import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVIDENCIAS_DIR = path.join(__dirname, "..", "..", "evidencias");

export type DiscoInfo = {
  libre_gb: number;
  usado_gb: number;
  total_gb: number;
};

function ejecutar(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function checkDiskMac(): Promise<DiscoInfo> {
  const salida = await ejecutar(`df -g "${EVIDENCIAS_DIR}"`);
  const lineas = salida.trim().split("\n");
  const datos = lineas[lineas.length - 1].split(/\s+/);
  // Filesystem 1G-blocks Used Available Capacity ...
  const totalGb = parseInt(datos[1], 10);
  const usadoGb = parseInt(datos[2], 10);
  const libreGb = parseInt(datos[3], 10);
  return { libre_gb: libreGb, usado_gb: usadoGb, total_gb: totalGb };
}

async function checkDiskLinux(): Promise<DiscoInfo> {
  const salida = await ejecutar(`df -BGB "${EVIDENCIAS_DIR}"`);
  const lineas = salida.trim().split("\n");
  const datos = lineas[lineas.length - 1].split(/\s+/);
  // Filesystem Size Used Avail Use% ...
  const totalGb = parseInt(datos[1], 10);
  const usadoGb = parseInt(datos[2], 10);
  const libreGb = parseInt(datos[3], 10);
  return { libre_gb: libreGb, usado_gb: usadoGb, total_gb: totalGb };
}

async function checkDiskWindows(): Promise<DiscoInfo> {
  // Letra de unidad donde vive la carpeta de evidencias, ej "C:"
  const letraUnidad = path.parse(EVIDENCIAS_DIR).root.replace(/\\$/, "") || "C:";

  const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID='${letraUnidad}'\\" | Select-Object Size,FreeSpace | ConvertTo-Json"`;

  const salida = await ejecutar(cmd);
  const datos = JSON.parse(salida.trim());

  const totalBytes = Number(datos.Size);
  const libreBytes = Number(datos.FreeSpace);
  const usadoBytes = totalBytes - libreBytes;

  const aGb = (bytes: number) => Math.round(bytes / 1024 ** 3);

  return {
    libre_gb: aGb(libreBytes),
    usado_gb: aGb(usadoBytes),
    total_gb: aGb(totalBytes),
  };
}

export async function checkDisk(): Promise<DiscoInfo> {
  switch (process.platform) {
    case "darwin":
      return checkDiskMac();
    case "win32":
      return checkDiskWindows();
    default:
      return checkDiskLinux();
  }
}