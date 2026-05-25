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
| RPG Maker XP / VX / VX Ace | 🟡 Estable limitado | To the Moon, LISA: The Painful | Permite edición limitada de campos comunes en `.rxdata`, `.rvdata` y `.rvdata2`, como dinero, objetos, variables, interruptores y valores de actor; los objetos Ruby personalizados y cambios estructurales se bloquean. |

## Ren'Py

| Motor | Estabilidad | Notas |
|---|---|---|
| Ren'Py | 🟡 Estable limitado | Permite ver `.save` y guardar valores simples de `persistent`, como strings, números y booleanos; objetos complejos, estado fuera de persistent y cambios estructurales se bloquean. |

## Unity

| Motor | Estabilidad | Notas |
|---|---|---|
| Unity PlayerPrefs | 🟢 Alta | Juegos de navegador o juegos de PC/Móvil que utilizan PlayerPrefs. |
| Unity BinaryFormatter | 🟡 Media | Soporte limitado para algunos tipos complejos comunes. Se mejorará en futuras actualizaciones. |

## Unreal Engine

| Motor / Formato | Estabilidad | Notas |
|---|---|---|
| GVAS estándar | 🟢 Alta | Soporta propiedades descomprimidas estándar de Unreal Save Game (juegos como Hogwarts Legacy, Palworld). |
| GVAS gzip/zlib | 🟢 Alta | Descomprime, permite editar y reconstruye el contenedor gzip/zlib original. Otros contenedores personalizados muestran modo de solo lectura o una causa de fallo separada. |

## GameMaker

| Formato | Estabilidad | Notas |
|---|---|---|
| INI / Texto plano | 🟢 Alta | Detecta y expande automáticamente la estructura de volcados `ds_map` o guardados INI. Si están codificados en Base64, los decodificará para su visualización (ej. Undertale). |

## NaniNovel (VNDS)

| Formato | Estabilidad | Notas |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 Alta | Un formato de serialización JSON para el motor Unity NaniNovel. |
