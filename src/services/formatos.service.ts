import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { imageSize as sizeOf } from "image-size";

export type ServiceError = { error: string };

const PLANTILLA = path.join(process.cwd(), "forms", "EXPEDIENTE.xlsx");
const PLANTILLA_CHECKLIST = path.join(process.cwd(), "forms", "CHECKLIST.xlsx");
const PLANTILLA_LEVANTAMIENTO = path.join(process.cwd(), "forms", "LEVANTAMIENTO_DE_DAÑOS.xlsx");
export const EVIDENCIAS_DIR = path.join(process.cwd(), "evidencias");
const ASSETS_DIR = path.join(process.cwd(), "assets");

const LOGO_MAP: Record<string, string> = {
  AXA: "axa.png",
  HDI: "hdi.png",
  Qualitas: "qualitas.png",
};

function formatoFecha(fecha?: Date | null): string {
  if (!fecha) return "";
  return fecha.toLocaleDateString("es-MX");
}

function formatoFechaHora(fecha?: Date | null): string {
  if (!fecha) return "";
  return fecha.toLocaleString("es-MX");
}

function marcar(valor?: boolean | null): string {
  return valor ? "X" : "";
}

function crearCarpetaFormatos(no_siniestro: string): string {
  const carpetaSiniestro = path.join(EVIDENCIAS_DIR, no_siniestro);
  const carpetaFormatos = path.join(carpetaSiniestro, "FORMATOS");
  if (!fs.existsSync(carpetaFormatos)) {
    fs.mkdirSync(carpetaFormatos, { recursive: true });
  }
  return carpetaFormatos;
}

function esError(result: unknown): result is ServiceError {
  return typeof result === "object" && result !== null && "error" in result;
}

export async function generarFormatoService(
  no_siniestro: string,
  carpetaDestino?: string
): Promise<{ ruta: string; nombre: string } | ServiceError> {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { no_siniestro },
      include: { aseguradora: true },
    });
    if (!expediente) return { error: "Expediente no encontrado" };

    if (!fs.existsSync(PLANTILLA)) {
      logger.error("Formatos", "No se encontró la plantilla", { ruta: PLANTILLA });
      return { error: "Plantilla no encontrada en el servidor" };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(PLANTILLA);
    const ws = workbook.worksheets[0];
    if (!ws) return { error: "La plantilla no contiene hojas de cálculo" };

    ws.getCell("L3").value = expediente.factura ?? "";
    ws.getCell("L5").value = expediente.orden ?? "";
    ws.getCell("L7").value = expediente.asesor ?? "";
    ws.getCell("E9").value = expediente.no_siniestro;
    ws.getCell("K9").value = formatoFecha(expediente.fecha_ingreso);
    ws.getCell("E11").value = formatoFecha(expediente.fecha_valuacion);
    ws.getCell("K11").value = formatoFecha(expediente.fecha_autorizacion);
    ws.getCell("E13").value = formatoFecha(expediente.fecha_pzas_completas);
    ws.getCell("K13").value = formatoFecha(expediente.fecha_entrega);
    ws.getCell("K15").value = expediente.mecanico ?? "";

    ws.getCell("D18").value = expediente.marca ?? "";
    ws.getCell("H18").value = expediente.placas ?? "";
    ws.getCell("D20").value = expediente.tipo ?? "";
    ws.getCell("H20").value = expediente.color ?? "";
    ws.getCell("D22").value = expediente.modelo ?? "";

    ws.getCell("D25").value = expediente.nombre_cliente ?? "";
    ws.getCell("D27").value = expediente.telefono_cliente ?? "";
    ws.getCell("D29").value = expediente.correo_cliente ?? "";

    ws.getCell("K18").value = expediente.observaciones ?? "";

    ws.getCell("C35").value = expediente.dato1 ?? "";
    ws.getCell("M35").value = formatoFechaHora(expediente.dato1_fecha_hora);
    ws.getCell("C39").value = expediente.dato2 ?? "";
    ws.getCell("M39").value = formatoFechaHora(expediente.dato2_fecha_hora);
    ws.getCell("C43").value = expediente.dato3 ?? "";
    ws.getCell("M43").value = formatoFechaHora(expediente.dato3_fecha_hora);
    ws.getCell("C47").value = expediente.dato4 ?? "";
    ws.getCell("M47").value = formatoFechaHora(expediente.dato4_fecha_hora);

    ws.getCell("C53").value = expediente.comentarios_aseguradora ?? "";
    ws.getCell("M53").value = formatoFechaHora(expediente.comentarios_aseguradora_fh);

    ws.getCell("F68").value = marcar(expediente.doc_orden_admision);
    ws.getCell("F70").value = marcar(expediente.doc_identificacion);
    ws.getCell("F72").value = marcar(expediente.doc_tarjeta_circulacion);
    ws.getCell("F74").value = marcar(expediente.doc_caratula_poliza);
    ws.getCell("F76").value = marcar(expediente.doc_carta_reparacion);
    ws.getCell("F78").value = marcar(expediente.doc_comprobante_deducible);
    ws.getCell("F80").value = marcar(expediente.doc_finiquito);
    ws.getCell("F82").value = marcar(expediente.doc_encuesta_servicio);

    if (expediente.aseguradora?.nombre) {
      const logoFileName = LOGO_MAP[expediente.aseguradora.nombre];
      if (logoFileName) {
        const logoPath = path.join(ASSETS_DIR, logoFileName);
        if (fs.existsSync(logoPath)) {
          try {
            const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
            ws.getRow(2).height = 42;
            ws.getRow(3).height = 42;
            const LOGO_SIZE = 105;
            ws.addImage(imageId, {
              tl: { col: 8.15, row: 1.1 },
              ext: { width: LOGO_SIZE, height: LOGO_SIZE },
              editAs: "oneCell",
            });
          } catch (imgErr: any) {
            logger.error("Formatos", "Error al insertar logo", { error: imgErr.message });
          }
        } else {
          logger.error("Formatos", "Logo no encontrado", { ruta: logoPath });
        }
      }
    }

    const carpetaFormatos = carpetaDestino ?? crearCarpetaFormatos(no_siniestro);
    const nombreArchivo = `EXPEDIENTE_${expediente.no_siniestro}.xlsx`;
    const rutaArchivo = path.join(carpetaFormatos, nombreArchivo);
    await workbook.xlsx.writeFile(rutaArchivo);

    logger.success("Formatos", "Formato generado correctamente", {
      no_siniestro: expediente.no_siniestro,
      archivo: nombreArchivo,
    });
    return { ruta: rutaArchivo, nombre: nombreArchivo };
  } catch (err: any) {
    logger.error("Formatos", "Error al generar formato", { error: err.message });
    return { error: "Error interno al generar el formato" };
  }
}

// ============================================================
// CHECKLIST DE SALIDA
// ============================================================

type GrupoChecklist = "izquierda" | "centro" | "derecha";

const GRUPO_COLS: Record<GrupoChecklist, { nombre: string; valores: [string, string, string, string] }> = {
  izquierda: { nombre: "A", valores: ["B", "C", "D", "E"] }, // OK, RE, MA, NA
  centro: { nombre: "F", valores: ["G", "H", "I", "J"] },
  derecha: { nombre: "K", valores: ["L", "M", "N", "O"] },
};

interface ChecklistItemDef {
  sistema: string;
  nombre_item: string;
  row: number;
  grupo: GrupoChecklist;
}

// Mapeo extraído celda por celda de forms/CHECKLIST.xlsx
const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // --- Columna izquierda (A) ---
  ...[
    "Nivel aceite motor", "Eficiencia de motor", "Turbo compresor", "Varilla nivel de aceite",
    "Soporte de motor", "Filtro aire primario", "Filtro aire secundario", "Multiple de admision",
    "Multiple de escape", "Bomba de inyeccion", "Inyectores", "mangueras combustible",
    "Bomba de cebado combustible", "Fugas de combustible", "Filtro de diesel", "Filtro aceite de motor",
    "Filtro separador agua", "Radiador de agua", "Tapa de radiador", "Ventilador", "Tolva radiador",
    "Fugas de refrigerante", "Guardas radiador", "Soporte de radiador", "Posteenfriador",
    "Enfriador aceite motor", "Condensador",
  ].map((nombre_item, i) => ({
    sistema: "SISTEMA DE ENFRIAMIENTO",
    nombre_item,
    row: 15 + i,
    grupo: "izquierda" as GrupoChecklist,
  })),
  ...[
    "Estribos de acceso", "faldones izq y der", "Pasamanos", "Llave de contacto",
    "Pedal aceleracion", "Pedal de freno", "Palanca de cambios", "Cabecera",
    "selector de cambios", "tablero codigos", "Parabrisas", "Tablero de luces",
    "Asientos", "Cinturon de seguridad", "Espejos inferior cabina", "Faro luz de cabina",
    "Radio", "Aire acondicionado",
  ].map((nombre_item, i) => ({
    sistema: "CABINA DE OPERADOR",
    nombre_item,
    row: 43 + i,
    grupo: "izquierda" as GrupoChecklist,
  })),

  // --- Columna centro (F) ---
  ...[
    "Nivel aceite (trans/caja)", "Vanilaje/Visor nivel aceite", "Caja de cambios", "Tapon de drenaje",
    "Filtro aceite de caja", "Tandem", "Eje cardan", "Cruceta", "Eje de diferencial de la nl",
    "Eje diferencial post", "Nivel aceite diferencial",
  ].map((nombre_item, i) => ({
    sistema: "SISTEMA DE TRANSMISION",
    nombre_item,
    row: 15 + i,
    grupo: "centro" as GrupoChecklist,
  })),
  ...["Liquido de freno", "Efectividad de frenado", "Freno motor/escape", "Freno estacionario"].map(
    (nombre_item, i) => ({
      sistema: "SISTEMA DE FRENO",
      nombre_item,
      row: 27 + i,
      grupo: "centro" as GrupoChecklist,
    })
  ),
  ...["Bomba direccion", "Caja de direccion", "Barras de direccion"].map((nombre_item, i) => ({
    sistema: "SISTEMA DE DIRECCION",
    nombre_item,
    row: 32 + i,
    grupo: "centro" as GrupoChecklist,
  })),
  ...["Llantas de repuesto", "Llantas delanteras", "Llantas posteriores", "Esparragos y tuercas"].map(
    (nombre_item, i) => ({
      sistema: "SISTEMA DE RODAMIENTO",
      nombre_item,
      row: 36 + i,
      grupo: "centro" as GrupoChecklist,
    })
  ),
  ...[
    "Baterias(  )marca:", "Loderas delanteras", "Loderas traseras", "Loderas intermedias",
    "Capuchones ruedas", "Valvula de porga", "Tapa baterias", "Surtidor de combustible",
    "Mangueras de servicio", "Cable macho luces", "Placa delantera", "Placa trasera",
    "Concavos de cofre", "Ganchos de cofre", "Tumbaburros", "Neblineros", "Luces adicionales",
  ].map((nombre_item, i) => ({
    sistema: "ACCESORIOS",
    nombre_item,
    row: 41 + i,
    grupo: "centro" as GrupoChecklist,
  })),
  ...[
    "Costados cabina izq", "Costado cabina der", "Cofre", "Espejo retrovisor",
    "Plumillas limpiaparabrisas",
  ].map((nombre_item, i) => ({
    sistema: "CABINA EXTERIOR",
    nombre_item,
    row: 59 + i,
    grupo: "centro" as GrupoChecklist,
  })),

  // --- Columna derecha (K) ---
  ...[
    "Compresor aire a/c", "Motor de compresor aire", "Valvula de seguridad", "Mesa de trabajo",
    "Quinta rueda", "Cajones de herramientas", "Eje delantero", "Baleros delanteros",
  ].map((nombre_item, i) => ({
    sistema: "ESTADO",
    nombre_item,
    row: 15 + i,
    grupo: "derecha" as GrupoChecklist,
  })),
  ...[
    "Alternador", "Pajas de alternador", "Marcha", "Baterias", "Gomas de baterias",
    "Faros delanteros", "Faros traseros", "Luces de freno", "Luces direccionales", "Claxon",
    "Alarma retroceso", "Llave y chapa contacto", "Interruptor con energia",
  ].map((nombre_item, i) => ({
    sistema: "SISTEMA ELECTRICO",
    nombre_item,
    row: 24 + i,
    grupo: "derecha" as GrupoChecklist,
  })),
  ...[
    "Niveles de aceite", "Prueba de manejo", "Niveles de anticongelante",
    "Limpieza de unidad general", "Limpieza chasis", "Detallado",
  ].map((nombre_item, i) => ({
    sistema: "ADICIONALES",
    nombre_item,
    row: 40 + i,
    grupo: "derecha" as GrupoChecklist,
  })),
  ...[
    "Cofre", "Defensa", "Cabina izq", "Cabina der", "Alerones izq", "Alerones der",
  ].map((nombre_item, i) => ({
    sistema: "Cabina General",
    nombre_item,
    row: 50 + i,
    grupo: "derecha" as GrupoChecklist,
  })),
];

function normalizar(txt: string): string {
  return txt
    .toLowerCase()
    .replace(/:/g, "")
    .replace(/\s+/g, "");
}

const CHECKLIST_MAP = new Map<string, ChecklistItemDef>(
  CHECKLIST_ITEMS.map((item) => [
    `${normalizar(item.sistema)}|${normalizar(item.nombre_item)}`,
    item,
  ])
);

const VALOR_INDEX: Record<string, number> = { OK: 0, RE: 1, MA: 2, NA: 3 };

export async function generarChecklistService(
  no_siniestro: string,
  carpetaDestino?: string
): Promise<{ ruta: string; nombre: string } | ServiceError> {
  try {
    const checklist = await prisma.checklist.findFirst({
      where: { no_siniestro },
      include: { checklist_item: true },
    });
    if (!checklist) return { error: "Checklist no encontrado para este siniestro" };

    if (!fs.existsSync(PLANTILLA_CHECKLIST)) {
      logger.error("Formatos", "No se encontró la plantilla de checklist", { ruta: PLANTILLA_CHECKLIST });
      return { error: "Plantilla de checklist no encontrada en el servidor" };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(PLANTILLA_CHECKLIST);
    const ws = workbook.worksheets[0];
    if (!ws) return { error: "La plantilla no contiene hojas de cálculo" };

    // Encabezado
    ws.getCell("A8").value = `Fecha de inspeccion: ${formatoFecha(checklist.fecha_inspeccion)}`;
    ws.getCell("C8").value = checklist.hora ? formatoFechaHora(checklist.hora) : "";
    ws.getCell("F8").value = checklist.inspeccionado_por ?? "";
    ws.getCell("I8").value = checklist.ubicacion ?? "";
    ws.getCell("L8").value = marcar(checklist.aprobada);
    ws.getCell("M8").value = marcar(checklist.detallado);

    ws.getCell("B9").value = checklist.carroceo_asignado ?? "";
    ws.getCell("D9").value = checklist.mecanico_asignado ?? "";
    ws.getCell("H9").value = checklist.pintor ?? "";
    ws.getCell("L9").value = checklist.area_detallado ?? "";

    ws.getCell("A10").value = `Marca y tipo: ${checklist.marca_tipo ?? ""}`;
    ws.getCell("B10").value = `Año: ${checklist.anio ?? ""}`;
    ws.getCell("G10").value = checklist.serie ?? "";

    ws.getCell("B11").value = checklist.areas_danadas ?? "";

    ws.getCell("C12").value = marcar(checklist.a);
    ws.getCell("E12").value = marcar(checklist.t);
    ws.getCell("G12").value = formatoFecha(checklist.fecha_vencimiento_seguro);
    ws.getCell("J12").value = checklist.deducible?.toString() ?? "";
    ws.getCell("L12").value = checklist.demerito?.toString() ?? "";

    // Tabla de sistemas
    const noEncontrados: string[] = [];
    for (const item of checklist.checklist_item) {
      const key = `${normalizar(item.sistema ?? "")}|${normalizar(item.nombre_item ?? "")}`;
      const def = CHECKLIST_MAP.get(key);
      if (!def) {
        noEncontrados.push(`${item.sistema} / ${item.nombre_item}`);
        continue;
      }
      const idx = item.valor ? VALOR_INDEX[item.valor.toUpperCase()] : undefined;
      if (idx === undefined) continue;
      const col = GRUPO_COLS[def.grupo].valores[idx];
      ws.getCell(`${col}${def.row}`).value = "X";
    }
    if (noEncontrados.length > 0) {
      logger.error("Formatos", "checklist_item sin mapeo en plantilla", { items: noEncontrados });
    }

    // Salida y entrega
    ws.getCell("B68").value = checklist.lugar_entrega ?? "";
    ws.getCell("G68").value = formatoFecha(checklist.fecha_entrega);
    ws.getCell("B69").value = checklist.nombre_quien_recibe ?? "";
    ws.getCell("B70").value = checklist.firma_quien_recibe ?? "";
    if (checklist.observaciones_adicionales) {
      ws.getCell("A63").value = checklist.observaciones_adicionales;
    }

    const carpetaFormatos = crearCarpetaFormatos(no_siniestro);
    const nombreArchivo = `CHECKLIST_${no_siniestro}.xlsx`;
    const rutaArchivo = path.join(carpetaFormatos, nombreArchivo);
    await workbook.xlsx.writeFile(rutaArchivo);

    logger.success("Formatos", "Checklist generado correctamente", { no_siniestro, archivo: nombreArchivo });
    return { ruta: rutaArchivo, nombre: nombreArchivo };
  } catch (err: any) {
    logger.error("Formatos", "Error al generar checklist", { error: err.message });
    return { error: "Error interno al generar el checklist" };
  }
}

// ============================================================
// LEVANTAMIENTO DE DAÑOS
// ============================================================

// Filas disponibles para conceptos, evitando la fila 75 (total/IVA)
const FILAS_CONCEPTO_IZQ = [
  ...Array.from({ length: 74 - 21 + 1 }, (_, i) => 21 + i), // 21-74
  ...Array.from({ length: 92 - 76 + 1 }, (_, i) => 76 + i), // 76-92
];
const FILAS_CONCEPTO_DER = [
  ...Array.from({ length: 39 - 21 + 1 }, (_, i) => 21 + i), // 21-39
  ...Array.from({ length: 56 - 43 + 1 }, (_, i) => 43 + i), // 43-56
];

export async function generarLevantamientoService(
  no_siniestro: string,
  carpetaDestino?: string
): Promise<{ ruta: string; nombre: string } | ServiceError> {
  try {
    const levantamiento = await prisma.levantamiento_danios.findFirst({
      where: { no_siniestro },
      include: { levantamiento_concepto: true },
    });
    if (!levantamiento) return { error: "Levantamiento de daños no encontrado para este siniestro" };

    if (!fs.existsSync(PLANTILLA_LEVANTAMIENTO)) {
      logger.error("Formatos", "No se encontró la plantilla de levantamiento", { ruta: PLANTILLA_LEVANTAMIENTO });
      return { error: "Plantilla de levantamiento no encontrada en el servidor" };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(PLANTILLA_LEVANTAMIENTO);
    const ws = workbook.worksheets[0];
    if (!ws) return { error: "La plantilla no contiene hojas de cálculo" };

    // Encabezado
    ws.getCell("L3").value = formatoFecha(levantamiento.fecha);
    ws.getCell("L5").value = levantamiento.orden ?? "";

    ws.getCell("C11").value = levantamiento.eco ?? "";
    ws.getCell("C12").value = levantamiento.asegurado_tercero ?? "";
    ws.getCell("C14").value = levantamiento.nombre_propietario ?? "";
    ws.getCell("C15").value = levantamiento.telefono ?? "";
    ws.getCell("C16").value = levantamiento.direccion ?? "";
    ws.getCell("C17").value = levantamiento.pega ?? "";

    ws.getCell("G10").value = `MARCA: ${levantamiento.marca ?? ""}`;
    ws.getCell("G11").value = `TIPO: ${levantamiento.tipo ?? ""}`;
    ws.getCell("G12").value = `MODELO: ${levantamiento.modelo ?? ""}`;
    ws.getCell("G13").value = `PLACAS: ${levantamiento.placas ?? ""}`;
    ws.getCell("G14").value = `KILOMETRAJE: ${levantamiento.kilometraje ?? ""}`;
    ws.getCell("G15").value = `NO. DE PUERTAS: ${levantamiento.no_puertas ?? ""}`;
    ws.getCell("G16").value = `COLOR: ${levantamiento.color ?? ""}`;
    ws.getCell("G17").value = `SERIE ${levantamiento.serie ?? ""}`;

    ws.getCell("K10").value = marcar(levantamiento.cristales);
    ws.getCell("K11").value = marcar(levantamiento.aire);
    ws.getCell("K12").value = marcar(levantamiento.vestiduras);
    ws.getCell("K13").value = marcar(levantamiento.rin);
    ws.getCell("K14").value = marcar(levantamiento.direccion_veh);
    ws.getCell("K15").value = marcar(levantamiento.tipo_pintura);
    ws.getCell("K16").value = marcar(levantamiento.trasmision);

    // Tabla de conceptos: llena primero la columna izquierda, luego la derecha
    const filasDisponibles = [
      ...FILAS_CONCEPTO_IZQ.map((row) => ({ row, cols: { claves: "A", concepto: "B", costo: "E" } })),
      ...FILAS_CONCEPTO_DER.map((row) => ({ row, cols: { claves: "H", concepto: "I", costo: "L" } })),
    ];

    let totalCosto = 0;
    const conceptos = levantamiento.levantamiento_concepto;
    if (conceptos.length > filasDisponibles.length) {
      logger.error("Formatos", "Más conceptos de los que caben en la plantilla", {
        no_siniestro,
        total: conceptos.length,
        disponibles: filasDisponibles.length,
      });
    }

    conceptos.forEach((c, i) => {
      const slot = filasDisponibles[i];
      if (!slot) return; // se excede la capacidad de la plantilla
      ws.getCell(`${slot.cols.claves}${slot.row}`).value = c.claves ?? "";
      ws.getCell(`${slot.cols.concepto}${slot.row}`).value = c.concepto ?? "";
      const costo = c.costo ? Number(c.costo) : 0;
      ws.getCell(`${slot.cols.costo}${slot.row}`).value = costo;
      totalCosto += costo;
    });

    // Fila 75: subtotal (M75 ya trae la fórmula =L75*1.16 en la plantilla)
    ws.getCell("L75").value = totalCosto;

    const carpetaFormatos = crearCarpetaFormatos(no_siniestro);
    const nombreArchivo = `LEVANTAMIENTO_${no_siniestro}.xlsx`;
    const rutaArchivo = path.join(carpetaFormatos, nombreArchivo);
    await workbook.xlsx.writeFile(rutaArchivo);

    logger.success("Formatos", "Levantamiento generado correctamente", { no_siniestro, archivo: nombreArchivo });
    return { ruta: rutaArchivo, nombre: nombreArchivo };
  } catch (err: any) {
    logger.error("Formatos", "Error al generar levantamiento", { error: err.message });
    return { error: "Error interno al generar el levantamiento" };
  }
}

// ============================================================
// GENERACIÓN PARA RESPALDO (no descarga)
// ============================================================

/**
 * Genera los formatos disponibles directamente en la raíz de la carpeta
 * del no_siniestro (no en FORMATOS/), para que subirCarpetaEvidencias los
 * recoja y suba junto con evidencias y documentos en la misma pasada.
 * El expediente es obligatorio; checklist y levantamiento se omiten en
 * silencio si el expediente aún no los tiene registrados — no truena
 * el respaldo completo por eso.
 */
export async function generarFormatosParaRespaldo(
  no_siniestro: string,
  carpetaDestino: string
): Promise<{ ruta: string; nombre: string }[] | ServiceError> {
  if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino, { recursive: true });
  }

  const generados: { ruta: string; nombre: string }[] = [];

  const expediente = await generarFormatoService(no_siniestro, carpetaDestino);
  if (esError(expediente)) {
    return expediente;
  }
  generados.push(expediente);

  const checklist = await generarChecklistService(no_siniestro, carpetaDestino);
  if (!esError(checklist)) {
    generados.push(checklist);
  } else {
    console.log(`Checklist omitido en respaldo de ${no_siniestro}: ${checklist.error}`);
  }

  const levantamiento = await generarLevantamientoService(no_siniestro, carpetaDestino);
  if (!esError(levantamiento)) {
    generados.push(levantamiento);
  } else {
    console.log(`Levantamiento omitido en respaldo de ${no_siniestro}: ${levantamiento.error}`);
  }

  return generados;
}