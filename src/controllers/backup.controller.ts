import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";
import { checkDisk } from "../utils/Disk.js";
import { leerLogs, agregarLog, limpiarLogs } from "../services/Backuplog.service.js";
import { ejecutarRespaldo, obtenerProgreso } from "../jobs/backup.job.js";
import { logger } from "../utils/logger.js";

export async function obtenerEstadoBackup(req: AuthRequest, res: Response) {
  try {
    const disco = await checkDisk();

    const [evidenciasLocal, evidenciasNube] = await Promise.all([
      prisma.evidencia.count({ where: { ubicacion_almacenamiento: "Local" } }),
      prisma.evidencia.count({ where: { ubicacion_almacenamiento: "Nube" } }),
    ]);
    const evidenciasTotales = evidenciasLocal + evidenciasNube;

    const logs = leerLogs();
    const ultimoNube = [...logs].reverse().find((l) => l.tipo === "Nube");
    const ultimoError = [...logs].reverse().find((l) => l.resultado === "Error");
    const pendientesNube = evidenciasLocal;

    res.json({
      disco_local: disco,
      nube: {
        estado: ultimoNube ? "Activo" : "Sin respaldos",
        ultimo_respaldo: ultimoNube?.fecha ?? null,
        ultimo_error: ultimoError?.detalle ?? "Ninguno",
        pendientes: pendientesNube,
      },
      evidencias: {
        totales: evidenciasTotales,
        local: evidenciasLocal,
        nube: evidenciasNube,
      },
    });
  } catch (err: any) {
    logger.error("Backup", "Error al obtener estado", { error: err.message });
    res.status(500).json({ error: "Error al obtener estado de respaldo" });
  }
}

export async function obtenerLogsBackup(req: AuthRequest, res: Response) {
  try {
    const logs = leerLogs().slice().reverse(); // más reciente primero
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: "Error al obtener logs" });
  }
}

/**
 * Dispara la exportación en segundo plano y responde de inmediato.
 * El frontend hace polling a /progreso para ver el avance.
 */
export async function exportarEvidencias(req: AuthRequest, res: Response) {
  const progresoActual = obtenerProgreso();
  if (progresoActual.corriendo) {
    return res.status(409).json({ error: "Ya hay una exportación en curso" });
  }

  const username = req.usuario?.username;

  ejecutarRespaldo()
    .then(({ subidas }) => {
      agregarLog({
        tipo: "Manual",
        resultado: "Exitoso",
        detalle: `Exportación de evidencias (${subidas} archivos) — ${username ?? "desconocido"}`,
        usuario: username,
      });
    })
    .catch((err: any) => {
      agregarLog({
        tipo: "Manual",
        resultado: "Error",
        detalle: err.message ?? "Error al exportar evidencias",
        usuario: username,
      });
    });

  res.json({ ok: true, iniciado: true });
}

export async function obtenerProgresoBackup(req: AuthRequest, res: Response) {
  res.json(obtenerProgreso());
}

export async function limpiarLogsBackup(req: AuthRequest, res: Response) {
  try {
    limpiarLogs();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Error al limpiar logs" });
  }
}