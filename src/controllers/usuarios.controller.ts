import { Response } from "express";
import {
  listarUsuariosService,
  obtenerUsuarioService,
  actualizarUsuarioService,
  eliminarUsuarioService,
} from "../services/usuarios.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export async function listarUsuarios(req: AuthRequest, res: Response) {
  const result = await listarUsuariosService();
  return res.json(result);
}

export async function obtenerUsuario(req: AuthRequest, res: Response) {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  const result = await obtenerUsuarioService(id);
  if (!result) return res.status(404).json({ error: "Usuario no encontrado" });

  return res.json(result);
}

export async function actualizarUsuario(req: AuthRequest, res: Response) {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  const { nombre, username, password, rol } = req.body;

  const roles = ["Administrador", "Operador", "Tecnico"];
  if (rol && !roles.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Debe ser: ${roles.join(", ")}` });
  }

  if (username && /\s/.test(username)) {
    return res.status(400).json({ error: "El usuario no puede contener espacios" });
  }

  const result = await actualizarUsuarioService(id, { nombre, username, password, rol });

  if ("error" in result) return res.status(400).json(result);

  return res.json(result);
}

export async function eliminarUsuario(req: AuthRequest, res: Response) {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  // No permitir que el admin se elimine a sí mismo
  if (req.usuario?.id === id) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
  }

  const result = await eliminarUsuarioService(id);
  if ("error" in result) return res.status(400).json(result);

  return res.json(result);
}