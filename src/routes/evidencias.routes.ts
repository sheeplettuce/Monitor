import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  subirEvidencia,
  listarEvidencias,
  eliminarEvidencia,
} from "../controllers/evidencias.controller.js";
import {
  verificarToken,
  soloAdmin,
  soloAdminOOperador,
} from "../middleware/auth.middleware.js";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const EVIDENCIAS_BASE = path.join(__dirname, "..", "..", "evidencias");

const storage = multer.diskStorage({
    destination(req, _file, cb) {
    const no_siniestro = req.params.no_siniestro;
    if (typeof no_siniestro !== "string") return cb(new Error("Número de siniestro inválido"), "");

    const tipo = (req.query.tipo as string) === "documento" ? "DOCUMENTOS REPARACION" : "evidencias";
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
router.get(
  "/",
  verificarToken,
  listarEvidencias
);

// POST /api/expedientes/:no_siniestro/evidencias
router.post(
  "/",
  verificarToken,
  soloAdminOOperador,
  upload.single("archivo"),
  subirEvidencia
);

// DELETE /api/expedientes/:no_siniestro/evidencias/:id
router.delete(
  "/:id",
  verificarToken,
  soloAdmin,
  eliminarEvidencia
);

export default router;