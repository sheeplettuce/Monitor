import { prisma } from "../config/prisma.js";

interface ConceptoInput {
  claves?: string;
  concepto?: string;
  costo?: number;
}

interface LevantamientoInput {
  no_siniestro: string;
  fecha?: Date | string;
  orden?: string;
  marca?: string;
  tipo?: string;
  modelo?: string;
  placas?: string;
  kilometraje?: string;
  no_puertas?: string;
  color?: string;
  serie?: string;
  eco?: string;
  asegurado_tercero?: string;
  nombre_propietario?: string;
  telefono?: string;
  direccion?: string;
  pega?: string;
  cristales?: boolean;
  aire?: boolean;
  vestiduras?: boolean;
  rin?: boolean;
  direccion_veh?: boolean;
  tipo_pintura?: boolean;
  trasmision?: boolean;
  conceptos?: ConceptoInput[];
}

// El frontend envía la fecha como "DD/MM/AAAA" (formato de DatePickerXP) o
// como "AAAA-MM-DD" (formato usado al precargar desde expediente). Esta
// función normaliza ambos casos a un Date válido para Prisma (@db.Date).
// Si el valor ya es Date, o si viene vacío/indefinido, se retorna tal cual.
function normalizarFecha(valor: Date | string | undefined): Date | undefined {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor;

  const v = valor.trim();
  if (!v) return undefined;

  const ddmmaaaa = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmaaaa) {
    const [, d, m, y] = ddmmaaaa;
    return new Date(`${y}-${m}-${d}T12:00:00`);
  }

  const aaaammdd = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (aaaammdd) {
    return new Date(`${v.slice(0, 10)}T12:00:00`);
  }

  const parsed = new Date(v);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

// RF4 - Registrar el levantamiento de daños al ingreso del siniestrado
export async function crearLevantamientoService(data: LevantamientoInput) {
  const { no_siniestro, conceptos, fecha, ...resto } = data;

  const expediente = await prisma.expediente.findUnique({
    where: { no_siniestro },
  });

  if (!expediente) {
    return { error: "No existe un expediente con ese no_siniestro" };
  }

  try {
    const nuevo = await prisma.levantamiento_danios.create({
      data: {
        no_siniestro,
        fecha: normalizarFecha(fecha),
        ...resto,
        levantamiento_concepto: conceptos?.length
          ? { create: conceptos }
          : undefined,
      },
      include: { levantamiento_concepto: true },
    });

    return nuevo;
  } catch (err: any) {
    return { error: err.message || "Error al crear el levantamiento" };
  }
}

// RF12/RF13 - Listar levantamientos, con filtro opcional por no_siniestro
export async function listarLevantamientosService(no_siniestro?: string) {
  return prisma.levantamiento_danios.findMany({
    where: no_siniestro ? { no_siniestro } : undefined,
    include: { levantamiento_concepto: true },
    orderBy: { id: "desc" },
  });
}

export async function obtenerLevantamientoPorIdService(id: number) {
  const resultado = await prisma.levantamiento_danios.findUnique({
    where: { id },
    include: { levantamiento_concepto: true, expediente: true },
  });

  if (!resultado) {
    return { error: "Levantamiento no encontrado" };
  }

  return resultado;
}

export async function obtenerLevantamientoPorSiniestroService(
  no_siniestro: string
) {
  const resultado = await prisma.levantamiento_danios.findFirst({
    where: { no_siniestro },
    include: { levantamiento_concepto: true },
    orderBy: { id: "desc" },
  });

  if (!resultado) {
    return { error: "No existe levantamiento para este siniestro" };
  }

  return resultado;
}

export async function actualizarLevantamientoService(
  id: number,
  data: Partial<LevantamientoInput>
) {
  const existente = await prisma.levantamiento_danios.findUnique({
    where: { id },
  });

  if (!existente) {
    return { error: "Levantamiento no encontrado" };
  }

  const { conceptos, fecha, ...resto } = data;

  try {
    const actualizado = await prisma.levantamiento_danios.update({
      where: { id },
      data: {
        ...resto,
        ...(fecha !== undefined ? { fecha: normalizarFecha(fecha) } : {}),
      },
      include: { levantamiento_concepto: true },
    });

    return actualizado;
  } catch (err: any) {
    return { error: err.message || "Error al actualizar el levantamiento" };
  }
}

export async function agregarConceptoService(
  id_levantamiento: number,
  concepto: ConceptoInput
) {
  const levantamiento = await prisma.levantamiento_danios.findUnique({
    where: { id: id_levantamiento },
  });

  if (!levantamiento) {
    return { error: "Levantamiento no encontrado" };
  }

  return prisma.levantamiento_concepto.create({
    data: { id_levantamiento, ...concepto },
  });
}

// Eliminación con confirmación previa solicitada en el frontend (RF7 análogo)
export async function eliminarConceptoService(id_concepto: number) {
  const concepto = await prisma.levantamiento_concepto.findUnique({
    where: { id: id_concepto },
  });

  if (!concepto) {
    return { error: "Concepto no encontrado" };
  }

  await prisma.levantamiento_concepto.delete({ where: { id: id_concepto } });

  return { mensaje: "Concepto eliminado correctamente" };
}

export async function eliminarLevantamientoService(id: number) {
  const levantamiento = await prisma.levantamiento_danios.findUnique({
    where: { id },
  });

  if (!levantamiento) {
    return { error: "Levantamiento no encontrado" };
  }

  await prisma.$transaction([
    prisma.levantamiento_concepto.deleteMany({
      where: { id_levantamiento: id },
    }),
    prisma.levantamiento_danios.delete({ where: { id } }),
  ]);

  return { mensaje: "Levantamiento y conceptos eliminados correctamente" };
}

export async function calcularCostoTotalService(id: number) {
  const levantamiento = await prisma.levantamiento_danios.findUnique({
    where: { id },
  });

  if (!levantamiento) {
    return { error: "Levantamiento no encontrado" };
  }

  const conceptos = await prisma.levantamiento_concepto.findMany({
    where: { id_levantamiento: id },
    select: { costo: true },
  });

  const total = conceptos.reduce((acc, c) => acc + Number(c.costo ?? 0), 0);

  return { id_levantamiento: id, total };
}