"""
SQLite storage for prediction history.
"""

import json
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "savora.db")


def get_connection():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn


def create_predictions_table(cursor):
  cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_name TEXT NOT NULL,
      weight REAL,
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      confidence REAL NOT NULL,
      message TEXT,
      health_tip TEXT,
      nutrition_found INTEGER DEFAULT 1,
      top_predictions TEXT,
      image_filename TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  """)


def migrate_if_needed(cursor):
  cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='predictions'")
  exists = cursor.fetchone()
  if not exists:
    create_predictions_table(cursor)
    return

  cursor.execute("PRAGMA table_info(predictions)")
  columns = {row[1] for row in cursor.fetchall()}
  expected_columns = {
    "food_name",
    "weight",
    "calories",
    "protein",
    "carbs",
    "fat",
    "confidence",
    "message",
    "health_tip",
    "nutrition_found",
    "top_predictions",
    "image_filename",
    "created_at",
  }

  if expected_columns.issubset(columns):
    return

  cursor.execute("ALTER TABLE predictions RENAME TO predictions_old")
  create_predictions_table(cursor)

  weight_expr = "weight" if "weight" in columns else "100"
  fat_expr = "fat" if "fat" in columns else ("fats" if "fats" in columns else "NULL")
  message_expr = "message" if "message" in columns else (
    "prediction_message" if "prediction_message" in columns else "NULL"
  )
  health_tip_expr = "health_tip" if "health_tip" in columns else "NULL"
  image_expr = "image_filename" if "image_filename" in columns else "NULL"
  created_expr = "created_at" if "created_at" in columns else "CURRENT_TIMESTAMP"

  cursor.execute("""
    INSERT INTO predictions (
      id, food_name, weight, calories, protein, carbs, fat, confidence,
      message, health_tip, nutrition_found, top_predictions, image_filename, created_at
    )
    SELECT
      id,
      food_name,
      COALESCE(""" + weight_expr + """, 100),
      calories,
      protein,
      carbs,
      """ + fat_expr + """,
      confidence,
      """ + message_expr + """,
      """ + health_tip_expr + """,
      1,
      '[]',
      """ + image_expr + """,
      """ + created_expr + """
    FROM predictions_old
  """)
  cursor.execute("DROP TABLE predictions_old")


def init_db():
  conn = get_connection()
  cursor = conn.cursor()
  migrate_if_needed(cursor)
  conn.commit()
  conn.close()


def save_prediction(prediction_data: dict) -> int:
  conn = get_connection()
  cursor = conn.cursor()
  cursor.execute("""
    INSERT INTO predictions (
      food_name, weight, calories, protein, carbs, fat, confidence,
      message, health_tip, nutrition_found, top_predictions, image_filename
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  """, (
    prediction_data["food_name"],
    prediction_data.get("weight"),
    prediction_data.get("calories"),
    prediction_data.get("protein"),
    prediction_data.get("carbs"),
    prediction_data.get("fat"),
    prediction_data["confidence"],
    prediction_data.get("message"),
    prediction_data.get("health_tip"),
    1 if prediction_data.get("nutrition_found", True) else 0,
    json.dumps(prediction_data.get("top_predictions", [])),
    prediction_data.get("image_filename"),
  ))
  row_id = cursor.lastrowid
  conn.commit()
  conn.close()
  return row_id


def row_to_prediction(row):
  item = dict(row)
  try:
    item["top_predictions"] = json.loads(item.get("top_predictions") or "[]")
  except json.JSONDecodeError:
    item["top_predictions"] = []
  item["nutrition_found"] = bool(item.get("nutrition_found", 1))
  return item


def get_all_predictions():
  conn = get_connection()
  cursor = conn.cursor()
  cursor.execute("SELECT * FROM predictions ORDER BY datetime(created_at) DESC, id DESC")
  rows = cursor.fetchall()
  conn.close()
  return [row_to_prediction(row) for row in rows]


def get_prediction_by_id(prediction_id: int):
  conn = get_connection()
  cursor = conn.cursor()
  cursor.execute("SELECT * FROM predictions WHERE id = ?", (prediction_id,))
  row = cursor.fetchone()
  conn.close()
  return row_to_prediction(row) if row else None


def delete_prediction(prediction_id: int) -> bool:
  conn = get_connection()
  cursor = conn.cursor()
  cursor.execute("DELETE FROM predictions WHERE id = ?", (prediction_id,))
  deleted = cursor.rowcount > 0
  conn.commit()
  conn.close()
  return deleted


def clear_all_predictions():
  conn = get_connection()
  cursor = conn.cursor()
  cursor.execute("DELETE FROM predictions")
  conn.commit()
  conn.close()


init_db()
