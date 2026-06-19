import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export interface AuthRequest extends Request {
  usuario?: {
    id: number;
    username: string;
    rol: string;
  };
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      username: string;
      rol: string;
    };

    req.usuario = decoded;
    next();

  } catch (err) {
    logger.warn("Auth", "Token inválido o expirado");
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function soloAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== "Administrador") {
    return res.status(403).json({ error: "Acceso restringido a administradores" });
  }
  next();
}

export function soloAdminOOperador(req: AuthRequest, res: Response, next: NextFunction) {
  const rol = req.usuario?.rol;
  if (rol !== "Administrador" && rol !== "Operador") {
    return res.status(403).json({ error: "Acceso restringido a administradores y operadores" });
  }
  next();
}