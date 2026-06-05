import { Router } from "express";
import {
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../controllers/usuarios.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Todas las rutas requieren token + rol Administrador
router.get("/",          verificarToken, soloAdmin, listarUsuarios);
router.get("/:id",       verificarToken, soloAdmin, obtenerUsuario);
router.put("/:id",       verificarToken, soloAdmin, actualizarUsuario);
router.delete("/:id",    verificarToken, soloAdmin, eliminarUsuario);

// POST /api/auth/crear ya existe en auth.routes.ts — se reutiliza para crear usuarios

export default router;