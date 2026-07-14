import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
function dbError(e, contexto) {
    logger.error("Checklist", contexto, e);
    return { error: "Error de base de datos" };
}
function normalizarChecklist(data) {
    return {
        ...data,
        fecha_inspeccion: data.fecha_inspeccion
            ? new Date(`${data.fecha_inspeccion}T00:00:00`)
            : null,
        fecha_vencimiento_seguro: data.fecha_vencimiento_seguro
            ? new Date(`${data.fecha_vencimiento_seguro}T00:00:00`)
            : null,
        fecha_entrega: data.fecha_entrega
            ? new Date(`${data.fecha_entrega}T00:00:00`)
            : null,
        hora: data.hora
            ? new Date(`1970-01-01T${data.hora}:00`)
            : null,
    };
}
export async function crearChecklistService(data) {
    try {
        const checklist = await prisma.checklist.create({
            data: normalizarChecklist(data),
        });
        logger.success("Checklist", "Checklist creado", { id: checklist.id });
        return checklist;
    }
    catch (e) {
        return dbError(e, "crearChecklistService");
    }
}
export async function listarChecklistsService() {
    try {
        return await prisma.checklist.findMany({
            include: { checklist_item: true },
            orderBy: { id: "desc" },
        });
    }
    catch (e) {
        return dbError(e, "listarChecklistsService");
    }
}
export async function obtenerChecklistPorIdService(id) {
    try {
        return await prisma.checklist.findUnique({
            where: { id },
            include: { checklist_item: true },
        });
    }
    catch (e) {
        return dbError(e, "obtenerChecklistPorIdService");
    }
}
export async function obtenerChecklistPorSiniestroService(no_siniestro) {
    try {
        return await prisma.checklist.findFirst({
            where: { no_siniestro },
            include: { checklist_item: true },
            orderBy: { id: "desc" },
        });
    }
    catch (e) {
        return dbError(e, "obtenerChecklistPorSiniestroService");
    }
}
export async function actualizarChecklistService(id, data) {
    try {
        const existe = await prisma.checklist.findUnique({
            where: { id },
        });
        if (!existe)
            return { error: "Checklist no encontrado" };
        const checklist = await prisma.checklist.update({
            where: { id },
            data: normalizarChecklist(data),
        });
        logger.success("Checklist", "Checklist actualizado", { id });
        return checklist;
    }
    catch (e) {
        return dbError(e, "actualizarChecklistService");
    }
}
export async function agregarItemService(id_checklist, data) {
    try {
        const existe = await prisma.checklist.findUnique({
            where: { id: id_checklist },
        });
        if (!existe)
            return { error: "Checklist no encontrado" };
        const item = await prisma.checklist_item.create({
            data: {
                ...data,
                id_checklist,
            },
        });
        return item;
    }
    catch (e) {
        return dbError(e, "agregarItemService");
    }
}
export async function actualizarItemsChecklistService(id_checklist, items) {
    try {
        const existe = await prisma.checklist.findUnique({
            where: { id: id_checklist },
        });
        if (!existe)
            return { error: "Checklist no encontrado" };
        await prisma.checklist_item.deleteMany({
            where: {
                id_checklist,
            },
        });
        if (items.length > 0) {
            await prisma.checklist_item.createMany({
                data: items.map((i) => ({
                    id_checklist,
                    sistema: i.sistema,
                    nombre_item: i.nombre_item,
                    valor: i.valor,
                })),
            });
        }
        return await prisma.checklist_item.findMany({
            where: { id_checklist },
            orderBy: { id: "asc" },
        });
    }
    catch (e) {
        return dbError(e, "actualizarItemsChecklistService");
    }
}
export async function eliminarItemService(id_item) {
    try {
        const existe = await prisma.checklist_item.findUnique({
            where: { id: id_item },
        });
        if (!existe)
            return { error: "Item no encontrado" };
        await prisma.checklist_item.delete({
            where: { id: id_item },
        });
        return { ok: true };
    }
    catch (e) {
        return dbError(e, "eliminarItemService");
    }
}
export async function eliminarChecklistService(id) {
    try {
        const existe = await prisma.checklist.findUnique({
            where: { id },
        });
        if (!existe)
            return { error: "Checklist no encontrado" };
        await prisma.$transaction([
            prisma.checklist_item.deleteMany({
                where: { id_checklist: id },
            }),
            prisma.checklist.delete({
                where: { id },
            }),
        ]);
        logger.success("Checklist", "Checklist eliminado", { id });
        return { ok: true };
    }
    catch (e) {
        return dbError(e, "eliminarChecklistService");
    }
}
//# sourceMappingURL=checklist.service.js.map