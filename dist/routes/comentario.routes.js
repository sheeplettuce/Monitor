import { Router } from "express";
import { crearComentario, listarComentarios, eliminarComentario, } from "../controllers/comentario.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";
const router = Router();
// Todas las rutas requieren autenticación
router.use(verificarToken);
// Crear comentario
router.post("/comentarios", crearComentario);
// Listar comentarios de un expediente
router.get("/comentarios/:no_siniestro", listarComentarios);
// Eliminar comentario (solo admin)
router.delete("/comentarios/:id", soloAdmin, eliminarComentario);
export default router;
//# sourceMappingURL=comentario.routes.js.map