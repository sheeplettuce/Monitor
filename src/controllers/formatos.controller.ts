import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  generarFormatoService,
  generarChecklistService,
  generarLevantamientoService,
} from "../services/formatos.service.js";

function esError(result: unknown): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as any).error === "string"
  );
}

function enviarArchivo(res: Response, result: { ruta: string; nombre: string }) {
  return res.download(result.ruta, result.nombre, (err) => {
    if (err) {
      console.error("Error al enviar el archivo:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al enviar el archivo" });
      }
    }
  });
}

/**
 * Genera el formato Excel del expediente y lo devuelve como descarga.
 * Ruta: GET /api/formatos/:no_siniestro
 */
export async function descargarFormato(req: AuthRequest, res: Response) {
  const no_siniestro = String(req.params.no_siniestro);
  if (!no_siniestro) {
    return res.status(400).json({ error: "Número de siniestro requerido" });
  }

  const result = await generarFormatoService(no_siniestro);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return enviarArchivo(res, result);
}

/**
 * Genera el checklist de salida y lo devuelve como descarga.
 * Ruta: GET /api/formatos/checklist/:no_siniestro
 */
export async function descargarChecklist(req: AuthRequest, res: Response) {
  const no_siniestro = String(req.params.no_siniestro);
  if (!no_siniestro) {
    return res.status(400).json({ error: "Número de siniestro requerido" });
  }

  const result = await generarChecklistService(no_siniestro);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return enviarArchivo(res, result);
}

/**
 * Genera el levantamiento de daños y lo devuelve como descarga.
 * Ruta: GET /api/formatos/levantamiento/:no_siniestro
 */
export async function descargarLevantamiento(req: AuthRequest, res: Response) {
  const no_siniestro = String(req.params.no_siniestro);
  if (!no_siniestro) {
    return res.status(400).json({ error: "Número de siniestro requerido" });
  }

  const result = await generarLevantamientoService(no_siniestro);

  if (esError(result)) {
    const status = result.error.includes("no encontrado") ? 404 : 500;
    return res.status(status).json(result);
  }

  return enviarArchivo(res, result);
}