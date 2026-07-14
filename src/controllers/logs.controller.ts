import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "app.log");

export function getLogs(req: Request, res: Response) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json([]);
    }
    const contenido = fs.readFileSync(LOG_FILE, "utf8");
    const lineas = contenido.trim().split("\n").filter(Boolean);
    const limite = Number(req.query.limite) || 150;
    res.json(lineas.slice(-limite).reverse());
  } catch {
    res.status(500).json({ error: "No se pudo leer el archivo de logs" });
  }
}

export function downloadLogs(req: Request, res: Response) {
  if (!fs.existsSync(LOG_FILE)) {
    return res.status(404).json({ error: "No hay archivo de logs" });
  }
  res.download(LOG_FILE, "app.log");
}