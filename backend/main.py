"""
Savora AI backend.
FastAPI implementation that always returns JSON responses.
"""

import asyncio
import io
import json
import re
import traceback
import uuid
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from starlette.exceptions import HTTPException as StarletteHTTPException
from tensorflow.keras.models import load_model

from .database import (
  clear_all_predictions,
  delete_prediction,
  get_all_predictions,
  get_prediction_by_id,
  save_prediction,
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR.parent / "model"
MODEL_H5_PATH = MODEL_DIR / "food_model.h5"
MODEL_KERAS_PATH = MODEL_DIR / "food_model.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
NUTRITION_PATH = MODEL_DIR / "nutrition_data.json"
UPLOADS_DIR = BASE_DIR / "uploads"

DEFAULT_WEIGHT = 100.0
CONFIDENCE_THRESHOLD = 0.4
TOP2_GAP_THRESHOLD = 0.15
SIMILAR_CLASS_GAP_THRESHOLD = 0.2
TEMPERATURE = 1.5
LOW_CONFIDENCE_MESSAGE = "Low confidence prediction. Try another image."
UNCERTAIN_MESSAGE = "Prediction is uncertain. Try another image."
NUTRITION_UNAVAILABLE_MESSAGE = "Nutrition data not available"
IMAGE_SIZE = (224, 224)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
PREDICTION_TIMEOUT_SECONDS = 30
SIMILAR_CLASS_GROUPS = [
  {"poha", "biryani"},
]

UPLOADS_DIR.mkdir(exist_ok=True)


def json_response(payload: dict, status_code: int = 200) -> JSONResponse:
  return JSONResponse(status_code=status_code, content=payload)


def success_response(data=None, message: str = "OK", status_code: int = 200, **extra) -> JSONResponse:
  payload = {
    "success": True,
    "message": message,
    "data": data,
  }
  payload.update(extra)
  return json_response(payload, status_code=status_code)


def error_response(message: str, status_code: int = 500, **extra) -> JSONResponse:
  payload = {
    "success": False,
    "message": message or "Internal server error",
  }
  payload.update(extra)
  return json_response(payload, status_code=status_code)


def log_debug(label: str, value) -> None:
  print(f"[Savora] {label}: {value}")


def normalize_key(name: str) -> str:
  normalized = str(name).strip().lower()
  normalized = re.sub(r"[\s\-]+", "_", normalized)
  normalized = re.sub(r"_+", "_", normalized)
  return normalized


def load_json(path: Path, default):
  if not path.exists():
    return default
  with path.open("r", encoding="utf-8") as file:
    return json.load(file)


def load_class_names() -> list[str]:
  with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
    class_names = json.load(file)

  if not isinstance(class_names, list) or not class_names:
    raise ValueError("class_names.json is missing or invalid")

  normalized = [normalize_key(name) for name in class_names]
  if len(set(normalized)) != len(normalized):
    raise ValueError("class_names.json contains duplicate labels after normalization")
  return normalized


def load_nutrition_data() -> dict[str, dict]:
  raw_data = load_json(NUTRITION_PATH, {})
  nutrition_map = raw_data.get("nutrition", {}) if isinstance(raw_data, dict) else {}
  if not isinstance(nutrition_map, dict):
    return {}

  normalized = {}
  for key, value in nutrition_map.items():
    if isinstance(value, dict):
      normalized[normalize_key(key)] = value
  return normalized


def load_model_once():
  model = None
  model_path = None
  load_error = None

  try:
    if MODEL_KERAS_PATH.exists():
      model_path = MODEL_KERAS_PATH
    elif MODEL_H5_PATH.exists():
      model_path = MODEL_H5_PATH
    else:
      raise FileNotFoundError("Model file not found. Expected model/food_model.h5 or model/food_model.keras")

    model = load_model(model_path)
    log_debug("model_loaded_from", str(model_path))
  except Exception as exc:
    load_error = str(exc)
    print("ERROR:", load_error)
    traceback.print_exc()

  return model, model_path, load_error


MODEL, MODEL_PATH, MODEL_LOAD_ERROR = load_model_once()
CLASS_NAMES = load_class_names() if CLASS_NAMES_PATH.exists() else []
NUTRITION_DATA = load_nutrition_data()
if MODEL is not None and CLASS_NAMES:
  output_shape = getattr(MODEL, "output_shape", None)
  output_units = output_shape[-1] if isinstance(output_shape, tuple) else None
  if output_units is None or int(output_units) != len(CLASS_NAMES):
    MODEL_LOAD_ERROR = (
      "Model/class_names mismatch: "
      f"model_outputs={output_units}, class_names={len(CLASS_NAMES)}. "
      "Use matching trained model and class_names.json."
    )
    MODEL = None
log_debug("model_loaded", MODEL is not None)
log_debug("class_names_loaded", len(CLASS_NAMES))
log_debug("nutrition_entries_loaded", len(NUTRITION_DATA))

app = FastAPI(
  title="Savora AI API",
  description="Food recognition and nutrition estimation API",
  version="5.0.0",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.middleware("http")
async def ensure_json_errors(request: Request, call_next):
  try:
    log_debug("request_received", f"{request.method} {request.url.path}")
    response = await call_next(request)
  except Exception as exc:
    print("ERROR:", str(exc))
    traceback.print_exc()
    return error_response("Something broke", 500, path=str(request.url.path))

  if request.url.path.startswith("/uploads"):
    return response

  content_type = response.headers.get("content-type", "")
  if response.status_code >= 400 and "application/json" not in content_type:
    return error_response("Request failed", response.status_code, path=str(request.url.path))

  return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
  details = exc.detail if not isinstance(exc.detail, str) else None
  message = exc.detail if isinstance(exc.detail, str) and exc.detail else "Request failed"
  return error_response(message, exc.status_code, details=details, path=str(request.url.path))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
  print("ERROR:", str(exc))
  return error_response("Invalid request payload", 422, details=exc.errors(), path=str(request.url.path))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
  print("ERROR:", str(exc))
  traceback.print_exc()
  return error_response("Something broke", 500, path=str(request.url.path))


def normalize_weight(weight_value: str | None) -> float:
  try:
    weight = float(weight_value) if weight_value is not None else DEFAULT_WEIGHT
    if weight <= 0:
      raise ValueError
    return round(weight, 2)
  except (TypeError, ValueError):
    return DEFAULT_WEIGHT


def validate_image_bytes(image_bytes: bytes) -> None:
  if not image_bytes:
    raise ValueError("No file uploaded")

  try:
    image = Image.open(io.BytesIO(image_bytes))
    image.verify()
  except (UnidentifiedImageError, OSError, ValueError) as exc:
    raise ValueError("Invalid image file") from exc


def preprocess_image(image_bytes: bytes) -> np.ndarray:
  try:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
  except (UnidentifiedImageError, OSError, ValueError) as exc:
    raise ValueError("Invalid image file") from exc

  image = image.resize(IMAGE_SIZE)
  image_array = np.asarray(image, dtype=np.float32)
  image_array = image_array / 255.0
  return np.expand_dims(image_array, axis=0)


def scale_nutrition(value, weight: float):
  if value is None:
    return None
  return round((float(value) * weight) / 100.0, 2)


def apply_temperature_scaling(logits: np.ndarray, temperature: float = TEMPERATURE) -> np.ndarray:
  safe_temperature = max(float(temperature), 1e-6)
  shifted_logits = logits - np.max(logits)
  exp_logits = np.exp(shifted_logits / safe_temperature)
  return exp_logits / np.sum(exp_logits)


def build_top_predictions(probabilities: np.ndarray) -> list[dict]:
  top_indices = np.argsort(probabilities)[::-1][:3]
  top_k_probs = probabilities[top_indices].astype(np.float64)
  top_sum = float(np.sum(top_k_probs))
  normalized_top_k = (top_k_probs / top_sum) if top_sum > 0 else top_k_probs
  return [
    {
      "name": CLASS_NAMES[index],
      "confidence": float(round(float(normalized_top_k[position]), 4)),
    }
    for position, index in enumerate(top_indices)
  ]


def find_similar_class_message(top_indices: np.ndarray, probabilities: np.ndarray) -> str | None:
  if len(top_indices) < 2:
    return None
  first_idx = int(top_indices[0])
  second_idx = int(top_indices[1])
  first_name = CLASS_NAMES[first_idx]
  second_name = CLASS_NAMES[second_idx]
  confidence_gap = float(probabilities[first_idx] - probabilities[second_idx])
  if confidence_gap >= SIMILAR_CLASS_GAP_THRESHOLD:
    return None

  top_pair = {first_name, second_name}
  for group in SIMILAR_CLASS_GROUPS:
    if top_pair.issubset(group):
      return f"This looks similar to multiple dishes: {first_name} / {second_name}"
  return None


def build_prediction_response(
  predicted_food_name: str,
  display_food_name: str,
  confidence: float,
  adjusted_confidence: float,
  confidence_gap: float,
  weight: float,
  nutrition: dict | None,
  top_predictions: list[dict],
  raw_logits: list[float],
  similarity_message: str | None,
) -> dict:
  is_unknown = display_food_name == "Unknown"
  is_uncertain = display_food_name == "Uncertain"
  is_low_confidence = is_unknown or is_uncertain
  nutrition = nutrition or {}
  message = None
  if similarity_message:
    message = similarity_message
  elif is_unknown:
    message = LOW_CONFIDENCE_MESSAGE
  elif is_uncertain:
    message = UNCERTAIN_MESSAGE
  elif not nutrition:
    message = NUTRITION_UNAVAILABLE_MESSAGE

  return {
    "food": display_food_name,
    "food_name": display_food_name,
    "predicted_class": predicted_food_name,
    "confidence": float(adjusted_confidence),
    "raw_confidence": float(confidence),
    "adjusted_confidence": float(adjusted_confidence),
    "confidence_gap": float(confidence_gap),
    "confidence_threshold": CONFIDENCE_THRESHOLD,
    "top2_gap_threshold": TOP2_GAP_THRESHOLD,
    "is_low_confidence": is_low_confidence,
    "is_uncertain": is_uncertain,
    "calories": scale_nutrition(nutrition.get("calories"), weight) if nutrition else None,
    "portion": nutrition.get("portion"),
    "protein": scale_nutrition(nutrition.get("protein"), weight) if nutrition else None,
    "carbs": scale_nutrition(nutrition.get("carbs"), weight) if nutrition else None,
    "fat": scale_nutrition(nutrition.get("fat", nutrition.get("fats")), weight) if nutrition else None,
    "fats": scale_nutrition(nutrition.get("fat", nutrition.get("fats")), weight) if nutrition else None,
    "weight": weight,
    "top_predictions": top_predictions,
    "raw_logits": raw_logits,
    "message": message,
    "health_tip": nutrition.get("health_tip"),
  }


async def run_prediction_pipeline(upload: UploadFile, weight: str | None) -> dict:
  log_debug("predict_step", "Validating uploaded file")
  if upload is None or not upload.filename:
    return {"error": error_response("No image uploaded", 400)}

  if upload.content_type not in ALLOWED_TYPES:
    return {
      "error": error_response(
        f"Invalid file type: {upload.content_type}. Allowed: JPEG, PNG, JPG, WebP.",
        400,
      )
    }

  log_debug("predict_step", "Checking model availability")
  if MODEL is None:
    return {"error": error_response(MODEL_LOAD_ERROR or "Model failed to load", 500)}

  if not CLASS_NAMES:
    return {"error": error_response("Class names failed to load", 500)}

  log_debug("predict_step", "Reading image bytes")
  try:
    image_bytes = await upload.read()
    validate_image_bytes(image_bytes)
  except ValueError as exc:
    return {"error": error_response(str(exc), 400)}
  log_debug("predict_step", f"Image validated ({len(image_bytes)} bytes)")

  normalized_weight = normalize_weight(weight)
  log_debug("predict_step", f"Weight normalized to {normalized_weight}")

  log_debug("predict_step", "Preprocessing image")
  try:
    image_array = preprocess_image(image_bytes)
  except ValueError as exc:
    return {"error": error_response(str(exc), 400)}

  log_debug("predict_step", "Running model prediction")
  try:
    raw_probabilities = await asyncio.wait_for(
      asyncio.to_thread(lambda: MODEL.predict(image_array, verbose=0)[0]),
      timeout=PREDICTION_TIMEOUT_SECONDS,
    )
  except TimeoutError:
    return {"error": error_response("Request timeout", 408)}
  except Exception:
    return {"error": error_response("Model failed", 500)}
  log_debug("predict_step", "Prediction done")

  logits = np.log(np.clip(raw_probabilities, 1e-9, 1.0))
  probabilities = apply_temperature_scaling(logits, temperature=TEMPERATURE)
  raw_logits = [float(round(value, 6)) for value in logits.tolist()]

  predicted_index = int(np.argmax(probabilities))
  predicted_food_name = CLASS_NAMES[predicted_index]
  confidence = float(round(float(probabilities[predicted_index]), 4))
  adjusted_confidence = confidence
  if adjusted_confidence > 0.85:
    adjusted_confidence = float(round(adjusted_confidence * 0.9, 4))

  top_indices = np.argsort(probabilities)[::-1]
  top_predictions = build_top_predictions(probabilities)
  similarity_message = find_similar_class_message(top_indices, probabilities)
  sorted_probabilities = np.sort(probabilities)[::-1]
  second_confidence = float(sorted_probabilities[1]) if len(sorted_probabilities) > 1 else 0.0
  confidence_gap = float(round(confidence - second_confidence, 4))

  if confidence < CONFIDENCE_THRESHOLD:
    display_food_name = "Unknown"
  elif confidence_gap < TOP2_GAP_THRESHOLD:
    display_food_name = "Uncertain"
  else:
    display_food_name = predicted_food_name

  log_debug("prediction_result", {
    "predicted_class": predicted_food_name,
    "confidence": confidence,
    "adjusted_confidence": adjusted_confidence,
    "confidence_gap": confidence_gap,
  })

  predicted_class_clean = normalize_key(predicted_food_name)
  nutrition = NUTRITION_DATA.get(predicted_class_clean)
  print("Predicted:", predicted_food_name)
  print("Cleaned:", predicted_class_clean)
  print("Nutrition found:", nutrition)

  log_debug("predict_step", "Building response payload")
  response = build_prediction_response(
    predicted_food_name=predicted_food_name,
    display_food_name=display_food_name,
    confidence=confidence,
    adjusted_confidence=adjusted_confidence,
    confidence_gap=confidence_gap,
    weight=normalized_weight,
    nutrition=nutrition,
    top_predictions=top_predictions,
    raw_logits=raw_logits,
    similarity_message=similarity_message,
  )

  log_debug("predict_step", "Persisting uploaded image")
  file_ext = upload.filename.split(".")[-1] if "." in upload.filename else "jpg"
  image_filename = f"{uuid.uuid4().hex}.{file_ext}"
  (UPLOADS_DIR / image_filename).write_bytes(image_bytes)
  response["image_filename"] = image_filename

  log_debug("predict_step", "Saving prediction to database")
  row_id = save_prediction(response)
  response["id"] = row_id
  log_debug("final_response", response)
  return {"data": response}


@app.get("/")
async def root():
  return success_response({
    "name": "Savora AI API",
    "version": "5.0.0",
    "model_loaded": MODEL is not None,
    "model_path": str(MODEL_PATH) if MODEL_PATH else None,
    "message": "Upload a food image to /predict.",
  }, message="API ready")


@app.get("/health")
async def health_check():
  return success_response({
    "status": "healthy" if MODEL is not None else "degraded",
    "model_loaded": MODEL is not None,
    "model_path": str(MODEL_PATH) if MODEL_PATH else None,
    "class_count": len(CLASS_NAMES),
    "nutrition_count": len(NUTRITION_DATA),
    "model_error": MODEL_LOAD_ERROR,
  }, message="Health check complete")


@app.post("/predict")
async def predict(
  file: UploadFile = File(default=None),
  image: UploadFile = File(default=None),
  weight: str | None = Form(default="100"),
):
  try:
    upload = file or image
    log_debug("predict_step", f"Upload field selected: {'file' if file else 'image' if image else 'none'}")
    pipeline_result = await run_prediction_pipeline(upload, weight)
    if pipeline_result.get("error"):
      return pipeline_result["error"]
    return success_response(pipeline_result.get("data"), message="Prediction generated")

  except Exception as exc:
    print("FATAL ERROR:", str(exc))
    traceback.print_exc()
    return JSONResponse(
      status_code=500,
      content={"success": False, "message": str(exc) or "Processing failed"},
    )


@app.get("/history")
async def get_history():
  try:
    predictions = get_all_predictions()
    return success_response({"predictions": predictions, "count": len(predictions)}, message="History loaded")
  except Exception as exc:
    print("ERROR:", str(exc))
    return error_response("Something broke", 500)


@app.get("/history/{prediction_id}")
async def get_single_prediction(prediction_id: int):
  try:
    prediction = get_prediction_by_id(prediction_id)
    if not prediction:
      return error_response("Prediction not found", 404)
    return success_response(prediction, message="Prediction loaded")
  except Exception as exc:
    print("ERROR:", str(exc))
    return error_response("Something broke", 500)


@app.delete("/history/{prediction_id}")
async def remove_prediction(prediction_id: int):
  try:
    deleted = delete_prediction(prediction_id)
    if not deleted:
      return error_response("Prediction not found", 404)
    return success_response({"id": prediction_id}, message="Prediction deleted")
  except Exception as exc:
    print("ERROR:", str(exc))
    return error_response("Something broke", 500)


@app.delete("/history")
async def clear_history():
  try:
    clear_all_predictions()
    return success_response({}, message="All history cleared")
  except Exception as exc:
    print("ERROR:", str(exc))
    return error_response("Something broke", 500)


@app.get("/classes")
async def get_classes():
  try:
    return success_response({"classes": CLASS_NAMES, "count": len(CLASS_NAMES)}, message="Classes loaded")
  except Exception as exc:
    print("ERROR:", str(exc))
    return error_response("Something broke", 500)


if __name__ == "__main__":
  import uvicorn

  print("\nStarting Savora AI backend...")
  print(f"Model loaded: {MODEL is not None}")
  if MODEL_LOAD_ERROR:
    print(f"Model load error: {MODEL_LOAD_ERROR}")
  uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
