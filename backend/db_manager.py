# db_manager.py
import sqlite3
import os
from datetime import datetime

DB_PATH = "db/chatbot.db"
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Initialize the database and create tables if they don't exist
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS chatlog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                user_input TEXT,
                bot_response TEXT,
                keywords TEXT,
                moderation_flags TEXT
            )
        ''')
        c.execute('''
            CREATE TABLE IF NOT EXISTS flagged (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                user_input TEXT,
                categories TEXT
            )
        ''')
        conn.commit()

init_db()

def log_chat(user_input, bot_response, keywords, moderation_flags):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO chatlog (timestamp, user_input, bot_response, keywords, moderation_flags)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            datetime.utcnow().isoformat(),
            user_input,
            bot_response,
            ", ".join(keywords),
            ", ".join(moderation_flags)
        ))
        conn.commit()

def log_flagged(user_input, categories):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO flagged (timestamp, user_input, categories)
            VALUES (?, ?, ?)
        ''', (
            datetime.utcnow().isoformat(),
            user_input,
            ", ".join(categories)
        ))
        conn.commit()
