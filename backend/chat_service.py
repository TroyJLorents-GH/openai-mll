# chat_service.py
from openai_client import OpenAIClient
from extractor import extract_keywords
from db_manager import log_chat, log_flagged




def handle_chat(prompt, model="gpt-4o", mode="general"):
    client = OpenAIClient()
    flagged, categories = client.moderate_content(prompt)

    if flagged:
        log_flagged(prompt, categories)
        return "I apologize, but I cannot respond to that type of content!"

    # Check if the prompt contains document context
    has_document_context = "Context from uploaded documents:" in prompt
    
    # Add context based on the type of question and whether documents are present
    if has_document_context:
        # Enhanced prompt for document-based questions
        enhanced_prompt = f"""You are an AI assistant with access to uploaded documents. Please analyze the provided document content and answer the user's question based on that information.

Document Context:
{prompt}

Please provide a comprehensive answer that:
- Directly addresses the user's question using information from the documents
- Cites specific parts of the documents when relevant
- Acknowledges if the documents don't contain information needed to answer the question
- Provides helpful insights and analysis based on the document content

User Question: {prompt.split('User question: ')[-1] if 'User question: ' in prompt else prompt}"""
    else:
        # Regular prompt enhancement for general questions
        enhanced_prompt = prompt
        if any(word in prompt.lower() for word in ['help', 'how', 'what', 'why', 'when', 'where']):
            enhanced_prompt = f"Please provide a helpful and well-structured response to: {prompt}"
        elif len(prompt.split()) < 5:  # Short messages
            enhanced_prompt = f"User said: '{prompt}'. Please respond naturally and engagingly."
    
    response = client.chat_completion(enhanced_prompt, model, mode)
    keywords = extract_keywords(prompt)
    log_chat(prompt, response, keywords, categories)
    return response
