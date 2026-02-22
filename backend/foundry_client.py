# foundry_client.py
import os
import requests
from azure.identity import ClientSecretCredential
from dotenv import load_dotenv

load_dotenv()


class FoundryClient:
    def __init__(self):
        self.client_id = os.getenv("AZURE_CLIENT_ID")
        self.client_secret = os.getenv("AZURE_CLIENT_SECRET")
        self.tenant_id = os.getenv("AZURE_TENANT_ID")
        self.agent_endpoint = os.getenv("FOUNDRY_AGENT_ENDPOINT")

        if not all([self.client_id, self.client_secret, self.tenant_id, self.agent_endpoint]):
            raise ValueError(
                "Missing Azure credentials. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, "
                "AZURE_TENANT_ID, and FOUNDRY_AGENT_ENDPOINT in .env"
            )

        self.credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret,
        )

    def _get_token(self):
        scope = "https://ai.azure.com/.default"
        token = self.credential.get_token(scope)
        return token.token

    def chat(self, message, conversation_history=None):
        """Send a message to the Foundry agent and return the response."""
        if conversation_history is None:
            conversation_history = []

        access_token = self._get_token()

        input_messages = [*conversation_history, {"role": "user", "content": message}]

        payload = {"input": input_messages}

        response = requests.post(
            self.agent_endpoint,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            json=payload,
        )

        if not response.ok:
            print(f"Foundry API error: {response.status_code} {response.text}")
            raise Exception(f"Foundry agent returned {response.status_code}: {response.text}")

        data = response.json()

        # Extract the assistant response
        assistant_message = ""

        if data.get("output_text"):
            assistant_message = data["output_text"]
        elif data.get("output") and isinstance(data["output"], list):
            for item in data["output"]:
                if item.get("type") == "message" and item.get("role") == "assistant":
                    content = item.get("content", [])
                    if isinstance(content, list):
                        for c in content:
                            if c.get("type") == "output_text" and c.get("text"):
                                assistant_message = c["text"]
                                break
                    else:
                        assistant_message = str(content)
                    break
        elif data.get("choices") and data["choices"][0].get("message", {}).get("content"):
            assistant_message = data["choices"][0]["message"]["content"]

        if not assistant_message:
            print(f"Could not extract response from Foundry: {data}")
            assistant_message = "I apologize, but I couldn't generate a response. Please try again."

        return assistant_message
