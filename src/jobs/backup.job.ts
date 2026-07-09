import cron from "node-cron";
import { exec } from "child_process";
import path from "path";
import os from "os";
import { subirArchivoRespaldo } from "../services/backup.service.js";

export async function ejecutarRespaldo() {
  const dumpPath = path.join(os.tmpdir(), `monitor_${Date.now()}.sql`);

  return new Promise<void>((resolve, reject) => {
    exec(`pg_dump "${process.env.DATABASE_URL}" -f "${dumpPath}"`, async (err) => {
      if (err) {
        console.error("Error en pg_dump:", err);
        return reject(err);
      }
      try {
        await subirArchivoRespaldo(dumpPath, `backups/db/${path.basename(dumpPath)}`);
        console.log("Respaldo subido correctamente:", dumpPath);
        resolve();
      } catch (uploadErr) {
        console.error("Error subiendo a B2:", uploadErr);
        reject(uploadErr);
      }
    });
  });
}

// todos los días a las 2am
cron.schedule("0 2 * * *", () => {
  ejecutarRespaldo().catch((e) => console.error("Falló el respaldo programado:", e));
});