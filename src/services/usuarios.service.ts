import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

export async function listarUsuariosService() {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nombre: true, username: true, rol: true },
      orderBy: { id: "asc" },
    });
    return usuarios;
  } catch (err: any) {
    logger.error("Usuarios", "Error al listar usuarios", { error: err.message });
    return [];
  }
}

export async function obtenerUsuarioService(id: number) {
  try {
    return await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, username: true, rol: true },
    });
  } catch (err: any) {
    logger.error("Usuarios", "Error al obtener usuario", { error: err.message });
    return null;
  }
}

export async function actualizarUsuarioService(
  id: number,
  datos: { nombre?: string; username?: string; password?: string; rol?: string }
) {
  try {
    const existe = await prisma.usuario.findUnique({ where: { id } });
    if (!existe) return { error: "Usuario no encontrado" };

    // Si cambia username, verificar que no esté en uso
    if (datos.username && datos.username !== existe.username) {
      const duplicado = await prisma.usuario.findUnique({ where: { username: datos.username } });
      if (duplicado) return { error: "El username ya está en uso" };
    }

    const data: any = {};
    if (datos.nombre !== undefined) data.nombre = datos.nombre;
    if (datos.username) data.username = datos.username;
    if (datos.rol) data.rol = datos.rol;
    if (datos.password) data.password_hash = await bcrypt.hash(datos.password, 10);

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, username: true, rol: true },
    });

    logger.success("Usuarios", "Usuario actualizado", { id, username: updated.username });
    return updated;
  } catch (err: any) {
    logger.error("Usuarios", "Error al actualizar usuario", { error: err.message });
    return { error: "Error interno al actualizar usuario" };
  }
}

export async function eliminarUsuarioService(id: number) {
  try {
    const existe = await prisma.usuario.findUnique({ where: { id } });
    if (!existe) return { error: "Usuario no encontrado" };

    await prisma.usuario.delete({ where: { id } });
    logger.success("Usuarios", "Usuario eliminado", { id });
    return { ok: true, id };
  } catch (err: any) {
    logger.error("Usuarios", "Error al eliminar usuario", { error: err.message });
    return { error: "Error interno al eliminar usuario" };
  }
}