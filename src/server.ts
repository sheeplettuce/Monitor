import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "os";
import { execSync } from "child_process";
import { Bonjour } from "bonjour-service";

import { logger } from "./utils/logger.js";
import {
  checkBackend,
  checkDatabase,
  checkDisk,
  checkEvidencias,
  checkFrontend,
} from "./utils/statusCheck.js";

import { prisma } from "./config/prisma.js";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import usuariosRoutes from "./routes/usuarios.route.js";
import expedientesRoutes from "./routes/expedientes.routes.js";
import levantamientoRoutes from "./routes/levantamiento.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import comentario from "./routes/comentario.routes.js";
import formatosRoutes from "./routes/formatos.routes.js";

import { seedAseguradoras } from "./utils/seedAseguradoras.js";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/evidencias",
  express.static(path.join(__dirname, "..", "evidencias"))
);

const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }

  return "127.0.0.1";
}

function getHostname(): string {
  try {
    if (isMac) {
      return execSync("scutil --get LocalHostName", {
        encoding: "utf8",
      }).trim();
    }

    if (isWindows) {
      return execSync("hostname", {
        encoding: "utf8",
      }).trim();
    }

    return os.hostname();
  } catch {
    return os.hostname();
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────
// El sub-router de "estado" (cambiar estado + historial) ya viene
// montado DENTRO de expedientes.routes.ts, colgado de
// "/:no_siniestro/estado" — mismo patrón que evidenciasRoutes.
// No hace falta (ni debe) montarse aquí por separado.

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/expedientes", expedientesRoutes);
app.use("/api", levantamientoRoutes);
app.use("/api", checklistRoutes);
app.use("/api", comentario);
app.use("/api", formatosRoutes);

app.get("/", (_, res) => {
  res.json({
    nombre: "Monitor API",
    estado: "OK",
  });
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

  res.json({
    nombre: "Monitor API",
    ips,
  });
});

// ─────────────────────────────────────────────────────────────
// Status checks
// ─────────────────────────────────────────────────────────────

async function runStatusChecks() {
  logger.info(
    "Sistema",
    "══════════ Iniciando verificación de estado ══════════"
  );

  await checkBackend(PORT);
  await checkDatabase(prisma);

  checkDisk();
  checkEvidencias();

  await checkFrontend(8081);

  logger.info(
    "Sistema",
    "══════════ Verificación completada ══════════"
  );
}

// ─────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await seedAseguradoras();

    const server = app.listen(PORT, "0.0.0.0", () => {
      const ip = getLocalIP();
      const hostname = getHostname();

      // Bonjour / mDNS
      const bonjour = new Bonjour();

      bonjour.publish({
        name: "Monitor API",
        type: "monitor",
        port: PORT,
        txt: {
          ipv4: ip,
        },
      });

      logger.success("Backend", "Servidor iniciado", {
        puerto: PORT,
      });

      logger.info("Red", "Servicio mDNS anunciado", {
        tipo: "_monitor._tcp",
      });

      logger.info("Red", "IP local", {
        ip,
      });

      logger.info("Red", "Nombre del servidor", {
        hostname,
        dns: `${hostname}.local`,
      });

      runStatusChecks();
      setInterval(runStatusChecks, 5 * 60 * 1000);
    });

    server.on("error", (err) => {
      logger.error("Backend", "Error al iniciar servidor", err);
      process.exit(1);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();