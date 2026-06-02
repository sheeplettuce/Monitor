import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

function timestamp(): string {
  return new Date().toISOString();
}

function colorize(level: LogLevel, msg: string): string {
  const colors: Record<LogLevel, string> = {
    INFO:    "\x1b[36m",  // cyan
    WARN:    "\x1b[33m",  // amarillo
    ERROR:   "\x1b[31m",  // rojo
    SUCCESS: "\x1b[32m",  // verde
  };
  const reset = "\x1b[0m";
  return `${colors[level]}[${level}]\x1b[0m ${reset}${msg}`;
}

function writeToFile(level: LogLevel, context: string, msg: string) {
  const line = `[${timestamp()}] [${level}] [${context}] ${msg}\n`;
  fs.appendFileSync(path.join(LOG_DIR, "app.log"), line);
}

export function log(level: LogLevel, context: string, message: string, data?: unknown) {
  const prefix = `\x1b[90m${timestamp()}\x1b[0m \x1b[35m[${context}]\x1b[0m`;
  const dataStr = data !== undefined ? `\n  → ${JSON.stringify(data, null, 2)}` : "";
  console.log(`${prefix} ${colorize(level, message)}${dataStr}`);
  writeToFile(level, context, message + (data ? ` | ${JSON.stringify(data)}` : ""));
}

export const logger = {
  info:    (ctx: string, msg: string, data?: unknown) => log("INFO",    ctx, msg, data),
  warn:    (ctx: string, msg: string, data?: unknown) => log("WARN",    ctx, msg, data),
  error:   (ctx: string, msg: string, data?: unknown) => log("ERROR",   ctx, msg, data),
  success: (ctx: string, msg: string, data?: unknown) => log("SUCCESS", ctx, msg, data),
};