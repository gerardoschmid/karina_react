# Documentación Técnica y Arquitectura de Software: Proyecto Kariña

## 1. Árbol de Arquitectura y Estructura de Archivos

La aplicación está construida sobre **React Native** utilizando el framework **Expo (SDK 55)** y **React 19**. La estructura sigue un patrón de enrutamiento basado en archivos proporcionado por **Expo Router**, organizando la lógica de negocio y la interfaz de usuario en el directorio `/src`.

### Mapa de Directorios Principal:

- **`/src/app`**: Núcleo de la navegación.
    - **`/(auth)`**: Contiene el flujo de acceso y registro (público antes de la sesión).
    - **`/(app)`**: Contiene la lógica protegida de la aplicación.
        - **`/(tabs)`**: Pantallas principales accesibles desde la barra de navegación inferior (Home, Diccionario, Juegos, Perfil, Módulos).
        - **`/juego`**: Implementación de los minijuegos interactivos.
        - **`/modulo`**: Detalle de los módulos de aprendizaje (ruta dinámica `[id].tsx`).
        - **`/practica`**: Lógica de ejercicios específicos por módulo.
- **`/src/components`**: Componentes reutilizables, incluyendo botones de audio (`DictionaryAudioButton.tsx`) y reproductores específicos.
- **`/src/client`**: Configuración del cliente **Supabase** (`supabase.ts`) para la persistencia y autenticación.
- **`/src/ctx.tsx`**: Proveedor de contexto global para la gestión de la sesión del usuario.
- **`/src/lib`**: Utilidades generales y configuración de temas.
- **`/assets`**: Recursos estáticos como sonidos de palabras en Kariña y archivos multimedia.

### Dependencias Clave:
- **`expo-router`**: Gestión de rutas y navegación.
- **`@supabase/supabase-js`**: Interacción con la base de datos y autenticación remota.
- **`react-native-reanimated` & `react-native-gesture-handler`**: Animaciones avanzadas e interacciones táctiles en los juegos.
- **`react-native-svg`**: Renderizado de elementos gráficos dinámicos (líneas de conexión).
- **`expo-audio`**: Gestión de la reproducción de fonemas y pronunciación.
- **`nativewind`**: Motor de estilos basado en Tailwind CSS.

---

## 2. Módulo de Autenticación y Perfiles

### Flujo de Acceso (Login):
Localizado en `src/app/(auth)/sign-in.tsx`. La aplicación utiliza un sistema de credenciales donde el nombre de usuario se combina con un dominio interno (`@miaoda.com`) para realizar la autenticación mediante `supabase.auth.signInWithPassword`.
- **Proceso de Inspección**: Se capturan el `username` y `password`. Se realiza una **comprobación** de campos vacíos y de la aceptación de términos antes de enviar la petición a Supabase.
- **Gestión de Errores**: Se **evalúan** las respuestas de la API para informar al usuario sobre credenciales incorrectas o problemas de red.

### Registro de Usuarios:
Localizado en `src/app/(auth)/sign-up.tsx`. Implementa una función `generateUsername` que crea un identificador único basado en el nombre y apellido.
- **Persistencia de Datos**: Tras el registro exitoso en Supabase Auth, se realiza una actualización en la tabla `profiles` para almacenar metadatos adicionales (edad, pertenencia a comunidad indígena, etc.).

### Gestión de Sesión y Perfil:
- **`src/ctx.tsx`**: El `SessionProvider` utiliza `onAuthStateChange` para monitorear el estado de la sesión. Implementa una **auditoría** del estado de la aplicación (`AppState`) para refrescar la sesión automáticamente cuando la app vuelve del segundo plano en dispositivos móviles.
- **`src/app/(app)/(tabs)/perfil.tsx`**: Permite **revisar** y actualizar la información del usuario, incluyendo la carga de avatares mediante `expo-image-picker` y su almacenamiento en un bucket de Supabase.

---

## 3. Módulo de Diccionario (Estructura de Datos y UI)

Ubicado en `src/app/(app)/(tabs)/diccionario.tsx`, este módulo actúa como el repositorio central de vocabulario.

- **Origen de Datos**: Las palabras se recuperan de forma dinámica desde la tabla `words` en Supabase mediante una consulta que incluye una relación (join) con la tabla `modules` para obtener etiquetas de categoría y colores.
- **Estructura de la Palabra**: Cada registro contiene `palabra_karina`, `traduccion_espanol` y una referencia al módulo asociado.
- **Interfaz de Usuario (UI)**: Utiliza un `FlatList` optimizado. Incluye un buscador que permite **inspeccionar** el arreglo local de palabras en tiempo real para filtrar por ambos idiomas.
- **Integración de Audio**: Existe un mapeo local (`AUDIO_FILES`) que vincula el texto de la palabra con archivos `.mp3` en los assets. La función `handlePlayAudio` gestiona la carga y reproducción mediante `expo-audio`.

---

## 4. Módulo de Juegos (Lógica Interactiva)

Los juegos se encuentran en `src/app/(app)/juego/`. Actualmente existen tres modalidades principales:

### Juego de Conexión ("Unir"):
Ubicado en `src/app/(app)/juego/unir.tsx`. Es el componente más complejo técnicamente.
- **Lógica de Interacción**: Utiliza un `Gesture.Pan()` para rastrear el movimiento del usuario. Se **comprueban** las coordenadas de inicio sobre las tarjetas de Kariña y las de fin sobre las de Español.
- **Renderizado Dinámico**: Se emplea `react-native-svg` con un componente `AnimatedLine` para dibujar la conexión física mientras el usuario arrastra el dedo.
- **Evaluación de Aciertos**: Al finalizar el gesto, la función `evaluateConnection` compara si el par seleccionado es correcto. El estado se gestiona con un `Set` de palabras emparejadas (`matched`).

### Escucha y Elige ("Opciones"):
Localizado en `src/app/(app)/juego/opciones.tsx`.
- El sistema selecciona una palabra objetivo (`target`) y genera distractores aleatorios.
- El usuario debe **revisar** el audio reproducido y seleccionar la opción escrita correspondiente.

### Dictado Kariña:
Localizado en `src/app/(app)/juego/dictado.tsx`.
- Requiere que el usuario escuche el audio y escriba manualmente la palabra.
- Se realiza una **inspección** de la cadena de texto (ignorando mayúsculas/minúsculas) para determinar la corrección de la respuesta.

---

## 5. Análisis de Flujo de Datos Global

La aplicación opera bajo un flujo de datos reactivo y centralizado:

1.  **Ciclo de Vida de Inicio**:
    - El `RootLayout` en `src/app/_layout.tsx` inicializa el `SessionProvider`.
    - El componente `AuthGuard` realiza una **auditoría** inmediata de la sesión. Si no existe un usuario autenticado, redirige forzosamente a `/(auth)/sign-in`.
2.  **Comunicación entre Componentes**:
    - **Context API**: Se utiliza para el estado de autenticación global.
    - **Props & Hooks**: Los componentes de UI reciben datos mediante props. Se hace un uso intensivo de `useFocusEffect` de Expo Router para asegurar que los datos se vuelvan a **evaluar** y cargar cada vez que una pantalla entra en el foco.
3.  **Persistencia**:
    - Las interacciones de progreso (XP, módulos completados) se envían a la tabla `module_progress` en Supabase desde los diversos módulos de juego y práctica.

---

## Conclusión y Recomendaciones Técnicas

El código presenta una estructura modular sólida y limpia. Los puntos más idóneos para futuras integraciones de persistencia externa o expansiones son:

- **`src/client/supabase.ts`**: Punto central para cualquier nueva inspección o llamada a API externa.
- **`module_progress`**: La lógica de esta tabla es el lugar perfecto para conectar sistemas de analítica de aprendizaje o rankings globales.
- **Estructura de `/juego`**: El patrón actual de estados locales y retroalimentación visual es fácilmente escalable para nuevos tipos de ejercicios interactivos.

La arquitectura actual garantiza que cada acción del usuario sea **revisada** y procesada de forma eficiente antes de impactar el estado global de la aplicación.
