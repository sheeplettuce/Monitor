import { Router } from "express";
import { getLogs, downloadLogs } from "../controllers/logs.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", verificarToken, soloAdmin, getLogs);
router.get("/download", verificarToken, soloAdmin, downloadLogs);
export default router;