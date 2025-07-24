# chat_service.py
from openai_client import OpenAIClient
from extractor import extract_keywords
from db_manager import log_chat, log_flagged




def handle_chat(prompt):
    client = OpenAIClient()
    flagged, categories = client.moderate_content(prompt)

    if flagged:
        log_flagged(prompt, categories)
        return "Sorry, I can't respond to that."

    response = client.chat_completion(prompt)
    keywords = extract_keywords(prompt)
    log_chat(prompt, response, keywords, categories)
    return response
