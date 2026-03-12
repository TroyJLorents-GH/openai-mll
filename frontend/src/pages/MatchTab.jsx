import React, { useState, useRef } from "react";
import {
  Box, Typography, Button, TextField, Paper, Chip, Alert, IconButton,
  LinearProgress, List, ListItem, ListItemText, ListItemSecondaryAction,
  CircularProgress, Collapse, useMediaQuery, useTheme,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import WorkIcon from "@mui/icons-material/Work";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch } from "../api";

const API = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5001";

export default function MatchTab({ vmResumes, refreshVmResumes }) {
  const [jobDescription, setJobDescription] = useState("");
  const [matchResults, setMatchResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");
  const [tailoring, setTailoring] = useState({});
  const [tailorResults, setTailorResults] = useState({});
  const [tailorExpanded, setTailorExpanded] = useState({});
  const [detailsExpanded, setDetailsExpanded] = useState({});
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await apiFetch(`${API}/vm/analyze`, { method: "POST", body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");

      const localForm = new FormData();
      localForm.append("file", file);
      await apiFetch(`${API}/upload`, { method: "POST", body: localForm });

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
      await apiFetch(`${API}/vm/documents/${id}`, { method: "DELETE" });
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
      const resp = await apiFetch(`${API}/vm/match-job`, {
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

  const handleTailor = async (result) => {
    const docId = result.documentId;
    setTailoring((prev) => ({ ...prev, [docId]: true }));
    setError("");
    try {
      const docResp = await apiFetch(`${API}/vm/documents/${docId}`);
      const docData = await docResp.json();
      if (!docResp.ok) throw new Error(docData.error || "Failed to fetch resume");
      const resumeText = docData.fullText || docData.extractedText || "";
      if (!resumeText) throw new Error("No resume text found for this document");

      const resp = await apiFetch(`${API}/tailor-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          matchedSkills: result.matchedSkills || [],
          missingSkills: result.missingSkills || [],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Tailoring failed");

      setTailorResults((prev) => ({ ...prev, [docId]: data.suggestions }));
      setTailorExpanded((prev) => ({ ...prev, [docId]: true }));
    } catch (err) {
      setError(`Tailor error: ${err.message}`);
    } finally {
      setTailoring((prev) => ({ ...prev, [docId]: false }));
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "auto", p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: { xs: 2, sm: 3 },
        alignItems: "flex-start",
      }}>
        {/* Left panel: Upload + Resume list */}
        <Paper sx={{
          width: isMobile ? "100%" : 340,
          p: 2,
          flexShrink: 0,
          position: isMobile ? "static" : "sticky",
          top: 0,
        }}>
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
                    primaryTypographyProps={{ noWrap: true, fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
        <Box sx={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Job Description
            </Typography>
            <TextField
              multiline
              minRows={3}
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
              fullWidth={isMobile}
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
                  <Box sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                    flexWrap: "wrap",
                    gap: 1,
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>
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

                  {/* Score Breakdown toggle */}
                  <Box sx={{ mt: 1.5, mb: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<InfoOutlinedIcon />}
                      endIcon={detailsExpanded[result.documentId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() =>
                        setDetailsExpanded((prev) => ({
                          ...prev,
                          [result.documentId]: !prev[result.documentId],
                        }))
                      }
                      sx={{ textTransform: "none", color: "text.secondary" }}
                    >
                      Score Breakdown
                    </Button>
                    <Collapse in={!!detailsExpanded[result.documentId]}>
                      <Paper variant="outlined" sx={{ mt: 1, p: 2, bgcolor: "grey.50" }}>
                        <Box sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                          gap: 2,
                          mb: 2,
                        }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">AI Search Score (RRF)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {result.searchScore ?? "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Hybrid BM25 + Vector
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Confidence</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: result.confidence >= 75 ? "success.main" : result.confidence >= 50 ? "warning.main" : "error.main" }}>
                              {result.confidence}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Normalized from RRF
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Skill Match</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: result.skillMatchPercent >= 75 ? "success.main" : result.skillMatchPercent >= 50 ? "warning.main" : "error.main" }}>
                              {result.skillMatchPercent}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {result.matchedSkills?.length || 0}/{(result.matchedSkills?.length || 0) + (result.missingSkills?.length || 0)} requirements
                            </Typography>
                          </Box>
                        </Box>

                        {result.resumeKeyPhrases?.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                              Resume Key Phrases ({result.resumeKeyPhrases.length})
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {result.resumeKeyPhrases.map((phrase, i) => (
                                <Chip key={i} label={phrase} size="small" variant="outlined" sx={{ fontSize: "0.75rem" }} />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    </Collapse>
                  </Box>

                  {/* Tailor Resume button */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={
                        tailoring[result.documentId]
                          ? <CircularProgress size={16} color="inherit" />
                          : <AutoFixHighIcon />
                      }
                      onClick={() => handleTailor(result)}
                      disabled={!!tailoring[result.documentId]}
                    >
                      {tailoring[result.documentId] ? "Tailoring..." : "Tailor Resume"}
                    </Button>
                    {tailorResults[result.documentId] && (
                      <IconButton
                        size="small"
                        onClick={() =>
                          setTailorExpanded((prev) => ({
                            ...prev,
                            [result.documentId]: !prev[result.documentId],
                          }))
                        }
                      >
                        {tailorExpanded[result.documentId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>

                  {/* Tailor results */}
                  <Collapse in={!!tailorExpanded[result.documentId]}>
                    {tailorResults[result.documentId] && (
                      <Paper
                        variant="outlined"
                        sx={{
                          mt: 2,
                          p: 2,
                          bgcolor: "background.default",
                          "& h1, & h2, & h3, & h4": { color: "secondary.main", mt: 1, mb: 0.5 },
                          "& ul, & ol": { pl: 2 },
                          "& li": { mb: 0.5 },
                          "& strong": { color: "primary.main" },
                        }}
                      >
                        <Typography variant="subtitle2" color="secondary" sx={{ mb: 1, fontWeight: 700 }}>
                          ResumeAgent Suggestions
                        </Typography>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {tailorResults[result.documentId]}
                        </ReactMarkdown>
                      </Paper>
                    )}
                  </Collapse>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
