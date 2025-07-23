import React, { useState, useRef, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    // Example message for layout
    // { role: "assistant", content: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag & drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e) => e.preventDefault();

  // Send message
  const sendMessage = async () => {
    if (!input && !file) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input, fileName: file?.name }
    ]);
    // Reset input and file
    setInput("");
    setFile(null);

    // --- Send to backend ---
    // Here you would use FormData to send message/file to your backend API
    // Skipping actual API call for now, but you can plug it in!

    // Simulate AI response:
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "This is a placeholder response." }
      ]);
    }, 700);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f3f5fa" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: "#fff",
          borderRight: "1px solid #eee",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: "1.3rem" }}>Chat History</h2>
        <div style={{ flex: 1, marginTop: "2rem", color: "#888", fontSize: "1rem" }}>
          {/* Add chat history here */}
          <p>No saved chats yet.</p>
        </div>
      </aside>

      {/* Main chat area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Chat messages */}
        <div
          style={{
            flex: 1,
            padding: "2rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "0.8rem"
              }}
            >
              <div
                style={{
                  background: msg.role === "user" ? "#5a98f2" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#333",
                  borderRadius: 10,
                  padding: "0.85rem 1.3rem",
                  maxWidth: 420,
                  boxShadow: "0 1px 3px 0 #c9d3ea1a"
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  {msg.role === "user" ? "You" : "AI"}:{" "}
                </span>
                {msg.content}
                {msg.fileName && (
                  <div style={{ fontSize: "0.85em", opacity: 0.7 }}>
                    <span role="img" aria-label="file">📎</span> {msg.fileName}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "1.2rem 2rem",
            background: "#fff",
            borderTop: "1px solid #eee"
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Upload icon */}
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 24,
              marginRight: 12,
              color: file ? "#3c82f6" : "#888"
            }}
            title="Attach a file"
            onClick={() => fileInputRef.current.click()}
            tabIndex={-1}
          >
            📎
          </button>
          <input
            type="file"
            accept=".pdf,.docx,.csv,.xlsx"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={e => setFile(e.target.files[0])}
          />
          <input
            type="text"
            placeholder={
              file
                ? `File ready: ${file.name} (add a question, then send)`
                : "Type your question, drag a file, or click the paperclip…"
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1,
              border: "1px solid #c9d3ea",
              borderRadius: 8,
              padding: "0.7rem 1rem",
              marginRight: 14,
              fontSize: 16
            }}
            autoFocus
          />
          <button
            type="submit"
            style={{
              background: "#3c82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.8rem 1.8rem",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
