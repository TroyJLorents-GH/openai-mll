import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Box, Paper, Typography, Button, TextField, Select, MenuItem, IconButton,
  List, ListItem, ListItemText, Chip, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

const API = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5001";

export default function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [model, setModel] = useState("gpt-4o");
  const [mode, setMode] = useState("general");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API}/documents`);
      const data = await response.json();
      if (data.documents) setDocuments(data.documents);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const uploadFile = async (fileToUpload) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const response = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await response.json();
      if (data.success) {
        await loadDocuments();
        return data.document_id;
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      try {
        const documentId = await uploadFile(droppedFile);
        setSelectedDocuments((prev) => [...prev, documentId]);
        setFile(null);
      } catch (error) {
        alert(`Upload failed: ${error.message}`);
        setFile(null);
      }
    }
  };
  const handleDragOver = (e) => e.preventDefault();

  const startNewChat = () => {
    if (messages.length > 0) {
      const chatTitle = messages[0]?.content?.substring(0, 50) + (messages[0]?.content?.length > 50 ? "..." : "");
      const newChat = {
        id: currentChatId || Date.now(),
        title: chatTitle,
        messages: [...messages],
        timestamp: new Date().toLocaleString(),
      };
      setChatHistory((prev) => {
        const idx = prev.findIndex((c) => c.id === currentChatId);
        if (idx >= 0) { const u = [...prev]; u[idx] = newChat; return u; }
        return [...prev, newChat];
      });
    }
    setMessages([]);
    setCurrentChatId(Date.now());
    setSelectedDocuments([]);
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) { setMessages(chat.messages); setCurrentChatId(chat.id); }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const documentId = await uploadFile(selectedFile);
        setSelectedDocuments((prev) => [...prev, documentId]);
        setFile(null);
      } catch (error) {
        alert(`Upload failed: ${error.message}`);
        setFile(null);
      }
    }
  };

  const sendMessage = async () => {
    if (!input && !file) return;
    setMessages((prev) => [...prev, { role: "user", content: input, fileName: file?.name }]);
    const currentInput = input;
    setInput("");
    setFile(null);
    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, model, mode, document_ids: selectedDocuments }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error talking to backend." }]);
    }
  };

  const removeDocument = (docId) => setSelectedDocuments((prev) => prev.filter((id) => id !== docId));

  const deleteDocument = async (documentId) => {
    try {
      const response = await fetch(`${API}/documents/${documentId}`, { method: "DELETE" });
      if (response.ok) {
        await loadDocuments();
        setSelectedDocuments((prev) => prev.filter((id) => id !== documentId));
      } else { alert("Failed to delete document"); }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Error deleting document");
    }
  };

  // Markdown components for dark theme
  const mdComponents = {
    h1: ({ children, ...p }) => <Typography variant="h5" sx={{ my: 0.5, fontWeight: "bold" }} {...p}>{children}</Typography>,
    h2: ({ children, ...p }) => <Typography variant="h6" sx={{ my: 0.4, fontWeight: "bold" }} {...p}>{children}</Typography>,
    h3: ({ children, ...p }) => <Typography variant="subtitle1" sx={{ my: 0.3, fontWeight: "bold" }} {...p}>{children}</Typography>,
    p: ({ children, ...p }) => <Typography variant="body1" sx={{ my: 0.3 }} {...p}>{children}</Typography>,
    ul: ({ children, ...p }) => <Box component="ul" sx={{ my: 0.3, pl: 3 }} {...p}>{children}</Box>,
    ol: ({ children, ...p }) => <Box component="ol" sx={{ my: 0.3, pl: 3 }} {...p}>{children}</Box>,
    li: ({ children, ...p }) => <Box component="li" sx={{ my: 0.2 }} {...p}>{children}</Box>,
    strong: ({ children, ...p }) => <Box component="strong" sx={{ fontWeight: "bold" }} {...p}>{children}</Box>,
    em: ({ children, ...p }) => <Box component="em" sx={{ fontStyle: "italic" }} {...p}>{children}</Box>,
    code: ({ children, ...p }) => (
      <Box component="code" sx={{ bgcolor: "rgba(255,255,255,0.08)", px: 0.5, py: 0.2, borderRadius: 0.5, fontSize: "0.9em" }} {...p}>
        {children}
      </Box>
    ),
    table: ({ children }) => (
      <TableContainer sx={{ my: 1 }}>
        <Table size="small">{children}</Table>
      </TableContainer>
    ),
    thead: ({ children }) => <TableHead>{children}</TableHead>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => <TableCell sx={{ fontWeight: 700, borderColor: "divider" }}>{children}</TableCell>,
    td: ({ children }) => <TableCell sx={{ borderColor: "divider" }}>{children}</TableCell>,
  };

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <Paper
        sx={{
          width: 260,
          borderRadius: 0,
          borderRight: 1,
          borderColor: "divider",
          p: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Chat History</Typography>
          <IconButton color="primary" onClick={startNewChat} title="New Chat" size="small">
            <AddIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {chatHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
              No saved chats yet.
            </Typography>
          ) : (
            <List dense disablePadding>
              {chatHistory.map((chat) => (
                <ListItem
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: "pointer",
                    bgcolor: currentChatId === chat.id ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemText
                    primary={chat.title}
                    secondary={chat.timestamp}
                    primaryTypographyProps={{ noWrap: true, fontSize: "0.9rem", fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Documents */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Documents</Typography>
          <Box sx={{ maxHeight: 200, overflow: "auto" }}>
            {documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                No documents uploaded.
              </Typography>
            ) : (
              <List dense disablePadding>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    onClick={() => {
                      if (selectedDocuments.includes(doc.id)) removeDocument(doc.id);
                      else setSelectedDocuments((prev) => [...prev, doc.id]);
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      cursor: "pointer",
                      border: 1,
                      borderColor: selectedDocuments.includes(doc.id) ? "primary.main" : "divider",
                      bgcolor: selectedDocuments.includes(doc.id) ? "rgba(99,102,241,0.1)" : "transparent",
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={doc.filename}
                      secondary={`${doc.content_length} chars`}
                      primaryTypographyProps={{ fontSize: "0.8rem", fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: "0.7rem" }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main chat area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Selected docs banner */}
        {selectedDocuments.length > 0 && (
          <Box sx={{ px: 2, py: 1, bgcolor: "rgba(99,102,241,0.1)", borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Using:</Typography>
            {selectedDocuments.map((docId) => {
              const doc = documents.find((d) => d.id === docId);
              return doc ? (
                <Chip
                  key={docId}
                  label={doc.filename}
                  size="small"
                  color="primary"
                  onDelete={() => removeDocument(docId)}
                />
              ) : null;
            })}
          </Box>
        )}

        {/* Messages */}
        <Box sx={{ flex: 1, p: 2, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", mb: 1 }}
            >
              <Paper
                sx={{
                  px: 2,
                  py: 1.2,
                  maxWidth: msg.role === "assistant" ? 800 : 420,
                  minWidth: 200,
                  bgcolor: msg.role === "user" ? "primary.main" : "background.paper",
                  color: msg.role === "user" ? "primary.contrastText" : "text.primary",
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.3 }}>
                  {msg.role === "user" ? "You" : "AI"}
                </Typography>
                {msg.role === "assistant" ? (
                  <Box sx={{ wordBreak: "break-word" }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>
                  </Box>
                ) : (
                  <Typography variant="body2">{msg.content}</Typography>
                )}
                {msg.fileName && (
                  <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mt: 0.5 }}>
                    Attached: {msg.fileName}
                  </Typography>
                )}
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input row */}
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <input type="file" accept=".pdf,.docx,.csv,.xlsx,.txt" hidden ref={fileInputRef} onChange={handleFileSelect} />
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            color={file ? "primary" : "default"}
            title="Attach a file"
          >
            {isUploading ? <HourglassEmptyIcon /> : <AttachFileIcon />}
          </IconButton>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Model</InputLabel>
            <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
              <MenuItem value="PersonalAssistant" sx={{ color: "#a78bfa" }}>PersonalAssistant</MenuItem>
              <MenuItem value="gpt-4o">GPT-4o</MenuItem>
              <MenuItem value="gpt-4o-mini">GPT-4o Mini</MenuItem>
              <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
              <MenuItem value="gpt-5">GPT-5</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Mode</InputLabel>
            <Select value={mode} label="Mode" onChange={(e) => setMode(e.target.value)}>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="code">Code</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            placeholder={
              file
                ? `File ready: ${file.name} (add a question, then send)`
                : "Type your question, drag a file, or click the paperclip..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isUploading}
            autoFocus
          />

          <Button
            type="submit"
            variant="contained"
            endIcon={<SendIcon />}
            disabled={isUploading}
            sx={{ whiteSpace: "nowrap" }}
          >
            {isUploading ? "Uploading..." : "Send"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
