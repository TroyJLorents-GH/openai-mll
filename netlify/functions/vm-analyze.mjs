const VM_API = "http://52.233.82.247:5000";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    // Parse multipart form data to extract file
    const contentType = event.headers["content-type"] || "";
    const boundary = contentType.split("boundary=")[1];

    if (!boundary) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No multipart boundary found" }) };
    }

    // Decode body
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

    // Forward the raw multipart data to the VM API
    const resp = await fetch(`${VM_API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: bodyBuffer,
    });
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
