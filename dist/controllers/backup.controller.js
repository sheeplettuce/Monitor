import { prisma } from "../config/prisma.js";
import { checkDisk } from "../utils/Disk.js";
import { leerLogs, agregarLog, limpiarLogs } from "../services/Backuplog.service.js";
import { ejecutarRespaldo, obtenerProgreso, contarArchivosPendientes } from "../jobs/backup.job.js";
import { logger } from "../utils/logger.js";
import { respaldarEvidenciasExpedienteService } from "../services/evidencias.service.js";
export async function obtenerEstadoBackup(req, res) {
    try {
        const disco = await checkDisk();
        const [evidenciasLocal, evidenciasNube, expedientesTotales] = await Promise.all([
            prisma.evidencia.count({ where: { ubicacion_almacenamiento: "Local" } }),
            prisma.evidencia.count({ where: { ubicacion_almacenamiento: "Nube" } }),
            prisma.expediente.count(),
        ]);
        const evidenciasTotales = evidenciasLocal + evidenciasNube;
        const archivosPendientes = contarArchivosPendientes();
        const logs = leerLogs();
        const ultimoNube = [...logs].reverse().find((l) => l.tipo === "Nube" || l.tipo === "Manual");
        const ultimoError = [...logs].reverse().find((l) => l.resultado === "Error");
        const pendientesNube = archivosPendientes > 0 ? archivosPendientes : evidenciasLocal;
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
            expedientes: {
                totales: expedientesTotales,
            },
        });
    }
    catch (err) {
        logger.error("Backup", "Error al obtener estado", { error: err.message });
        res.status(500).json({ error: "Error al obtener estado de respaldo" });
    }
}
export async function obtenerLogsBackup(req, res) {
    try {
        const logs = leerLogs().slice().reverse(); // más reciente primero
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: "Error al obtener logs" });
    }
}
/**
 * Dispara la exportación en segundo plano y responde de inmediato.
 * El frontend hace polling a /progreso para ver el avance.
 */
export async function exportarEvidencias(req, res) {
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
        .catch((err) => {
        agregarLog({
            tipo: "Manual",
            resultado: "Error",
            detalle: err.message ?? "Error al exportar evidencias",
            usuario: username,
        });
    });
    res.json({ ok: true, iniciado: true });
}
export async function obtenerProgresoBackup(req, res) {
    res.json(obtenerProgreso());
}
export async function respaldarEvidenciasPorNoSiniestro(req, res) {
    const no_siniestro = req.params.no_siniestro;
    const username = req.usuario?.username;
    if (typeof no_siniestro !== "string" || !no_siniestro.trim()) {
        return res.status(400).json({ error: "Número de siniestro inválido" });
    }
    try {
        const resultado = await respaldarEvidenciasExpedienteService(no_siniestro);
        if ("error" in resultado) {
            agregarLog({
                tipo: "Manual",
                resultado: "Error",
                detalle: `Respaldo de expediente ${no_siniestro}: ${resultado.error} — ${username ?? "desconocido"}`,
                usuario: username,
            });
            return res.status(400).json(resultado);
        }
        agregarLog({
            tipo: "Manual",
            resultado: "Exitoso",
            detalle: `Respaldo del expediente ${no_siniestro} (${resultado.subidas} archivos) — ${username ?? "desconocido"}`,
            usuario: username,
        });
        return res.json(resultado);
    }
    catch (err) {
        logger.error("Backup", "Error al respaldar expediente", { error: err.message });
        agregarLog({
            tipo: "Manual",
            resultado: "Error",
            detalle: `Respaldo de expediente ${no_siniestro}: ${err.message} — ${username ?? "desconocido"}`,
            usuario: username,
        });
        return res.status(500).json({ error: "Error al respaldar expediente" });
    }
}
export async function limpiarLogsBackup(req, res) {
    try {
        const eliminados = limpiarLogs();
        res.json({ ok: true, eliminados });
    }
    catch (err) {
        res.status(500).json({ error: "Error al limpiar logs" });
    }
}
//# sourceMappingURL=backup.controller.js.map