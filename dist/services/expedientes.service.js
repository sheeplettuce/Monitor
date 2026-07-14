import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Convierte un string de fecha "YYYY-MM-DD" a Date evitando el desfase UTC.
 * Al agregar T12:00:00 se garantiza que la fecha no cambie de día
 * independientemente de la zona horaria del servidor.
 */
function parseFecha(valor) {
    return new Date(valor.includes("T") ? valor : `${valor}T12:00:00`);
}
const CAMPOS_FECHA = [
    "fecha_ingreso",
    "fecha_valuacion",
    "fecha_autorizacion",
    "fecha_pzas_completas",
    "fecha_entrega",
];
// Campos timestamp (ISO string con hora) que se guardan como Timestamp en BD
const CAMPOS_TIMESTAMP = [
    "dato1_fecha_hora",
    "dato2_fecha_hora",
    "dato3_fecha_hora",
    "dato4_fecha_hora",
    "comentarios_aseguradora_fh",
];
export async function listarExpedientesService() {
    try {
        return await prisma.expediente.findMany({
            select: {
                no_siniestro: true,
                factura: true,
                orden: true,
                asesor: true,
                fecha_ingreso: true,
                estado: true,
                marca: true,
                placas: true,
                tipo: true,
                color: true,
                modelo: true,
                nombre_cliente: true,
                telefono_cliente: true,
                aseguradora: { select: { id: true, nombre: true } },
            },
            orderBy: { fecha_ingreso: "desc" },
        });
    }
    catch (err) {
        logger.error("Expedientes", "Error al listar expedientes", {
            error: err.message,
        });
        return { error: "Error al obtener la lista de expedientes" };
    }
}
export async function listarExpedientesPendientesService() {
    try {
        // Filtra directo por la columna del expediente, que ya se mantiene
        // sincronizada en sincronizarUbicacionExpedienteService: pasa a "Nube"
        // solo cuando ya no le queda ninguna evidencia Local. No hace falta
        // revisar evidencia[] aquí.
        // Además, solo puede aparecer como "listo para subir" un expediente
        // que ya cerró su ciclo (estado "Salida") — mientras esté activo
        // (Ingreso, Restauracion, Pendiente_de_salida) no debe respaldarse
        // ni desaparecer del gestor de estados con evidencia local aún viva.
        return await prisma.expediente.findMany({
            where: {
                ubicacion_almacenamiento: "Local",
                estado: "Salida",
            },
            select: {
                no_siniestro: true,
                factura: true,
                orden: true,
                asesor: true,
                fecha_ingreso: true,
                estado: true,
                marca: true,
                placas: true,
                tipo: true,
                color: true,
                modelo: true,
                nombre_cliente: true,
                telefono_cliente: true,
                aseguradora: { select: { id: true, nombre: true } },
            },
            orderBy: { fecha_ingreso: "desc" },
        });
    }
    catch (err) {
        logger.error("Expedientes", "Error al listar expedientes pendientes", {
            error: err.message,
        });
        return { error: "Error al obtener la lista de expedientes pendientes" };
    }
}
export async function listarExpedientesNubeService() {
    try {
        // Inverso de listarExpedientesPendientesService: expedientes cuya
        // columna ya fue sincronizada a "Nube" (todas sus evidencias subidas).
        return await prisma.expediente.findMany({
            where: { ubicacion_almacenamiento: "Nube" },
            select: {
                no_siniestro: true,
                factura: true,
                orden: true,
                asesor: true,
                fecha_ingreso: true,
                estado: true,
                marca: true,
                placas: true,
                tipo: true,
                color: true,
                modelo: true,
                nombre_cliente: true,
                telefono_cliente: true,
                aseguradora: { select: { id: true, nombre: true } },
            },
            orderBy: { fecha_ingreso: "desc" },
        });
    }
    catch (err) {
        logger.error("Expedientes", "Error al listar expedientes en nube", {
            error: err.message,
        });
        return { error: "Error al obtener la lista de expedientes en la nube" };
    }
}
export async function obtenerExpedienteService(no_siniestro) {
    try {
        return await prisma.expediente.findUnique({
            where: { no_siniestro },
            include: {
                aseguradora: { select: { id: true, nombre: true } },
                historial_estado: { orderBy: { fecha_cambio: "desc" } },
                evidencia: true,
            },
        });
    }
    catch (err) {
        logger.error("Expedientes", "Error al obtener expediente", {
            error: err.message,
        });
        return { error: "Error al obtener el expediente" };
    }
}
export async function crearExpedienteService(datos) {
    try {
        const existe = await prisma.expediente.findUnique({
            where: { no_siniestro: datos.no_siniestro },
        });
        if (existe)
            return { error: "Ya existe un expediente con ese No. Siniestro" };
        // Campos obligatorios al ingreso según ERS RF4: datos del cliente y
        // del vehículo son indispensables para identificar el siniestrado;
        // fecha_ingreso es necesaria porque el sistema asigna estado "Ingreso"
        // automáticamente al crear (RF6). fecha_entrega se exige aquí como
        // la fecha de entrega comprometida desde el ingreso (decisión operativa).
        const faltantes = [];
        if (!datos.nombre_cliente?.trim())
            faltantes.push("nombre_cliente");
        if (!datos.telefono_cliente?.trim())
            faltantes.push("telefono_cliente");
        if (!datos.marca?.trim())
            faltantes.push("marca");
        if (!datos.placas?.trim())
            faltantes.push("placas");
        if (!datos.tipo?.trim())
            faltantes.push("tipo");
        if (!datos.modelo?.trim())
            faltantes.push("modelo");
        if (!datos.fecha_ingreso)
            faltantes.push("fecha_ingreso");
        if (!datos.fecha_entrega)
            faltantes.push("fecha_entrega");
        if (faltantes.length > 0) {
            return { error: `Faltan campos obligatorios: ${faltantes.join(", ")}` };
        }
        const expediente = await prisma.expediente.create({
            data: {
                no_siniestro: datos.no_siniestro,
                factura: datos.factura,
                orden: datos.orden,
                asesor: datos.asesor,
                fecha_ingreso: datos.fecha_ingreso ? parseFecha(datos.fecha_ingreso) : undefined,
                fecha_valuacion: datos.fecha_valuacion ? parseFecha(datos.fecha_valuacion) : undefined,
                fecha_autorizacion: datos.fecha_autorizacion ? parseFecha(datos.fecha_autorizacion) : undefined,
                fecha_pzas_completas: datos.fecha_pzas_completas ? parseFecha(datos.fecha_pzas_completas) : undefined,
                fecha_entrega: datos.fecha_entrega ? parseFecha(datos.fecha_entrega) : undefined,
                tecnico: datos.tecnico,
                mecanico: datos.mecanico,
                vehiculo: datos.vehiculo,
                observaciones: datos.observaciones,
                marca: datos.marca,
                placas: datos.placas,
                tipo: datos.tipo,
                color: datos.color,
                modelo: datos.modelo,
                nombre_cliente: datos.nombre_cliente,
                telefono_cliente: datos.telefono_cliente,
                correo_cliente: datos.correo_cliente,
                comentarios_aseguradora: datos.comentarios_aseguradora,
                comentarios_aseguradora_fh: datos.comentarios_aseguradora_fh ? new Date(datos.comentarios_aseguradora_fh) : undefined,
                dato1: datos.dato1,
                dato1_fecha_hora: datos.dato1_fecha_hora ? new Date(datos.dato1_fecha_hora) : undefined,
                dato2: datos.dato2,
                dato2_fecha_hora: datos.dato2_fecha_hora ? new Date(datos.dato2_fecha_hora) : undefined,
                dato3: datos.dato3,
                dato3_fecha_hora: datos.dato3_fecha_hora ? new Date(datos.dato3_fecha_hora) : undefined,
                dato4: datos.dato4,
                dato4_fecha_hora: datos.dato4_fecha_hora ? new Date(datos.dato4_fecha_hora) : undefined,
                doc_orden_admision: datos.doc_orden_admision,
                doc_identificacion: datos.doc_identificacion,
                doc_tarjeta_circulacion: datos.doc_tarjeta_circulacion,
                doc_caratula_poliza: datos.doc_caratula_poliza,
                doc_carta_reparacion: datos.doc_carta_reparacion,
                doc_comprobante_deducible: datos.doc_comprobante_deducible,
                doc_finiquito: datos.doc_finiquito,
                doc_encuesta_servicio: datos.doc_encuesta_servicio,
                estado: "Ingreso",
                id_aseguradora: datos.id_aseguradora,
                creado_por: datos.creado_por,
            },
        });
        await prisma.historial_estado.create({
            data: {
                no_siniestro: expediente.no_siniestro,
                estado_anterior: null,
                estado_nuevo: "Ingreso",
                cambiado_por: datos.creado_por ?? null,
            },
        });
        logger.success("Expedientes", "Expediente creado", {
            no_siniestro: expediente.no_siniestro,
        });
        return expediente;
    }
    catch (err) {
        logger.error("Expedientes", "Error al crear expediente", {
            error: err.message,
        });
        return { error: "Error interno al crear expediente" };
    }
}
export async function actualizarExpedienteService(no_siniestro, datos) {
    try {
        const existe = await prisma.expediente.findUnique({
            where: { no_siniestro },
        });
        if (!existe)
            return { error: "Expediente no encontrado" };
        // Extraer estado del objeto de datos para que no pueda modificarse desde aquí.
        // El estado solo se cambia mediante el módulo de gestión de estados.
        const { estado: _estado, ...datosSinEstado } = datos;
        // Convertir campos de fecha sin mutar el objeto original
        const data = { ...datosSinEstado };
        for (const campo of CAMPOS_FECHA) {
            if (typeof data[campo] === "string") {
                data[campo] = parseFecha(data[campo]);
            }
        }
        for (const campo of CAMPOS_TIMESTAMP) {
            if (typeof data[campo] === "string") {
                data[campo] = new Date(data[campo]);
            }
        }
        const updated = await prisma.expediente.update({
            where: { no_siniestro },
            data,
        });
        logger.success("Expedientes", "Expediente actualizado", { no_siniestro });
        return updated;
    }
    catch (err) {
        logger.error("Expedientes", "Error al actualizar expediente", {
            error: err.message,
        });
        return { error: "Error interno al actualizar expediente" };
    }
}
export async function eliminarExpedienteService(no_siniestro) {
    try {
        const existe = await prisma.expediente.findUnique({
            where: { no_siniestro },
        });
        if (!existe)
            return { error: "Expediente no encontrado" };
        // El expediente tiene varias tablas hijas con FK sin cascada
        // (checklist_item, checklist, levantamiento_concepto,
        // levantamiento_danios, evidencia, historial_estado). Hay que
        // eliminarlas todas, de hija a padre, antes de borrar el expediente,
        // dentro de una transacción para que sea todo o nada.
        await prisma.$transaction([
            prisma.checklist_item.deleteMany({
                where: { checklist: { no_siniestro } },
            }),
            prisma.checklist.deleteMany({ where: { no_siniestro } }),
            prisma.levantamiento_concepto.deleteMany({
                where: { levantamiento_danios: { no_siniestro } },
            }),
            prisma.levantamiento_danios.deleteMany({ where: { no_siniestro } }),
            prisma.evidencia.deleteMany({ where: { no_siniestro } }),
            prisma.historial_estado.deleteMany({ where: { no_siniestro } }),
            prisma.expediente.delete({ where: { no_siniestro } }),
        ]);
        logger.success("Expedientes", "Expediente eliminado", { no_siniestro });
        return { ok: true, no_siniestro };
    }
    catch (err) {
        logger.error("Expedientes", "Error al eliminar expediente", {
            error: err.message,
        });
        return { error: "Error interno al eliminar expediente" };
    }
}
export async function listarAseguradorasService() {
    try {
        return await prisma.aseguradora.findMany({
            select: { id: true, nombre: true },
            orderBy: { nombre: "asc" },
        });
    }
    catch (err) {
        logger.error("Expedientes", "Error al listar aseguradoras", {
            error: err.message,
        });
        return { error: "Error al obtener la lista de aseguradoras" };
    }
}
//# sourceMappingURL=expedientes.service.js.map