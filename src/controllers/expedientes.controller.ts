import { Response } from "express";
import {
  listarExpedientesService,
  obtenerExpedienteService,
  crearExpedienteService,
  actualizarExpedienteService,
  eliminarExpedienteService,
  listarAseguradorasService,
} from "../services/expedientes.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verifica si el resultado del service es un objeto de error. */
function esError(result: unknown): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as any).error === "string"
  );
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listarExpedientes(req: AuthRequest, res: Response) {
  const result = await listarExpedientesService();

  if (esError(result)) {
    return res.status(500).json(result);
  }

  return res.json(result);
}

export async function obtenerExpediente(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.params;

  if (!no_siniestro || Array.isArray(no_siniestro)) {
    return res.status(400).json({ error: "No. Siniestro requerido" });
  }

  const result = await obtenerExpedienteService(no_siniestro);

  if (esError(result)) {
    return res.status(500).json(result);
  }

  if (!result) {
    return res.status(404).json({ error: "Expediente no encontrado" });
  }

  return res.json(result);
}

export async function crearExpediente(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.body;

  if (!no_siniestro?.trim()) {
    return res.status(400).json({ error: "El No. Siniestro es obligatorio" });
  }

  const result = await crearExpedienteService({
    ...req.body,
    no_siniestro: (no_siniestro as string).trim(),
    creado_por: req.usuario?.id,
  });

  if (esError(result)) {
    // Conflicto de duplicado vs error interno
    const status = result.error.includes("Ya existe") ? 409 : 500;
    return res.status(status).json(result);
  }

  return res.status(201).json(result);
}

export async function actualizarExpediente(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.params;

  if (!no_siniestro || Array.isArray(no_siniestro)) {
    return res.status(400).json({ error: "No. Siniestro requerido" });
  }

  const result = await actualizarExpedienteService(no_siniestro, req.body);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return res.json(result);
}

export async function eliminarExpediente(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.params;

  if (!no_siniestro || Array.isArray(no_siniestro)) {
    return res.status(400).json({ error: "No. Siniestro requerido" });
  }

  const result = await eliminarExpedienteService(no_siniestro);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return res.json(result);
}

export async function listarAseguradoras(req: AuthRequest, res: Response) {
  const result = await listarAseguradorasService();

  if (esError(result)) {
    return res.status(500).json(result);
  }

  return res.json(result);
}