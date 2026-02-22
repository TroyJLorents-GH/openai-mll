# Migrating to Azure OpenAI

## Quick Migration Guide

Your application currently uses OpenAI API. Here's how to switch to Azure OpenAI:

### Step 1: Update Dependencies

**File: `backend/requirements.txt`**

Make sure you have:
```
openai>=1.0.0
```

The Azure OpenAI SDK is included in the same package!

### Step 2: Update openai_client.py

**File: `backend/openai_client.py`**

Replace lines 1-13 with:

```python
# openai_client.py
from openai import AzureOpenAI
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv()


class OpenAIClient:
    def __init__(self, api_key=None, use_azure=True):
        if use_azure:
            # Azure OpenAI configuration
            self.client = AzureOpenAI(
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version="2024-08-01-preview"
            )
        else:
            # Regular OpenAI (fallback)
            self.api_key = api_key or os.getenv("OPENAI_API_KEY")
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
```

### Step 3: Update .env File

**File: `backend/.env`**

Add your Azure OpenAI credentials:

```bash
# Azure OpenAI Configuration (NEW)
AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-5.1-chat

# Legacy OpenAI (keep for fallback)
OPENAI_API_KEY=your-openai-key-if-you-have-one
```

### Step 4: Update Model Names for Azure

In `openai_client.py`, update the `_normalize_model` method:

```python
def _normalize_model(self, model: str) -> str:
    """Map model names to Azure OpenAI deployment names."""
    # For Azure OpenAI, use your deployment name
    azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.1-chat")

    # Map any model request to your Azure deployment
    # In Azure, you use deployment names, not model names
    return azure_deployment
```

### Step 5: Update Moderation (Important!)

**Azure OpenAI doesn't support the moderation endpoint yet!**

Update `moderate_content` method:

```python
def moderate_content(self, prompt):
    # Option 1: Use Azure Content Safety (requires separate setup)
    # Option 2: Skip moderation
    # Option 3: Use OpenAI moderation via regular API

    # For now, let's skip it (or keep using OpenAI for moderation)
    try:
        # Still use OpenAI for content moderation
        from openai import OpenAI
        moderation_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        moderation = moderation_client.moderations.create(input=prompt)
        result = moderation.results[0]
        categories = result.categories.model_dump()
        flagged_categories = [cat for cat, flagged in categories.items() if flagged]
        return result.flagged, flagged_categories
    except:
        # If moderation fails, just allow it through
        return False, []
```

### Step 6: Test It!

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python app.py
```

Then in another terminal:
```bash
cd frontend
npm start
```

---

## What Changes, What Stays the Same

### ✅ Stays the Same:
- Frontend code (no changes needed!)
- API endpoints (/chat, /upload, etc.)
- Database structure
- File upload logic
- Response format

### 🔄 Changes:
- OpenAI client initialization (Azure endpoint)
- Model names → deployment names
- Content moderation (may need workaround)

---

## Benefits of Using Azure OpenAI

1. **Enterprise Security** - Data stays in your Azure tenant
2. **Compliance** - Better for regulated industries (like banking)
3. **SLA** - Enterprise-grade support
4. **Integration** - Works with Azure AD, Key Vault, etc.
5. **Cost Management** - Better billing controls
6. **Latest Models** - Access to GPT-5.1 and other Azure-exclusive models

---

## Interview Talking Points

"I built a full-stack document chat application using React and Python Flask. It integrates with OpenAI for conversational AI and implements RAG (Retrieval-Augmented Generation) to answer questions about uploaded documents. The architecture is designed to be flexible - I can easily swap OpenAI for Azure OpenAI by changing the client initialization. This demonstrates my understanding of both front-end development, back-end API design, AI integration, and cloud services."

---

## Production Enhancements (Future)

- [ ] Use Azure Key Vault for API keys
- [ ] Deploy backend to Azure App Service
- [ ] Deploy frontend to Azure Static Web Apps
- [ ] Use Azure Blob Storage for file uploads
- [ ] Implement Azure Application Insights for monitoring
- [ ] Add authentication with Azure AD
- [ ] Use Azure Content Safety for moderation
- [ ] Implement proper vector database (Azure Cognitive Search or Cosmos DB)
