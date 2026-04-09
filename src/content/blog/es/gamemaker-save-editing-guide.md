---
title: "Edición de Guardados de GameMaker: Guía Completa de Archivos INI y JSON"
description: "Domina el arte de editar archivos de guardado de GameMaker Studio. Aprende a modificar configuraciones INI, guardados JSON y formatos binarios para juegos como Undertale, Deltarune y más."
pubDate: 2026-01-02
updatedDate: 2026-03-18
tags: ["gamemaker", "undertale", "guía", "tutorial", "ini", "json"]
author: "Paradox"
image: "/images/blog/gamemaker-cover.webp"
---

## Introducción a los Guardados de GameMaker

![GameMaker Save Editor Interface](/images/blog/gamemaker-content.webp)

**GameMaker Studio** (GMS) es uno de los motores de juegos 2D más populares, impulsando títulos icónicos como **Undertale**, **Deltarune**, **Hotline Miami**, **Hyper Light Drifter** e innumerables éxitos independientes. Si alguna vez has querido modificar un archivo de guardado para desbloquear contenido, ajustar estadísticas o experimentar con resultados diferentes, esta guía es para ti.

A diferencia de los motores con un sistema de guardado estandarizado, GameMaker ofrece a los desarrolladores total libertad sobre cómo almacenar los datos. Esto significa que los formatos de guardado varían enormemente, pero la mayoría cae en unas pocas categorías comunes que nuestro editor soporta completamente.

## Formatos Comunes de Guardado en GameMaker

### 1. Archivos INI (Los Más Comunes)

Las funciones `ini_*` de GameMaker son extremadamente populares por su simplicidad:

```ini
[player]
name="Frisk"
hp=20
maxhp=20
love=1
gold=50

[flags]
met_sans=1
spared_toriel=1
```

**Juegos que usan INI**: Undertale (PC), Deltarune Capítulo 1, muchos RPGs indie.

### 2. Archivos JSON

Los juegos modernos de GameMaker a menudo usan JSON para datos más complejos:

```json
{
  "player": {
    "name": "Kris",
    "hp": 100,
    "items": ["healing_item", "weapon_01"]
  },
  "chapter": 2,
  "choices": {
    "route": "pacifist"
  }
}
```

**Juegos que usan JSON**: Deltarune Capítulo 2, juegos nuevos de GMS2.

### 3. Archivos Binarios (ds_map_secure)

Algunos desarrolladores usan `ds_map_secure_save()`, que crea archivos binarios encriptados. Estos son más difíciles de editar pero posibles con las herramientas adecuadas.

### 4. Archivos de Texto Plano

Los juegos simples pueden usar simplemente funciones `file_text_*` para escribir datos brutos.

## Encontrando Archivos de Guardado de GameMaker

### Windows

La mayoría de los juegos de GameMaker almacenan los guardados en:

```
%LocalAppData%\[NombreDelJuego]\
```

Por ejemplo:
- **Undertale**: `%LocalAppData%\UNDERTALE\`
- **Deltarune**: `%LocalAppData%\DELTARUNE\`

### Steam Cloud

Muchos juegos se sincronizan con Steam Cloud. La ubicación para esos es:

```
%ProgramFiles(x86)%\Steam\userdata\[SteamID]\[AppID]\remote\
```

### macOS

```
~/Library/Application Support/[NombreDelJuego]/
```

## Guía de Edición de Undertale

Como el juego más famoso de GameMaker, Undertale merece una mención especial:

### Estructura de Archivos

| Archivo | Propósito |
|---|---|
| `file0` | Datos principales de guardado (sin extensión, pero formato INI) |
| `file8` | Datos persistentes (memoria de Flowey) |
| `file9` | Datos de prevención de "True Reset" |
| `undertale.ini` | Datos del sistema (valor fun, configuraciones) |

### Variables Clave en file0

```ini
[General]
Name="Frisk"        ; Nombre del Jugador
Love=1              ; LV (Nivel de Violencia)
HP=20               ; Salud Actual
MaxHP=20            ; Salud Máxima
AT=10               ; Ataque
DF=10               ; Defensa
Gold=100            ; Dinero
EXP=0               ; Puntos de Experiencia
Room=12             ; ID de Sala Actual

[Kills]
kills=0             ; Total de asesinatos (afecta rutas)
```

### Cambiando Rutas

Para cambiar de ruta, necesitas modificar varias variables:

#### Requisitos de Pacifista
```ini
kills=0
killed_flowey=0
Toriel_state=1
Papyrus_state=1
Undyne_state=1
```

#### Indicadores de Genocidio
```ini
kills=20+           ; Contador de muertes en la zona actual
Fun=66              ; Valor de eventos especiales
```

## Guía Paso a Paso de Edición

### Paso 1: Localizar y Respaldar

1.  Ve a la carpeta de guardado de tu juego.
2.  **Siempre haz una copia de seguridad** antes de editar:
    ```bash
    cp file0 file0.backup
    cp undertale.ini undertale.ini.backup
    ```

### Paso 2: Subir al Editor

1.  Ve a nuestro [Editor de GameMaker](/es/editor/gamemaker).
2.  Sube tu archivo de guardado (`.ini`, `.json`, o texto).
3.  El editor detectará automáticamente el formato.

### Paso 3: Realizar Modificaciones

Para archivos INI, verás una vista jerárquica:
-   Secciones (por ejemplo, `[player]`, `[flags]`)
-   Pares clave-valor bajo cada sección

Para archivos JSON, verás un árbol de objetos completo.

### Paso 4: Descargar y Reemplazar

1.  Haz clic en **Descargar Guardado Modificado**.
2.  Reemplaza el archivo original.
3.  Inicia el juego para verificar los cambios.

## Avanzado: Edición de Deltarune

Deltarune utiliza un sistema de guardado más complejo:

### Capítulo 1 (Basado en INI)

Similar a Undertale, pero con nuevas variables:
```ini
[Actors]
actor0_Name="Kris"
actor0_HP=100
actor0_MaxHP=100

[Items]
item0="Broken_Key_A"
item1="ReviveMint"
```

### Capítulo 2+ (Basado en JSON)

Utiliza JSON con objetos anidados:
```json
{
  "Recruitment": {
    "recruited_tasque_manager": false,
    "recruited_swatchlings": true
  },
  "Snowgrave": {
    "route_active": false,
    "proceed_count": 0
  }
}
```

## Solución de Problemas

### Error "Save Data Corrupted" (Datos de Guardado Corruptos)

**Causas**:
-   Sintaxis INI inválida (comillas faltantes, corchetes).
-   Tipos de datos cambiados (cadena donde se espera un número).
-   Secciones requeridas eliminadas.

**Solución**: Restaura desde el respaldo y haz cambios más pequeños.

### Los Cambios No Se Guardan

**Problemas Posibles**:
1.  **Steam Cloud**: Sobrescribe tus cambios locales.
2.  **Archivo de Solo Lectura**: Verifica los permisos del archivo.
3.  **Archivo Incorrecto**: Algunos juegos tienen múltiples archivos de guardado.

### El Juego Se Cierra al Cargar

**Causas Probables**:
-   ID de Sala inválido (Room=999 para una sala inexistente).
-   HP o estadísticas negativas.
-   Faltan variables obligatorias.

## Consejos para Encontrar Variables

Cuando los nombres de las variables no son obvios:

1.  **Haz un cambio en el juego** y compara los archivos de guardado.
2.  **Busca en wikis del juego** variables conocidas.
3.  **Busca patrones**: `kills`, `hp`, `gold`, `flags` son nombres comunes.
4.  **Revisa cadenas codificadas en base64** (algunos juegos codifican valores específicos).

## Editores Relacionados

Dependiendo del motor del juego, también podrías necesitar:

-   [Editor de Unity](/es/editor/unity) – Para juegos hechos en Unity.
-   [Editor de RPG Maker](/es/editor/rpg-maker-mv) – Para juegos de RPG Maker.
-   [Visor de Ren'Py](/es/editor/renpy) – Para novelas visuales.

## Conclusión

La flexibilidad de GameMaker significa que no hay un enfoque único para la edición de guardados, pero los formatos más comunes (INI y JSON) están bien soportados por nuestro editor. Ya sea que intentes desbloquear un final secreto en Undertale o experimentar con Deltarune, los pasos clave son:

1.  **Encontrar** el archivo de guardado.
2.  **Respaldar** antes de editar.
3.  **Editar** cuidadosamente con nuestra herramienta.
4.  **Verificar** en el juego.

Si encuentras formatos de guardado inusuales o tienes sugerencias, por favor [contáctanos](/contact). ¡Feliz edición!

## Lectura Adicional

Expande tu conocimiento de GameMaker con estas guías:

- 📖 [Undertale Wiki - Archivos de Guardado](https://undertale.fandom.com/wiki/SAVE) - Documentación de la comunidad.
- 🎮 [Página del Juego Undertale](/games/undertale) - Ubicaciones de guardado y elementos editables.
- 📂 [Extensiones de Archivos de Guardado](/es/blog/common-save-file-extensions-explained) - Entendiendo .ini, .json y otros.
- 🔧 [Editor de GameMaker](/es/editor/gamemaker) - Herramienta online usada en esta guía.
- 🎭 [Guía de Edición de RPG Maker](/es/blog/how-to-edit-rpg-maker-save) - Otro motor indie popular.

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Extensiones Comunes de Archivos de Guardado Explicadas](/es/blog/common-save-file-extensions-explained)
- [Cómo Editar Archivos de Guardado de RPG Maker](/es/blog/how-to-edit-rpg-maker-save)
- [Dónde Encontrar los Guardados de Undertale](/games/undertale)
