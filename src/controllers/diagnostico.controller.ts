import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import { obtenerEstadoChecks } from "../utils/statusStore.js";

export function getEstadoChecks(req: Request, res: Response) {
  res.json(obtenerEstadoChecks());
}

export async function getSyncPendientes(req: Request, res: Response) {
  try {
    const pendientes = await prisma.expediente.count({
      where: { ubicacion_almacenamiento: "Local" },
    });
    res.json({ pendientes });
  } catch {
    res.status(500).json({ error: "No se pudo consultar expedientes pendientes" });
  }
}

export async function getHistorialReciente(req: Request, res: Response) {
  try {
    const historial = await prisma.historial_estado.findMany({
      orderBy: { fecha_cambio: "desc" },
      take: 20,
    });
    res.json(historial);
  } catch {
    res.status(500).json({ error: "No se pudo consultar el historial" });
  }
}

export function getUptimeHistorial(req: Request, res: Response) {
  try {
    const file = path.join(process.cwd(), "logs", "uptime.log");
    if (!fs.existsSync(file)) return res.json([]);
    const lineas = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    res.json(lineas.slice(-20).reverse());
  } catch {
    res.status(500).json({ error: "No se pudo leer el historial de uptime" });
  }
}