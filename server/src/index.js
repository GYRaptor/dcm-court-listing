import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS so the React frontend (running on a different port) can make requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// Health check endpoint for verifying server uptime and deployment status
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "DCM Court Listing API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error-handling middleware: keeps error responses consistent as { error: "message" }
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
});

// Start listening if running directly
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
