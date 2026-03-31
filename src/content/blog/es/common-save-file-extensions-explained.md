---
title: "Explicación de las Extensiones Comunes de Archivos de Guardado - Guía Completa"
description: "Una guía completa para entender .json, .xml, .sav, .rpgsave, .save, .dat y otros formatos populares de archivos de guardado y cómo editarlos."
pubDate: 2026-01-01
tags: ["guía", "formatos-archivo", "educación", "referencia"]
author: "Paradox"
image: "/images/blog/extensions-cover.webp"
---

## Introducción

![Common Save File Extensions](/images/blog/extensions-content.webp)

Los archivos de guardado de juegos vienen en docenas de formatos diferentes, cada uno con sus propias peculiaridades y requisitos de edición. Entender con qué extensión de archivo estás tratando es el primer paso para modificar con éxito tus partidas guardadas. Si alguna vez has intentado abrir un archivo de guardado y solo has visto caracteres ininteligibles, sabrás por qué esto es importante.

Esta guía completa cubre todos los formatos principales de archivos de guardado que encontrarás en juegos de PC, web y consolas, desde archivos de texto simples legibles por humanos hasta estructuras binarias complejas.

## Formatos Basados en Texto (Fáciles de Editar)

Estos son los archivos de guardado más sencillos. Almacenan datos en texto plano que puedes leer sin herramientas especiales.

### JSON (.json)

**Motores**: GameMaker, Godot, Unity (personalizado), muchos juegos indie y web.

JSON (JavaScript Object Notation) es un formato legible por humanos que utiliza llaves y pares clave-valor. Es increíblemente común en el desarrollo de juegos modernos debido a su simplicidad y compatibilidad con la mayoría de los lenguajes de programación.

```json
{
  "playerName": "Héroe",
  "gold": 5000,
  "level": 25,
  "stats": {
      "str": 10,
      "dex": 15
  },
  "inventory": ["espada_01", "poción_03"]
}
```

**Cómo Editar**: Ábrelo en cualquier editor de texto (VS Code, Notepad++, Bloc de notas). Cambia los valores, guarda y listo. Solo ten cuidado de no romper la sintaxis (como olvidar una coma o dejar un corchete sin cerrar), ya que esto corromperá el archivo.

**Herramienta recomendada**: [Cualquier editor de texto, o nuestro Editor Genérico](/es/editor/gamemaker) para una vista de árbol más segura.

---

### INI (.ini)

**Motores**: GameMaker Studio, muchos juegos antiguos de Windows.

Los archivos INI utilizan secciones entre corchetes con pares simples de clave=valor. Son muy fáciles de leer pero no soportan estructuras de datos complejas (como listas anidadas) tan bien como JSON.

```ini
[Player]
Name=Héroe
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**Cómo Editar**: Extremadamente sencillo. Ábrelo en un editor de texto, cambia los números o el texto después del signo `=` y guarda.

**Herramienta recomendada**: [Cualquier editor de texto, o nuestro Editor de GameMaker](/es/editor/gamemaker) para edición organizada.

---

### XML (.xml, .plist)

**Motores**: Unity (PlayerPrefs en móviles), muchos juegos multiplataforma, juegos de iOS.

XML utiliza etiquetas anidadas para estructurar datos, similar a HTML. Es un formato más antiguo que JSON pero sigue siendo muy utilizado, especialmente en entornos empresariales y juegos móviles.

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
  <pref name="UserName" type="string">Jugador1</pref>
</PlayerPrefs>
```

**Cómo Editar**: Editable en editores de texto, pero ten cuidado con la estructura de las etiquetas de apertura `<tag>` y cierre `</tag>`. Si faltan etiquetas de cierre, el analizador del juego no podrá leer el archivo.

**Herramienta recomendada**: [Editor de Unity](/es/editor/unity) (soporta conversión automática de tipos).

---

## Formatos Comprimidos/Codificados (Dificultad Media)

Estos archivos son texto técnico, pero han sido "comprimidos" u ofuscados para ahorrar espacio o disuadir la edición casual.

### RPG Maker (.rpgsave, .rvdata2)

**Motores**: RPG Maker MV, MZ (usan .rpgsave), VX Ace (usa .rvdata2).

Los archivos `.rpgsave` son cadenas de datos JSON que han sido comprimidas usando un algoritmo llamado LZString y luego codificadas en Base64. Los archivos `.rvdata2` utilizan el formato Marshal de Ruby, que es específico de ese lenguaje.

Sin descompresión, parecen una larga cadena de caracteres aleatorios:
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

Después de la descompresión adecuada, se convierten en JSON estándar.

**Cómo Editar**: No puedes editarlos directamente en el Bloc de notas. Requieren una herramienta especializada que pueda descomprimir la cadena LZString, permitirte editar el JSON y luego volver a comprimirlo exactamente igual.

**Herramienta recomendada**: [Editor de RPG Maker](/es/editor/rpg-maker-mv) (maneja todo el proceso automáticamente).

---

### NaniNovel (.nson)

**Motores**: Juegos de Unity que utilizan el framework de novelas visuales NaniNovel.

Los archivos `.nson` son típicamente objetos JSON que pueden estar comprimidos (gzip, brotli) o codificados en base64 según la configuración del desarrollador.

**Cómo Editar**: Similar a RPG Maker, necesitas una herramienta que detecte la capa de compresión. Nuestro editor detecta automáticamente el método de codificación y presenta un JSON editable.

**Herramienta recomendada**: [Editor de NaniNovel](/es/editor/naninovel)

---

## Formatos Binarios (Difíciles de Editar)

Estos archivos almacenan datos en bytes (0s y 1s) en lugar de texto. Abrirlos en un editor de texto solo mostrará símbolos extraños.

### Unreal Engine (.sav)

**Motores**: Unreal Engine 4 y 5.

La mayoría de los juegos de Unreal utilizan el formato binario GVAS (Game Variable Archive Save). Este formato contiene un encabezado con información de versión, definiciones de estructuras personalizadas y los datos del juego serializados.

Juegos incluidos: *Palworld*, *Hogwarts Legacy*, *Satisfactory*, *Deep Rock Galactic*.

**Cómo Editar**: Requiere un analizador GVAS robusto para convertir la estructura binaria a un formato legible (como JSON) y volver a convertirla perfectamente sin corromper el archivo.

**Herramienta recomendada**: [Editor de Unreal Engine](/es/editor/unreal) (el mejor para archivos .sav).

---

### Ren'Py (.save)

**Motores**: Motor de novelas visuales Ren'Py.

Utiliza el módulo `pickle` de Python para serializar el estado completo de la memoria del juego. Esto lo hace muy flexible para los desarrolladores, pero muy difícil de modificar de forma segura para los usuarios, ya que ejecutar archivos pickle no confiables puede ser un riesgo de seguridad.

Juegos incluidos: *Doki Doki Literature Club*, *Katawa Shoujo*, muchas novelas visuales para adultos.

**Cómo Editar**: La visualización de solo lectura es segura. La modificación requiere re-empaquetar cuidadosamente los objetos de Python o, mejor aún, usar la consola de desarrollador del juego en tiempo real.

**Herramienta recomendada**: [Visor de Ren'Py](/es/editor/renpy) (solo lectura) o la consola del juego.

---

### Binario Genérico (.dat, .sav, .bin)

**Motores**: Motores personalizados, juegos de consola antiguos, implementaciones específicas en C++.

Estos archivos no tienen un formato estándar universal. Podrían contener:
*   Registros de tamaño fijo (por ejemplo, los primeros 4 bytes son oro, los siguientes 4 son nivel).
*   Datos estructurados de diversas formas sin un patrón claro.
*   Compresión personalizada o encriptación.

**Cómo Editar**: La única forma confiable es usar un Editor Hexadecimal (como HxD o 010 Editor). Necesitas buscar patrones, comparar archivos de guardado antes y después de cambios en el juego, y a menudo requiere conocimientos de ingeniería inversa.

**Herramienta recomendada**: Editor Hexadecimal de escritorio (no basado en web).

---

## Formatos Específicos de Plataforma

### Registro de Windows (PlayerPrefs)

Los juegos de Unity en Windows a menudo no crean un archivo en absoluto. En su lugar, almacenan sus datos (PlayerPrefs) directamente en el Registro de Windows en:
```
HKEY_CURRENT_USER\Software\[NombreDeLaCompañía]\[NombreDelProducto]
```

Los valores se almacenan con nombres de clave que pueden estar basados en hash, y los datos pueden ser binarios.

**Cómo Editar**: Usa la herramienta `regedit` incorporada en Windows. Navega a la ruta y edita las claves con cuidado.

---

### iOS/macOS .plist

Archivos de Lista de Propiedades (Property List) utilizados por las plataformas de Apple. Pueden presentarse en formato XML legible o en un formato binario comprimido.

**Cómo Editar**: Si es XML, usa un editor de texto. Si es binario, puedes usar la herramienta de línea de comandos `plutil` para convertir: `plutil -convert xml1 archivo.plist` para leerlo, y luego convertirlo de nuevo.

---

### SQLite (.db, .sqlite)

Algunos juegos, especialmente los de estrategia o gestión con muchos datos, utilizan bases de datos SQLite completas como archivos de guardado.

**Cómo Editar**: Usa un visor de bases de datos como *DB Browser for SQLite*. Puedes ejecutar consultas SQL directas para modificar cualquier dato.

---

## Tabla de Referencia Rápida

| Extensión | Tipo de Formato | Dificultad | Nuestra Herramienta Recomendada |
|---|---|---|---|
| `.json` | Texto (JSON) | Fácil | [GameMaker](/es/editor/gamemaker) |
| `.ini` | Texto (INI) | Fácil | [GameMaker](/es/editor/gamemaker) |
| `.xml` | Texto (XML) | Fácil | [Unity](/es/editor/unity) |
| `.plist` | Texto/Binario | Fácil-Media | [Unity](/es/editor/unity) |
| `.rpgsave` | JSON Comprimido | Media | [RPG Maker](/es/editor/rpg-maker-mv) |
| `.nson` | JSON Codificado | Media | [NaniNovel](/es/editor/naninovel) |
| `.sav` (UE) | Binario (GVAS) | Difícil | [Unreal](/es/editor/unreal) |
| `.save` (Ren'Py)| Binario (Pickle)| Muy Difícil| [Visor Solo](/es/editor/renpy) |
| `.dat`, `.bin` | Binario Personalizado | Muy Difícil | Editor Hexadecimal de escritorio |

## Preguntas Frecuentes

**P: ¿Cómo sé qué formato es realmente mi archivo de guardado?**
R: Ábrelo en un editor de texto simple (como el Bloc de notas). Si ves texto legible y estructuras como `{}` o `<>`, está basado en texto. Si ves un lío de símbolos extraños y cuadros, es binario o está comprimido.

**P: ¿Qué pasa si el formato de mi juego no está en la lista?**
R: Intenta abrirlo en nuestro editor genérico; puede detectar automáticamente formatos comunes de Unity o JSON disfrazados. De lo contrario, consulta las comunidades específicas del juego (Reddit, Discord) para ver si existen herramientas creadas por fans.

**P: ¿Se pueden editar absolutamente todos los archivos de guardado?**
R: La gran mayoría se puede editar técnicamente. Sin embargo, algunos juegos modernos usan:
*   **Encriptación**: Requiere una clave que podría estar oculta en el ejecutable del juego.
*   **Sumas de verificación (Checksums)**: Una firma matemática que valida la integridad del archivo. Si cambias un byte sin actualizar la suma, el juego marcará el guardado como corrupto.
*   **Guardado en la nube del servidor**: En juegos multijugador (como MMOs), tus datos viven en los servidores de la compañía, no en tu PC, por lo que no puedes editarlos.

**P: ¿Es legal editar partidas guardadas?**
R: Para juegos de un solo jugador en archivos que posees localmente, es legal y generalmente aceptado. Sin embargo, modificar juegos competitivos o en línea para obtener ventaja viola los Términos de Servicio y puede resultar en la prohibición de tu cuenta. Úsalo responsablemente.

**P: ¿Por qué mi archivo .sav no funciona en el editor de Unreal?**
R: No todos los archivos `.sav` son de Unreal Engine. Muchos desarrolladores usan esa extensión genérica para sus propios formatos personalizados. Si el encabezado del archivo no comienza con `GVAS`, probablemente no sea de Unreal.

## Conclusión

Entender el formato de tu archivo de guardado es la mitad de la batalla para convertirte en un experto en edición de partidas. Una vez que sepas si estás tratando con JSON simple, datos comprimidos de RPG Maker o archivos complejos GVAS de Unreal, puedes elegir la herramienta y el enfoque correctos.

Nuestro Save Editor Online soporta la mayoría de los formatos comunes automáticamente: ¡simplemente sube tu archivo y déjanos encargarnos de la detección y análisis por ti!

## Lectura Adicional

Explora nuestras guías paso a paso detalladas para cada motor de juego específico:

- 📖 [Guía de Edición de RPG Maker](/es/blog/how-to-edit-rpg-maker-save) - Profundizando en archivos .rpgsave y .rvdata2
- 📖 [Guía de Edición de Unity](/es/blog/how-to-edit-unity-saves) - PlayerPrefs, XML y JSON explicados
- 📖 [Guía de Unreal Engine](/es/blog/how-to-edit-unreal-engine-saves) - Dominando el formato binario GVAS .sav
- 📖 [Guía de Edición de Ren'Py](/es/blog/renpy-save-editing-guide) - Trabajando con archivos pickle de Python
- 📖 [Guía de Edición de GameMaker](/es/blog/gamemaker-save-editing-guide) - Archivos INI y JSON en detalle
- 📖 [Guía de Edición de NaniNovel](/es/blog/naninovel-save-editing-guide) - Archivos .nson comprimidos

---

*Última actualización: Enero 2026*

### Empezar a Editar Ahora

- [Editor de RPG Maker](/es/editor/rpg-maker-mv)
- [Editor de Unity](/es/editor/unity)
- [Editor de Unreal Engine](/es/editor/unreal)
- [Visor de Ren'Py](/es/editor/renpy)
- [Editor de GameMaker](/es/editor/gamemaker)
- [Editor de NaniNovel](/es/editor/naninovel)
