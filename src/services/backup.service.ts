import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpsAgent } from "https";
import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import { sincronizarUbicacionExpedienteService } from "./evidencias.service.js";
import { EVIDENCIAS_DIR, eliminarCarpetaSiVacia } from "../jobs/backup.job.js";

const b2 = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
  },
  // Sin esto, subidas masivas y secuenciales revientan con "socket hang up":
  // el SDK reutiliza conexiones keep-alive que B2 cierra por inactividad.
  requestHandler: new NodeHttpHandler({
    httpsAgent: new HttpsAgent({ keepAlive: false }),
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
  }),
  maxAttempts: 3,
});

export async function subirArchivoRespaldo(filePath: string, key: string) {
  const fileStream = fs.createReadStream(filePath);
  await b2.send(new PutObjectCommand({
    Bucket: process.env.B2_BUCKET!,
    Key: key,
    Body: fileStream,
  }));
}

/**
 * Genera una URL firmada temporal para visualizar/descargar un archivo privado.
 * expiraSegundos: tiempo de vida de la URL (default 15 min).
 */
export async function generarUrlFirmada(
  key: string,
  expiraSegundos = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET!,
    Key: key,
  });
  return getSignedUrl(b2, command, { expiresIn: expiraSegundos });
}

export async function eliminarArchivoB2(key: string) {
  await b2.send(new DeleteObjectCommand({
    Bucket: process.env.B2_BUCKET!,
    Key: key,
  }));
}

/**
 * Sube recursivamente toda la carpeta de un expediente (evidencias +
 * DOCUMENTOS REPARACION) a B2, y borra los archivos locales conforme
 * se van subiendo exitosamente. Al terminar, intenta borrar la carpeta
 * del no_siniestro (y sus subcarpetas) si quedaron completamente vacías —
 * si queda algo dentro (ej. FORMATOS/ con documentos generados, o algún
 * archivo que falló la subida) no se toca. Retorna las keys subidas.
 */
export async function subirCarpetaEvidencias(
  carpetaLocal: string,
  no_siniestro: string
): Promise<string[]> {
  const keysSubidas: string[] = [];

  if (!fs.existsSync(carpetaLocal)) {
    return keysSubidas;
  }

  const archivos = fs.readdirSync(carpetaLocal, {
    recursive: true,
    withFileTypes: true,
  }) as fs.Dirent[];

  for (const entry of archivos) {
    if (!entry.isFile()) continue;

    const carpetaEntry = (entry as any).parentPath ?? (entry as any).path;
    const rutaAbsoluta = path.join(carpetaEntry, entry.name);
    const rutaRelativa = path.relative(carpetaLocal, rutaAbsoluta);
    const key = `evidencias/${no_siniestro}/${rutaRelativa.split(path.sep).join("/")}`;

    await subirArchivoRespaldo(rutaAbsoluta, key);
    fs.unlinkSync(rutaAbsoluta);
    keysSubidas.push(key);
  }

  try {
    eliminarCarpetaSiVacia(carpetaLocal);
  } catch (err: any) {
    console.error(`No se pudo limpiar carpeta de ${no_siniestro}:`, err.message);
  }

  return keysSubidas;
}