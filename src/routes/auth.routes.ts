import { Router } from "express";
import { crearUsuario, login } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", crearUsuario);


export default router;