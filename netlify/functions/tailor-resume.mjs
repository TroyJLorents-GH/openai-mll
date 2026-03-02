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
    const { resumeText, jobDescription, matchedSkills = [], missingSkills = [] } = JSON.parse(event.body || "{}");

    if (!resumeText || !jobDescription) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "resumeText and jobDescription are required" }) };
    }

    // Call ResumeAgent via Foundry
    const { ClientSecretCredential } = await import("@azure/identity");

    const credential = new ClientSecretCredential(
      process.env.RESUME_AGENT_TENANT_ID,
      process.env.RESUME_AGENT_CLIENT_ID,
      process.env.RESUME_AGENT_CLIENT_SECRET
    );

    const token = await credential.getToken("https://ai.azure.com/.default");

    const prompt =
      `TAILOR MODE\n\n` +
      `Job Description:\n${jobDescription}\n\n` +
      `My Resume:\n${resumeText}\n\n` +
      `Matched Skills: ${matchedSkills.join(", ")}\n` +
      `Missing/Weak Skills: ${missingSkills.join(", ")}\n\n` +
      `Give me your top 3-5 highest-impact changes to tailor this resume for this job.`;

    const resp = await fetch(process.env.RESUME_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.token}`,
      },
      body: JSON.stringify({ input: [{ role: "user", content: prompt }] }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`ResumeAgent returned ${resp.status}: ${errText}`);
    }

    const data = await resp.json();

    // Extract response
    let suggestions = "";
    if (data.output_text) {
      suggestions = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && item.role === "assistant") {
          const content = item.content || [];
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === "output_text" && c.text) {
                suggestions = c.text;
                break;
              }
            }
          } else {
            suggestions = String(content);
          }
          break;
        }
      }
    } else if (data.choices?.[0]?.message?.content) {
      suggestions = data.choices[0].message.content;
    }

    if (!suggestions) {
      suggestions = "ResumeAgent did not return a response. Please try again.";
    }

    return { statusCode: 200, headers, body: JSON.stringify({ suggestions }) };
  } catch (err) {
    console.error("Tailor error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
