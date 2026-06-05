import "dotenv/config";
import express from "express";
import cors from "cors";
import { logger } from "./utils/logger.js";
import { checkBackend, checkDatabase, checkDisk, checkEvidencias, checkFrontend } from "./utils/statusCheck.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import usuariosRoutes from "./routes/usuarios.route.js";

const app = express();
const PORT = 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/health", healthRoutes);

app.get("/", (_, res) => {
  res.json({ nombre: "Monitor API", estado: "OK" });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.success("Backend", `Servidor iniciado`, { puerto: PORT });
  runStatusChecks();
  setInterval(runStatusChecks, 5 * 60 * 1000);
});

async function runStatusChecks() {
  logger.info("Sistema", "══════════ Iniciando verificación de estado ══════════");
  await checkBackend(PORT);
  await checkDatabase(prisma);
  checkDisk();
  checkEvidencias();
  await checkFrontend(8081);
  logger.info("Sistema", "══════════ Verificación completada ══════════");
}