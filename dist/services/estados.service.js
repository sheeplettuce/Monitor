import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
export async function cambiarEstadoService(no_siniestro, nuevo_estado, cambiado_por) {
    try {
        const expediente = await prisma.expediente.findUnique({
            where: { no_siniestro },
            select: { estado: true },
        });
        if (!expediente)
            return { error: "Expediente no encontrado" };
        const estado_actual = expediente.estado;
        if (estado_actual === nuevo_estado) {
            return { error: "El expediente ya se encuentra en ese estado" };
        }
        // Al pasar a "Salida" son obligatorias: unidad_terminada (expediente)
        // y fecha_entrega (checklist de salida). Sin ambas no se permite el cierre.
        if (nuevo_estado === "Salida") {
            const expedienteCompleto = await prisma.expediente.findUnique({
                where: { no_siniestro },
                select: { unidad_terminada: true },
            });
            if (!expedienteCompleto?.unidad_terminada) {
                return { error: "Falta registrar la fecha de entrega del expediente" };
            }
            const checklist = await prisma.checklist.findFirst({
                where: { no_siniestro },
                orderBy: { id: "desc" },
                select: { fecha_entrega: true },
            });
            if (!checklist) {
                return { error: "No existe checklist de salida para este expediente" };
            }
            if (!checklist.fecha_entrega) {
                return { error: "Falta registrar la fecha de entrega en el checklist" };
            }
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
    }
    catch (err) {
        logger.error("Estados", "Error al cambiar estado del expediente", {
            error: err.message,
        });
        return { error: "Error interno al cambiar el estado del expediente" };
    }
}
export async function obtenerHistorialEstadoService(no_siniestro) {
    try {
        const expediente = await prisma.expediente.findUnique({
            where: { no_siniestro },
            select: { no_siniestro: true },
        });
        if (!expediente)
            return { error: "Expediente no encontrado" };
        return await prisma.historial_estado.findMany({
            where: { no_siniestro },
            include: {
                usuario: { select: { id: true, nombre: true, username: true } },
            },
            orderBy: { fecha_cambio: "desc" },
        });
    }
    catch (err) {
        logger.error("Estados", "Error al obtener historial de estados", {
            error: err.message,
        });
        return { error: "Error al obtener el historial de estados" };
    }
}
//# sourceMappingURL=estados.service.js.map