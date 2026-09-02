"""Savora AI training script with dynamic class generation."""

import argparse
import json
import os
from collections import Counter
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "val"
MODEL_SAVE_PATH = BASE_DIR / "food_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "class_names.json"
TRAINING_SUMMARY_PATH = BASE_DIR / "training_summary.json"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 35
LEARNING_RATE = 1e-4
FINE_TUNE_LEARNING_RATE = 1e-5
FINE_TUNE_LAYERS = 30
DEFAULT_FINE_TUNE_EPOCHS = 5
SEED = 42


def parse_args():
  parser = argparse.ArgumentParser(description="Train the Savora food classifier.")
  parser.add_argument("--fine-tune", action="store_true", help="Enable fine-tuning stage.")
  parser.add_argument("--fine-tune-epochs", type=int, default=DEFAULT_FINE_TUNE_EPOCHS)
  return parser.parse_args()


def get_class_names_from_folders(dataset_path: Path) -> list[str]:
  if not dataset_path.exists():
    raise FileNotFoundError(f"Dataset folder not found: {dataset_path}")
  # Required pattern from request:
  class_names = sorted(os.listdir(dataset_path))
  class_names = [name for name in class_names if (dataset_path / name).is_dir()]
  if not class_names:
    raise ValueError(f"No class folders found in {dataset_path}")
  return class_names


def validate_dataset_structure() -> list[str]:
  train_classes = get_class_names_from_folders(TRAIN_DIR)
  val_classes = get_class_names_from_folders(VAL_DIR)
  if train_classes != val_classes:
    raise ValueError(
      "Train/val class folders differ. "
      f"train={train_classes}, val={val_classes}"
    )
  return train_classes


def save_class_names(class_names: list[str]) -> None:
  with CLASS_NAMES_PATH.open("w", encoding="utf-8") as file:
    json.dump(class_names, file, indent=2)


def build_generators():
  train_datagen = ImageDataGenerator(
    rescale=1.0 / 255.0,
    rotation_range=25,
    zoom_range=0.2,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
    brightness_range=[0.7, 1.3],
  )
  val_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

  train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=True,
    seed=SEED,
  )
  val_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False,
  )
  return train_generator, val_generator


def validate_generators(train_generator, val_generator) -> list[str]:
  if train_generator.class_indices != val_generator.class_indices:
    raise ValueError(
      "Train and validation class indices differ. "
      f"train={train_generator.class_indices}, val={val_generator.class_indices}"
    )
  return list(train_generator.class_indices.keys())


def compute_class_weights(train_generator, class_names: list[str]) -> dict[int, float]:
  class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.arange(len(class_names)),
    y=train_generator.classes,
  )
  return {index: float(weight) for index, weight in enumerate(class_weights)}


def build_model(num_classes: int):
  base_model = MobileNetV2(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
  base_model.trainable = False

  inputs = layers.Input(shape=(224, 224, 3))
  x = base_model(inputs, training=False)
  x = layers.GlobalAveragePooling2D()(x)
  x = layers.BatchNormalization()(x)
  x = layers.Dense(128, activation="relu")(x)
  x = layers.Dropout(0.3)(x)
  outputs = layers.Dense(num_classes, activation="softmax")(x)

  model = models.Model(inputs, outputs)
  model.compile(optimizer=Adam(learning_rate=LEARNING_RATE), loss="categorical_crossentropy", metrics=["accuracy"])
  return model, base_model


def validate_output_layer_matches_classes(model, class_names: list[str]) -> None:
  output_units = model.output_shape[-1]
  if int(output_units) != len(class_names):
    raise ValueError(
      "Output layer/class count mismatch: "
      f"output_units={output_units}, classes={len(class_names)}"
    )


def enable_fine_tuning(model, base_model) -> None:
  base_model.trainable = True
  for layer in base_model.layers[:-FINE_TUNE_LAYERS]:
    layer.trainable = False
  for layer in base_model.layers[-FINE_TUNE_LAYERS:]:
    layer.trainable = True
  model.compile(optimizer=Adam(learning_rate=FINE_TUNE_LEARNING_RATE), loss="categorical_crossentropy", metrics=["accuracy"])


def save_training_summary(class_names: list[str], validation_loss: float, validation_accuracy: float, trained_epochs: int) -> None:
  summary = {
    "classes": class_names,
    "class_count": len(class_names),
    "image_size": list(IMG_SIZE),
    "batch_size": BATCH_SIZE,
    "epochs": trained_epochs,
    "saved_model_path": MODEL_SAVE_PATH.name,
    "validation_loss": round(float(validation_loss), 4),
    "validation_accuracy": round(float(validation_accuracy), 4),
  }
  with TRAINING_SUMMARY_PATH.open("w", encoding="utf-8") as file:
    json.dump(summary, file, indent=2)


def main():
  args = parse_args()

  print("=" * 70)
  print("Savora AI - Full dataset retraining")
  print("=" * 70)
  print(f"TensorFlow: {tf.__version__}")
  print(f"Train dir: {TRAIN_DIR}")
  print(f"Val dir:   {VAL_DIR}")
  print(f"Model out: {MODEL_SAVE_PATH}")
  print("Note: For hard negative learning, add visually confusing examples (e.g., poha-like biryani) into class folders.")

  folder_classes = validate_dataset_structure()
  print(f"Class folders discovered: {len(folder_classes)} -> {folder_classes}")

  train_generator, val_generator = build_generators()
  generator_classes = validate_generators(train_generator, val_generator)

  if generator_classes != folder_classes:
    raise ValueError(
      "flow_from_directory classes do not match folder classes. "
      f"folders={folder_classes}, generator={generator_classes}"
    )

  class_names = folder_classes
  save_class_names(class_names)

  model, base_model = build_model(num_classes=len(class_names))
  validate_output_layer_matches_classes(model, class_names)

  class_weights = compute_class_weights(train_generator, class_names)
  model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    class_weight=class_weights,
    verbose=1,
  )

  total_epochs = EPOCHS
  if args.fine_tune:
    enable_fine_tuning(model, base_model)
    validate_output_layer_matches_classes(model, class_names)
    model.fit(
      train_generator,
      validation_data=val_generator,
      epochs=args.fine_tune_epochs,
      class_weight=class_weights,
      verbose=1,
    )
    total_epochs += args.fine_tune_epochs

  validation_loss, validation_accuracy = model.evaluate(val_generator, verbose=1)
  model.save(MODEL_SAVE_PATH)
  save_training_summary(class_names, validation_loss, validation_accuracy, total_epochs)

  print("\nTraining complete.")
  print(f"Saved model: {MODEL_SAVE_PATH}")
  print(f"Saved classes: {CLASS_NAMES_PATH}")
  print(f"class_count={len(class_names)}, output_units={model.output_shape[-1]}")
  print(f"Val loss={validation_loss:.4f}, Val acc={validation_accuracy:.4f}")


if __name__ == "__main__":
  main()
