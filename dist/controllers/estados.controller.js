import { cambiarEstadoService, obtenerHistorialEstadoService, } from "../services/estados.service.js";
import { estado_enum } from "@prisma/client";
function esError(result) {
    return (typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string");
}
const ESTADOS_VALIDOS = Object.values(estado_enum);
export async function cambiarEstado(req, res) {
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
    const result = await cambiarEstadoService(no_siniestro, estado, req.usuario?.id);
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 400;
        return res.status(status).json(result);
    }
    return res.json(result);
}
export async function obtenerHistorialEstado(req, res) {
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
//# sourceMappingURL=estados.controller.js.map