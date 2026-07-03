import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type ServiceError = { error: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const EVIDENCIAS_DIR = path.join(__dirname, "..", "..", "evidencias");

function subcarpetaPorTipo(tipo: string): string {
  return tipo === "documento" ? "DOCUMENTOS REPARACION" : "evidencias";
}

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

    const subcarpeta = subcarpetaPorTipo(datos.tipo);

    const evidencia = await prisma.evidencia.create({
      data: {
        no_siniestro:            datos.no_siniestro,
        tipo:                    datos.tipo,
        nombre_archivo:          datos.nombre_archivo,
        ruta: `/evidencias/${datos.no_siniestro}/${subcarpeta}/${path.basename(datos.ruta)}`,
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
    const data = await prisma.evidencia.findMany({
      where: { no_siniestro },
      orderBy: { fecha_carga: "desc" },
    });

    return data.map((e) => ({
      id: e.id,
      no_siniestro: e.no_siniestro,
      tipo: e.tipo,
      nombre_archivo: e.nombre_archivo,
      ruta: e.ruta,
      fecha_carga: e.fecha_carga,
    }));
  } catch (err: any) {
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
      const relativa = evidencia.ruta.replace(/^\/evidencias\//, "");
      const rutaAbsoluta = path.join(EVIDENCIAS_DIR, relativa);
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

export function eliminarCarpetaEvidencias(no_siniestro: string) {
  const carpeta = path.join(EVIDENCIAS_DIR, no_siniestro);
  if (fs.existsSync(carpeta)) fs.rmSync(carpeta, { recursive: true, force: true });
}