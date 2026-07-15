CREATE DATABASE MonitorDB;

CREATE TYPE "estado_enum" AS ENUM (
  'Ingreso',
  'Restauracion',
  'Pendiente_de_salida',
  'Salida'
);

CREATE TYPE "rol_enum" AS ENUM (
  'Administrador',
  'Operador',
  'Tecnico'
);

CREATE TYPE "ubicacion_enum" AS ENUM (
  'Local',
  'Nube'
);

CREATE TABLE "usuario" (
  "id" SERIAL PRIMARY KEY,
  "nombre" varchar,
  "username" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "rol" rol_enum NOT NULL
);

CREATE TABLE "aseguradora" (
  "id" SERIAL PRIMARY KEY,
  "nombre" varchar,
  "logo" bytea
);

CREATE TABLE "expediente" (
  "no_siniestro" varchar PRIMARY KEY NOT NULL,
  "factura" varchar,
  "orden" varchar,
  "asesor" varchar,
  "fecha_ingreso" date,
  "fecha_valuacion" date,
  "fecha_autorizacion" date,
  "fecha_pzas_completas" date,
  "fecha_entrega" date,
  "unidad_terminada" date,
  "tecnico" varchar,
  "mecanico" varchar,
  "vehiculo" varchar,
  "observaciones" text,
  "marca" varchar,
  "placas" varchar,
  "tipo" varchar,
  "color" varchar,
  "modelo" varchar,
  "nombre_cliente" varchar,
  "telefono_cliente" varchar,
  "correo_cliente" varchar,
  "dato1" varchar(500),
  "dato1_fecha_hora" timestamp,
  "dato2" varchar(500),
  "dato2_fecha_hora" timestamp,
  "dato3" varchar(500),
  "dato3_fecha_hora" timestamp,
  "dato4" varchar(500),
  "dato4_fecha_hora" timestamp,
  "comentarios_aseguradora" text,
  "comentarios_aseguradora_fh" timestamp,
  "doc_orden_admision" boolean,
  "doc_identificacion" boolean,
  "doc_tarjeta_circulacion" boolean,
  "doc_caratula_poliza" boolean,
  "doc_carta_reparacion" boolean,
  "doc_comprobante_deducible" boolean,
  "doc_finiquito" boolean,
  "doc_encuesta_servicio" boolean,
  "estado" estado_enum NOT NULL DEFAULT 'Ingreso',
  "ubicacion_almacenamiento" ubicacion_enum NOT NULL DEFAULT 'Local',
  "id_aseguradora" integer,
  "creado_por" integer
);

CREATE TABLE "historial_estado" (
  "id" SERIAL PRIMARY KEY,
  "no_siniestro" varchar NOT NULL,
  "estado_anterior" estado_enum,
  "estado_nuevo" estado_enum NOT NULL,
  "fecha_cambio" timestamp NOT NULL DEFAULT (now()),
  "cambiado_por" integer
);

CREATE TABLE "levantamiento_danios" (
  "id" SERIAL PRIMARY KEY,
  "no_siniestro" varchar,
  "fecha" date,
  "orden" varchar,
  "marca" varchar,
  "tipo" varchar,
  "modelo" varchar,
  "placas" varchar,
  "kilometraje" varchar,
  "no_puertas" varchar,
  "color" varchar,
  "serie" varchar,
  "eco" varchar,
  "asegurado_tercero" varchar,
  "nombre_propietario" varchar,
  "telefono" varchar,
  "direccion" varchar,
  "pega" varchar,
  "cristales" boolean,
  "aire" boolean,
  "vestiduras" boolean,
  "rin" boolean,
  "direccion_veh" boolean,
  "tipo_pintura" boolean,
  "trasmision" boolean
);

CREATE TABLE "levantamiento_concepto" (
  "id" SERIAL PRIMARY KEY,
  "id_levantamiento" integer NOT NULL,
  "claves" varchar,
  "concepto" varchar,
  "costo" decimal
);

CREATE TABLE "checklist" (
  "id" SERIAL PRIMARY KEY,
  "no_siniestro" varchar,
  "fecha_inspeccion" date,
  "hora" time,
  "inspeccionado_por" varchar,
  "ubicacion" varchar,
  "aprobada" boolean,
  "detallado" boolean,
  "carroceo_asignado" varchar,
  "mecanico_asignado" varchar,
  "pintor" varchar,
  "area_detallado" varchar,
  "marca_tipo" varchar,
  "anio" varchar,
  "serie" varchar,
  "areas_danadas" text,
  "a" boolean,
  "t" boolean,
  "fecha_vencimiento_seguro" date,
  "deducible" decimal,
  "demerito" decimal,
  "lugar_entrega" varchar,
  "fecha_entrega" date,
  "nombre_quien_recibe" varchar,
  "firma_quien_recibe" varchar,
  "observaciones_adicionales" text
);

CREATE TABLE "checklist_item" (
  "id" SERIAL PRIMARY KEY,
  "id_checklist" integer NOT NULL,
  "sistema" varchar,
  "nombre_item" varchar,
  "valor" varchar
);

CREATE TABLE "evidencia" (
  "id" SERIAL PRIMARY KEY,
  "no_siniestro" varchar NOT NULL,
  "tipo" varchar,
  "nombre_archivo" varchar,
  "ruta" text,
  "fecha_carga" timestamp DEFAULT (now()),
  "ubicacion_almacenamiento" ubicacion_enum NOT NULL DEFAULT 'Local',
  "subido_por" integer
);

CREATE TABLE "comentario" (
  "id" SERIAL PRIMARY KEY,
  "no_siniestro" varchar NOT NULL,
  "usuario_id" integer,
  "fecha" date NOT NULL DEFAULT CURRENT_DATE,
  "hora" time NOT NULL DEFAULT CURRENT_TIME,
  "comentario" text NOT NULL,
  "fecha_creacion" timestamp NOT NULL DEFAULT now()
);


ALTER TABLE "comentario" ADD FOREIGN KEY ("no_siniestro") REFERENCES "expediente" ("no_siniestro") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comentario" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "expediente" ADD FOREIGN KEY ("id_aseguradora") REFERENCES "aseguradora" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "expediente" ADD FOREIGN KEY ("creado_por") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "historial_estado" ADD FOREIGN KEY ("no_siniestro") REFERENCES "expediente" ("no_siniestro") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "historial_estado" ADD FOREIGN KEY ("cambiado_por") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "levantamiento_danios" ADD FOREIGN KEY ("no_siniestro") REFERENCES "expediente" ("no_siniestro") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "levantamiento_concepto" ADD FOREIGN KEY ("id_levantamiento") REFERENCES "levantamiento_danios" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "checklist" ADD FOREIGN KEY ("no_siniestro") REFERENCES "expediente" ("no_siniestro") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "checklist_item" ADD FOREIGN KEY ("id_checklist") REFERENCES "checklist" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "evidencia" ADD FOREIGN KEY ("no_siniestro") REFERENCES "expediente" ("no_siniestro") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "evidencia" ADD FOREIGN KEY ("subido_por") REFERENCES "usuario" ("id") DEFERRABLE INITIALLY IMMEDIATE;


-- Negocios
--ESPACIOS ELIMINADOS
ALTER TABLE usuario
ADD CONSTRAINT chk_username_sin_espacios
CHECK (username !~ '\s');

-- admin por defecto
INSERT INTO usuario (nombre, username, password_hash, rol) 
VALUES 
    ('Admin',
    'Admin',
    '$2b$10$r7W1RiArWuiWnnwNoypN5egbMcMNX2GSuc7URh6IKpoxUmf1BTfs.',
    'Administrador');

-- aseguradoras
INSERT INTO aseguradora (nombre)
VALUES
('AXA'),
('HDI'),
('Qualitas');

-- Actualizar rutas de evidencia
UPDATE evidencia
SET ruta = '/evidencias/' || no_siniestro || '/' || regexp_replace(ruta, '.*[\\/]', '')
WHERE ruta LIKE 'C:%';