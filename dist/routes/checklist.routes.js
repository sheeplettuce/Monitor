import { Router } from "express";
import { crearChecklist, listarChecklists, obtenerChecklistPorId, obtenerChecklistPorSiniestro, actualizarChecklist, agregarItem, actualizarItemsChecklist, eliminarItem, eliminarChecklist, } from "../controllers/checklist.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";
const router = Router();
router.use(verificarToken);
router.post("/checklist", crearChecklist);
router.get("/checklist", listarChecklists);
router.get("/checklist/siniestro/:no_siniestro", obtenerChecklistPorSiniestro);
router.get("/checklist/:id", obtenerChecklistPorId);
router.put("/checklist/:id", actualizarChecklist);
router.post("/checklist/:id/items", agregarItem);
router.put("/checklist/:id/items/bulk", actualizarItemsChecklist);
router.delete("/checklist/items/:id_item", soloAdmin, eliminarItem);
router.delete("/checklist/:id", soloAdmin, eliminarChecklist);
export default router;
//# sourceMappingURL=checklist.routes.js.map