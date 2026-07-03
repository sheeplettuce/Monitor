import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import { estado_enum } from "@prisma/client";

export type ServiceError = { error: string };

// Orden en el que deben transicionar los expedientes normalmente
const ORDEN_ESTADOS: estado_enum[] = [
  "Ingreso",
  "Restauracion",
  "Pendiente_de_salida",
  "Salida",
];

function esAvanceValido(actual: estado_enum, nuevo: estado_enum): boolean {
  const idxActual = ORDEN_ESTADOS.indexOf(actual);
  const idxNuevo = ORDEN_ESTADOS.indexOf(nuevo);
  // Solo se permite avanzar un paso a la vez
  return idxNuevo === idxActual + 1;
}

export async function cambiarEstadoService(
  no_siniestro: string,
  nuevo_estado: estado_enum,
  cambiado_por: number | undefined,
  esAdmin: boolean
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

    // Operador/Tecnico solo avanzan un paso a la vez.
    // Admin puede mover el expediente a cualquier estado (correcciones).
    if (!esAdmin && !esAvanceValido(estado_actual, nuevo_estado)) {
      return {
        error:
          "No se puede cambiar de \"" +
          estado_actual +
          "\" a \"" +
          nuevo_estado +
          "\". El flujo es: " +
          ORDEN_ESTADOS.join(" -> "),
      };
    }

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
): Promise<
  Awaited<ReturnType<typeof prisma.historial_estado.findMany>> | ServiceError
> {
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