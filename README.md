# Resume Match AI

A full-stack AI-powered resume matching application that lets users upload resumes, extract text and metadata using Azure AI services, and match them against job descriptions using hybrid search (BM25 + vector similarity). Features multi-user authentication, AI chat with Azure Foundry agents, resume tailoring, and a knowledge graph.

**Live:** [https://openai-llm.netlify.app](https://openai-llm.netlify.app)

## Features

- **Resume Upload & Analysis** — Upload PDF/DOCX resumes, extract text via Azure Document Intelligence, generate embeddings, store in Cosmos DB
- **Job Matching** — Paste a job description and get ranked results with confidence scores, skill match %, matched/missing skills breakdown
- **LLM Skill Gap Analysis** — GPT-4.1-mini semantically matches resume content to job requirements (understands synonyms like "Azure DevOps pipelines" = "CI/CD")
- **Resume Tailoring** — AI-powered suggestions on how to modify your resume to better match a specific job
- **AI Chat** — Chat with OpenAI models or a PersonalAssistant Foundry agent that has access to your uploaded resumes
- **Multi-User Auth** — Firebase Authentication with Google, Email/Password, and Email Link (passwordless) sign-in
- **Knowledge Graph** — Graphiti + Neo4j AuraDB for entity/relationship extraction from resumes and job descriptions
- **Responsive Design** — Mobile-friendly with MUI breakpoints, drawer navigation, and stacked layouts

## Architecture

```
User (Browser)
  |
  v
Netlify (React + MUI frontend)
  |
  |-- Match Tab ----> Netlify Functions (auth + proxy) ----> VM API (Flask :5000)
  |                                                             |
  |                                                +------------+-------------+
  |                                                |            |             |
  |                                          Doc Intel    Azure OpenAI   Cosmos DB
  |                                          (extract)   (embeddings)   (storage)
  |                                                            |
  |                                                      Azure AI Search
  |                                                   (hybrid BM25 + vector)
  |
  |-- Chat Tab -----> Netlify Functions ----> OpenAI API / PersonalAssistant Agent
  |
  |-- Tailor -------> Netlify Functions ----> ResumeAgent (Azure Foundry)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Material UI (MUI), Firebase SDK |
| Auth | Firebase Authentication (Google, Email/Password, Email Link) |
| Serverless | Netlify Functions (Node.js) — token verification + API proxy |
| Backend API | Python Flask on Azure VM |
| Document Processing | Azure Document Intelligence, Text Analytics |
| Embeddings & LLM | Azure OpenAI (text-embedding-3-small, GPT-4.1-mini) |
| Database | Azure Cosmos DB (NoSQL, partition key: userId) |
| Search | Azure AI Search (hybrid BM25 + vector, RRF ranking) |
| AI Agents | Azure Foundry (PersonalAssistant, ResumeAgent) |
| Knowledge Graph | Graphiti + Neo4j AuraDB |
| Hosting | Netlify (frontend + functions), Azure VM (API) |

## Project Structure

```
openai-mll/
  frontend/
    src/
      App.js                # Login gate, header, tab routing
      AuthContext.js         # Firebase auth provider
      api.js                # apiFetch() with auto token attachment
      firebase.js           # Firebase config
      pages/
        MatchTab.jsx         # Resume upload, job matching, score breakdown
        ChatTab.jsx          # AI chat with model/agent selector
  backend/
    app.py                   # Local Flask proxy (port 5001)
    foundry_client.py        # Foundry agent clients
  netlify/
    functions/
      auth.mjs               # Firebase Admin SDK token verification
      vm-analyze.mjs         # Proxy: resume upload -> VM
      vm-documents.mjs       # Proxy: document CRUD -> VM
      vm-match-job.mjs       # Proxy: job matching -> VM
      chat.mjs               # Chat -> OpenAI / Foundry agents
      tailor-resume.mjs      # Resume tailoring -> ResumeAgent
  graphiti-setup.py          # Knowledge graph setup (resumes -> Neo4j)
  graphiti-add-jobs.py       # Add job descriptions to knowledge graph
  jobs.json                  # Job descriptions for graph import
  netlify.toml               # Build config + redirect rules
```

## Local Development

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Environment Variables

**Frontend** (`frontend/.env`):
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
```

**Backend** (`backend/.env`):
```
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
FOUNDRY_AGENT_ENDPOINT=
OPENAI_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

**Netlify** (set in site dashboard):
Same as backend vars plus `RESUME_AGENT_*` credentials.

## Knowledge Graph

Import resumes and job descriptions into Neo4j for entity/relationship visualization:

```bash
# Initial setup — import all resumes from Cosmos DB
python graphiti-setup.py

# Add job descriptions
python graphiti-add-jobs.py --file jobs.json
python graphiti-add-jobs.py --skip 2        # skip already-imported
python graphiti-add-jobs.py --interactive    # add one at a time
```

View the graph at [Neo4j Aura Console](https://console.neo4j.io) → Explore.
