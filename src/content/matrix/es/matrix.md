---
title: 'Matriz de compatibilidad'
subtitle: 'Una descripción general de los motores y formatos actualmente compatibles.'
---

## Formatos genéricos

| Formato | Extensiones | Descripción |
|---|---|---|
| JSON | `.json` / `.sav` | Texto estructurado. Utilizado por muchos motores de juegos y juegos web. |
| XML | `.xml` | Formato de texto basado en etiquetas. Común en juegos Flash y títulos más antiguos. |
| INI | `.ini` | Archivos de configuración simples de clave-valor. A menudo se utilizan en juegos independientes a pequeña escala. |

## Serie RPG Maker

| Motor | Estabilidad | Ejemplos de juegos probados | Notas |
|---|---|---|---|
| RPG Maker MV / MZ | 🟢 Alta | Omori, OneShot, Lisa | El formato `rpgsave` es JSON comprimido con LZString. |
| RPG Maker XP / VX | 🔴 Sin soporte | To the Moon | `rxdata` y `rvdata2` (Ruby Marshal Data) no son compatibles actualmente debido a las dificultades en la deserialización segura y precisa desde el navegador del cliente. |

## Ren'Py

| Motor | Estabilidad | Notas |
|---|---|---|
| Ren'Py | 🟡 Media | Analiza serializaciones complejas de Python Pickles (comprimidos con zlib). Como depende en gran medida de los tipos de variables, modificar la estructura de los valores podría corromper el juego. |

## Unity

| Motor | Estabilidad | Notas |
|---|---|---|
| Unity PlayerPrefs | 🟢 Alta | Juegos de navegador o juegos de PC/Móvil que utilizan PlayerPrefs. |
| Unity BinaryFormatter | 🟡 Media | Soporte limitado para algunos tipos complejos comunes. Se mejorará en futuras actualizaciones. |

## Unreal Engine

| Motor / Formato | Estabilidad | Notas |
|---|---|---|
| GVAS estándar | 🟢 Alta | Soporta propiedades descomprimidas estándar de Unreal Save Game (juegos como Hogwarts Legacy, Palworld). |
| GVAS comprimido | 🟡 Media | Detecta automáticamente y descomprime la compresión zlib (ej. Deep Rock Galactic). Debido a la falta de garantías en la reconstrucción segura de los guardados en el juego, actualmente opera en modo "Solo lectura". |

## GameMaker

| Formato | Estabilidad | Notas |
|---|---|---|
| INI / Texto plano | 🟢 Alta | Detecta y expande automáticamente la estructura de volcados `ds_map` o guardados INI. Si están codificados en Base64, los decodificará para su visualización (ej. Undertale). |

## NaniNovel (VNDS)

| Formato | Estabilidad | Notas |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 Alta | Un formato de serialización JSON para el motor Unity NaniNovel. |
