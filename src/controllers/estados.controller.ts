import { Response } from "express";
import {
  cambiarEstadoService,
  obtenerHistorialEstadoService,
} from "../services/estados.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { estado_enum } from "@prisma/client";

function esError(result: unknown): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as any).error === "string"
  );
}

const ESTADOS_VALIDOS = Object.values(estado_enum);

export async function cambiarEstado(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.params;
  const { estado } = req.body;

  if (!no_siniestro || Array.isArray(no_siniestro)) {
    return res.status(400).json({ error: "No. Siniestro requerido" });
  }

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
    });
  }

  const esAdmin = req.usuario?.rol === "Administrador";

  const result = await cambiarEstadoService(
    no_siniestro,
    estado as estado_enum,
    req.usuario?.id,
    esAdmin
  );

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 400;
    return res.status(status).json(result);
  }

  return res.json(result);
}

export async function obtenerHistorialEstado(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.params;

  if (!no_siniestro || Array.isArray(no_siniestro)) {
    return res.status(400).json({ error: "No. Siniestro requerido" });
  }

  const result = await obtenerHistorialEstadoService(no_siniestro);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return res.json(result);
}