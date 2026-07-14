import { crearChecklistService, listarChecklistsService, obtenerChecklistPorIdService, obtenerChecklistPorSiniestroService, actualizarChecklistService, agregarItemService, eliminarItemService, eliminarChecklistService, actualizarItemsChecklistService, } from "../services/checklist.service.js";
function esError(result) {
    return (typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string");
}
export async function crearChecklist(req, res) {
    const result = await crearChecklistService(req.body);
    if (esError(result))
        return res.status(500).json(result);
    return res.status(201).json(result);
}
export async function listarChecklists(req, res) {
    const result = await listarChecklistsService();
    if (esError(result))
        return res.status(500).json(result);
    return res.json(result);
}
export async function obtenerChecklistPorId(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ error: "ID inválido" });
    const result = await obtenerChecklistPorIdService(id);
    if (esError(result))
        return res.status(500).json(result);
    if (!result)
        return res.status(404).json({ error: "Checklist no encontrado" });
    return res.json(result);
}
export async function obtenerChecklistPorSiniestro(req, res) {
    const no_siniestro = String(req.params.no_siniestro);
    if (!no_siniestro)
        return res.status(400).json({ error: "No. Siniestro requerido" });
    const result = await obtenerChecklistPorSiniestroService(no_siniestro);
    if (esError(result))
        return res.status(500).json(result);
    if (!result)
        return res.status(404).json({ error: "Checklist no encontrado" });
    return res.json(result);
}
export async function actualizarChecklist(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ error: "ID inválido" });
    const result = await actualizarChecklistService(id, req.body);
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.json(result);
}
export async function agregarItem(req, res) {
    const id_checklist = Number(req.params.id);
    if (!id_checklist)
        return res.status(400).json({ error: "ID inválido" });
    const result = await agregarItemService(id_checklist, req.body);
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.status(201).json(result);
}
export async function actualizarItemsChecklist(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ error: "ID inválido" });
    const result = await actualizarItemsChecklistService(id, req.body.items ?? []);
    if (esError(result))
        return res.status(500).json(result);
    return res.json(result);
}
export async function eliminarItem(req, res) {
    const id_item = Number(req.params.id_item);
    if (!id_item)
        return res.status(400).json({ error: "ID inválido" });
    const result = await eliminarItemService(id_item);
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.json(result);
}
export async function eliminarChecklist(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ error: "ID inválido" });
    const result = await eliminarChecklistService(id);
    if (esError(result)) {
        const status = result.error.includes("no encontrado") ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.json(result);
}
//# sourceMappingURL=checklist.controller.js.map