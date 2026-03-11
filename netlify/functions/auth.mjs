import admin from "firebase-admin";

let initialized = false;

function initFirebase() {
  if (initialized) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  initialized = true;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns userId (Firebase UID) on success, or an error response object.
 */
export async function verifyToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: "Missing authorization token" }) } };
  }

  try {
    initFirebase();
    const decoded = await admin.auth().verifyIdToken(token);
    return { userId: decoded.uid };
  } catch (err) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: "Invalid token", detail: err.message }) } };
  }
}
