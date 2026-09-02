# Savora - Savor Every Bite, Smartly

AI-powered food classification built with a React frontend, FastAPI backend, and a MobileNetV2 model trained on a custom dataset.

## Overview

Savora now runs only on trained-model predictions.

- No demo mode
- No random predictions
- Custom classes loaded from `model/dataset/<class_name>`
- Model artifacts stored as `model/food_model.h5` and `model/class_names.json`

## Dataset Structure

Put your dataset in this format:

```text
model/
  dataset/
    pizza/
    burger/
    fries/
    sushi/
```

Training uses `validation_split=0.2`, so both training and validation samples are created automatically from the same class folders.
Class names are detected automatically from folder names and saved to `model/class_names.json`.

## Training

```bash
cd model
pip install -r requirements.txt
python download_dataset.py
python train.py
```

Optional fine-tuning:

```bash
python train.py --fine-tune
```

Training uses:

- MobileNetV2 transfer learning
- Frozen base model
- Optional unfreeze of the last 20 base-model layers for fine-tuning
- `GlobalAveragePooling2D`
- `Dense(128, relu)`
- `Dropout(0.3)`
- `Dense(num_classes, softmax)`
- Input resize to `224x224`
- Normalization to `[0, 1]`
- `flow_from_directory`
- `validation_split=0.2`
- 10 epochs

The trained model is saved to `model/food_model.h5`.

## Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

If the model or class names file is missing, `/predict` returns:

```json
{
  "detail": "Model not trained yet"
}
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI shows:

- Actual predicted class
- Confidence percentage
- Low-confidence warning when confidence is below 60%
- Optional nutrition info only when metadata exists for that class

## API Response

Example `/predict` response:

```json
{
  "food_name": "Pizza",
  "class_name": "pizza",
  "confidence": 91.42,
  "prediction_message": null,
  "calories": null,
  "protein": null,
  "carbs": null,
  "fats": null
}
```
