import os
import fitz  # PyMuPDF
from docx import Document
import json
from datetime import datetime
import hashlib

class FileUploader:
    def __init__(self, upload_folder="uploads"):
        self.upload_folder = upload_folder
        self.documents_db = "documents.json"
        self.ensure_upload_folder()
        self.load_documents_db()
    
    def ensure_upload_folder(self):
        """Create upload folder if it doesn't exist"""
        if not os.path.exists(self.upload_folder):
            os.makedirs(self.upload_folder)
    
    def load_documents_db(self):
        """Load or create documents database"""
        if os.path.exists(self.documents_db):
            with open(self.documents_db, 'r') as f:
                self.documents = json.load(f)
        else:
            self.documents = {}
    
    def save_documents_db(self):
        """Save documents database"""
        with open(self.documents_db, 'w') as f:
            json.dump(self.documents, f, indent=2)
    
    def extract_text_from_pdf(self, file_path):
        """Extract text from PDF file"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    def extract_text_from_docx(self, file_path):
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting text from DOCX: {str(e)}")
    
    def extract_text_from_txt(self, file_path):
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            raise Exception(f"Error reading text file: {str(e)}")
    
    def process_file(self, file_data, filename):
        """Process uploaded file and extract text content"""
        # Generate unique ID for the document
        file_hash = hashlib.md5(f"{filename}{datetime.now().isoformat()}".encode()).hexdigest()
        
        # Save file to upload folder
        file_path = os.path.join(self.upload_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Extract text based on file type
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            text_content = self.extract_text_from_pdf(file_path)
        elif file_extension == 'docx':
            text_content = self.extract_text_from_docx(file_path)
        elif file_extension in ['txt', 'csv']:
            text_content = self.extract_text_from_txt(file_path)
        else:
            raise Exception(f"Unsupported file type: {file_extension}")
        
        # Store document information
        document_info = {
            "id": file_hash,
            "filename": filename,
            "file_path": file_path,
            "file_type": file_extension,
            "upload_date": datetime.now().isoformat(),
            "content": text_content,
            "content_length": len(text_content)
        }
        
        self.documents[file_hash] = document_info
        self.save_documents_db()
        
        return document_info
    
    def get_document_content(self, document_id):
        """Get document content by ID"""
        if document_id in self.documents:
            return self.documents[document_id]["content"]
        return None
    
    def get_all_documents(self):
        """Get all uploaded documents"""
        return list(self.documents.values())
    
    def search_documents(self, query):
        """Search documents for specific content"""
        results = []
        query_lower = query.lower()
        
        for doc_id, doc_info in self.documents.items():
            if query_lower in doc_info["content"].lower():
                results.append({
                    "id": doc_id,
                    "filename": doc_info["filename"],
                    "content": doc_info["content"][:200] + "..." if len(doc_info["content"]) > 200 else doc_info["content"]
                })
        
        return results
    
    def delete_document(self, document_id):
        """Delete a document"""
        if document_id in self.documents:
            doc_info = self.documents[document_id]
            # Remove file
            if os.path.exists(doc_info["file_path"]):
                os.remove(doc_info["file_path"])
            # Remove from database
            del self.documents[document_id]
            self.save_documents_db()
            return True
        return False
