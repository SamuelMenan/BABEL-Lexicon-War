Modo de dificultad (propuesta)

Objetivo
- Ajustar la penalizacion de errores de mecanografia sin romper el ritmo central de BABEL.
- Mantener la fantasia de "escribir es combatir" en todos los niveles.

Niveles

Facil
- Regla de error: retry.
- Si fallas una letra, no pierdes progreso acumulado de la palabra.
- Solo debes escribir correctamente la letra que fallaste para continuar.
- Recomendado para onboarding y primeras partidas.

Medio
- Regla de error: backstep.
- Si fallas una letra, retrocedes 1 letra en el progreso actual.
- Exige correccion activa sin castigo total.
- Recomendado como modo por defecto.

Dificil
- Regla de error: reset.
- Si fallas una letra, se reinicia la palabra completa.
- Aumenta mucho la tension en oleadas altas.
- Recomendado para jugadores con alta precision.

UX sugerida en menu
- Selector visible antes de iniciar: Facil / Medio / Dificil.
- Estado por defecto: Medio.
- Texto de ayuda bajo el selector:
	- Facil: "Corriges solo la letra equivocada."
	- Medio: "Retrocedes una letra al fallar."
	- Dificil: "Reinicias la palabra al fallar."

Feedback visual sugerido
- Facil: feedback de error leve (sin shake agresivo).
- Medio: shake corto + flash tenue.
- Dificil: shake fuerte + flash rojo + reset instantaneo visible.

Balance recomendado por dificultad
- Facil:
	- Enemigos un poco mas lentos.
	- Ventana entre oleadas ligeramente mayor.
- Medio:
	- Balance actual del prototipo.
- Dificil:
	- Enemigos mas rapidos.
	- Menor tiempo entre oleadas.
	- Palabras mas largas desde oleadas tempranas.

Metrica para tuning
- Trackear por dificultad:
	- Accuracy media por partida.
	- WPM medio por oleada.
	- Oleada maxima alcanzada.
	- Tasa de abandonos por modo.
- Objetivo de tuning inicial:
	- Facil: 70%+ de jugadores llegan al menos a oleada 4.
	- Medio: 45%+ llegan a oleada 4.
	- Dificil: 20%+ llegan a oleada 4.

Notas narrativas
- Facil: "Simulacion TYPO asistida".
- Medio: "Operacion estandar TYPO".
- Dificil: "Protocolo Lyra".

Version corta (regla principal)
- Facil: corriges solo la letra fallada.
- Medio: retrocedes una letra.
- Dificil: reinicias toda la palabra.