# chat_service.py
from openai_client import OpenAIClient
from extractor import extract_keywords
from db_manager import log_chat, log_flagged




def handle_chat(prompt):
    client = OpenAIClient()
    flagged, categories = client.moderate_content(prompt)

    if flagged:
        log_flagged(prompt, categories)
        return "I apologize, but I cannot respond to that type of content. Please try asking something else!"

    # Add context based on the type of question
    enhanced_prompt = prompt
    if any(word in prompt.lower() for word in ['help', 'how', 'what', 'why', 'when', 'where']):
        enhanced_prompt = f"Please provide a helpful and well-structured response to: {prompt}"
    elif len(prompt.split()) < 5:  # Short messages
        enhanced_prompt = f"User said: '{prompt}'. Please respond naturally and engagingly."
    
    response = client.chat_completion(enhanced_prompt)
    keywords = extract_keywords(prompt)
    log_chat(prompt, response, keywords, categories)
    return response
