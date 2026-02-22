# app.py
from flask import Flask, request, jsonify, Response
from chat_service import handle_chat
from file_uploader import FileUploader
from flask_cors import CORS
import os
import requests

VM_API_BASE = "http://52.233.82.247:5000"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  

print("START OF APP.PY")

# Initialize file uploader
file_uploader = FileUploader()

@app.route("/upload", methods=["POST"])
def upload_file():
    """Handle file uploads"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Read file data
        file_data = file.read()
        
        # Process the file
        document_info = file_uploader.process_file(file_data, file.filename)
        
        return jsonify({
            "success": True,
            "message": f"File '{file.filename}' uploaded and processed successfully",
            "document_id": document_info["id"],
            "filename": document_info["filename"],
            "content_length": document_info["content_length"]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/documents", methods=["GET"])
def get_documents():
    """Get all uploaded documents"""
    try:
        documents = file_uploader.get_all_documents()
        return jsonify({"documents": documents})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/documents/<document_id>", methods=["GET"])
def get_document(document_id):
    """Get specific document content"""
    try:
        content = file_uploader.get_document_content(document_id)
        if content:
            return jsonify({"content": content})
        else:
            return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/documents/<document_id>", methods=["DELETE"])
def delete_document(document_id):
    """Delete a document"""
    try:
        success = file_uploader.delete_document(document_id)
        if success:
            return jsonify({"message": "Document deleted successfully"})
        else:
            return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        prompt = data.get("message")
        model = data.get("model", "gpt-4o")
        mode = data.get("mode", "general")
        document_ids = data.get("document_ids", [])  # List of document IDs to include

        if not prompt:
            return jsonify({"error": "No message provided."}), 400

        # Basic logging for debugging
        print(f"/chat called model={model} mode={mode} doc_ids={len(document_ids)}")

        # Get document content if document IDs are provided
        document_context = ""
        if document_ids:
            for doc_id in document_ids:
                content = file_uploader.get_document_content(doc_id)
                if content:
                    document_context += f"\n\nDocument content:\n{content}\n"

        # Include document context in the prompt if available
        if document_context:
            enhanced_prompt = f"Context from uploaded documents:{document_context}\n\nUser question: {prompt}"
        else:
            enhanced_prompt = prompt

        response = handle_chat(enhanced_prompt, model, mode)
        return jsonify({"response": response})
    except Exception as e:
        # Return JSON error so the frontend sees a reason
        print(f"/chat error: {e}")
        return jsonify({"error": "Chat failed", "detail": str(e)}), 500

# ── VM API proxy routes ──────────────────────────────────────────────

@app.route("/vm/analyze", methods=["POST"])
def vm_analyze():
    """Proxy resume upload to VM API for Doc Intelligence analysis."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        resp = requests.post(
            f"{VM_API_BASE}/analyze",
            files={"file": (file.filename, file.read(), file.content_type)},
            timeout=120,
        )
        return Response(resp.content, status=resp.status_code,
                        content_type=resp.headers.get("Content-Type", "application/json"))
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "VM API is unreachable"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/vm/match-job", methods=["POST"])
def vm_match_job():
    """Proxy job-description matching to VM API."""
    try:
        resp = requests.post(
            f"{VM_API_BASE}/match-job",
            json=request.get_json(),
            timeout=120,
        )
        return Response(resp.content, status=resp.status_code,
                        content_type=resp.headers.get("Content-Type", "application/json"))
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "VM API is unreachable"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/vm/documents", methods=["GET"])
def vm_documents():
    """Proxy resume list from Cosmos DB via VM API."""
    try:
        resp = requests.get(f"{VM_API_BASE}/documents", timeout=30)
        return Response(resp.content, status=resp.status_code,
                        content_type=resp.headers.get("Content-Type", "application/json"))
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "VM API is unreachable"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/vm/documents/<document_id>", methods=["DELETE"])
def vm_delete_document(document_id):
    """Proxy resume deletion to VM API."""
    try:
        resp = requests.delete(f"{VM_API_BASE}/documents/{document_id}", timeout=30)
        return Response(resp.content, status=resp.status_code,
                        content_type=resp.headers.get("Content-Type", "application/json"))
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "VM API is unreachable"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("ABOUT TO RUN FLASK")
    app.run(debug=True, port=5001)
