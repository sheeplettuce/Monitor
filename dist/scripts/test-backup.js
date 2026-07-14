import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { subirArchivoRespaldo } from "../services/backup.service.js";
async function main() {
    const testFile = path.join(os.tmpdir(), "test-backup.txt");
    fs.writeFileSync(testFile, `prueba de subida - ${new Date().toISOString()}`);
    console.log("Subiendo archivo de prueba a B2...");
    await subirArchivoRespaldo(testFile, `backups/test/test-backup-${Date.now()}.txt`);
    console.log("Subida exitosa ✅");
}
main().catch((err) => {
    console.error("Falló la subida ❌", err);
    process.exit(1);
});
//# sourceMappingURL=test-backup.js.map