import { crearEvidenciaService, listarEvidenciasService, eliminarEvidenciaService, } from "../services/evidencias.service.js";
import { respaldarEvidenciasExpedienteService } from "../services/evidencias.service.js";
export async function respaldarEvidencias(req, res) {
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") {
        return res.status(400).json({ error: "Número de siniestro inválido" });
    }
    const resultado = await respaldarEvidenciasExpedienteService(no_siniestro);
    if ("error" in resultado) {
        return res.status(400).json(resultado);
    }
    return res.status(200).json(resultado);
}
function esError(r) {
    return typeof r === "object" && r !== null && "error" in r;
}
export async function subirEvidencia(req, res) {
    console.log("=== SUBIR EVIDENCIA ===");
    console.log("params:", req.params);
    console.log("file:", req.file);
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") {
        return res
            .status(400)
            .json({ error: "Número de siniestro inválido" });
    }
    const archivo = req.file;
    if (!archivo) {
        return res
            .status(400)
            .json({ error: "No se recibió ningún archivo" });
    }
    const categoria = req.body.tipo === "documento" ? "documento" : "evidencia";
    const result = await crearEvidenciaService({
        no_siniestro,
        tipo: categoria,
        nombre_archivo: archivo.originalname,
        ruta: archivo.path,
        subido_por: req.usuario?.id,
    });
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.status(201).json(result);
}
export async function listarEvidencias(req, res) {
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") {
        return res
            .status(400)
            .json({ error: "Número de siniestro inválido" });
    }
    const result = await listarEvidenciasService(no_siniestro);
    if (esError(result)) {
        return res.status(500).json(result);
    }
    return res.json(result);
}
export async function eliminarEvidencia(req, res) {
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") {
        return res
            .status(400)
            .json({ error: "Número de siniestro inválido" });
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
    }
    const result = await eliminarEvidenciaService(id);
    if (esError(result)) {
        const status = result.error.includes("no encontrada") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.json({
        ok: result.ok,
        mensaje: `Carpeta del expediente ${result.eliminada} eliminada completamente`,
        carpetaEliminada: result.eliminada,
    });
}
//# sourceMappingURL=evidencias.controller.js.map