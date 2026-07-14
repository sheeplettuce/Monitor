import { Router } from "express";
import { getLogs } from "../controllers/logs.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";
const router = Router();
router.get("/", verificarToken, soloAdmin, getLogs);
export default router;
//# sourceMappingURL=logs.routes.js.map