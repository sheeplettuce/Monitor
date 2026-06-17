import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "os";
import { execSync } from "child_process";
import { logger } from "./utils/logger.js";
import { checkBackend, checkDatabase, checkDisk, checkEvidencias, checkFrontend } from "./utils/statusCheck.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import usuariosRoutes from "./routes/usuarios.route.js";
import { Bonjour } from "bonjour-service";

const app = express();
const PORT = 3000;
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

// Obtener IP local
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "desconocida";
}

// Obtener hostname del sistema
function getHostname(): string {
  try {
    if (isMac) {
      return execSync("scutil --get LocalHostName", { encoding: "utf8" }).trim();
    } else if (isWindows) {
      return execSync("hostname", { encoding: "utf8" }).trim();
    }
    return os.hostname();
  } catch {
    return os.hostname();
  }
}

app.use(cors({ origin: "*" }));
app.use(express.json());

//vuelta al antiguo build, pendiente de arreglo

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/health", healthRoutes);

app.get("/", (_, res) => {
  res.json({ nombre: "Monitor API", estado: "OK" });
});

app.get("/discovery", (_, res) => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }

  res.json({ nombre: "Monitor API", ips });
});

app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  const hostname = getHostname();
  const bonjour = new Bonjour();
    bonjour.publish({
    name: "Monitor API",
    type: "monitor",
    port: PORT,
    txt: {
    ipv4: getLocalIP(),
  },
});
logger.info("Red", "Servicio mDNS anunciado", { tipo: "_monitor._tcp" });

  logger.success("Backend", `Servidor iniciado`, { puerto: PORT });
  logger.info("Red", `IP local`, { ip });
  logger.info("Red", `Nombre del servidor`, { hostname, dns: `${hostname}.local` });

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