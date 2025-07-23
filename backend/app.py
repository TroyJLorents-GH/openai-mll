# app.py
from flask import Flask, request, jsonify
from chat_service import handle_chat

print("START OF APP.PY")


app = Flask(__name__)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    prompt = data.get("message")

    if not prompt:
        return jsonify({"error": "No message provided."}), 400

    response = handle_chat(prompt)
    return jsonify({"response": response})

if __name__ == "__main__":
    print("ABOUT TO RUN FLASK")

    app.run(debug=True)
