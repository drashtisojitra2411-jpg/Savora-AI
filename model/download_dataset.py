"""
Savora AI dataset validator.
Validates the train/val dataset structure and writes class_names.json.
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "val"
CLASS_NAMES_PATH = BASE_DIR / "class_names.json"


def discover_classes(root_dir: Path) -> list[str]:
  if not root_dir.exists():
    raise FileNotFoundError(f"Dataset folder not found: {root_dir}")

  class_names = sorted(item.name for item in root_dir.iterdir() if item.is_dir())
  if not class_names:
    raise ValueError(f"No class folders found in {root_dir}")

  return class_names


def count_images(root_dir: Path, class_name: str) -> int:
  class_dir = root_dir / class_name
  return sum(1 for item in class_dir.iterdir() if item.is_file()) if class_dir.exists() else 0


def main():
  train_classes = discover_classes(TRAIN_DIR)
  validation_classes = discover_classes(VAL_DIR)

  if train_classes != validation_classes:
    missing_in_train = sorted(set(validation_classes) - set(train_classes))
    missing_in_validation = sorted(set(train_classes) - set(validation_classes))
    raise ValueError(
      "Train/validation class mismatch. "
      f"Missing in train: {missing_in_train}. "
      f"Missing in val: {missing_in_validation}."
    )

  print("=" * 60)
  print("Savora AI - Dataset Validator")
  print("=" * 60)
  print(f"Dataset root: {DATASET_DIR}")
  print(f"Detected classes: {train_classes}")

  for class_name in train_classes:
    train_count = count_images(TRAIN_DIR, class_name)
    validation_count = count_images(VAL_DIR, class_name)
    print(f"{class_name}: train={train_count}, val={validation_count}")

  with CLASS_NAMES_PATH.open("w", encoding="utf-8") as file:
    json.dump(train_classes, file, indent=2)

  print(f"Saved class names to {CLASS_NAMES_PATH}")


if __name__ == "__main__":
  main()
