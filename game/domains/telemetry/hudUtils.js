import { WARN_PROXIMITY_YELLOW_M, WARN_PROXIMITY_RED_M } from "@shared/config/constants.js";

export function getProximityLevel(distance) {
  if (!Number.isFinite(distance)) return "none";
  if (distance <= WARN_PROXIMITY_RED_M) return "red";
  if (distance <= WARN_PROXIMITY_YELLOW_M) return "yellow";
  return "none";
}

export function wordHexCore(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) & 0xFFFF;
  return "0X" + h.toString(16).toUpperCase().padStart(4, "0").slice(0, 2) + "·" + h.toString(16).toUpperCase().padStart(4, "0").slice(2);
}

export const WORD_TYPE_MAP = {
  escritor: "NOMBRE·NUCLEO", piloto: "NOMBRE·NUCLEO", palabra: "NOMBRE·NUCLEO",
  silencio: "NOMBRE·NUCLEO", enjambre: "NOMBRE·NUCLEO", lexico: "NOMBRE·NUCLEO",
  sintaxis: "NOMBRE·NUCLEO", cifra: "NOMBRE·NUCLEO", nexo: "NOMBRE·NUCLEO",
  patron: "NOMBRE·NUCLEO", senal: "NOMBRE·NUCLEO", umbral: "NOMBRE·NUCLEO",
  vector: "NOMBRE·NUCLEO", pulso: "NOMBRE·NUCLEO", nodo: "NOMBRE·NUCLEO",
  codigo: "NOMBRE·NUCLEO", glifo: "NOMBRE·NUCLEO", forma: "NOMBRE·NUCLEO",
  flujo: "NOMBRE·NUCLEO",
  babel: "PROPIO·NUCLEO", kael: "PROPIO·NUCLEO", lyra: "PROPIO·NUCLEO",
  voss: "PROPIO·NUCLEO", typo: "PROPIO·NUCLEO",
};
