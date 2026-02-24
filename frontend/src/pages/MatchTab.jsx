import React, { useState, useRef } from "react";
import {
  Box, Typography, Button, TextField, Paper, Chip, Alert, IconButton,
  LinearProgress, List, ListItem, ListItemText, ListItemSecondaryAction,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import WorkIcon from "@mui/icons-material/Work";

const API = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5001";

export default function MatchTab({ vmResumes, refreshVmResumes }) {
  const [jobDescription, setJobDescription] = useState("");
  const [matchResults, setMatchResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Upload to VM API for Doc Intelligence analysis
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch(`${API}/vm/analyze`, { method: "POST", body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");

      // Also upload to local backend for chat context
      const localForm = new FormData();
      localForm.append("file", file);
      await fetch(`${API}/upload`, { method: "POST", body: localForm });

      await refreshVmResumes();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/vm/documents/${id}`, { method: "DELETE" });
      await refreshVmResumes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMatch = async () => {
    if (!jobDescription.trim()) return;
    setMatching(true);
    setError("");
    setMatchResults(null);
    try {
      const resp = await fetch(`${API}/vm/match-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Matching failed");
      setMatchResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "auto", p: 3 }}>
      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        {/* Left panel: Upload + Resume list */}
        <Paper sx={{ width: 340, p: 2, flexShrink: 0, position: "sticky", top: 0 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Resumes
          </Typography>

          <input
            type="file"
            accept=".pdf,.docx,.txt"
            hidden
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{ mb: 2 }}
            fullWidth
          >
            {uploading ? "Analyzing..." : "Upload Resume"}
          </Button>

          {vmResumes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
              No resumes uploaded yet.
            </Typography>
          ) : (
            <List dense>
              {vmResumes.map((doc) => (
                <ListItem key={doc.id} sx={{ borderRadius: 1, mb: 0.5, bgcolor: "background.default" }}>
                  <ListItemText
                    primary={doc.filename || doc.name || doc.id}
                    secondary={doc.uploadedAt ? `Analyzed ${new Date(doc.uploadedAt).toLocaleDateString()}` : null}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small" onClick={() => handleDelete(doc.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Right panel: Job description + Results */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Job Description
            </Typography>
            <TextField
              multiline
              minRows={4}
              maxRows={8}
              fullWidth
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={matching ? <CircularProgress size={18} color="inherit" /> : <WorkIcon />}
              onClick={handleMatch}
              disabled={matching || !jobDescription.trim() || vmResumes.length === 0}
            >
              {matching ? "Matching..." : "Match Resumes"}
            </Button>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {matching && <LinearProgress sx={{ mb: 2 }} />}

          {/* Results */}
          {matchResults && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Top-level recommendation */}
              {matchResults.recommendation && (
                <Alert
                  severity={
                    matchResults.matches?.[0]?.confidence >= 75 ? "success"
                    : matchResults.matches?.[0]?.confidence >= 50 ? "info"
                    : "warning"
                  }
                >
                  {matchResults.recommendation}
                </Alert>
              )}

              {matchResults.jobRequirements?.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Job Requirements Extracted ({matchResults.jobRequirements.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {matchResults.jobRequirements.map((req, i) => (
                      <Chip key={i} label={req} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Paper>
              )}

              {(matchResults.matches || []).map((result, idx) => (
                <Paper key={idx} sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {result.filename || `Resume ${idx + 1}`}
                    </Typography>
                    <Chip
                      label={`${result.confidence}% Match`}
                      color={
                        result.confidence >= 75 ? "success"
                        : result.confidence >= 50 ? "warning"
                        : "error"
                      }
                      sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                    />
                  </Box>

                  {result.skillMatchPercent != null && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Skill Match: {result.skillMatchPercent}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={result.skillMatchPercent}
                        sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                      />
                    </Box>
                  )}

                  {result.matchedSkills?.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Matched Skills
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {result.matchedSkills.map((skill, i) => (
                          <Chip key={i} label={skill} size="small" color="success" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {result.missingSkills?.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Missing Skills
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {result.missingSkills.map((skill, i) => (
                          <Chip key={i} label={skill} size="small" color="warning" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
