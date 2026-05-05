# Plan de Solución: Rendimiento WebGL (30 FPS vs 144 FPS)

## 1. Análisis de Causa Raíz
El análisis de los archivos de diagnóstico (`about:gpu`) confirma que el problema de rendimiento en **BABEL Lexicon War** no se debe al código del juego en sí (no hay fugas de memoria, ni problemas de optimización de Three.js que afecten a un navegador y a otro no). La causa es de **Hardware Allocation** (Asignación de Hardware):

*   **Brave:** Ejecutando sobre `GPU0: NVIDIA GeForce RTX 3050` (*ACTIVE*).
*   **Chrome / Edge:** Ejecutando sobre `GPU0: Intel(R) Iris(R) Xe Graphics` (*ACTIVE*).

La gráfica de Intel Iris Xe activa medidas de ahorro de batería (Ahorro de energía de Chrome y Modo Eficiencia de Edge) que típicamente limitan los `requestAnimationFrame` a **30 FPS**. La NVIDIA RTX 3050 procesa sin restricciones, alcanzando la tasa de refresco del monitor (**144 FPS**).

## 2. Plan de Acción (Pasos de Resolución)

### Fase 1: Forzar el uso de la GPU Dedicada (NVIDIA) en Windows
El primer paso es ordenarle al sistema operativo que le dé prioridad de Alto Rendimiento a Chrome y Edge, igual que hace con Brave.

1. Presiona `Windows + i` para abrir la **Configuración de Windows**.
2. Ve a **Sistema** > **Pantalla** > **Gráficos** (o busca "Configuración de gráficos" en el menú de inicio).
3. Verás una lista de aplicaciones. Si **Google Chrome** y **Microsoft Edge** no están en la lista, agrégalos haciendo clic en "Examinar" y buscando sus rutas:
   * Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   * Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
4. Haz clic sobre cada uno en la lista y selecciona **Opciones**.
5. Cambia la configuración de "Permitir que Windows decida" a **Alto rendimiento** (Asegúrate de que mencione la NVIDIA GeForce RTX 3050).
6. **Importante:** Reinicia ambos navegadores por completo.

### Fase 2: Desactivar Limitadores de FPS Nativos de los Navegadores
Incluso con la GPU correcta, Edge y Chrome pueden tener "frenos de mano" activados que limitan los WebGL a 30 FPS para ahorrar batería.

**Para Google Chrome:**
1. Ve a `chrome://settings/performance` en la barra de direcciones.
2. Desactiva la opción de **Ahorro de energía** (Energy Saver).
3. Asegúrate de que el "Ahorro de memoria" no esté suspendiendo el Canvas temporalmente.

**Para Microsoft Edge:**
1. Ve a `edge://settings/system` en la barra de direcciones.
2. Desactiva el **Modo de eficiencia** (Efficiency mode). 
3. Asegúrate de desactivar opciones como "Desvanecer pestañas en reposo" para la pestaña local del juego.

### Fase 3: Aceleración por Hardware y Flags (Verificación)
Para garantizar el mejor rendimiento posible en la renderización de Three.js:
1. En ambos navegadores, verifica en su configuración del sistema que la opción **"Usar aceleración de hardware cuando esté disponible"** esté activada.
2. (Solo si persisten las caídas): Ingresa a `chrome://flags` / `edge://flags`.
   * Busca: **Choose ANGLE graphics backend**.
   * Si está en "Default", puedes probar forzarlo a **D3D11** o **OpenGL** para evaluar estabilidades.
   * *Nota: Chrome tiene "Skia Graphite" habilitado, mientras que en Brave está deshabilitado. No debería ser la causa de la bajada de FPS, pero si experimentas "tartamudeos" (stuttering) tras arreglar la GPU, puedes deshabilitarlo en flags.*

### Fase 4: Comprobación de Resultados
1. Abre tu juego de Babel en Chrome o Edge.
2. Abre una nueva pestaña y entra a `chrome://gpu` o `edge://gpu`.
3. Baja hasta la sección **Driver Information**.
4. Ahora deberías ver que `GPU0` es la **NVIDIA GeForce RTX 3050 Laptop GPU** y tiene el flag `*ACTIVE*`.
5. El juego debería correr fluido a 144 FPS.
