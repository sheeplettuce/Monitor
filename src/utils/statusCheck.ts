import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const EVIDENCIAS_DIR = path.resolve(
  process.cwd(),
  process.env["EVIDENCIAS_DIR"] ?? "../evidencias"
);
const isWindows = process.platform === "win32";

export async function checkBackend(port = 3000) {
  try {
    const cmd = isWindows
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} | grep LISTEN`;

    const result = execSync(cmd, { encoding: "utf8" });
    if (result) {
      logger.success("Backend", `Servidor en línea`, { puerto: port });
    }
  } catch {
    logger.error("Backend", `No hay proceso escuchando`, { puerto: port });
  }
}

export async function checkDatabase(prisma: any) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.success("PostgreSQL", "Conexión exitosa a la base de datos");
  } catch (err: any) {
    logger.error("PostgreSQL", "Fallo en la conexión", { error: err.message });
  }
}

export function checkDisk() {
  try {
    let libre_GB: string, usado_GB: string, total_GB: string;

    if (isWindows) {
      // wmic devuelve bytes, convertimos a GB
      const result = execSync(
        `wmic logicaldisk where "DeviceID='C:'" get FreeSpace,Size /format:csv`,
        { encoding: "utf8" }
      );
      const lines = result.trim().split("\n").filter(l => l.includes(",") && !l.startsWith("Node"));
      const parts = lines[0].trim().split(",");
      // CSV: Node, FreeSpace, Size
      const free = parseInt(parts[1]);
      const total = parseInt(parts[2]);
      const used = total - free;

      libre_GB  = (free  / 1e9).toFixed(1);
      usado_GB  = (used  / 1e9).toFixed(1);
      total_GB  = (total / 1e9).toFixed(1);
    } else {
      const result = execSync("df -BGB . --output=avail,used,size", { encoding: "utf8" });
      const lines = result.trim().split("\n");
      [libre_GB, usado_GB, total_GB] = lines[1].trim().split(/\s+/).map(v => v.replace("G", ""));
    }

    logger.info("Disco", "Estado del disco local", { total_GB, usado_GB, libre_GB });

    if (parseFloat(libre_GB) < 10) {
      logger.warn("Disco", `Espacio bajo: solo ${libre_GB}GB libres`);
    }
  } catch (err: any) {
    logger.error("Disco", "No se pudo leer el disco", { error: err.message });
  }
}

export function checkEvidencias() {
  try {
    if (!fs.existsSync(EVIDENCIAS_DIR)) {
      logger.warn("Evidencias", "Directorio no encontrado", { ruta: EVIDENCIAS_DIR });
      return;
    }

    const archivos = fs.readdirSync(EVIDENCIAS_DIR);
    const totalSize = archivos.reduce((acc, file) => {
      const stat = fs.statSync(path.join(EVIDENCIAS_DIR, file));
      return acc + stat.size;
    }, 0);

    const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
    logger.info("Evidencias", "Conteo de archivos", {
      archivos: archivos.length,
      tamaño_MB: `${sizeMB} MB`,
    });
  } catch (err: any) {
    logger.error("Evidencias", "Error leyendo evidencias", { error: err.message });
  }
}export async function checkFrontend(port = 5173) {
  try {
    const response = await fetch(`http://localhost:${port}`);
    if (response.ok || response.status === 200) {
      logger.success("Frontend", `En línea`, { puerto: port, url: `http://localhost:${port}` });
    } else {
      logger.warn("Frontend", `Respondió con estado inesperado`, { status: response.status });
    }
  } catch {
    logger.warn("Frontend", `No disponible (sin conexión o no iniciado)`, { puerto: port });
  }
}