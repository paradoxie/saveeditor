---
title: "Cómo Editar Archivos de Guardado de Palworld - Guía Completa (2026)"
description: "Guía de edición de guardados de Palworld enfocada en compatibilidad. Incluye ubicaciones en PC/Steam Deck, inspección segura de GVAS estándar y cuándo cambiar a herramientas dedicadas."
pubDate: 2026-01-07
updatedDate: 2026-04-02
tags: ["palworld", "unreal-engine", "guía", "editor-sav"]
author: "Paradox"
image: "/images/blog/palworld-guide-cover-v2.webp"
---

> **Estado de soporte (febrero de 2026):** Este flujo para Palworld prioriza saves **GVAS estándar**. Si el archivo está encapsulado/cifrado, el editor puede quedar en solo lectura o recomendar herramientas dedicadas.

## Introducción a la Edición de Guardados de Palworld

![Palworld Save Editor Interface](/images/blog/palworld-content.webp)

**Palworld** ha tomado al mundo por sorpresa con su mezcla adictiva de captura de monstruos, supervivencia y automatización de bases. Como juego de Unreal Engine 5, utiliza el complejo formato de guardado binario **GVAS** (`.sav`), lo que hace que la edición manual sea imposible sin herramientas especializadas.

Ya sea que quieras recuperar progreso tras un error o ajustar tu partida con cuidado, esta guía te enseña un flujo de inspección y edición con enfoque de compatibilidad.

## Ubicación del Archivo de Guardado de Palworld

Antes de editar, necesitas encontrar tus archivos. Palworld almacena los datos de manera diferente según la plataforma.

### Windows (Steam)
```
%LocalAppData%\Pal\Saved\SaveGames\<TuSteamID>\<IDMundo>\
```

1.  Presiona `Win + R`.
2.  Escribe `%localappdata%` y presiona Enter.
3.  Navega a `Pal` -> `Saved` -> `SaveGames`.
4.  Verás una carpeta con números largos (tu Steam ID). Entra ahí.
5.  Verás otra carpeta con caracteres aleatorios (este es el ID de tu mundo).

### Windows (Xbox / Game Pass)
```
%LocalAppData%\Packages\PocketpairInc.Palworld_ad4psfrxyesvt\SystemAppData\wgs\
```
*Nota: Los guardados de Game Pass tienen nombres de archivo codificados y son más difíciles de identificar.*

### Steam Deck (Linux / Proton)
```
/home/deck/.local/share/Steam/steamapps/compatdata/1623730/pfx/drive_c/users/steamuser/AppData/Local/Pal/Saved/SaveGames/
```

### Estructura del Archivo de Guardado

Dentro de la carpeta de tu mundo, encontrarás varios archivos clave:

| Archivo | Contenido |
|---|---|
| `Level.sav` | El archivo más importante. Contiene datos del mundo, todos los Pals (capturados y salvajes), y bases. |
| `LevelMeta.sav` | Metadatos sobre el guardado (versión, fecha). |
| `LocalData.sav` | Configuraciones locales como niebla de guerra y tutoriales. |
| `Players/*.sav` | Archivos individuales para cada jugador (solo inventario y estadísticas básicas del personaje). |

## Paso 1: Respaldar tus Guardados

**¡ALTO!** No te saltes este paso. Palworld se actualiza frecuentemente, y los archivos de guardado son frágiles.

1.  Copia toda la carpeta `<IDMundo>`.
2.  Pégala en tu escritorio o en una carpeta de "Respaldos".

## Paso 2: Subir al Editor Online

Dado que los archivos son binarios GVAS comprimidos, no puedes usar el Bloc de notas.

1.  Ve a nuestro [Editor de Palworld](/es/editor/palworld).
2.  Para editar **Pals, Bases o el Mundo**, sube `Level.sav`.
3.  Para editar **Inventario del Jugador o Puntos de Tecnología**, sube tu archivo `Players/0000...00001.sav` (para host) o el ID correspondiente.
4.  Espera a que la herramienta analice el archivo (archivos `Level.sav` grandes pueden tardar unos segundos).

## Paso 3: Encontrar y Editar Datos

Los campos disponibles cambian según la versión y el tipo de guardado. Si el editor entra en modo de solo lectura, detén la edición y usa una herramienta dedicada.

Una vez cargado, verás una estructura de árbol. En variantes compatibles, aquí suelen aparecer campos comunes:

### Oro / Dinero (si está expuesto)
El oro es un objeto en tu inventario, no solo un número.
1.  En el archivo del Jugador, navega a `InventoryInfo`.
2.  Busca el objeto con ID estático `Money` o `GoldCoin`.
3.  Cambia el valor `StackCount` a `999999`.

### Estadísticas de Pals (en `Level.sav`, cuando estén expuestas)
Esto es complejo porque los Pals se almacenan en un mapa masivo.
1.  Busca `CharacterSaveParameterMap`.
2.  Cada entrada es una instancia de un Pal.
3.  Expande una entrada para ver:
    *   `Level`: Nivel del Pal (máx 50).
    *   `Exp`: Puntos de experiencia.
    *   `Talent_HP`, `Talent_Melee`, `Talent_Defense`: Valores IV (0-100) que determinan el potencial.
    *   `PassiveSkillList`: Lista de habilidades pasivas (ej. `Legend`, `Ferocious`).
    *   `Gender`: `Male` o `Female`.

### Inventario (cuando esté expuesto)
1.  En el archivo del Jugador, ve a `InventoryInfo`.
2.  Encuentra una ranura vacía o un objeto existente que no quieras.
3.  Cambia el `StaticID` al ID del objeto que deseas (ej. `Accessory_HeatResist_3`).
4.  Ajusta el `StackCount`.

### Campos del Jugador (cuando estén expuestos)
En el archivo del Jugador `PlayerCharacterMakeData`:
*   `StatusPoint`: Puntos de estadística no gastados.
*   `TechnologyPoint`: Puntos para desbloquear recetas.

## Paso 4: Descargar y Reemplazar

1.  Haz clic en **Descargar** solo si el editor muestra modo compatible y editable.
2.  Asegúrate de que el nombre del archivo sea **exactamente** el original (`Level.sav` o el ID del jugador).
3.  Reemplaza el archivo solo después de validar tu backup.
4.  Si el editor aparece en solo lectura, usa una herramienta específica de Palworld.

## Preguntas Comunes

**P: ¿Funciona esto para servidores dedicados?**
R: Si eres el administrador y tienes acceso FTP a los archivos del servidor (`/Pal/Saved/SaveGames/0/`), sí. Detén el servidor, descarga el archivo, edita, sube y reinicia.

**P: ¿Puedo transferir mi personaje a otro mundo?**
R: Es complicado. Requiere copiar la entrada del jugador dentro de `Level.sav` de un archivo a otro y reasignar el GUID del jugador. Existen scripts de Python específicos para esto ("Palworld Character Transfer") que son mejores que la edición manual.

**P: ¿Mi archivo es demasiado grande?**
R: `Level.sav` puede crecer mucho (50MB+). Nuestro editor maneja archivos grandes, pero asegúrate de tener una conexión estable y paciencia durante el análisis.

## Resumen de Compatibilidad

| Categoría | Ubicación habitual | Dificultad |
|---|---|---|
| Dinero/Oro | Archivo de Jugador (Inventario) | Fácil* |
| Puntos de Tecnología | Archivo de Jugador | Fácil* |
| Estadísticas de Pals (IVs) | Level.sav | Avanzado* |
| Habilidades Pasivas de Pals | Level.sav | Avanzado* |
| Materiales de Base | Level.sav (Inventario de Contenedores) | Avanzado |
| Tiempo del Mundo | LevelMeta.sav | Fácil |

\*Disponible solo en estructuras compatibles; en modo solo lectura usa herramientas dedicadas.

## Consejos para una Edición Segura

1.  **Edita valores existentes** en lugar de crear nuevas estructuras. Es más seguro cambiar 1 madera por 999 diamantes que intentar insertar una nueva ranura de inventario desde cero.
2.  **Mantén los valores dentro de límites razonables**. Nivel 50 es el máximo actual. Poner nivel 9999 podría causar errores o ser revertido por el juego.

## Herramientas Alternativas

*   **PalEdit**: Una herramienta de escritorio con interfaz gráfica para visualizar tus Pals.
*   **XGP-Save-Extractor**: Necesario para extraer guardados de la versión de Game Pass.

## Conclusión

Editar guardados de Palworld abre un gran margen de personalización, pero requiere respetar los límites de compatibilidad. Con nuestro editor web puedes trabajar de forma segura en variantes estándar y detectar pronto cuándo necesitas una herramienta especializada.

[Abrir Editor de Palworld →](/es/editor/palworld)

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Guía de Edición de Unreal Engine](/es/blog/how-to-edit-unreal-engine-saves)
- [Estructura GVAS Explicada](/es/blog/how-to-edit-unreal-engine-saves#understanding-the-gvas-format)
- [Extensiones de Archivo Comunes](/es/blog/common-save-file-extensions-explained)
