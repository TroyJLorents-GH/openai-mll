# openai_client.py
import openai
import os
from dotenv import load_dotenv

load_dotenv()

class OpenAIClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = openai.Client(api_key=self.api_key)

    def chat_completion(self, prompt, model="gpt-4o"):
        response = self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()

    def moderate_content(self, prompt):
        moderation = self.client.moderations.create(input=prompt)
        result = moderation.results[0]
        # Convert categories to dict
        categories = result.categories.model_dump()
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]
        return result.flagged, flagged_categories
