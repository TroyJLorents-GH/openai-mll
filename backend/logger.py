# logger.py
import json
import os
from datetime import datetime

LOG_PATH = "data/logs.json"
FLAGGED_PATH = "data/flagged.txt"


def log_chat(user_input, bot_response, keywords, moderation_flags):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_input": user_input,
        "bot_response": bot_response,
        "keywords": keywords,
        "moderation_flags": moderation_flags
    }

    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

    if not os.path.exists(LOG_PATH):
        with open(LOG_PATH, 'w', encoding='utf-8') as f:
            json.dump([log_entry], f, indent=2)
    else:
        with open(LOG_PATH, 'r+', encoding='utf-8') as f:
            data = json.load(f)
            data.append(log_entry)
            f.seek(0)
            json.dump(data, f, indent=2)


def log_flagged(prompt, categories):
    os.makedirs(os.path.dirname(FLAGGED_PATH), exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with open(FLAGGED_PATH, 'a', encoding='utf-8') as f:
        f.write(f"[{timestamp}] FLAGGED: \"{prompt}\" | Categories: {categories}\n")
