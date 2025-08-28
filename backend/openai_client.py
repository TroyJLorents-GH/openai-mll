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

    def chat_completion(self, prompt, model="gpt-4o", mode="general"):
        # Check if this is a document-based query
        is_document_query = "Context from uploaded documents:" in prompt
        
        if is_document_query:
            if mode == "code":
                system_message = """You are a concise, friendly coding assistant with access to uploaded documents.

Guidelines:
- Extract only the information needed to answer the question
- Provide correct, runnable code when relevant (include language-tagged fenced blocks)
- Cite the document sections you used when applicable
- Call out constraints, assumptions, and edge cases
- If the docs do not contain enough info, state that clearly and propose a safe default
- Keep answers short, skimmable, and focused on solving the task"""
                max_tokens = 2000
                temperature = 0.35
            else:
                system_message = """You are a helpful AI assistant with access to uploaded documents. When analyzing documents, please:

- Carefully read and understand the provided document content
- Answer questions based specifically on the information in the documents
- Cite relevant parts of the documents when answering
- If the documents don't contain information needed to answer a question, clearly state this
- Provide comprehensive analysis and insights based on the document content
- Be thorough but concise in your responses
- Use markdown formatting for better readability when appropriate"""
                max_tokens = 2000
                temperature = 0.5
        else:
            if mode == "code":
                system_message = """You are a concise, friendly coding assistant.

Guidelines:
- Prioritize correct, runnable code and best practices
- Prefer step-by-step fixes and minimal explanations
- Use short paragraphs and bullet points; avoid fluff
- When showing code, use fenced blocks with a language tag
- Mention important caveats, edge cases, and security considerations
- If uncertain, state assumptions and propose a safe default
- Keep answers scoped to programming topics unless asked otherwise"""
                max_tokens = 700
                temperature = 0.3
            else:
                system_message = """You are a helpful, concise, and friendly general assistant.

Guidelines:
- Be direct, skimmable, and actionable
- Use short paragraphs and bullets; avoid verbosity
- Include key caveats and safety notes when relevant
- Ask clarifying questions only if strictly necessary
- Format outputs for readability (markdown ok)"""
                max_tokens = 700
                temperature = 0.3
        
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()

    def moderate_content(self, prompt):
        moderation = self.client.moderations.create(input=prompt)
        result = moderation.results[0]
        # Convert categories to dict
        categories = result.categories.model_dump()
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]
        return result.flagged, flagged_categories
