import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

export type ServiceError = { error: string };

export async function crearEvidenciaService(datos: {
  no_siniestro: string;
  tipo: string;
  nombre_archivo: string;
  ruta: string;
  subido_por?: number;
}) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { no_siniestro: datos.no_siniestro },
    });
    if (!expediente) return { error: "Expediente no encontrado" };

    const evidencia = await prisma.evidencia.create({
      data: {
        no_siniestro:            datos.no_siniestro,
        tipo:                    datos.tipo,
        nombre_archivo:          datos.nombre_archivo,
        ruta:                    datos.ruta,
        ubicacion_almacenamiento: "Local",
        subido_por:              datos.subido_por ?? null,
      },
    });

    logger.success("Evidencias", "Evidencia registrada", { id: evidencia.id });
    return evidencia;
  } catch (err: any) {
    logger.error("Evidencias", "Error al crear evidencia", { error: err.message });
    return { error: "Error interno al registrar evidencia" };
  }
}

export async function listarEvidenciasService(no_siniestro: string) {
  try {
    return await prisma.evidencia.findMany({
      where: { no_siniestro },
      orderBy: { fecha_carga: "desc" },
    });
  } catch (err: any) {
    logger.error("Evidencias", "Error al listar evidencias", { error: err.message });
    return { error: "Error al obtener evidencias" };
  }
}

export async function eliminarEvidenciaService(
  id: number
): Promise<{ ok: true } | ServiceError> {
  try {
    const evidencia = await prisma.evidencia.findUnique({ where: { id } });
    if (!evidencia) return { error: "Evidencia no encontrada" };

    if (evidencia.ruta) {
      const rutaAbsoluta = path.resolve(evidencia.ruta);
      if (fs.existsSync(rutaAbsoluta)) fs.unlinkSync(rutaAbsoluta);
    }

    await prisma.evidencia.delete({ where: { id } });
    logger.success("Evidencias", "Evidencia eliminada", { id });
    return { ok: true };
  } catch (err: any) {
    logger.error("Evidencias", "Error al eliminar evidencia", { error: err.message });
    return { error: "Error interno al eliminar evidencia" };
  }
}