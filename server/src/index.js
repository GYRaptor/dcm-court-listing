import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import caseRoutes from "./routes/case.routes.js";
import judgeRoutes from "./routes/judge.routes.js";
import causeListRoutes from "./routes/causelist.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import hearingRoutes from "./routes/hearing.routes.js";
import auditRoutes from "./routes/audit.routes.js";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS so the React frontend can make requests from local or production Vercel origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.CLIENT_URL && origin.startsWith(process.env.CLIENT_URL))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// Mount API routes (supports both standard and /api-prefixed routes for production deployment)
const routes = [
  ["/auth", authRoutes],
  ["/cases", caseRoutes],
  ["/judges", judgeRoutes],
  ["/cause-list", causeListRoutes],
  ["/dashboard", dashboardRoutes],
  ["/hearings", hearingRoutes],
  ["/audit-log", auditRoutes],
];

for (const [path, router] of routes) {
  app.use(path, router);
  app.use(`/api${path}`, router);
}

// Health check endpoint for verifying server uptime and deployment status
const healthCheckHandler = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "DCM Court Listing API is healthy",
    timestamp: new Date().toISOString(),
  });
};
app.get("/health", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

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

// Start listening if running directly (and not imported for testing)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
