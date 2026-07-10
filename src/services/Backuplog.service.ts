import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "backup.log.json");

export type BackupLogEntry = {
  id: number;
  fecha: string; // ISO
  tipo: "Nube" | "Manual" | "Local";
  resultado: "Exitoso" | "Parcial" | "Error";
  detalle: string;
  usuario?: string;
};

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "[]", "utf-8");
}

export function leerLogs(): BackupLogEntry[] {
  ensureLogFile();
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function agregarLog(entry: Omit<BackupLogEntry, "id" | "fecha">): BackupLogEntry {
  ensureLogFile();
  const logs = leerLogs();
  const nuevo: BackupLogEntry = {
    id: logs.length ? logs[logs.length - 1].id + 1 : 1,
    fecha: new Date().toISOString(),
    ...entry,
  };
  logs.push(nuevo);
  // conserva solo los últimos 200 registros
  const recortado = logs.slice(-200);
  fs.writeFileSync(LOG_FILE, JSON.stringify(recortado, null, 2), "utf-8");
  return nuevo;
}

export function limpiarLogs(): void {
  ensureLogFile();
  fs.writeFileSync(LOG_FILE, "[]", "utf-8");
}