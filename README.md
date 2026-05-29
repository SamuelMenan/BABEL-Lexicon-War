# BABEL: LEXICON WAR

> *Las palabras no se acaban — solo cambian de mano.*

---

## Transmisión inicial

Hubo un tiempo en que el lenguaje fue herramienta. Después aprendió a pensarse a sí mismo.

De los restos del proyecto **BABEL** —aquella ambición demasiado limpia de la Corporación Nexolang por traducir toda lengua conocida sin pérdida ni ambiguedad— nació el **Enjambre Lexical**: un sistema vivo que no destruye estaciones, las reescribe; que no apaga sistemas, los reinterpreta. Cada unidad porta una palabra-núcleo. Esa palabra es su identidad, su escudo y su única vulnerabilidad.

El **Programa TYPO** —*Typographic Yields for Pattern Operations*— forma a quienes aún saben sostener un teclado bajo presión. Pilotos que no disparan con armas: disparan con palabras. La precisión es la munición. El ritmo es la mira. El silencio es la muerte.

Este repositorio contiene el simulador de campo. Si lo estás leyendo, ya eres cadete.

---

## Qué es

Juego de typing en navegador, ambientado en la trinchera lingüística que dejó BABEL. Dos modos de servicio:

- **Combate** — oleadas del Enjambre con palabras-núcleo flotando sobre cada unidad. Tipear la palabra exacta la colapsa. El error genera **Lex-Heat** (calor léxico): si saturas, *overheat* y tres segundos y medio de cursor muerto.
- **Carrera** — *Sector Halo*. No hay enemigos ni HP. Escribir es avanzar. WPM es velocidad. El error frena. La nave respira al ritmo de tus teclas.

Por encima de ambos: el estado de **Flow**, comunión limpia entre ojo, mano y palabra. Los multiplicadores se apilan. El universo se inclina ligeramente a tu favor.

---

## Mecánicas de mando

| Concepto | Qué hace |
|---|---|
| **Palabra-núcleo** | Identidad y vulnerabilidad de cada unidad enemiga. Escribirla exacta = colapso. |
| **Lex-Heat** | Calor léxico. Sube con error e impacto. Saturación → overheat. |
| **Flow** | Estado de cadencia limpia. Multiplica recompensa y velocidad. |
| **WPM-drive** *(Carrera)* | Velocidad de nave proporcional al WPM sostenido. |
| **Grafemas** | Energía residual liberada por cada palabra-núcleo destruida. Moneda del Programa. |
| **PAT** | Confianza de patrón. Métrica experimental introducida por los analistas de Nexolang. *"Hay algo aquí."* |

---

## Naves del hangar

Cada cadete recibe la **TYPO-STD** *(Clase Estándar)*: triángulo cian, núcleo esférico, booster frío. Sin lujos. Sin historial.

El hangar abre con los grafemas acumulados en misión. Cada chasis cambia la lectura del campo: ángulo de cámara, comportamiento del booster, tolerancia al Lex-Heat. Ninguna nave dispara mejor que otra. Solo el piloto dispara.

---

## Manifiesto de diseño

> *La precisión es la identidad del juego.*

- No se recompensa el error.
- No se recompensa el abandono.
- No hay daño abstraído: hay flujo, y la ausencia de flujo.
- El lenguaje no es decoración. Es el sistema.

Si rompes ritmo, la nebulosa lo nota. Si encuentras Flow, también.

---

## Arquitectura del simulador

Tres capas con frontera estricta. Ninguna cruza a la otra sin pasar por el puente compartido:

```
 app/   ──► shared/        (React: HUD, hangar, menús)
 game/  ──► shared/        (Motor: render, sistemas, worker)
 shared/ ──► nada          (Estado, eventos, constantes de balance)
```

El motor corre headless. El HUD se suscribe a un *Bridge* y baja por props. El **matching léxico** vive en un Web Worker dedicado para que la cadencia de teclado nunca compita con el render.

Stack: **Vite · React 18 · Three.js · Web Worker · Howler · Supabase**.

Documentación viva por área en [`docs/`](./docs):

```
architecture/   overview · core-loop · react-canvas-bridge · state-events · workers
systems/        combat · racing · lexicon · progression · spawn-difficulty · tutorials
economy/        grafemas-rewards · shop-catalog
ui/             hud-system · hud-slots · hangar
design/         vision · racing-mode · difficulty · scenarios · levels
performance/    browsers-plan · quality-settings
```

Para la historia completa: [`docs/BABEL_Lexicon_War_historia.md`](./docs/BABEL_Lexicon_War_historia.md).

---

## Arranque de cabina

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción
npm run preview   # servir build local
```

Recomendado: navegador moderno con soporte WebGL2 y Web Workers. Teclado mecánico opcional, pero el sonido importa más de lo que crees.

---

## Estado del Programa *(2026-05)*

- ✅ Combate, carrera, lexicon worker, economía de grafemas, hangar, perfil persistente.
- ⚠️ FOV dinámico de carrera y balanceo orgánico — en calibración.
- 🚧 Modo híbrido *(Sectores N5–N6)*, tienda de skins/boosters, leaderboard.

---

## Última transmisión registrada

> *"Las palabras no se acaban. Solo cambian de mano."*
>
> — Lyra Voss, quince segundos después de su última señal.
> *Batalla de las Nebulosas Silentes.*
