import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
function dbError(e, contexto) {
    logger.error("Comentario", contexto, e);
    return { error: "Error de base de datos" };
}
/**
 * Crea un nuevo comentario asociado a un expediente.
 * `usuario_id` se obtiene del token (controller lo pasa en `data`).
 */
export async function crearComentarioService(data) {
    try {
        const comentario = await prisma.comentario.create({
            data: {
                no_siniestro: data.no_siniestro,
                usuario_id: data.usuario_id,
                comentario: data.comentario,
                // fecha y hora se asignarán automáticamente en la BD
            },
            include: {
                usuario: {
                    select: { id: true, nombre: true, username: true },
                },
            },
        });
        logger.success("Comentario", "Comentario creado", { id: comentario.id });
        return comentario;
    }
    catch (e) {
        return dbError(e, "crearComentarioService");
    }
}
/**
 * Lista todos los comentarios de un expediente, ordenados del más reciente al más antiguo.
 */
export async function listarComentariosPorSiniestroService(no_siniestro) {
    try {
        return await prisma.comentario.findMany({
            where: { no_siniestro },
            orderBy: { fecha_creacion: "desc" },
            include: {
                usuario: {
                    select: { id: true, nombre: true, username: true },
                },
            },
        });
    }
    catch (e) {
        return dbError(e, "listarComentariosPorSiniestroService");
    }
}
/**
 * Elimina un comentario (solo admin debería poder usarlo).
 */
export async function eliminarComentarioService(id) {
    try {
        const existe = await prisma.comentario.findUnique({ where: { id } });
        if (!existe)
            return { error: "Comentario no encontrado" };
        await prisma.comentario.delete({ where: { id } });
        logger.success("Comentario", "Comentario eliminado", { id });
        return { ok: true };
    }
    catch (e) {
        return dbError(e, "eliminarComentarioService");
    }
}
//# sourceMappingURL=comentario.service.js.map