import { Router } from "express";
import {
  listarExpedientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
  listarAseguradoras,
} from "../controllers/expedientes.controller.js";
import {
  verificarToken,
  soloAdmin,
  soloAdminOOperador,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET  /expedientes              → todos los roles autenticados
// GET  /expedientes/aseguradoras → todos los roles autenticados
//   ⚠️  /aseguradoras debe ir ANTES de /:no_siniestro para que Express
//      no lo interprete como parámetro dinámico.
// GET  /expedientes/:no_siniestro → todos los roles autenticados
// POST /expedientes              → Admin y Operador (Técnico solo lectura según ERS)
// PUT  /expedientes/:no_siniestro → Admin y Operador
// DELETE /expedientes/:no_siniestro → solo Admin

router.get(
  "/",
  verificarToken,
  listarExpedientes
);

router.get(
  "/aseguradoras",
  verificarToken,
  listarAseguradoras
);

router.get(
  "/:no_siniestro",
  verificarToken,
  obtenerExpediente
);

router.post(
  "/",
  verificarToken,
  soloAdminOOperador,
  crearExpediente
);

router.put(
  "/:no_siniestro",
  verificarToken,
  soloAdminOOperador,
  actualizarExpediente
);

router.delete(
  "/:no_siniestro",
  verificarToken,
  soloAdmin,
  eliminarExpediente
);

export default router;