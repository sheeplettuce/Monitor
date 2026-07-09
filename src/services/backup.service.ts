import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const b2 = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
  },
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
 * Sube recursivamente toda la carpeta de un expediente (evidencias +
 * DOCUMENTOS REPARACION) a B2, conservando la estructura relativa.
 * Retorna la lista de keys subidas para poder actualizar la BD después.
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

    // entry.parentPath (Node 20+) o entry.path (Node <20) según versión
    const carpetaEntry = (entry as any).parentPath ?? (entry as any).path;
    const rutaAbsoluta = path.join(carpetaEntry, entry.name);
    const rutaRelativa = path.relative(carpetaLocal, rutaAbsoluta);

    // key final en B2: evidencias/{no_siniestro}/{ruta relativa con /}
    const key = `evidencias/${no_siniestro}/${rutaRelativa.split(path.sep).join("/")}`;

    await subirArchivoRespaldo(rutaAbsoluta, key);
    keysSubidas.push(key);
  }

  return keysSubidas;
}