---
title: "Cómo Editar Archivos de Guardado de RPG Maker (.rpgsave & .rvdata2) Online"
description: "Aprende a modificar oro, estadísticas y objetos en juegos de RPG Maker MV, MZ, VX Ace y XP usando nuestro editor de guardado online gratuito."
pubDate: 2026-01-05
tags: ["rpg-maker", "guía", "tutorial"]
author: "Equipo SaveEditor"
image: "/images/blog/rpg-maker-cover.webp"
---

## Introducción

Los juegos de RPG Maker son increíblemente populares en la escena indie. Ya sea que estés jugando _Omori_, _To the Moon_, o cientos de títulos gratuitos en itch.io, podrías querer darte un poco más de oro o superar una batalla difícil.

Esta guía te mostrará exactamente cómo editar archivos de guardado de RPG Maker usando nuestra herramienta online gratuita.

![RPG Maker Save Editor Interface](/images/blog/rpg-maker-content.webp)

## Entendiendo los Formatos de RPG Maker

Hay dos tipos principales de archivos:

### 1. Archivos .rpgsave (MV y MZ)
Estos son usados por las versiones más nuevas (RPG Maker MV y MZ).
*   **Formato**: JSON comprimido con LZString.
*   **Ubicación**: Usualmente en la carpeta `www/save` dentro del directorio del juego.

### 2. Archivos .rvdata2 (VX Ace) y .rxdata (XP)
Estos son usados por versiones antiguas.
*   **Formato**: Objetos serializados de Ruby (Marshaled).
*   **Ubicación**: Directamente en la carpeta del juego o en `%APPDATA%`.

¡Nuestro editor soporta ambos!

---

## Guía Paso a Paso

### Paso 1: Localiza tu Archivo de Guardado

**Windows**:
*   Busca dentro de la carpeta del juego una carpeta llamada `save` o `www/save`.
*   Si no está ahí, presiona `Win + R`, escribe `%APPDATA%`, y busca una carpeta con el nombre del juego o del desarrollador.

**Mac**:
*   Revisa `~/Library/Application Support/`
*   O haz clic derecho en la aplicación del juego -> "Mostrar contenido del paquete" -> `Contents/Resources/app.nw/save/`.

### Paso 2: Sube al Editor

1.  Ve a [Save Editor Online](/es/).
2.  Arrastra y suelta tu archivo `file1.rpgsave` (o similar).
3.  La herramienta detectará automáticamente el motor.

### Paso 3: Editando Valores

Una vez cargado, verás una estructura de árbol. Aquí están las claves más comunes para buscar:

*   **party**: Contiene información sobre tus personajes.
    *   `_actors`: Lista de miembros del grupo.
        *   Revisa `_paramPlus` para estadísticas (Ataque, Defensa, etc.).
*   **gold** o **money**: Tu moneda actual.
*   **items**: IDs de los objetos en tu inventario.
*   **variables**: Variables del juego (interruptores de progreso de la historia, relaciones, etc.).

**Consejo Pro**: Usa la barra de búsqueda en la parte superior del editor para encontrar "gold" o el nombre de tu personaje rápidamente.

### Paso 4: Descargar y Reemplazar

1.  Haz clic en el botón "Descargar".
2.  **Haz una copia de seguridad** de tu archivo de guardado original (renómbralo a `file1_backup.rpgsave`).
3.  Pon el archivo editado en la carpeta de guardado.
4.  Carga tu juego.

---

## Solución de Problemas

**"Error: Failed to parse"**
*   El archivo podría estar encriptado con una clave única del desarrollador.
*   Intenta usar una herramienta de descifrado específica si conoces el ID del juego.

**"My changes didn't show up" (Mis cambios no aparecieron)**
*   Asegúrate de haber sobrescrito el archivo correcto. Algunos juegos usan Steam Cloud que podría restaurar el antiguo guardado. Deshabilita Steam Cloud temporalmente si esto sucede.

## Juegos Populares Soportados

*   **Omori**: Usa nuestro analizador RPG Maker MV.
*   **Fear & Hunger**: Usa nuestro analizador RPG Maker MV/MZ.
*   **Lisa: The Painful**: Usa nuestro analizador VX Ace (.rvdata2).
*   **To the Moon**: Usa nuestro analizador XP/VX Ace.

¿Listo para empezar?

[Abrir Editor de RPG Maker](/es/editor/rpg-maker-mv)
