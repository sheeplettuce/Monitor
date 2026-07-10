import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DatosCrearExpediente = {
  no_siniestro: string;
  factura?: string;
  orden?: string;
  asesor?: string;
  fecha_ingreso?: string;
  fecha_valuacion?: string;
  fecha_autorizacion?: string;
  fecha_pzas_completas?: string;
  unidad_terminada?: string;
  tecnico?: string;
  mecanico?: string;
  vehiculo?: string;
  observaciones?: string;
  marca?: string;
  placas?: string;
  tipo?: string;
  color?: string;
  modelo?: string;
  nombre_cliente?: string;
  telefono_cliente?: string;
  correo_cliente?: string;
  dato1?: string;
  dato1_fecha_hora?: string;
  dato2?: string;
  dato2_fecha_hora?: string;
  dato3?: string;
  dato3_fecha_hora?: string;
  dato4?: string;
  dato4_fecha_hora?: string;
  comentarios_aseguradora?: string;
  comentarios_aseguradora_fh?: string;
  doc_orden_admision?: boolean;
  doc_identificacion?: boolean;
  doc_tarjeta_circulacion?: boolean;
  doc_caratula_poliza?: boolean;
  doc_carta_reparacion?: boolean;
  doc_comprobante_deducible?: boolean;
  doc_finiquito?: boolean;
  doc_encuesta_servicio?: boolean;
  id_aseguradora?: number;
  creado_por?: number;
};

export type DatosActualizarExpediente = Partial<
  Omit<DatosCrearExpediente, "no_siniestro" | "creado_por" | "estado">
>;

export type ServiceError = { error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte un string de fecha "YYYY-MM-DD" a Date evitando el desfase UTC.
 * Al agregar T12:00:00 se garantiza que la fecha no cambie de día
 * independientemente de la zona horaria del servidor.
 */
function parseFecha(valor: string): Date {
  return new Date(
    valor.includes("T") ? valor : `${valor}T12:00:00`
  );
}

const CAMPOS_FECHA = [
  "fecha_ingreso",
  "fecha_valuacion",
  "fecha_autorizacion",
  "fecha_pzas_completas",
  "unidad_terminada",
] as const;

// Campos timestamp (ISO string con hora) que se guardan como Timestamp en BD
const CAMPOS_TIMESTAMP = [
  "dato1_fecha_hora",
  "dato2_fecha_hora",
  "dato3_fecha_hora",
  "dato4_fecha_hora",
  "comentarios_aseguradora_fh",
] as const;

// ─── Services ─────────────────────────────────────────────────────────────────

export type ExpedienteResumen = {
  no_siniestro: string;
  factura: string | null;
  orden: string | null;
  asesor: string | null;
  fecha_ingreso: Date | null;
  estado: string;
  marca: string | null;
  placas: string | null;
  tipo: string | null;
  color: string | null;
  modelo: string | null;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  aseguradora: AseguradoraResumen | null;
};

export async function listarExpedientesService(): Promise<
  ExpedienteResumen[] | ServiceError
> {
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
  } catch (err: any) {
    logger.error("Expedientes", "Error al listar expedientes", {
      error: err.message,
    });
    return { error: "Error al obtener la lista de expedientes" };
  }
}

export async function listarExpedientesPendientesService(): Promise<
  ExpedienteResumen[] | ServiceError
> {
  try {
    // Filtra directo por la columna del expediente, que ya se mantiene
    // sincronizada en sincronizarUbicacionExpedienteService: pasa a "Nube"
    // solo cuando ya no le queda ninguna evidencia Local. No hace falta
    // revisar evidencia[] aquí.
    return await prisma.expediente.findMany({
      where: { ubicacion_almacenamiento: "Local" },
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
  } catch (err: any) {
    logger.error("Expedientes", "Error al listar expedientes pendientes", {
      error: err.message,
    });
    return { error: "Error al obtener la lista de expedientes pendientes" };
  }
}

export async function listarExpedientesNubeService(): Promise <
  ExpedienteResumen[] | ServiceError
> {
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
  } catch (err: any) {
    logger.error("Expedientes", "Error al listar expedientes en nube", {
      error: err.message,
    });
    return { error: "Error al obtener la lista de expedientes en la nube" };
  }
}

export async function obtenerExpedienteService(
  no_siniestro: string
): Promise<
  Awaited<ReturnType<typeof prisma.expediente.findUnique>> | ServiceError
> {
  try {
    return await prisma.expediente.findUnique({
      where: { no_siniestro },
      include: {
        aseguradora: { select: { id: true, nombre: true } },
        historial_estado: { orderBy: { fecha_cambio: "desc" } },
        evidencia: true,
      },
    });
  } catch (err: any) {
    logger.error("Expedientes", "Error al obtener expediente", {
      error: err.message,
    });
    return { error: "Error al obtener el expediente" };
  }
}

export async function crearExpedienteService(
  datos: DatosCrearExpediente
): Promise<
  Awaited<ReturnType<typeof prisma.expediente.create>> | ServiceError
> {
  try {
    const existe = await prisma.expediente.findUnique({
      where: { no_siniestro: datos.no_siniestro },
    });
    if (existe) return { error: "Ya existe un expediente con ese No. Siniestro" };

    const expediente = await prisma.expediente.create({
      data: {
        no_siniestro:              datos.no_siniestro,
        factura:                   datos.factura,
        orden:                     datos.orden,
        asesor:                    datos.asesor,
        fecha_ingreso:             datos.fecha_ingreso        ? parseFecha(datos.fecha_ingreso)        : undefined,
        fecha_valuacion:           datos.fecha_valuacion      ? parseFecha(datos.fecha_valuacion)      : undefined,
        fecha_autorizacion:        datos.fecha_autorizacion   ? parseFecha(datos.fecha_autorizacion)   : undefined,
        fecha_pzas_completas:      datos.fecha_pzas_completas ? parseFecha(datos.fecha_pzas_completas) : undefined,
        unidad_terminada:          datos.unidad_terminada     ? parseFecha(datos.unidad_terminada)     : undefined,
        tecnico:                   datos.tecnico,
        mecanico:                  datos.mecanico,
        vehiculo:                  datos.vehiculo,
        observaciones:             datos.observaciones,
        marca:                     datos.marca,
        placas:                    datos.placas,
        tipo:                      datos.tipo,
        color:                     datos.color,
        modelo:                    datos.modelo,
        nombre_cliente:            datos.nombre_cliente,
        telefono_cliente:          datos.telefono_cliente,
        correo_cliente:            datos.correo_cliente,
        comentarios_aseguradora:   datos.comentarios_aseguradora,
        comentarios_aseguradora_fh: datos.comentarios_aseguradora_fh ? new Date(datos.comentarios_aseguradora_fh) : undefined,
        dato1:                     datos.dato1,
        dato1_fecha_hora:          datos.dato1_fecha_hora ? new Date(datos.dato1_fecha_hora) : undefined,
        dato2:                     datos.dato2,
        dato2_fecha_hora:          datos.dato2_fecha_hora ? new Date(datos.dato2_fecha_hora) : undefined,
        dato3:                     datos.dato3,
        dato3_fecha_hora:          datos.dato3_fecha_hora ? new Date(datos.dato3_fecha_hora) : undefined,
        dato4:                     datos.dato4,
        dato4_fecha_hora:          datos.dato4_fecha_hora ? new Date(datos.dato4_fecha_hora) : undefined,
        doc_orden_admision:        datos.doc_orden_admision,
        doc_identificacion:        datos.doc_identificacion,
        doc_tarjeta_circulacion:   datos.doc_tarjeta_circulacion,
        doc_caratula_poliza:       datos.doc_caratula_poliza,
        doc_carta_reparacion:      datos.doc_carta_reparacion,
        doc_comprobante_deducible: datos.doc_comprobante_deducible,
        doc_finiquito:             datos.doc_finiquito,
        doc_encuesta_servicio:     datos.doc_encuesta_servicio,
        estado:                    "Ingreso",
        id_aseguradora:            datos.id_aseguradora,
        creado_por:                datos.creado_por,
      },
    });

    await prisma.historial_estado.create({
      data: {
        no_siniestro:    expediente.no_siniestro,
        estado_anterior: null,
        estado_nuevo:    "Ingreso",
        cambiado_por:    datos.creado_por ?? null,
      },
    });

    logger.success("Expedientes", "Expediente creado", {
      no_siniestro: expediente.no_siniestro,
    });
    return expediente;
  } catch (err: any) {
    logger.error("Expedientes", "Error al crear expediente", {
      error: err.message,
    });
    return { error: "Error interno al crear expediente" };
  }
}

export async function actualizarExpedienteService(
  no_siniestro: string,
  datos: DatosActualizarExpediente
): Promise<
  Awaited<ReturnType<typeof prisma.expediente.update>> | ServiceError
> {
  try {
    const existe = await prisma.expediente.findUnique({
      where: { no_siniestro },
    });
    if (!existe) return { error: "Expediente no encontrado" };

    // Extraer estado del objeto de datos para que no pueda modificarse desde aquí.
    // El estado solo se cambia mediante el módulo de gestión de estados.
    const { estado: _estado, ...datosSinEstado } = datos as any;

    // Convertir campos de fecha sin mutar el objeto original
    const data: Record<string, unknown> = { ...datosSinEstado };
    for (const campo of CAMPOS_FECHA) {
      if (typeof data[campo] === "string") {
        data[campo] = parseFecha(data[campo] as string);
      }
    }
    for (const campo of CAMPOS_TIMESTAMP) {
      if (typeof data[campo] === "string") {
        data[campo] = new Date(data[campo] as string);
      }
    }

    const updated = await prisma.expediente.update({
      where: { no_siniestro },
      data,
    });

    logger.success("Expedientes", "Expediente actualizado", { no_siniestro });
    return updated;
  } catch (err: any) {
    logger.error("Expedientes", "Error al actualizar expediente", {
      error: err.message,
    });
    return { error: "Error interno al actualizar expediente" };
  }
}

export async function eliminarExpedienteService(
  no_siniestro: string
): Promise<{ ok: true; no_siniestro: string } | ServiceError> {
  try {
    const existe = await prisma.expediente.findUnique({
      where: { no_siniestro },
    });
    if (!existe) return { error: "Expediente no encontrado" };

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
  } catch (err: any) {
    logger.error("Expedientes", "Error al eliminar expediente", {
      error: err.message,
    });
    return { error: "Error interno al eliminar expediente" };
  }
}

export type AseguradoraResumen = { id: number; nombre: string | null };

export async function listarAseguradorasService(): Promise<
  AseguradoraResumen[] | ServiceError
> {
  try {
    return await prisma.aseguradora.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
  } catch (err: any) {
    logger.error("Expedientes", "Error al listar aseguradoras", {
      error: err.message,
    });
    return { error: "Error al obtener la lista de aseguradoras" };
  }
}