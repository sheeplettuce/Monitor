import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { subirArchivoRespaldo } from "../services/backup.service.js";
import { agregarLog } from "../services/Backuplog.service.js";
import { sincronizarUbicacionExpedienteService } from "../services/evidencias.service.js";
import { prisma } from "../config/prisma.js";

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

export function contarArchivosPendientes(): number {
  if (!fs.existsSync(EVIDENCIAS_DIR)) {
    return 0;
  }

  const archivos = (
    fs.readdirSync(EVIDENCIAS_DIR, {
      recursive: true,
      withFileTypes: true,
    }) as fs.Dirent[]
  ).filter((entry) => entry.isFile());

  return archivos.length;
}

/**
 * Borra recursivamente subcarpetas vacías dentro de `dir`, y al final borra
 * `dir` mismo si quedó vacío. Bottom-up: nunca borra una carpeta que aún
 * tenga archivos (ej. FORMATOS/ con documentos generados, o evidencias que
 * fallaron la subida y siguen locales), así que es seguro llamarla siempre.
 */
export function eliminarCarpetaSiVacia(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      eliminarCarpetaSiVacia(path.join(dir, entry.name));
    }
  }

  // Releer después de limpiar subcarpetas: pudieron haber quedado vacías
  // y ya fueron eliminadas arriba.
  const restantes = fs.readdirSync(dir);
  if (restantes.length === 0) {
    fs.rmdirSync(dir);
  }
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

  // Expedientes tocados durante esta corrida, para sincronizar su
  // ubicacion_almacenamiento una sola vez al final de cada uno.
  const expedientesTocados = new Set<string>();

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
      const key = `evidencias/${rutaRelativa.split(path.sep).join("/")}`;

      progreso.archivoActual = rutaRelativa;

      let intentos = 0;
      let subido = false;
      while (intentos < 3 && !subido) {
        try {
          await subirArchivoRespaldo(rutaAbsoluta, key);

          const partes = rutaRelativa.split(path.sep);
          const noSiniestro = partes[0];
          if (noSiniestro) {
            await prisma.evidencia.updateMany({
              where: {
                no_siniestro: noSiniestro,
                nombre_archivo: entry.name,
                ubicacion_almacenamiento: "Local",
              },
              data: {
                ruta: key,
                ubicacion_almacenamiento: "Nube",
              },
            });
            expedientesTocados.add(noSiniestro);
          }

          if (fs.existsSync(rutaAbsoluta)) {
            fs.unlinkSync(rutaAbsoluta);
          }
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

    // Sincronizar expediente.ubicacion_almacenamiento para cada expediente
    // afectado: pasa a "Nube" solo si ya no le queda ninguna evidencia Local.
    for (const noSiniestro of expedientesTocados) {
      await sincronizarUbicacionExpedienteService(noSiniestro);
    }

    // Limpiar carpetas locales vacías. Si un expediente aún tiene archivos
    // que no forman parte de evidencias (ej. FORMATOS/) o evidencias que
    // fallaron la subida, la carpeta no se borra — solo desaparece cuando
    // no queda nada dentro.
    for (const noSiniestro of expedientesTocados) {
      try {
        eliminarCarpetaSiVacia(path.join(EVIDENCIAS_DIR, noSiniestro));
      } catch (err: any) {
        console.error(`No se pudo limpiar carpeta de ${noSiniestro}:`, err.message);
      }
    }

    progreso.archivoActual = null;
    progreso.terminado_en = new Date().toISOString();
    agregarLog({
      tipo: "Nube",
      resultado: progreso.fallidas > 0 ? "Parcial" : "Exitoso",
      detalle: `Respaldo completo de evidencias (${progreso.subidas} subidos, ${progreso.fallidas} fallidos)`,
    });
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