import { Router } from "express";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";
import { obtenerEstadoBackup, obtenerLogsBackup, exportarEvidencias, obtenerProgresoBackup, limpiarLogsBackup, respaldarEvidenciasPorNoSiniestro, } from "../controllers/backup.controller.js";
const router = Router();
// Rutas específicas PRIMERO
router.post("/logs/limpiar", verificarToken, soloAdmin, limpiarLogsBackup);
router.delete("/logs", verificarToken, soloAdmin, limpiarLogsBackup);
router.post("/exportar/:no_siniestro", verificarToken, soloAdmin, respaldarEvidenciasPorNoSiniestro);
// Rutas genéricas después
router.get("/estado", verificarToken, soloAdmin, obtenerEstadoBackup);
router.get("/logs", verificarToken, soloAdmin, obtenerLogsBackup);
router.post("/exportar", verificarToken, soloAdmin, exportarEvidencias);
router.get("/progreso", verificarToken, soloAdmin, obtenerProgresoBackup);
export default router;
//# sourceMappingURL=backup.routes.js.map