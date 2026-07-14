interface CheckResult {
  nombre: string;
  ok: boolean;
  timestamp: string;
}

let ultimaEjecucion: string | null = null;
const resultados: CheckResult[] = [];

export function registrarCheck(nombre: string, ok: boolean) {
  const timestamp = new Date().toISOString();
  const existente = resultados.find((r) => r.nombre === nombre);
  if (existente) {
    existente.ok = ok;
    existente.timestamp = timestamp;
  } else {
    resultados.push({ nombre, ok, timestamp });
  }
}

export function marcarEjecucionCompleta() {
  ultimaEjecucion = new Date().toISOString();
}

export function obtenerEstadoChecks() {
  return { ultimaEjecucion, checks: resultados };
}