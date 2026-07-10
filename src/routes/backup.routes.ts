import { Router } from "express";
import { soloAdmin } from "../middleware/auth.middleware.js";
import {
  obtenerEstadoBackup,
  obtenerLogsBackup,
  exportarEvidencias,
  obtenerProgresoBackup,
  limpiarLogsBackup,
} from "../controllers/backup.controller.js";

const router = Router();

router.get("/estado", soloAdmin, obtenerEstadoBackup);
router.get("/logs", soloAdmin, obtenerLogsBackup);
router.post("/exportar", soloAdmin, exportarEvidencias);
router.get("/progreso", soloAdmin, obtenerProgresoBackup);
router.post("/logs/limpiar", soloAdmin, limpiarLogsBackup);

export default router;