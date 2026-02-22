import React, { useState, useEffect, useCallback } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import MatchTab from "./pages/MatchTab";
import ChatTab from "./pages/ChatTab";

const API = "http://localhost:5001";

export default function App() {
  const [tab, setTab] = useState(0);
  const [vmResumes, setVmResumes] = useState([]);

  const refreshVmResumes = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/vm/documents`);
      const data = await resp.json();
      const docs = Array.isArray(data.documents) ? data.documents : Array.isArray(data) ? data : [];
      setVmResumes(docs);
    } catch (err) {
      console.error("Failed to load VM resumes:", err);
    }
  }, []);

  useEffect(() => { refreshVmResumes(); }, [refreshVmResumes]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          Resume Match{" "}
          <Box component="span" sx={{ color: "primary.main" }}>AI</Box>
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Match" />
          <Tab label="Chat" />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {tab === 0 && <MatchTab vmResumes={vmResumes} refreshVmResumes={refreshVmResumes} />}
        {tab === 1 && <ChatTab />}
      </Box>
    </Box>
  );
}
