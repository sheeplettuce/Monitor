import { Response } from "express";
import {
  crearComentarioService,
  listarComentariosPorSiniestroService,
  eliminarComentarioService,
} from "../services/comentario.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

function esError(result: unknown): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as any).error === "string"
  );
}

export async function crearComentario(req: AuthRequest, res: Response) {
  const { no_siniestro, comentario } = req.body;
  const usuario_id = req.usuario?.id;

  if (!no_siniestro || !comentario) {
    return res.status(400).json({ error: "no_siniestro y comentario son obligatorios" });
  }
  if (!usuario_id) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  const result = await crearComentarioService({
    no_siniestro,
    usuario_id,
    comentario,
  });

  if (esError(result)) return res.status(500).json(result);
  return res.status(201).json(result);
}

export async function listarComentarios(req: AuthRequest, res: Response) {
  const no_siniestro = String(req.params.no_siniestro);
  if (!no_siniestro) {
    return res.status(400).json({ error: "no_siniestro es requerido" });
  }

  const result = await listarComentariosPorSiniestroService(no_siniestro);
  if (esError(result)) return res.status(500).json(result);
  return res.json(result);
}

export async function eliminarComentario(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const result = await eliminarComentarioService(id);
  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }
  return res.json(result);
}