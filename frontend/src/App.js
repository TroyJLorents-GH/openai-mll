import React, { useState, useEffect, useCallback } from "react";
import { Box, Tabs, Tab, Typography, Button, Avatar, CircularProgress, IconButton, useMediaQuery, useTheme } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import LogoutIcon from "@mui/icons-material/Logout";
import MatchTab from "./pages/MatchTab";
import ChatTab from "./pages/ChatTab";
import { useAuth } from "./AuthContext";
import { apiFetch, setTokenProvider } from "./api";

const API = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5001";

export default function App() {
  const [tab, setTab] = useState(0);
  const [vmResumes, setVmResumes] = useState([]);
  const { user, loading, login, logout, getToken } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Wire up apiFetch with the token provider
  useEffect(() => {
    setTokenProvider(getToken);
  }, [getToken]);

  const refreshVmResumes = useCallback(async () => {
    try {
      const resp = await apiFetch(`${API}/vm/documents`);
      const data = await resp.json();
      const docs = Array.isArray(data.documents) ? data.documents : Array.isArray(data) ? data : [];
      setVmResumes(docs);
    } catch (err) {
      console.error("Failed to load VM resumes:", err);
    }
  }, []);

  useEffect(() => {
    if (user) refreshVmResumes();
  }, [user, refreshVmResumes]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Login gate
  if (!user) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 3,
          px: 2,
        }}
      >
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, letterSpacing: "-0.02em", textAlign: "center" }}>
          Resume Match{" "}
          <Box component="span" sx={{ color: "primary.main" }}>AI</Box>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
          Sign in to manage your resumes and match them to jobs.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={login}
          sx={{ textTransform: "none", px: 4, py: 1.5 }}
        >
          Sign in with Google
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          Resume Match{" "}
          <Box component="span" sx={{ color: "primary.main" }}>AI</Box>
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 2 } }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
            <Tab label="Match" sx={{ minWidth: isMobile ? 48 : 90, px: isMobile ? 1 : 2 }} />
            <Tab label="Chat" sx={{ minWidth: isMobile ? 48 : 90, px: isMobile ? 1 : 2 }} />
          </Tabs>

          <Avatar
            src={user.photoURL}
            alt={user.displayName}
            sx={{ width: 28, height: 28 }}
          />
          {isMobile ? (
            <IconButton size="small" onClick={logout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          ) : (
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{ textTransform: "none" }}
            >
              Logout
            </Button>
          )}
        </Box>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {tab === 0 && <MatchTab vmResumes={vmResumes} refreshVmResumes={refreshVmResumes} />}
        {tab === 1 && <ChatTab />}
      </Box>
    </Box>
  );
}
