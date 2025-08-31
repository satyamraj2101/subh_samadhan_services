import express from "express";
import authRoutes from "./routes/auth.routes";

const app = express();
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running at http://localhost:${PORT}`);
});
