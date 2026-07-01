import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  crearLevantamientoService,
  listarLevantamientosService,
  obtenerLevantamientoPorIdService,
  obtenerLevantamientoPorSiniestroService,
  actualizarLevantamientoService,
  agregarConceptoService,
  eliminarConceptoService,
  eliminarLevantamientoService,
  calcularCostoTotalService,
} from "../services/levantamiento.service.js";

export async function crearLevantamiento(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.body;

  if (!no_siniestro) {
    return res.status(400).json({
      error: "no_siniestro es requerido",
    });
  }

  const result = await crearLevantamientoService(req.body);

  if ("error" in result) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
}

export async function listarLevantamientos(req: AuthRequest, res: Response) {
  const { no_siniestro } = req.query;

  const result = await listarLevantamientosService(
    no_siniestro as string | undefined
  );

  return res.json(result);
}

export async function obtenerLevantamientoPorId(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const result = await obtenerLevantamientoPorIdService(id);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}

export async function obtenerLevantamientoPorSiniestro(
  req: AuthRequest,
  res: Response
) {
  const no_siniestro = req.params.no_siniestro as string;

  const result = await obtenerLevantamientoPorSiniestroService(no_siniestro);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}

export async function actualizarLevantamiento(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const result = await actualizarLevantamientoService(id, req.body);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}

export async function agregarConcepto(req: AuthRequest, res: Response) {
  const id_levantamiento = Number(req.params.id);
  const { concepto, costo } = req.body;

  if (isNaN(id_levantamiento)) {
    return res.status(400).json({ error: "id inválido" });
  }

  if (!concepto) {
    return res.status(400).json({ error: "concepto es requerido" });
  }

  const result = await agregarConceptoService(id_levantamiento, req.body);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.status(201).json(result);
}

export async function eliminarConcepto(req: AuthRequest, res: Response) {
  const id_concepto = Number(req.params.id_concepto);

  if (isNaN(id_concepto)) {
    return res.status(400).json({ error: "id_concepto inválido" });
  }

  const result = await eliminarConceptoService(id_concepto);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}

export async function eliminarLevantamiento(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const result = await eliminarLevantamientoService(id);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}

export async function calcularCostoTotal(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const result = await calcularCostoTotalService(id);

  if ("error" in result) {
    return res.status(404).json(result);
  }

  return res.json(result);
}