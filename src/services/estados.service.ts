import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import { estado_enum } from "@prisma/client";

export type ServiceError = { error: string };

export async function cambiarEstadoService(
  no_siniestro: string,
  nuevo_estado: estado_enum,
  cambiado_por: number | undefined
): Promise<Awaited<ReturnType<typeof prisma.expediente.update>> | ServiceError> {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { no_siniestro },
      select: { estado: true },
    });

    if (!expediente) return { error: "Expediente no encontrado" };

    const estado_actual = expediente.estado;

    if (estado_actual === nuevo_estado) {
      return { error: "El expediente ya se encuentra en ese estado" };
    }

    // Administrador y Operador tienen el mismo nivel de acceso para
    // cambiar el estado a cualquier valor (ver matriz de roles IEEE 830).
    // Técnico nunca llega aquí: la ruta ya lo bloquea con soloAdminOOperador.

    const [, expedienteActualizado] = await prisma.$transaction([
      prisma.historial_estado.create({
        data: {
          no_siniestro,
          estado_anterior: estado_actual,
          estado_nuevo: nuevo_estado,
          cambiado_por: cambiado_por ?? null,
        },
      }),
      prisma.expediente.update({
        where: { no_siniestro },
        data: { estado: nuevo_estado },
      }),
    ]);

    logger.success("Estados", "Estado de expediente actualizado", {
      no_siniestro,
      estado_anterior: estado_actual,
      estado_nuevo: nuevo_estado,
    });

    return expedienteActualizado;
  } catch (err: any) {
    logger.error("Estados", "Error al cambiar estado del expediente", {
      error: err.message,
    });
    return { error: "Error interno al cambiar el estado del expediente" };
  }
}

export async function obtenerHistorialEstadoService(
  no_siniestro: string
): Promise<Awaited<ReturnType<typeof prisma.historial_estado.findMany>> | ServiceError> {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { no_siniestro },
      select: { no_siniestro: true },
    });

    if (!expediente) return { error: "Expediente no encontrado" };

    return await prisma.historial_estado.findMany({
      where: { no_siniestro },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { fecha_cambio: "desc" },
    });
  } catch (err: any) {
    logger.error("Estados", "Error al obtener historial de estados", {
      error: err.message,
    });
    return { error: "Error al obtener el historial de estados" };
  }
}