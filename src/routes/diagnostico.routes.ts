import { Router } from "express";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";
import {
  getEstadoChecks,
  getSyncPendientes,
  getHistorialReciente,
  getUptimeHistorial,
} from "../controllers/diagnostico.controller.js";

const router = Router();
router.get("/checks", verificarToken, soloAdmin, getEstadoChecks);
router.get("/sync-pendientes", verificarToken, soloAdmin, getSyncPendientes);
router.get("/historial-reciente", verificarToken, soloAdmin, getHistorialReciente);
router.get("/uptime", verificarToken, soloAdmin, getUptimeHistorial);
export default router;