import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";

const ASEGURADORAS = [
  {
    nombre: "AXA",
    archivo: "axa.png",
  },
  {
    nombre: "HDI",
    archivo: "hdi.png",
  },
  {
    nombre: "Qualitas",
    archivo: "qualitas.png",
  },
];

export async function seedAseguradoras(): Promise<void> {
  try {
    const assetsDir = path.resolve(process.cwd(), "assets");

    for (const aseguradora of ASEGURADORAS) {
      const logoPath = path.join(assetsDir, aseguradora.archivo);

      if (!fs.existsSync(logoPath)) {
        console.warn(
          `[ASEGURADORAS] No se encontró el archivo: ${logoPath}`
        );
        continue;
      }

      const logoBuffer = fs.readFileSync(logoPath);

      const existente = await prisma.aseguradora.findFirst({
        where: {
          nombre: aseguradora.nombre,
        },
      });

      if (!existente) {
        await prisma.aseguradora.create({
          data: {
            nombre: aseguradora.nombre,
            logo: logoBuffer,
          },
        });

        console.log(
          `[ASEGURADORAS] Creada: ${aseguradora.nombre}`
        );

        continue;
      }

      if (!existente.logo || existente.logo.length === 0) {
        await prisma.aseguradora.update({
          where: {
            id: existente.id,
          },
          data: {
            logo: logoBuffer,
          },
        });

        console.log(
          `[ASEGURADORAS] Logo actualizado: ${aseguradora.nombre}`
        );

        continue;
      }

      console.log(
        `[ASEGURADORAS] Ya existe: ${aseguradora.nombre}`
      );
    }
  } catch (error) {
    console.error(
      "[ASEGURADORAS] Error al sincronizar aseguradoras:",
      error
    );
  }
}