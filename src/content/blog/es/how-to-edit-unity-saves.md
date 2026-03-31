---
title: "Cómo Editar Guardados de Unity (PlayerPrefs y XML) - Guía Completa"
description: "Una guía completa para modificar archivos de guardado de juegos de Unity en Android, iOS y PC. Aprende cómo editar archivos PlayerPrefs, XML, JSON y Plist para cualquier juego de Unity."
pubDate: 2026-01-04
tags: ["unity", "guía", "tutorial", "playerprefs"]
author: "Paradox"
image: "/images/blog/unity-cover.webp"
---

## Introducción

Unity es el motor detrás de miles de juegos populares, desde éxitos móviles hasta gemas indie en PC como *Hollow Knight*, *Cuphead* y *Among Us*. Debido a su flexibilidad, los juegos de Unity pueden almacenar datos de guardado en una variedad de formatos y ubicaciones.

Esta guía te ayudará a localizar, identificar y editar archivos de guardado de juegos hechos con Unity, cubriendo los métodos de almacenamiento más comunes: **PlayerPrefs** (Preferencias del Jugador), XML, JSON y serialización binaria.

![Unity Save Editor Interface](/images/blog/unity-content.webp)

## Entendiendo las Ubicaciones de Guardado de Unity

Antes de poder editar, necesitas encontrar el archivo. Unity tiene rutas predeterminadas, pero los desarrolladores pueden cambiarlas.

### Windows

La mayoría de los juegos modernos de Unity almacenan datos en la carpeta `AppData`:

*   **Ruta Estándar**: `%USERPROFILE%\AppData\LocalLow\[NombreCompañía]\[NombreProducto]\`
*   **PlayerPrefs (Registro)**: Algunos juegos almacenan configuraciones directamente en el Registro de Windows bajo `HKEY_CURRENT_USER\Software\[NombreCompañía]\[NombreProducto]`.

### Android

*   **Ruta Estándar**: `/storage/emulated/0/Android/data/[com.paquete.juego]/files/`
*   **PlayerPrefs**: `/data/data/[com.paquete.juego]/shared_prefs/[com.paquete.juego].xml` (Requiere acceso Root para ver/editar esta carpeta específica).

### iOS / macOS

*   **macOS**: `~/Library/Application Support/[NombreCompañía]/[NombreProducto]/` o `~/Library/Preferences/` (para archivos .plist).
*   **iOS**: Dentro del contenedor de la aplicación (accesible vía Jailbreak o herramientas de exploración de archivos de respaldo).

### Steam Cloud

Si el juego usa Steam Cloud, revisa:
`%ProgramFiles(x86)%\Steam\userdata\[TuSteamID]\[AppID]\remote\`

## Paso 1: Localizar y Extraer tu Archivo de Guardado

1.  Usa las rutas anteriores para encontrar la carpeta del juego.
2.  Busca archivos con extensiones como `.json`, `.xml`, `.txt`, `.dat` o `.sav`.
3.  Si estás en Android sin root, conecta tu teléfono a la PC e intenta copiar la carpeta `Android/data`.

## Paso 2: Crear una Copia de Seguridad

**Crucial**: Copia tu archivo de guardado y pégalo en una carpeta segura (por ejemplo, en tu Escritorio) antes de tocar nada. Si corrompes el archivo, perderás tu progreso.

## Paso 3: Subir al Editor Online

Dado que los formatos varían, usar una herramienta inteligente es lo más seguro.

1.  Ve a nuestro [Editor de Unity](/es/editor/unity).
2.  Arrastra y suelta tu archivo.
3.  La herramienta intentará detectar si es XML, JSON o un binario decodificable.

## Paso 4: Modificar Valores

### Para Archivos PlayerPrefs (XML/Plist)

Verás una lista de entradas de preferencias.
*   **Claves**: Nombres de variables (ej. "Coins", "Level", "HighScore").
*   **Valores**: Los datos a cambiar.
    *   *Enteros*: Números enteros (oro, nivel).
    *   *Flotantes*: Decimales (coordenadas x/y, salud precisa).
    *   *Cadenas*: Texto (nombres, inventario codificado).

### Para Archivos JSON

Verás un árbol estructurado. Busca campos como `inventory`, `stats` o `playerData`.

### Para Formatos Binarios

Si el archivo es binario (ilegible en Bloc de notas), nuestro editor intentará convertirlo a un formato legible. Si contiene datos serializados con `BinaryFormatter` de .NET, la edición es más riesgosa y compleja, pero campos simples a menudo se pueden cambiar.

## Paso 5: Descargar y Reemplazar

1.  Descarga el archivo editado desde la herramienta.
2.  Asegúrate de que el nombre del archivo sea **exactamente el mismo** que el original.
3.  Reemplaza el archivo en la carpeta del juego.
4.  Si editaste el Registro de Windows, asegúrate de importar el archivo .reg o aplicar los cambios manualmente.

## Solución de Problemas

### El juego sobrescribe mis cambios
*   Desactiva **Steam Cloud** antes de reemplazar el archivo.
*   O edita el archivo mientras el juego está abierto en el menú principal (riesgoso, pero a veces funciona).

### El archivo está encriptado / ilegible
*   Algunos desarrolladores encriptan los guardados (ej. Base64 o AES).
*   Intenta usar un decodificador Base64 primero. Si es AES, necesitarás encontrar la clave de encriptación, lo cual es avanzado y específico de cada juego.

### No encuentro el archivo en Android
*   Las versiones modernas de Android restringen el acceso a `Android/data`. Usa la aplicación "Files by Google" o conecta el teléfono a una PC para navegar.

## Avanzado: Editando PlayerPrefs en el Registro de Windows

Si no encuentras archivos, el juego probablemente usa el Registro.

1.  Presiona `Windows + R`, escribe `regedit` y presiona Enter.
2.  Navega a `HKEY_CURRENT_USER\Software\`.
3.  Busca la carpeta del desarrollador del juego.
4.  Haz clic en la carpeta del juego.
5.  En el panel derecho, verás las claves.
6.  Haz doble clic en una clave para editarla. Asegúrate de seleccionar "Decimal" para ver números normales si es un valor DWORD.
7.  **Advertencia**: Editar el registro es peligroso. Toca solo lo que estés seguro de conocer.

## Conclusión

Editar guardados de Unity es una habilidad útil dada la ubicuidad del motor. Ya sea editando XMLs simples en tu teléfono o modificando el registro en PC, los principios son los mismos: localizar, respaldar, modificar y probar.

[Prueba nuestro Editor de Unity ahora](/es/editor/unity)

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Guía de Edición de Unreal Engine](/es/blog/how-to-edit-unreal-engine-saves)
- [Guía de Edición de GameMaker](/es/blog/gamemaker-save-editing-guide)
- [Formatos de Archivo Comunes](/es/blog/common-save-file-extensions-explained)
