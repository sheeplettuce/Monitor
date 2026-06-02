import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

export async function loginService(username: string, password: string) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario) {
      logger.warn("Auth", "Intento de login con usuario inexistente", { username });
      return null;
    }

    const valido = await bcrypt.compare(password, usuario.password_hash);

    if (!valido) {
      logger.warn("Auth", "Contraseña incorrecta", { username });
      return null;
    }

    logger.success("Auth", "Login exitoso", { username, rol: usuario.rol });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    };

  } catch (err: any) {
    logger.error("Auth", "Error en login", { error: err.message });
    return null;
  }
}
export async function crearUsuarioService(
  nombre: string,
  username: string,
  password: string,
  rol: "Administrador" | "Operador" | "Tecnico"
) {
  try {
    const existe = await prisma.usuario.findUnique({ where: { username } });

    if (existe) {
      logger.warn("Auth", "Intento de crear usuario duplicado", { username });
      return { error: "El username ya está en uso" };
    }

    const password_hash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: { nombre, username, password_hash, rol },
    });

    logger.success("Auth", "Usuario creado", { username, rol });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    };

  } catch (err: any) {
    logger.error("Auth", "Error al crear usuario", { error: err.message });
    return { error: "Error interno al crear usuario" };
  }
}