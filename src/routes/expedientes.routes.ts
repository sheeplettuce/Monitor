import { Router } from "express";
import {
  listarExpedientes,
  listarExpedientesPendientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
  listarAseguradoras,
  listarExpedientesNube,
} from "../controllers/expedientes.controller.js";
import {
  verificarToken,
  soloAdmin,
  soloAdminOOperador,
} from "../middleware/auth.middleware.js";
import evidenciasRoutes from "./evidencias.routes.js";
import estadosRoutes from "./estados.routes.js";

const router = Router();

router.get("/", verificarToken, listarExpedientes);
router.get("/pendientes", verificarToken, listarExpedientesPendientes);
router.get("/aseguradoras", verificarToken, listarAseguradoras);

router.get("/", verificarToken, listarExpedientes);
router.get("/pendientes", verificarToken, listarExpedientesPendientes);
router.get("/nube", verificarToken, listarExpedientesNube);
router.get("/aseguradoras", verificarToken, listarAseguradoras);

router.use("/:no_siniestro/evidencias", evidenciasRoutes);
router.use("/:no_siniestro/estado", estadosRoutes);

router.get("/:no_siniestro", verificarToken, obtenerExpediente);
router.post("/", verificarToken, soloAdminOOperador, crearExpediente);
router.put("/:no_siniestro", verificarToken, soloAdminOOperador, actualizarExpediente);
router.delete("/:no_siniestro", verificarToken, soloAdmin, eliminarExpediente);

export default router;