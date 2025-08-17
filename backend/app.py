# app.py
from flask import Flask, request, jsonify
from chat_service import handle_chat
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  

print("START OF APP.PY")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    prompt = data.get("message")
    model = data.get("model", "gpt-4o") 

    if not prompt:
        return jsonify({"error": "No message provided."}), 400

    response = handle_chat(prompt, model)
    return jsonify({"response": response})

if __name__ == "__main__":
    print("ABOUT TO RUN FLASK")
    app.run(debug=True, port=5001)
