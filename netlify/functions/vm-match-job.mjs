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
    const resp = await fetch(`${VM_API}/match-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body,
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
