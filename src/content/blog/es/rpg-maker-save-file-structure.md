---
title: "Explicación de la Estructura del Archivo de Guardado de RPG Maker - Análisis Técnico"
description: "Análisis técnico profundo de la estructura de archivos de guardado de RPG Maker MV (.rpgsave) y MZ (.rmmzsave). Aprende cómo funcionan la codificación JSON, la compresión LZString y el cifrado del juego."
pubDate: 2026-01-09
tags: ["rpg-maker", "técnico", "json", "estructura-de-datos"]
author: "Equipo SaveEditor"
image: "/images/blog/rpg-maker-cover.webp"
---

## Introducción

Para los desarrolladores y entusiastas de la edición de guardados, entender el formato **.rpgsave** es crucial. A diferencia de los motores que utilizan bases de datos binarias complejas, RPG Maker MV y MZ utilizan un enfoque basado en web, aprovechando JSON para el almacenamiento de datos.

Este artículo proporciona una inmersión técnica profunda en cómo RPG Maker estructura sus datos de guardado, maneja la compresión y organiza el estado del juego.

![RPG Maker Save File Structure decoded showing JSON data](/images/blog/rpg-maker-structure-content.webp)

## Compresión y Codificación de Archivos

Antes de llegar a los datos JSON reales, el motor aplica varias capas de transformación:

### 1. Capa de Compresión (LZString)
El objeto JSON crudo se convierte primero en una cadena y luego se comprime utilizando el algoritmo **LZString**. LZString es una biblioteca de compresión rápida basada en LZW diseñada específicamente para almacenar grandes cantidades de datos en `localStorage` (que tiene límites estrictos de tamaño).

*Nota: RPG Maker MZ a menudo omite este paso y almacena JSON más directo, pero MV lo utiliza mucho.*

### 2. Capa de Codificación (Base64)
La cadena binaria comprimida se codifica luego en **Base64** para hacerla segura para el transporte y el almacenamiento de texto.

**El Flujo de Guardado:**
`Objeto JSON` -> `Cadena JSON` -> `LZString (Comprimido)` -> `Base64` -> `.rpgsave`

**El Flujo de Carga:**
`.rpgsave` -> `Decodificar Base64` -> `Descomprimir LZString` -> `Analizar JSON` -> `Objeto de Juego`

## La Estructura JSON Raíz

Una vez decodificado, el objeto de guardado raíz contiene varias claves de nivel superior que dividen el estado del juego:

```json
{
  "system":Object,
  "screen":Object,
  "timer":Object,
  "switches":Object,
  "variables":Object,
  "selfSwitches":Object,
  "actors":Object,
  "party":Object,
  "map":Object,
  "player":Object
}
```

### 1. System (`$gameSystem`)
Almacena configuraciones a nivel de sistema.
*   `_versionId`: ID aleatorio verificado contra los archivos de datos del juego para asegurar la compatibilidad.
*   `_saveCount`: Número de veces que se ha guardado el juego.
*   `_bgmOnSave`: Música de fondo reproduciéndose en el momento del guardado.

### 2. Switches (`$gameSwitches`)
Una matriz (array) simple de valores booleanos.
*   Índice: ID del Interruptor (como se ve en el editor).
*   Valor: `true` (ON) o `false` (OFF/null).

*Consejo de Edición*: Establecer un índice específico a `true` puede omitir misiones o desbloquear contenido.

### 3. Variables (`$gameVariables`)
Una matriz de valores numéricos o de cadena.
*   Índice: ID de la Variable.
*   Valor: Típicamente un entero, pero puede ser cualquier tipo.

### 4. Party (`$gameParty`)
Gestiona el estado "global" del grupo del jugador.
*   `_gold`: Cantidad actual de moneda.
*   `_steps`: Pasos totales dados.
*   `_items`: Objeto `{ID_Objeto: Cantidad}`.
*   `_weapons`: Objeto `{ID_Arma: Cantidad}`.
*   `_armors`: Objeto `{ID_Armadura: Cantidad}`.
*   `_actors`: Matriz de IDs de Actores actualmente en el grupo activo.

### 5. Actors (`$gameActors`)
Almacena el estado individual de cada personaje.
*   `_classId`: ID de la clase actual del actor.
*   `_level`: Nivel actual.
*   `_exp`: Objeto que mapea IDs de Clase a puntos de Experiencia totales.
*   `_skills`: Matriz de IDs de Habilidades aprendidas.
*   `_equips`: Matriz de IDs de objetos equipados (Arma, Escudo, Cabeza, Cuerpo, Accesorio).

### 6. Map (`$gameMap`)
El estado del mapa actual.
*   `_mapId`: ID del mapa en el que se encuentra el jugador.
*   `_events`: Estado de los eventos que se están ejecutando actualmente.

## Diferencias: MV vs MZ

Aunque la estructura de datos lógica es casi idéntica, el formato de archivo difiere ligeramente:

| Característica | RPG Maker MV | RPG Maker MZ |
|---|---|---|
| **Extensión** | .rpgsave | .rmmzsave |
| **Compresión** | LZString (Casi siempre) | A menudo solo JSON puro o Zip |
| **Encabezado** | Ninguno (Comienza con contenido) | Ninguno |

## Manejo de Scripts Personalizados

Muchos juegos de RPG Maker utilizan complementos (plugins) (Yanfly, VisuStella). Estos complementos a menudo inyectan sus propios datos en el archivo de guardado.

*   **Plugin Managers**: A menudo almacenan datos en `System` o en un objeto separado completamente nuevo.
*   **Alias de Propiedades**: Los complementos pueden añadir sufijos como `_GoldMax` o `_ClassLevel_2` a objetos existentes.

**Advertencia**: Si editas un guardado y eliminas datos requeridos por un complemento, el juego probablemente fallará al cargar.

## Guía de Implementación para Desarrolladores de Herramientas

Si estás construyendo tu propio editor de guardados:

1.  **Detección**: Comprueba si el archivo es JSON válido. Si no, intenta decodificar Base64.
2.  **Descompresión**: Si el resultado JSON parece basura binaria, intenta descomprimir con LZString.
3.  **Seguridad**: Nunca uses `eval()` en los datos guardados. Siempre usa `JSON.parse()`.
4.  **Re-codificación**: Debes aplicar exactamente las mismas transformaciones (LZString -> Base64) al guardar, o el juego no reconocerá el archivo.

## Conclusión

La arquitectura de guardado de RPG Maker es robusta y flexible, basándose en tecnologías web estándar. Esto la hace una de las estructuras de guardado más fáciles de analizar y modificar, siempre que manejes las capas de compresión correctamente.

Para ver esta estructura en acción, carga cualquier archivo `.rpgsave` en nuestro [Editor de RPG Maker](/es/editor/rpg-maker-mv) y cambia a la "Vista Avanzada" para explorar el árbol JSON crudo.

---

*Última actualización: Enero 2026*

### Artículos Relacionados

- [Cómo Editar Guardados de RPG Maker](/es/blog/how-to-edit-rpg-maker-save)
- [Extensiones de Archivo Comunes](/es/blog/common-save-file-extensions-explained)
- [Documentación MV (Comunidad)](https://kadavru.github.io/rpgmakermv/)
