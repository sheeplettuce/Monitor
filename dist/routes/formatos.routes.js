import { Router } from "express";
import { descargarFormato, descargarChecklist, descargarLevantamiento, } from "../controllers/formatos.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";
const router = Router();
// Todas las rutas requieren autenticación
router.use(verificarToken);
// Descargar formato de expediente
router.get("/formatos/:no_siniestro", descargarFormato);
// Descargar checklist de salida
router.get("/formatos/checklist/:no_siniestro", descargarChecklist);
// Descargar levantamiento de daños
router.get("/formatos/levantamiento/:no_siniestro", descargarLevantamiento);
export default router;
//# sourceMappingURL=formatos.routes.js.map