---
title: "Cómo Editar Archivos de Guardado de Unreal Engine (.sav) - Guía Completa GVAS"
description: "Una guía completa para editar archivos de guardado de Unreal Engine 4 y 5. Aprende a analizar el formato GVAS y modificar juegos como Palworld, Hogwarts Legacy, Satisfactory y más."
pubDate: 2026-01-05
tags: ["unreal-engine", "gvas", "guía", "palworld", "hogwarts-legacy"]
author: "Equipo SaveEditor"
image: "/images/blog/unreal-cover.webp"
---

## Introducción

Unreal Engine (UE4 y UE5) es la potencia detrás de muchos de los juegos más grandes de la actualidad, incluyendo _Palworld_, _Hogwarts Legacy_, _Star Wars Jedi: Survivor_ y _Satisfactory_.

A diferencia de motores más simples que usan archivos de texto, Unreal utiliza un formato binario complejo para los guardados, a menudo llamado **GVAS** (Game Variable Archive Save). No puedes simplemente abrir estos archivos en el Bloc de notas y esperar leerlos. Esta guía explica cómo funciona este formato y cómo puedes editarlos de manera segura.

## Entendiendo el Formato GVAS

Un archivo típico `.sav` de Unreal Engine contiene:

1.  **Encabezado GVAS**: Identifica el archivo como un guardado de UE e incluye información de versión.
2.  **Versión del Motor**: Indica qué versión de UE (ej. 4.27, 5.3) se utilizó.
3.  **Definiciones de Estructuras Personalizadas**: Esquemas de datos específicos del juego.
4.  **Datos Serializados**: Los valores reales (salud, inventario, coordenadas) almacenados en binario.

A veces, este archivo GVAS completo está comprimido (usando Zlib o Gzip) dentro de otro archivo contenedor, lo que añade otra capa de dificultad.

## Juegos Comunes que Usan GVAS

*   **Palworld**: Usa GVAS para datos de jugador y mundo (a veces dentro de contenedores comprimidos).
*   **Hogwarts Legacy**: Usa una base de datos SQLite encapsulada o archivos GVAS directos.
*   **Deep Rock Galactic**: Archivos `.sav` GVAS estándar.
*   **Astroneer**: Datos altamente estructurados en formato GVAS.

## Paso 1: Localizar tu Archivo de Guardado

En Windows, la ubicación más común es:

`%LOCALAPPDATA%\[NombreDelJuego]\Saved\SaveGames\`

1.  Presiona `Win + R` en tu teclado.
2.  Escribe `%localappdata%` y presiona Enter.
3.  Busca la carpeta del juego (ej. `Pal`, `Hogwarts Legacy`, `FSD` para Deep Rock).
4.  Navega a `Saved` -> `SaveGames`.

Para juegos de Steam, a veces están enterrados en la carpeta de userdata de Steam:
`C:\Program Files (x86)\Steam\userdata\[TuID]\`

## Paso 2: Crear una Copia de Seguridad

**Advertencia**: Los archivos binarios son extremadamente frágiles. Si cambias un solo byte incorrecto, el archivo será ilegible para el juego. **Siempre** haz una copia de seguridad (copiar y pegar) antes de editar.

## Paso 3: Subir al Editor Online

Nuestro editor es un analizador GVAS especializado que funciona en tu navegador. Convierte los datos binarios en JSON editable y luego los re-ensambla perfectamente.

1.  Ve a nuestro [Editor de Unreal Engine](/es/editor/unreal).
2.  Arrastra y suelta tu archivo `.sav`.
3.  La herramienta intentará analizarlo.

*Nota: Si obtienes un error, es posible que el juego use una versión personalizada del motor o encriptación adicional.*

## Paso 4: Navegar y Editar Propiedades

Los archivos GVAS se convierten en una gran estructura JSON. Busca estos tipos de propiedades comunes:

*   **Properties**: Aquí vive la mayoría de los datos del juego.
*   **StructProperty**: A menudo contiene estadísticas complejas del jugador o coordenadas.
*   **IntProperty / FloatProperty**: Valores numéricos simples (oro, experiencia, salud).
*   **ArrayProperty**: Listas de objetos, como tu inventario o lista de misiones.
*   **NameProperty**: Cadenas de texto, a menudo usadas para IDs de objetos o nombres.

**Ejemplo (Palworld)**:
Busca `SaveData` -> `value` -> `WorldSaveData`. Aquí es donde residen los datos sobre Pals, bases y configuración del mundo.

**Ejemplo (General)**:
Para cambiar dinero, busca términos como `Gold`, `Credits`, `Currency` o `Money` en la barra de búsqueda del editor.

## Paso 5: Descargar y Reemplazar

1.  Haz clic en "Descargar" en el editor.
2.  El editor re-empaquetará el JSON en el formato binario GVAS correcto, actualizando las longitudes de los arrays y los encabezados automáticamente.
3.  Reemplaza el archivo original en la carpeta del juego.

## Solución de Problemas

### Error "Invalid Header" (Encabezado Inválido)
*   El archivo podría no ser un GVAS estándar.
*   Podría ser un archivo de configuración de UE4 (`GameUserSettings.ini`), que es texto.
*   Podría estar encriptado (común en juegos online).

### El archivo editado causa que el juego se cierre
*   Esto sucede si cambiaste la longitud de un Array (añadiste/quitaste items) sin actualizar las propiedades de contador asociadas, o introdujiste un valor que el juego no espera (ej. un ID de objeto inválido).
*   Intenta hacer cambios pequeños primero.

### No veo mis cambios
*   Asegúrate de haber desactivado Steam Cloud, ya que podría estar restaurando tu guardado antiguo automáticamente.

## Herramientas Alternativas

Para ediciones muy complejas o juegos específicos, podrías necesitar utilidades de escritorio:

*   **UESaveTool**: Una herramienta de línea de comandos para convertir GVAS a JSON y viceversa.
*   **FModel**: Para explorar los archivos del juego y encontrar los nombres correctos de las propiedades (útil para encontrar IDs de objetos).
*   **SaveEditOnline**: Otro editor web popular (nota: nosotros ofrecemos características similares con un enfoque en la privacidad).

## Conclusión

La edición de guardados de Unreal Engine es una tarea poderosa pero arriesgada debido a la complejidad del formato binario GVAS. Nuestro editor simplifica el proceso encargándose de la conversión binaria, permitiéndote concentrarte en los datos JSON.

¡Explora, experimenta, y disfruta de tus juegos de Unreal a tu manera!

[Abrir el Editor de Unreal Engine](/es/editor/unreal)

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Guía de Edición de Palworld](/es/blog/palworld-save-editing-guide)
- [Guía de Edición de Unity](/es/blog/how-to-edit-unity-saves)
- [Formatos de Archivo Comunes](/es/blog/common-save-file-extensions-explained)
