import { Router } from "express";
import {
  cambiarEstado,
  obtenerHistorialEstado,
} from "../controllers/estados.controller.js";
import {
  verificarToken,
  soloAdminOOperador,
} from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

// PATCH /expedientes/:no_siniestro/estado           → cambiar estado (Admin y Operador)
// GET   /expedientes/:no_siniestro/estado/historial  → ver historial (todos los roles autenticados)

router.patch(
  "/",
  verificarToken,
  soloAdminOOperador,
  cambiarEstado
);

router.get(
  "/historial",
  verificarToken,
  obtenerHistorialEstado
);

export default router;