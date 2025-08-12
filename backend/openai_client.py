# openai_client.py
import openai
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv()


class OpenAIClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = openai.Client(api_key=self.api_key)

    def chat_completion(self, prompt, model="gpt-4o"):
        system_message = """You are a helpful AI assistant. Please provide clear, well-structured responses that are:
- Conversational and friendly
- Concise but informative
- Well-formatted with proper paragraphs
- Helpful and actionable when possible

If the user asks a question, provide a direct answer. If they're making conversation, respond naturally and engagingly."""
        
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        return response.choices[0].message.content.strip()

    def moderate_content(self, prompt):
        moderation = self.client.moderations.create(input=prompt)
        result = moderation.results[0]
        # Convert categories to dict
        categories = result.categories.model_dump()
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]
        return result.flagged, flagged_categories
