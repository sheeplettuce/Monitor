import "dotenv/config";
import express from "express";
import cors from "cors";
import { logger } from "./utils/logger.js";
import { checkBackend, checkDatabase, checkDisk, checkEvidencias, checkFrontend } from "./utils/statusCheck.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


// ROUTES
app.use("/api/auth", authRoutes);


app.get("/", (_, res) => {
  res.json({ nombre: "Monitor API", estado: "OK" });
});

app.listen(PORT, () => {
  logger.success("Backend", `Servidor iniciado`, { puerto: PORT });
});

async function runStatusChecks() {
  logger.info("Sistema", "══════════ Iniciando verificación de estado ══════════");
  await checkBackend(PORT);
  await checkDatabase(prisma);
  checkDisk();
  checkEvidencias();
  await checkFrontend(5173);
  logger.info("Sistema", "══════════ Verificación completada ══════════");
}


runStatusChecks();
setInterval(runStatusChecks, 5 * 60 * 1000);