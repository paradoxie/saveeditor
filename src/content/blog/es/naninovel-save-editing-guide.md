---
title: "Edición de Guardados de NaniNovel: Guía Completa de Archivos .nson"
description: "Aprende a editar archivos de guardado de novelas visuales NaniNovel (.nson). Guía completa que cubre la estructura del formato NSON, algoritmos de compresión, modificación de variables y consejos de solución de problemas."
pubDate: 2026-01-06
tags: ["naninovel", "novela-visual", "guía", "nson"]
author: "Equipo SaveEditor"
image: "/images/blog/naninovel-cover.webp"
---

## Introducción

NaniNovel es uno de los motores de novelas visuales más avanzados y populares para Unity. Impulsa desde juegos indie de ritmo rápido hasta producciones narrativas complejas como *Love Is...* e *Infinite Stars*.

A diferencia de los guardados estándar de Unity, NaniNovel utiliza su propio formato de serialización optimizado, a menudo con la extensión `.nson`. Estos archivos pueden ser complicados de editar porque suelen estar comprimidos y codificados, apareciendo como texto ininteligible si intentas abrirlos directamente.

Esta guía te llevará a través de la estructura interna de los archivos NSON y cómo editarlos de forma segura utilizando nuestras herramientas.

![NaniNovel Save Editor Interface](/images/blog/naninovel-content.webp)

## Entendiendo el Formato de Archivo NSON

### Estructura Técnica

Un archivo `.nson` es esencialmente un contenedor de datos serializados. Dependiendo de la configuración del desarrollador, puede ser:

1.  **JSON Puro**: Texto legible (poco común en versiones de producción).
2.  **JSON Comprimido**: JSON comprimido con Gzip o Brotli para ahorrar espacio.
3.  **Base64 + Compresión**: La forma más común. Los datos binarios comprimidos se convierten a una cadena de texto Base64 segura.

### Características Clave

*   **State Management**: NaniNovel guarda el estado de "Servicios" individuales (Variables, Script Player, Audio, etc.).
*   **Independencia de Ranura**: Cada ranura de guardado es un archivo independiente, pero comparten un archivo de "Configuración Global" y "Galería".

## Qué hay dentro de un Guardado de NaniNovel?

Una vez decodificado, un guardado de NaniNovel revela una estructura JSON rica:

### Variables de Estado Global (`CustomVariableManager`)
Aquí es donde vive la magia. Contiene todas las banderas y contadores del juego.
```json
"CustomVariableManager": {
  "g_LovePoints": 100,
  "g_HasMetAlice": true,
  "g_TrueEndingUnlocked": false,
  "g_Inventory": ["Key", "Map"]
}
```

### Estado de Ejecución del Script (`ScriptPlayer`)
Rastrea exactamente dónde estás en la historia.
```json
"ScriptPlayer": {
  "playedScript": "Chapter3_Date",
  "playbackSpot": { "lineIndex": 42, "inlineIndex": 0 }
}
```
*Advertencia: Editar esto incorrectamente puede romper el flujo del juego o causar bucles.*

### Elecciones del Jugador (`ChoiceHandler`)
Registra qué opciones has seleccionado, a menudo para impedir que las vuelvas a elegir o para rastrear ramas.

## Guía de Edición Paso a Paso

### Paso 1: Localizar los Archivos

**Windows**: `%LocalLow%\[Compañía]\[Juego]\Saves\` o `Game Data\`
**macOS**: `~/Library/Application Support/[Compañía]/[Juego]/Saves/`

Busca archivos comúnmente nombrados como:
*   `Save001.nson` (Ranuras de guardado individuales)
*   `Global.nson` (Configuraciones globales y variables persistentes)
*   `CG.nson` (Estado de desbloqueo de la galería de imágenes)

### Paso 2: Descifrar y Abrir

1.  Ve a nuestro [Editor de NaniNovel](/es/editor/naninovel).
2.  Arrastra tu archivo `.nson`.
    *   *Nota: Si el juego usa PlayerPrefs en lugar de archivos, usa nuestro Editor de Unity.*
3.  El editor detectará automáticamente la compresión (Gzip/Brotli) y la codificación (Base64), presentándote un JSON limpio.

### Paso 3: Modificar Variables

Para cambiar afinidad o inventario, busca la sección `Variables` o `CustomVariableManager`.

**Ejemplo: Maximizar Afinidad**
Encuentra `"g_Affinity"` y cambia el valor de `10` a `100`.

**Ejemplo: Desbloquear Galería**
Abre el archivo `CG.nson` (o `Unlockables.nson`). Verás una lista de IDs de imágenes con valores `true` o `false`. Cámbialos todos a `true`.

### Paso 4: Re-empaquetar y Guardar

1.  Presiona el botón "Descargar" en el editor.
2.  La herramienta volverá a comprimir y codificar los datos exactamente como el juego los espera.
3.  Reemplaza el archivo original.

## Avanzado: Múltiples Formatos de Guardado

NaniNovel es flexible. Si no encuentras archivos `.nson`, el juego podría estar guardando en:

*   **PlayerPrefs**: Almacenado en el registro (Windows) o XML (Mac/Linux). Busca una clave llamada `SaveGameData`.
*   **Base de Datos**: Algunos juegos grandes usan SQLite.

Nuestro editor soporta principalmente archivos `.nson` y volcados de PlayerPrefs.

## Solución de Problemas Comunes

### El juego se congela en la pantalla de carga
*   **Causa**: Error de sintaxis JSON o valor imposible (ej. cargar una línea de script que no existe).
*   **Solución**: Verifica que no falten comas o llaves en tu edición. Asegúrate de no haber cambiado el nombre del script en `ScriptPlayer` a algo inválido.

### Mis cambios no aparecen
*   **Causa**: Estás editando el archivo incorrecto o Steam Cloud lo sobrescribió.
*   **Solución**: Edita el archivo `Global.nson` para variables persistentes, o la ranura específica `SaveXXX.nson` para progreso actual. Desactiva Steam Cloud temporalmente.

### "Data Integrity Error"
*   **Causa**: El juego usa hashing para verificar modificaciones.
*   **Solución**: Algunos juegos de NaniNovel tienen habilitada la verificación de hash. Nuestro editor intenta recalcular hashes estándar, pero si el desarrollador usa una "semilla" (seed) personalizada, la edición puede ser imposible sin ingeniería inversa.

## Conclusión

Editar juegos de NaniNovel es la mejor manera de ver todas las rutas de una novela visual sin pasar horas saltando texto. Con acceso a las variables globales y estados de desbloqueo, tienes control total sobre la narrativa.

[Abrir el Editor de NaniNovel](/es/editor/naninovel)

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Guía de Edición de Ren'Py](/es/blog/renpy-save-editing-guide)
- [Guía de Edición de Unity](/es/blog/how-to-edit-unity-saves)
- [Extensiones de Archivo Explicadas](/es/blog/common-save-file-extensions-explained)
