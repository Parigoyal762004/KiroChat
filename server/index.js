// ☕ Entry point: Express + Socket.IO server — caffeinated and ready
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./src/config/db.js";
import healthRoute from "./src/routes/health.js";
import meetingRoutes from "./src/routes/meetingRoutes.js"; // NEW
import initSocketManager from "./src/socketManager.js";
import chalk from "chalk";
import fs from "fs";

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploaded files (NEW)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/health", healthRoute);
app.use("/api", meetingRoutes); // NEW - Mount meeting routes

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // for dev; lock this down in prod
    methods: ["GET", "POST"],
  },
  // pingInterval/pingTimeout can be tuned for production
});

initSocketManager(io); // wire up all socket logic

// Ensure upload directories exist (NEW)
const uploadDirs = ["uploads", "uploads/recordings"];
uploadDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(chalk.cyan(`📁 Created directory: ${dir}`));
  }
});

// Error handling middleware (ENHANCED)
app.use((err, req, res, next) => {
  console.error(chalk.red("❌ Error:"), err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// 404 handler (NEW)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(chalk.green(`🚀 Server running on port ${PORT}`));
    console.log(chalk.yellow(`☕ Database connected — caffeine levels stable.`));
    console.log(chalk.cyan(`🎬 Recording uploads: /uploads/recordings`));
    console.log(chalk.cyan(`📅 Scheduled meetings API: /api/schedule-meeting`));
  });
});

export { app, io };