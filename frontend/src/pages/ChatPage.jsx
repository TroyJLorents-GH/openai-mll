import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [model, setModel] = useState("gpt-4o");

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

  // Start a new chat
  const startNewChat = () => {
    // Save current chat to history if it has messages
    if (messages.length > 0) {
      const chatTitle = messages[0]?.content?.substring(0, 50) + (messages[0]?.content?.length > 50 ? "..." : "");
      const newChat = {
        id: currentChatId || Date.now(),
        title: chatTitle,
        messages: [...messages],
        timestamp: new Date().toLocaleString()
      };
      
      setChatHistory(prev => {
        const existingIndex = prev.findIndex(chat => chat.id === currentChatId);
        if (existingIndex >= 0) {
          // Update existing chat
          const updated = [...prev];
          updated[existingIndex] = newChat;
          return updated;
        } else {
          // Add new chat
          return [...prev, newChat];
        }
      });
    }
    
    // Clear current chat
    setMessages([]);
    setCurrentChatId(Date.now());
  };

  // Load a chat from history
  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
    }
  };

  // Send message
 const sendMessage = async () => {
  if (!input && !file) return;

  setMessages((prev) => [
    ...prev,
    { role: "user", content: input, fileName: file?.name }
  ]);
  setInput("");
  setFile(null);

  // --- Send to backend ---
  try {
    const response = await fetch("http://localhost:5001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, model }),
    });
    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.response }
    ]);
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Error talking to backend." }
    ]);
  }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.3rem" }}>Chat History</h2>
          <button
            onClick={startNewChat}
            style={{
              background: "#5a98f2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: "500"
            }}
            title="Start a new chat"
          >
            New Chat
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto" }}>
          {chatHistory.length === 0 ? (
            <p style={{ color: "#888", fontSize: "1rem", textAlign: "center", marginTop: "2rem" }}>
              No saved chats yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: currentChatId === chat.id ? "#f0f4ff" : "transparent",
                    border: currentChatId === chat.id ? "1px solid #5a98f2" : "1px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (currentChatId !== chat.id) {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentChatId !== chat.id) {
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div style={{ fontWeight: "500", fontSize: "0.9rem", color: "#333", marginBottom: "0.25rem" }}>
                    {chat.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>
                    {chat.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  maxWidth: msg.role === "assistant" ? 600 : 420,
                  minWidth: 200,
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  boxShadow: "0 1px 3px 0 #c9d3ea1a"
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  {msg.role === "user" ? "You" : "AI"}:{" "}
                </span>
                {msg.role === "assistant" ? (
                  <div style={{ wordWrap: "break-word", overflowWrap: "break-word" }}>
                    <ReactMarkdown 
                      components={{
                        h1: ({children, ...props}) => <h1 style={{fontSize: '1.5em', margin: '0.5em 0', fontWeight: 'bold', wordWrap: 'break-word'}} {...props}>{children}</h1>,
                        h2: ({children, ...props}) => <h2 style={{fontSize: '1.3em', margin: '0.4em 0', fontWeight: 'bold', wordWrap: 'break-word'}} {...props}>{children}</h2>,
                        h3: ({children, ...props}) => <h3 style={{fontSize: '1.1em', margin: '0.3em 0', fontWeight: 'bold', wordWrap: 'break-word'}} {...props}>{children}</h3>,
                        p: ({children, ...props}) => <p style={{margin: '0.3em 0', wordWrap: 'break-word'}} {...props}>{children}</p>,
                        ul: ({children, ...props}) => <ul style={{margin: '0.3em 0', paddingLeft: '1.5em', wordWrap: 'break-word'}} {...props}>{children}</ul>,
                        ol: ({children, ...props}) => <ol style={{margin: '0.3em 0', paddingLeft: '1.5em', wordWrap: 'break-word'}} {...props}>{children}</ol>,
                        li: ({children, ...props}) => <li style={{margin: '0.2em 0', wordWrap: 'break-word'}} {...props}>{children}</li>,
                        strong: ({children, ...props}) => <strong style={{fontWeight: 'bold'}} {...props}>{children}</strong>,
                        em: ({children, ...props}) => <em style={{fontStyle: 'italic'}} {...props}>{children}</em>,
                        code: ({children, ...props}) => <code style={{backgroundColor: '#f1f3f4', padding: '0.2em 0.4em', borderRadius: '3px', fontSize: '0.9em', wordWrap: 'break-word'}} {...props}>{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
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

          {/* 🔽 Model selector */}
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)} 
            style={{ marginRight: "10px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #c9d3ea" }}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option Value="gpt-5">GPT-5 (if available)</option>
          </select>

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
