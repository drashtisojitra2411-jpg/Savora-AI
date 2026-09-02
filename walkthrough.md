# Savora Walkthrough

Savora now uses a real trained-model pipeline end to end.

## What Changed

- Removed backend demo mode and random prediction fallback
- Added custom dataset support under `model/dataset/train` and `model/dataset/val`
- Auto-detects class folders and writes `model/class_names.json`
- Reworked training script to use MobileNetV2 transfer learning for 10 epochs
- Backend now loads `model/food_model.h5` and `model/class_names.json`
- Added low-confidence handling below 60%
- Updated frontend to show actual class/confidence and avoid fake nutrition values

## Run Order

### 1. Prepare dataset

```bash
cd model
python download_dataset.py
```

### 2. Train the model

```bash
cd model
pip install -r requirements.txt
python train.py
```

### 3. Start backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

## Expected Behavior

- `/predict` returns real model inference only
- Missing model returns `"Model not trained yet"`
- Debug logs print predicted probabilities and selected class
- Dashboard shows the predicted class and confidence
- Low-confidence results show `"Low confidence prediction"`
