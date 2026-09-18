// Degradacion adaptativa de calidad segun el rendimiento REAL medido.
//
// Por que existe: detectQualityTier() adivina el tier a partir de
// maxTextureSize y hardwareConcurrency, y ninguno de los dos mide potencia de
// GPU. maxTextureSize es un limite del driver — una Intel UHD de portatil
// reporta 16384 igual que una tarjeta dedicada — y hardwareConcurrency cuenta
// hilos de CPU. El resultado es que un portatil con grafica integrada puede
// acabar en HIGH, que es el peor reparto posible: las GPU mas debiles
// recibiendo los ajustes mas caros.
//
// Esto no lo arregla adivinando mejor, sino midiendo: si el juego va lento, baja.
//
// Solo degrada, nunca sube. Subir exigiria reconstruir pools y passes ya
// asignados; degradar solo requiere usar menos de lo que ya existe.
//
// Fuente de FPS: TelemetrySystem via Bridge, que publica a 4 Hz. No se duplica
// la medicion a proposito — GameLoop.js declara telemetry como unica fuente.

import { Bridge } from '@shared/state/bridge.js';
import { downgradeQualityTier, getQualityTier } from '@shared/config/qualitySettings.js';

// Umbral de degradacion en ms por frame. 22 ms ~ 45 fps: por debajo de eso el
// movimiento de las naves ya se nota irregular.
const SLOW_FRAME_MS = 22;

// Muestras de telemetria (250 ms cada una) que deben ir mal seguidas antes de
// tocar nada. 12 muestras = 3 segundos: suficiente para no reaccionar a un
// pico puntual como la primera oleada o un GC.
const WINDOW = 12;
const BAD_RATIO = 0.7;   // 70% de la ventana en mal estado

// Arranque: los primeros segundos incluyen carga de assets, compilacion de
// shaders y subida de texturas. Medir ahi daria un falso positivo seguro.
const WARMUP_MS = 8000;

// Tras degradar, esperar antes de volver a evaluar: los cambios tardan en
// notarse y no queremos caer a LOW de golpe por inercia de la ventana.
const COOLDOWN_MS = 6000;

// Un frame de mas de 250 ms no es "ir lento", es una pausa: pestaña en
// segundo plano, alt-tab, breakpoint. Contaminaria la media.
const STALL_MS = 250;

export class AdaptiveQuality {
  constructor({ onDowngrade = null } = {}) {
    this._samples   = [];
    this._lastT     = 0;
    this._startedAt = 0;
    this._pausedUntil = 0;
    this._onDowngrade = onDowngrade;
  }

  update() {
    const now = performance.now();
    if (!this._startedAt) this._startedAt = now;

    if (now - this._startedAt < WARMUP_MS) return;
    if (now < this._pausedUntil) return;

    const t = Bridge.peekState().telemetry;
    if (!t || t.t === this._lastT) return;   // sin muestra nueva
    this._lastT = t.t;

    // Descartar pausas: no son rendimiento, son ausencia de render.
    if (t.frameMsMax >= STALL_MS) {
      this._samples.length = 0;
      return;
    }

    this._samples.push(t.frameMsAvg);
    if (this._samples.length > WINDOW) this._samples.shift();
    if (this._samples.length < WINDOW) return;

    const bad = this._samples.filter((ms) => ms > SLOW_FRAME_MS).length;
    if (bad / WINDOW < BAD_RATIO) return;

    const from = getQualityTier();
    const to   = downgradeQualityTier();
    this._samples.length = 0;
    this._pausedUntil = now + COOLDOWN_MS;

    if (to) {
      console.info(`[quality] ${from} → ${to} (${bad}/${WINDOW} muestras por encima de ${SLOW_FRAME_MS}ms)`);
      this._onDowngrade?.(to, from);
    } else {
      // Ya en LOW y sigue yendo mal: no hay mas que bajar por esta via.
      console.info('[quality] ya en LOW y el rendimiento sigue bajo');
      this._pausedUntil = Infinity;
    }
  }
}
