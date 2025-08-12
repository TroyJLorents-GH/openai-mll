# OpenAI MLL Project

A full-stack application with React frontend and Python Flask backend for OpenAI integration.

## Setup Instructions

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your actual OpenAI API key:
     ```
     OPENAI_API_KEY=your_actual_openai_api_key_here
     ```

5. **Run the backend:**
   ```bash
   python app.py
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## Important Security Notes

- **Never commit your `.env` file** - it contains sensitive API keys
- The `.env` file is already in `.gitignore` to prevent accidental commits
- If you accidentally commit an API key, immediately rotate it in your OpenAI account
- Use `.env.example` as a template for required environment variables

## Project Structure

```
openai-mll/
├── backend/          # Python Flask backend
│   ├── app.py       # Main Flask application
│   ├── .env         # Environment variables (not committed)
│   └── .env.example # Example environment file
└── frontend/        # React frontend
    ├── src/
    └── package.json
```
