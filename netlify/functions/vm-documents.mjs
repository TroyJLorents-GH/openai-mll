import { verifyToken } from "./auth.mjs";

const VM_API = "http://52.233.82.247:5000";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const auth = await verifyToken(event);
  if (auth.error) return { ...auth.error, headers };

  try {
    // Extract document ID from path — try both rewritten and original paths
    const rawPath = event.rawUrl || event.path || "";
    let documentId = null;

    // Match UUID pattern in the path
    const uuidMatch = rawPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) {
      documentId = uuidMatch[1];
    }

    if (event.httpMethod === "DELETE" && documentId) {
      const resp = await fetch(`${VM_API}/documents/${documentId}?userId=${auth.userId}`, { method: "DELETE" });
      const data = await resp.text();
      return { statusCode: resp.status, headers, body: data };
    }

    if (event.httpMethod === "GET" && documentId) {
      const resp = await fetch(`${VM_API}/documents/${documentId}?userId=${auth.userId}`);
      const data = await resp.text();
      return { statusCode: resp.status, headers, body: data };
    }

    // GET all documents
    const resp = await fetch(`${VM_API}/documents?userId=${auth.userId}`);
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
