import React, { useState, useEffect, useCallback } from "react";
import { Box, Tabs, Tab, Typography, Button, Avatar, CircularProgress, IconButton, useMediaQuery, useTheme, TextField, Alert } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from "@mui/icons-material/Email";
import LinkIcon from "@mui/icons-material/Link";
import LogoutIcon from "@mui/icons-material/Logout";
import MatchTab from "./pages/MatchTab";
import ChatTab from "./pages/ChatTab";
import { useAuth } from "./AuthContext";
import { apiFetch, setTokenProvider } from "./api";

const API = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5001";

export default function App() {
  const [tab, setTab] = useState(0);
  const [vmResumes, setVmResumes] = useState([]);
  const { user, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, sendEmailLink, logout, getToken } = useAuth();
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
    return <LoginScreen isMobile={isMobile} loginWithGoogle={loginWithGoogle} loginWithEmail={loginWithEmail} signUpWithEmail={signUpWithEmail} sendEmailLink={sendEmailLink} />;
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

function LoginScreen({ isMobile, loginWithGoogle, loginWithEmail, signUpWithEmail, sendEmailLink }) {
  const [mode, setMode] = useState("main"); // main | email | emailLink
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err.code === "auth/user-not-found" ? "No account found. Try signing up." :
        err.code === "auth/wrong-password" ? "Incorrect password." :
        err.code === "auth/weak-password" ? "Password must be at least 6 characters." :
        err.code === "auth/email-already-in-use" ? "Account already exists. Try signing in." :
        err.message);
    }
  };

  const handleEmailLink = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await sendEmailLink(email);
      setSuccess("Sign-in link sent! Check your email.");
    } catch (err) {
      setError(err.message);
    }
  };


  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", gap: 3, px: 2 }}>
      <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, letterSpacing: "-0.02em", textAlign: "center" }}>
        Resume Match <Box component="span" sx={{ color: "primary.main" }}>AI</Box>
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
        Sign in to manage your resumes and match them to jobs.
      </Typography>

      {error && <Alert severity="error" sx={{ maxWidth: 360, width: "100%" }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ maxWidth: 360, width: "100%" }}>{success}</Alert>}

      {mode === "main" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 360, width: "100%" }}>
          <Button variant="contained" size="large" startIcon={<GoogleIcon />} onClick={loginWithGoogle} sx={{ textTransform: "none", py: 1.5 }}>
            Sign in with Google
          </Button>
          <Button variant="outlined" size="large" startIcon={<EmailIcon />} onClick={() => { setMode("email"); setError(""); setSuccess(""); }} sx={{ textTransform: "none", py: 1.5 }}>
            Sign in with Email
          </Button>
          <Button variant="outlined" size="large" startIcon={<LinkIcon />} onClick={() => { setMode("emailLink"); setError(""); setSuccess(""); }} sx={{ textTransform: "none", py: 1.5 }}>
            Sign in with Email Link
          </Button>
        </Box>
      )}

      {mode === "email" && (
        <Box component="form" onSubmit={handleEmailSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360, width: "100%" }}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth size="small" />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth size="small" />
          <Button type="submit" variant="contained" sx={{ textTransform: "none", py: 1.2 }}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
          <Button size="small" onClick={() => setIsSignUp(!isSignUp)} sx={{ textTransform: "none" }}>
            {isSignUp ? "Already have an account? Sign in" : "No account? Create one"}
          </Button>
          <Button size="small" onClick={() => { setMode("main"); setError(""); setSuccess(""); }} sx={{ textTransform: "none" }}>Back</Button>
        </Box>
      )}

      {mode === "emailLink" && (
        <Box component="form" onSubmit={handleEmailLink} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360, width: "100%" }}>
          <Typography variant="body2" color="text.secondary">
            Enter your email and we'll send a sign-in link. No password needed.
          </Typography>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth size="small" />
          <Button type="submit" variant="contained" sx={{ textTransform: "none", py: 1.2 }}>Send Sign-in Link</Button>
          <Button size="small" onClick={() => { setMode("main"); setError(""); setSuccess(""); }} sx={{ textTransform: "none" }}>Back</Button>
        </Box>
      )}

    </Box>
  );
}
