import express from "express";
import { prisma } from "../../../libs/prisma/client"; // ✅ Import shared client

const app = express();
app.use(express.json());

// Healthcheck
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // simple DB check
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "not connected" });
  }
});

// Example: list users
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const PORT = process.env.API_GATEWAY_PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
});
