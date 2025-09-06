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

    def _normalize_model(self, model: str) -> str:
        """Map aliases/unknown models to supported defaults."""
        default_model = "gpt-4o"
        if not model:
            return default_model
        m = model.strip()
        # Known supported chat-completions models
        supported = {
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-3.5-turbo",
        }
        if m in supported:
            return m
        # Common aliases or placeholders
        aliases = {
            "gpt5": "gpt-4o",
            "gpt-5": "gpt-4o",
            "gpt-5-mini": "gpt-4o-mini",
            "gpt-4.1-turbo": "gpt-4.1",
        }
        return aliases.get(m.lower(), default_model)

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
        
        # Normalize/alias unknown model names (e.g., "gpt-5")
        model = self._normalize_model(model)

        # Some newer models (e.g., gpt-4o family) require 'max_completion_tokens' instead of 'max_tokens'.
        def uses_max_completion_tokens(m: str) -> bool:
            m = (m or "").lower()
            prefixes = (
                "gpt-4o",
                "gpt-4.1",
                "o3",
                "o4",
            )
            return any(m.startswith(p) for p in prefixes)

        create_kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
        }

        if uses_max_completion_tokens(model):
            create_kwargs["max_completion_tokens"] = max_tokens
        else:
            create_kwargs["max_tokens"] = max_tokens

        response = self.client.chat.completions.create(**create_kwargs)
        return response.choices[0].message.content.strip()

    def moderate_content(self, prompt):
        moderation = self.client.moderations.create(input=prompt)
        result = moderation.results[0]
        # Convert categories to dict
        categories = result.categories.model_dump()
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]
        return result.flagged, flagged_categories
