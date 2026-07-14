import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { subirCarpetaEvidencias, generarUrlFirmada, eliminarArchivoB2 } from "./backup.service.js";
import { generarFormatosParaRespaldo } from "./formatos.service.js";
function esError(valor) {
    return typeof valor === "object" && valor !== null && "error" in valor;
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const EVIDENCIAS_DIR = path.join(__dirname, "..", "..", "evidencias");
function subcarpetaPorTipo(tipo) {
    return tipo === "documento" ? "DOCUMENTOS REPARACION" : "evidencias";
}
/**
 * Sincroniza expediente.ubicacion_almacenamiento en base al estado real
 * de sus evidencias: "Nube" solo si TODAS las evidencias están en Nube,
 * "Local" si hay al menos una Local o si no tiene evidencias.
 * Debe llamarse después de cualquier operación que cree, suba o elimine
 * una evidencia.
 */
export async function sincronizarUbicacionExpedienteService(no_siniestro) {
    try {
        const expediente = await prisma.expediente.findUnique({
            where: { no_siniestro },
            select: { estado: true },
        });
        // Solo puede pasar a "Nube" un expediente que ya cerró su ciclo.
        // Mientras esté activo (Ingreso, Restauracion, Pendiente_de_salida)
        // se queda forzado en "Local" sin importar cuántas evidencias ya
        // se hayan subido a B2 — evita que desaparezca del gestor de estados
        // o del selector de "pendientes" antes de tiempo.
        if (expediente?.estado !== "Salida") {
            await prisma.expediente.update({
                where: { no_siniestro },
                data: { ubicacion_almacenamiento: "Local" },
            });
            return;
        }
        const total = await prisma.evidencia.count({ where: { no_siniestro } });
        const enNube = total === 0
            ? 0
            : await prisma.evidencia.count({
                where: { no_siniestro, ubicacion_almacenamiento: "Nube" },
            });
        const nuevaUbicacion = total > 0 && enNube === total ? "Nube" : "Local";
        await prisma.expediente.update({
            where: { no_siniestro },
            data: { ubicacion_almacenamiento: nuevaUbicacion },
        });
    }
    catch (err) {
        logger.error("Evidencias", "Error al sincronizar ubicación del expediente", {
            no_siniestro,
            error: err.message,
        });
    }
}
export async function crearEvidenciaService(datos) {
    try {
        const expediente = await prisma.expediente.findUnique({
            where: { no_siniestro: datos.no_siniestro },
        });
        if (!expediente)
            return { error: "Expediente no encontrado" };
        const subcarpeta = subcarpetaPorTipo(datos.tipo);
        const evidencia = await prisma.evidencia.create({
            data: {
                no_siniestro: datos.no_siniestro,
                tipo: datos.tipo,
                nombre_archivo: datos.nombre_archivo,
                ruta: `/evidencias/${datos.no_siniestro}/${subcarpeta}/${path.basename(datos.ruta)}`,
                ubicacion_almacenamiento: "Local",
                subido_por: datos.subido_por ?? null,
            },
        });
        await sincronizarUbicacionExpedienteService(datos.no_siniestro);
        logger.success("Evidencias", "Evidencia registrada", { id: evidencia.id });
        return evidencia;
    }
    catch (err) {
        logger.error("Evidencias", "Error al crear evidencia", { error: err.message });
        return { error: "Error interno al registrar evidencia" };
    }
}
export async function listarEvidenciasService(no_siniestro) {
    try {
        const data = await prisma.evidencia.findMany({
            where: { no_siniestro },
            orderBy: { fecha_carga: "desc" },
        });
        return await Promise.all(data.map(async (e) => {
            let urlNube = null;
            if (e.ubicacion_almacenamiento === "Nube" && e.ruta) {
                try {
                    // Verifica que sea una key de B2 (empieza con "evidencias/")
                    if (e.ruta.startsWith("evidencias/")) {
                        urlNube = await generarUrlFirmada(e.ruta);
                    }
                }
                catch (err) {
                    console.error(`Error generando URL para ${e.nombre_archivo}:`, err.message);
                }
            }
            return {
                id: e.id,
                no_siniestro: e.no_siniestro,
                tipo: e.tipo,
                nombre_archivo: e.nombre_archivo,
                ruta: e.ruta,
                url_nube: urlNube,
                key_nube: e.ruta,
                ubicacion_almacenamiento: e.ubicacion_almacenamiento,
                fecha_carga: e.fecha_carga,
            };
        }));
    }
    catch (err) {
        return { error: "Error al obtener evidencias" };
    }
}
export async function eliminarEvidenciaService(id) {
    try {
        const evidencia = await prisma.evidencia.findUnique({ where: { id } });
        if (!evidencia)
            return { error: "Evidencia no encontrada" };
        // 1. Eliminar archivo de B2 si está en nube
        if (evidencia.ubicacion_almacenamiento === "Nube" && evidencia.ruta) {
            try {
                await eliminarArchivoB2(evidencia.ruta);
            }
            catch (err) {
                console.warn(`No se pudo eliminar de B2: ${evidencia.ruta}`, err.message);
            }
        }
        // 2. Eliminar archivo local si existe
        if (evidencia.ruta) {
            const rutaLocal = path.join(EVIDENCIAS_DIR, "..", evidencia.ruta);
            if (fs.existsSync(rutaLocal)) {
                try {
                    fs.unlinkSync(rutaLocal);
                }
                catch (err) {
                    console.warn(`No se pudo eliminar archivo local: ${rutaLocal}`, err.message);
                }
            }
        }
        // 3. Eliminar registro de BD
        await prisma.evidencia.delete({ where: { id } });
        // 4. Recalcular ubicación del expediente (puede pasar a Nube si ya
        //    no quedan evidencias Local, o quedarse en Local si no tiene ninguna)
        await sincronizarUbicacionExpedienteService(evidencia.no_siniestro);
        logger.success("Evidencias", "Evidencia eliminada", {
            id,
            nombre: evidencia.nombre_archivo,
            no_siniestro: evidencia.no_siniestro,
        });
        return { ok: true, eliminada: evidencia.nombre_archivo ?? "archivo sin nombre" };
    }
    catch (err) {
        logger.error("Evidencias", "Error al eliminar evidencia", { error: err.message });
        return { error: "Error interno al eliminar evidencia" };
    }
}
//subir evidencias a la nube
export async function respaldarEvidenciasExpedienteService(no_siniestro) {
    try {
        const expediente = await prisma.expediente.findUnique({
            where: { no_siniestro },
            select: { estado: true },
        });
        if (!expediente) {
            return { error: "Expediente no encontrado" };
        }
        // Solo se puede respaldar a la nube un expediente que ya cerró su
        // ciclo completo. Mientras siga activo en el gestor de estados
        // (Ingreso, Restauracion, Pendiente_de_salida) no se sube nada,
        // aunque ya tenga evidencia local lista.
        if (expediente.estado !== "Salida") {
            return {
                error: "Solo se puede respaldar a la nube un expediente con estado Salida",
            };
        }
        const carpetaLocal = path.join(EVIDENCIAS_DIR, no_siniestro);
        // Genera EXPEDIENTE/CHECKLIST/LEVANTAMIENTO directo en la raíz del
        // expediente, para que se suban y borren junto con el resto en el
        // mismo paso de subirCarpetaEvidencias.
        const formatos = await generarFormatosParaRespaldo(no_siniestro, carpetaLocal);
        if (esError(formatos)) {
            return formatos;
        }
        const evidenciasLocales = await prisma.evidencia.findMany({
            where: { no_siniestro, ubicacion_almacenamiento: "Local" },
        });
        const keysSubidas = await subirCarpetaEvidencias(carpetaLocal, no_siniestro);
        if (keysSubidas.length === 0) {
            return { error: "No hay evidencias locales para respaldar" };
        }
        // Empareja cada evidencia en BD con su key subida por nombre de archivo
        for (const ev of evidenciasLocales) {
            const key = keysSubidas.find((k) => k.endsWith(ev.nombre_archivo ?? ""));
            if (!key)
                continue;
            await prisma.evidencia.update({
                where: { id: ev.id },
                data: { ruta: key, ubicacion_almacenamiento: "Nube" },
            });
        }
        // Recalcular ubicación del expediente en base al estado final de sus evidencias
        await sincronizarUbicacionExpedienteService(no_siniestro);
        logger.success("Evidencias", "Carpeta respaldada en B2", {
            no_siniestro,
            total: keysSubidas.length,
        });
        return { ok: true, subidas: keysSubidas.length };
    }
    catch (err) {
        logger.error("Evidencias", "Error al respaldar carpeta", {
            error: err.message,
        });
        return { error: "Error interno al respaldar evidencias" };
    }
}
export function eliminarCarpetaEvidencias(no_siniestro) {
    const carpeta = path.join(EVIDENCIAS_DIR, no_siniestro);
    if (fs.existsSync(carpeta))
        fs.rmSync(carpeta, { recursive: true, force: true });
}
//# sourceMappingURL=evidencias.service.js.map