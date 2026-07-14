import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { subirEvidencia, listarEvidencias, eliminarEvidencia, } from "../controllers/evidencias.controller.js";
import { verificarToken, soloAdmin, soloAdminOOperador, } from "../middleware/auth.middleware.js";
import { fileURLToPath } from "url";
import { respaldarEvidencias } from "../controllers/evidencias.controller.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVIDENCIAS_BASE = path.join(__dirname, "..", "..", "evidencias");
const storage = multer.diskStorage({
    destination(req, _file, cb) {
        const no_siniestro = req.params.no_siniestro;
        if (typeof no_siniestro !== "string")
            return cb(new Error("Número de siniestro inválido"), "");
        const tipo = req.body.tipo === "documento" ? "DOCUMENTOS REPARACION" : "evidencias";
        const carpeta = path.join(EVIDENCIAS_BASE, no_siniestro, tipo);
        fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename(_req, file, cb) {
        const ts = Date.now();
        const nombre = `${ts}_${file.originalname.replace(/\s+/g, "_")}`;
        cb(null, nombre);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});
const router = Router({ mergeParams: true });
// GET /api/expedientes/:no_siniestro/evidencias
router.get("/", verificarToken, listarEvidencias);
// POST /api/expedientes/:no_siniestro/evidencias
router.post("/", verificarToken, soloAdminOOperador, upload.single("archivo"), subirEvidencia);
// DELETE /api/expedientes/:no_siniestro/evidencias/:id
router.delete("/:id", verificarToken, soloAdmin, eliminarEvidencia);
// DELETE /api/expedientes/:no_siniestro/evidencias
// Elimina la carpeta completa del expediente (usado al cancelar creación)
router.delete("/", verificarToken, soloAdminOOperador, async (req, res) => {
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") {
        return res.status(400).json({ error: "Número de siniestro inválido" });
    }
    const carpeta = path.join(EVIDENCIAS_BASE, no_siniestro);
    // seguridad: nunca borrar fuera de EVIDENCIAS_BASE
    if (!carpeta.startsWith(EVIDENCIAS_BASE)) {
        return res.status(400).json({ error: "Ruta inválida" });
    }
    try {
        await fsp.rm(carpeta, { recursive: true, force: true });
        return res.status(200).json({ ok: true });
    }
    catch (err) {
        console.error("Error eliminando carpeta de evidencias:", err);
        return res.status(500).json({ error: "No se pudo eliminar la carpeta" });
    }
});
// POST /api/expedientes/:no_siniestro/evidencias/respaldar
router.post("/respaldar", verificarToken, soloAdminOOperador, respaldarEvidencias);
export default router;
//# sourceMappingURL=evidencias.routes.js.map