import { Router } from "express";
import {
  crearLevantamiento,
  listarLevantamientos,
  obtenerLevantamientoPorId,
  obtenerLevantamientoPorSiniestro,
  actualizarLevantamiento,
  agregarConcepto,
  eliminarConcepto,
  eliminarLevantamiento,
  calcularCostoTotal,
} from "../controllers/levantamiento.controller.js";
import { verificarToken, soloAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verificarToken);

router.post("/levantamientos", crearLevantamiento);
router.get("/levantamientos", listarLevantamientos);
router.get("/levantamientos/siniestro/:no_siniestro", (req, res, next) => {
  console.log("HIT siniestro route:", req.params.no_siniestro);
  next();
}, obtenerLevantamientoPorSiniestro);
router.get("/levantamientos/:id/costo-total", calcularCostoTotal);
router.get("/levantamientos/:id", obtenerLevantamientoPorId);
router.put("/levantamientos/:id", actualizarLevantamiento);
router.post("/levantamientos/:id/conceptos", agregarConcepto);
router.delete("/levantamientos/conceptos/:id_concepto", soloAdmin, eliminarConcepto);
router.delete("/levantamientos/:id", soloAdmin, eliminarLevantamiento);

export default router;