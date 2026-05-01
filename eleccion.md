Pantalla de eleccion de nave (propuesta)

Objetivo
- Mostrar al jugador las naves disponibles antes de entrar a Combate o Carrera.
- Permitir ver cada nave en 3D, rotarla y elegirla como nave activa.
- Esta pantalla solo se ocupa del modelado y la presentacion de la flota; no toca balance, no toca stats, no toca progresion.

Alcance del archivo
- Este documento define UNICAMENTE la capa visual y de seleccion.
- No define velocidad, hp, dano, energia ni ningun atributo de juego.
- El sistema de stats por nave queda fuera del alcance de este archivo y se definira aparte.

Flota inicial (7 naves)
- Las 7 naves disponibles son los modelos .glb listados a continuacion.
- Los archivos de tipo concept art (24_dizzying_space_travel_-_inktober2019, truth_about_the_dark_side_of_the_moon) NO entran en la flota: son referencia, no modelos jugables.

Lista de modelos jugables
1. spaceship_-_cb1.glb
2. waldeinsamkeit-class_strategic_survey_ve...glb
3. ig_127-730-00.glb
4. spaceshipnew.glb
5. spaceship.glb
6. spaceship__low_poly.glb
7. spaceship_colaid1_50k.glb

Ubicacion de assets
- Ruta: /public/models/ships/
- Cada .glb se carga via AssetLoader (game/core/AssetLoader.js).
- No se renombran los archivos en disco; los nombres .glb son la fuente de verdad.

Cuando aparece la pantalla
- Se invoca despues del MainMenu, una vez el jugador presiona "Combate" o "Carrera".
- Antes de cargar la escena del modo elegido.
- Flujo: MainMenu -> seleccion de modo -> EleccionNave -> escena del modo.
- Si el jugador retrocede, vuelve al MainMenu sin perder el modo elegido.

UX de la pantalla
- Vista central 3D con la nave actualmente enfocada, rotando suavemente sobre su eje Y.
- El jugador puede:
	- Rotar manualmente la nave con el mouse (drag) o teclas A / D.
	- Hacer zoom in / out con la rueda o teclas W / S.
	- Resetear la vista a la rotacion por defecto con tecla R.
- Navegacion entre naves:
	- Flechas izquierda / derecha del teclado.
	- Botones laterales en pantalla ( "<" y ">" ).
	- Indicador de posicion: "3 / 7".
- Boton de confirmacion: "Desplegar nave" (centro inferior).
- Boton de cancelar: "Volver" (esquina inferior izquierda) -> regresa al MainMenu.

Estados visuales por nave
- Nave activa (foco actual): iluminada, rotacion lenta, glow cyan tenue debajo.
- Naves no activas: no se muestran simultaneamente; transicion (fade + slide) al cambiar de nave.
- Mientras carga el .glb: placeholder con texto monoespaciado "CARGANDO MODELO..." y barra de progreso fina.

Texto en pantalla por nave
- Nombre de la nave (derivado del nombre del archivo, formateado legible).
- Codigo de identificacion corto (los primeros tokens del nombre, en monospace).
- Linea de clasificacion narrativa (a definir cuando se asignen roles dentro del Programa TYPO).
- Nota: este archivo NO define los nombres narrativos finales de cada nave; solo establece el espacio en pantalla donde iran.

Camara y composicion
- Fondo: el mismo espacio oscuro del juego (COLORS.BACKGROUND, 0x000008).
- Particulas tenues de fondo para reforzar continuidad visual con el resto de la experiencia.
- Iluminacion:
	- Luz key cyan (lado izquierdo, suave).
	- Luz fill magenta tenue (lado derecho, muy baja intensidad, ecos del Enjambre).
	- Luz de ambiente baja para no aplanar el modelo.
- Camara orbital con limites de pitch para evitar angulos rotos.

Tipografia y estilo
- Misma paleta y tipografia monoespaciada del resto del juego.
- Acentos en cyan (#00ffcc) para elementos activos.
- Acentos en magenta (#ff4466) solo para advertencias o cancelar.
- Sin decoracion innecesaria: el texto en pantalla es informacion, no adorno.

Persistencia de la eleccion
- La nave seleccionada se guarda en el bridge / store compartido (shared/bridge.js).
- Persiste durante toda la sesion del jugador.
- Se aplica al modo Combate y al modo Carrera por igual (la misma nave sirve para ambos).
- Si el jugador no elige y solo confirma, se carga la nave por defecto: spaceship.glb.

Eventos sugeridos (catalogo en shared/eventTypes.js)
- SHIP_SELECTION_OPENED
- SHIP_FOCUS_CHANGED ( payload: shipId )
- SHIP_CONFIRMED ( payload: shipId )
- SHIP_SELECTION_CANCELLED

Integracion con la arquitectura
- La pantalla vive en app/ (UI React) como pagina o componente: app/pages/EleccionNave.jsx.
- El visor 3D se monta sobre un canvas Three.js controlado por game/, no por React.
- React solo presenta el HUD (botones, nombre, contador 3/7).
- La carga de modelos se delega a game/core/AssetLoader.js.
- La comunicacion entre el visor y la UI pasa por shared/bridge.js (regla del proyecto: app/ no importa de game/, y viceversa).

Notas narrativas
- La pantalla representa el hangar del Programa TYPO antes de un despliegue.
- El sonido ambiente sugerido es bajo: zumbido de hangar, ecos lejanos, sin musica fuerte.
- Cuando el jugador confirma, transicion corta al modo elegido (fade + linea de texto: "Despliegue autorizado.").

Fuera de alcance (explicitamente no en este archivo)
- Stats de cada nave (velocidad, hp, energia, hitbox).
- Sistema de desbloqueo / progresion de naves.
- Skins, customizacion o variantes de color.
- Animaciones de combate o carrera de cada nave.
- Logica de balance entre naves.

Version corta (regla principal)
- Antes de Combate o Carrera, el jugador entra a EleccionNave.
- Ve 1 nave a la vez en 3D, puede rotarla y cambiar entre 7 modelos .glb.
- Confirma con "Desplegar nave"; la eleccion se guarda en el bridge y aplica a ambos modos.
