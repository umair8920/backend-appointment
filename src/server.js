import express from "express";
import cors from "cors";
import pool from "./db/index.js";
import authRoutes from "./routes/auth.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

// ======================
// Middlewares
// ======================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(express.json());

// ======================
// Health Check Route
// ======================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// ======================
// Routes
// ======================

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/chat", chatRoutes);

// ======================
// Global Error Handler
// ======================

app.use(errorHandler);

// ======================
// Start Server
// ======================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test DB connection
    await pool.query("SELECT 1");
    console.log("✅ Connected to PostgreSQL");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

startServer();