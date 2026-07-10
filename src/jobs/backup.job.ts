import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { subirArchivoRespaldo } from "../services/backup.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const EVIDENCIAS_DIR = path.join(__dirname, "..", "..", "evidencias");

export type ProgresoRespaldo = {
  corriendo: boolean;
  total: number;
  procesados: number;
  subidas: number;
  fallidas: number;
  archivoActual: string | null;
  terminado_en: string | null;
  error: string | null;
};

const progreso: ProgresoRespaldo = {
  corriendo: false,
  total: 0,
  procesados: 0,
  subidas: 0,
  fallidas: 0,
  archivoActual: null,
  terminado_en: null,
  error: null,
};

export function obtenerProgreso(): ProgresoRespaldo {
  return { ...progreso };
}

/**
 * Exporta TODA la carpeta de evidencias (todos los expedientes,
 * DOCUMENTOS REPARACION incluido) a B2. No toca la base de datos.
 * No borra los archivos locales — es exportación/backup, no migración.
 * Actualiza `progreso` en memoria para que el frontend haga polling.
 */
export async function ejecutarRespaldo(): Promise<{ subidas: number }> {
  if (progreso.corriendo) {
    throw new Error("Ya hay una exportación en curso");
  }

  progreso.corriendo = true;
  progreso.total = 0;
  progreso.procesados = 0;
  progreso.subidas = 0;
  progreso.fallidas = 0;
  progreso.archivoActual = null;
  progreso.terminado_en = null;
  progreso.error = null;

  try {
    if (!fs.existsSync(EVIDENCIAS_DIR)) {
      progreso.terminado_en = new Date().toISOString();
      return { subidas: 0 };
    }

    const archivos = (
      fs.readdirSync(EVIDENCIAS_DIR, {
        recursive: true,
        withFileTypes: true,
      }) as fs.Dirent[]
    ).filter((e) => e.isFile());

    progreso.total = archivos.length;

    for (const entry of archivos) {
      const carpetaEntry = (entry as any).parentPath ?? (entry as any).path;
      const rutaAbsoluta = path.join(carpetaEntry, entry.name);
      const rutaRelativa = path.relative(EVIDENCIAS_DIR, rutaAbsoluta);
      const key = `backups/evidencias/${rutaRelativa.split(path.sep).join("/")}`;

      progreso.archivoActual = rutaRelativa;

      let intentos = 0;
      let subido = false;
      while (intentos < 3 && !subido) {
        try {
          await subirArchivoRespaldo(rutaAbsoluta, key);
          subido = true;
          progreso.subidas++;
        } catch (err: any) {
          intentos++;
          if (intentos >= 3) {
            progreso.fallidas++;
            console.error(`Falló subida (${rutaRelativa}) tras 3 intentos:`, err.message);
          }
        }
      }

      progreso.procesados++;
    }

    progreso.archivoActual = null;
    progreso.terminado_en = new Date().toISOString();
    console.log(
      `Exportación de evidencias completa: ${progreso.subidas} subidos, ${progreso.fallidas} fallidos`
    );
    return { subidas: progreso.subidas };
  } catch (err: any) {
    progreso.error = err.message ?? "Error desconocido";
    progreso.terminado_en = new Date().toISOString();
    throw err;
  } finally {
    progreso.corriendo = false;
  }
}

// todos los días a las 2am
cron.schedule("0 2 * * *", () => {
  ejecutarRespaldo().catch((e) => console.error("Falló el respaldo programado:", e));
});