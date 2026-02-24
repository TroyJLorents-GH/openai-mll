const VM_API = "http://52.233.82.247:5000";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  try {
    // Extract document ID from path if present
    const pathParts = event.path.replace("/.netlify/functions/vm-documents", "").split("/").filter(Boolean);
    const documentId = pathParts[0] || null;

    if (event.httpMethod === "DELETE" && documentId) {
      const resp = await fetch(`${VM_API}/documents/${documentId}`, { method: "DELETE" });
      const data = await resp.text();
      return { statusCode: resp.status, headers, body: data };
    }

    // GET all documents
    const resp = await fetch(`${VM_API}/documents`);
    const data = await resp.text();
    return { statusCode: resp.status, headers, body: data };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "VM API is unreachable", details: err.message }),
    };
  }
};
