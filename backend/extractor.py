# extractor.py
from openai_client import OpenAIClient




def extract_keywords(prompt):
    client = OpenAIClient()
    instruction = f"Extract 3 to 5 important keywords or topics from the following message:\n\n\"{prompt}\"\n\nList them separated by commas."
    response = client.chat_completion(instruction)
    return [kw.strip() for kw in response.split(',') if kw.strip()]
