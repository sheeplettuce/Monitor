import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
export function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token requerido" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    }
    catch (err) {
        logger.warn("Auth", "Token inválido o expirado");
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}
export function soloAdmin(req, res, next) {
    if (req.usuario?.rol !== "Administrador") {
        return res.status(403).json({ error: "Acceso restringido a administradores" });
    }
    next();
}
export function soloAdminOOperador(req, res, next) {
    const rol = req.usuario?.rol;
    if (rol !== "Administrador" && rol !== "Operador") {
        return res.status(403).json({ error: "Acceso restringido a administradores y operadores" });
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map