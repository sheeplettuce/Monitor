import { Router } from "express";
import { crearUsuario, login } from "../controllers/auth.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);

// Solo administrador puede crear usuarios
router.post("/register", verificarToken, soloAdmin, crearUsuario);

export default router;