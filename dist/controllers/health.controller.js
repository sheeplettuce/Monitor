import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "../config/prisma.js";
const EVIDENCIAS_DIR = path.resolve(process.cwd(), process.env["EVIDENCIAS_DIR"] ?? "../evidencias");
const isWindows = process.platform === "win32";
export async function getHealth(req, res) {
    // Obtener IP del cliente o servidor
    const ip = req.ip || req.socket.remoteAddress || "desconocida";
    const result = {
        ip,
        backend: false,
        database: false,
        disco: { libre_GB: "0", usado_GB: "0", total_GB: "0" },
        evidencias: { archivos: 0, tamaño_MB: "0" },
        expedientes: 0,
        ram: { usada_MB: 0, total_MB: 0 },
    };
    result.backend = true;
    try {
        await prisma.$queryRaw `SELECT 1`;
        result.database = true;
    }
    catch {
        result.database = false;
    }
    try {
        if (isWindows) {
            const raw = execSync(`wmic logicaldisk where "DeviceID='C:'" get FreeSpace,Size /format:csv`, { encoding: "utf8" });
            const lines = raw.trim().split("\n").filter((l) => l.includes(",") && !l.startsWith("Node"));
            const parts = lines[0].trim().split(",");
            const free = parseInt(parts[1]);
            const total = parseInt(parts[2]);
            result.disco = {
                libre_GB: (free / 1e9).toFixed(1),
                usado_GB: ((total - free) / 1e9).toFixed(1),
                total_GB: (total / 1e9).toFixed(1),
            };
        }
        else {
            const raw = execSync("df -BGB . --output=avail,used,size", { encoding: "utf8" });
            const parts = raw.trim().split("\n")[1].trim().split(/\s+/).map((v) => v.replace("G", ""));
            result.disco = { libre_GB: parts[0], usado_GB: parts[1], total_GB: parts[2] };
        }
    }
    catch { }
    try {
        if (fs.existsSync(EVIDENCIAS_DIR)) {
            const archivos = fs.readdirSync(EVIDENCIAS_DIR);
            const totalSize = archivos.reduce((acc, file) => {
                const stat = fs.statSync(path.join(EVIDENCIAS_DIR, file));
                return acc + stat.size;
            }, 0);
            result.evidencias = {
                archivos: archivos.length,
                tamaño_MB: (totalSize / 1024 / 1024).toFixed(1),
            };
        }
    }
    catch { }
    // RAM
    const mem = process.memoryUsage();
    result.ram = {
        usada_MB: Math.round(mem.rss / 1024 / 1024),
        total_MB: Math.round(os.totalmem() / 1024 / 1024),
    };
    // Expedientes
    try {
        result.expedientes = await prisma.expediente.count();
    }
    catch {
        result.expedientes = 0;
    }
    res.json(result);
}
//# sourceMappingURL=health.controller.js.map