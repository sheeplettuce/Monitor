import { Request, Response } from "express";
import { loginService, crearUsuarioService } from "../services/auth.service.js";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Usuario y contraseña requeridos" });
    return;
  }

  const result = await loginService(username, password);

  if (!result) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  res.json(result);
}


export async function crearUsuario(req: Request, res: Response) {
  const { nombre, username, password, rol } = req.body;

  if (!username || !password || !rol) {
    res.status(400).json({ error: "username, password y rol son requeridos" });
    return;
  }

  const roles = ["Administrador", "Operador", "Tecnico"];
  if (!roles.includes(rol)) {
    res.status(400).json({ error: `Rol inválido. Debe ser: ${roles.join(", ")}` });
    return;
  }

  const result = await crearUsuarioService(nombre, username, password, rol);

  if ("error" in result) {
    res.status(400).json(result);
    return;
  }

  res.status(201).json(result);
}