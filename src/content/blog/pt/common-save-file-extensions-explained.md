---
title: "Extensões Comuns de Arquivos de Save de Jogos Explicadas - Referência Completa"
description: "Um guia abrangente para entender .json, .xml, .sav, .rpgsave, .save, .dat e outros formatos comuns de arquivos de save de jogos e como editá-los."
pubDate: 2025-11-28
tags: ["guia", "formatos-de-arquivo", "educação", "referência"]
author: "SaveEditor Team"
lang: "pt"
image: "/images/blog/extensions-cover.webp"
---

## Introdução

![Extensões Comuns de Arquivos de Save](/images/blog/extensions-content.webp)

Arquivos de save de jogos vêm em dezenas de formatos diferentes, cada um com suas próprias peculiaridades e requisitos de edição. Entender com qual extensão de arquivo você está lidando é o primeiro passo para modificar com sucesso seus saves de jogo.

Este guia abrangente cobre todos os principais formatos de arquivo de save que você encontrará, desde arquivos de texto simples legíveis por humanos até estruturas binárias complexas.

## Formatos Baseados em Texto (Fáceis de Editar)

### JSON (.json)

**Motores**: GameMaker, Godot, Unity (customizado), muitos jogos indie.

JSON (JavaScript Object Notation) é um formato legível por humanos que usa chaves e pares chave-valor:

```json
{
  "playerName": "Hero",
  "gold": 5000,
  "level": 25,
  "inventory": ["sword_01", "potion_03"]
}
```

**Como Editar**: Abra em qualquer editor de texto (VS Code, Notepad++). Mude valores, salve, pronto. Apenas tenha cuidado para não quebrar a sintaxe (vírgulas faltando, colchetes não fechados).

**Ferramenta**: [Qualquer editor de texto, ou nosso Editor Genérico](/pt/editor/gamemaker)

---

### INI (.ini)

**Motores**: GameMaker Studio, muitos jogos antigos.

Arquivos INI usam seções em colchetes com pares chave=valor:

```ini
[Player]
Name=Hero
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**Como Editar**: Muito direto. Abra em um editor de texto, mude valores, salve.

**Ferramenta**: [Qualquer editor de texto, ou nosso Editor GameMaker](/pt/editor/gamemaker)

---

### XML (.xml, .plist)

**Motores**: Unity (PlayerPrefs em mobile), muitos jogos cross-platform.

XML usa tags aninhadas para estruturar dados:

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
</PlayerPrefs>
```

**Como Editar**: Editável em editores de texto, mas tenha cuidado com a estrutura de tags. Tags de fechamento faltando quebrarão o arquivo.

**Ferramenta**: [Editor Unity](/pt/editor/unity)

---

## Formatos Comprimidos/Codificados (Dificuldade Média)

### RPG Maker (.rpgsave, .rvdata2)

**Motores**: RPG Maker MV, MZ (rpgsave), VX Ace (rvdata2).

Arquivos `.rpgsave` são dados JSON comprimidos com LZString. Arquivos `.rvdata2` usam formato Ruby Marshal.

Sem descompressão, eles parecem caracteres aleatórios:
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

Após descompressão, são apenas JSON.

**Como Editar**: Requer uma ferramenta especializada para descomprimir, editar e recomprimir.

**Ferramenta**: [Editor RPG Maker](/pt/editor/rpg-maker-mv)

---

### NaniNovel (.nson)

**Motores**: Jogos Unity usando o framework de visual novel NaniNovel.

Arquivos `.nson` são tipicamente JSON que pode ser comprimido ou codificado em base64.

**Como Editar**: Nosso editor detecta automaticamente a codificação e apresenta JSON editável.

**Ferramenta**: [Editor NaniNovel](/pt/editor/naninovel)

---

## Formatos Binários (Difíceis de Editar)

### Unreal Engine (.sav)

**Motores**: Unreal Engine 4 & 5.

Usa o formato binário GVAS (Game Variable Archive Save). Contém um header, árvore de propriedades e compressão opcional.

Jogos incluem: Palworld, Hogwarts Legacy, Satisfactory, Deep Rock Galactic.

**Como Editar**: Requer um parser GVAS para converter binário para JSON e vice-versa.

**Ferramenta**: [Editor Unreal Engine](/pt/editor/unreal)

---

### Ren'Py (.save)

**Motores**: Motor de visual novel Ren'Py.

Usa o módulo `pickle` do Python para serializar o estado inteiro do jogo. Muito difícil de modificar com segurança devido a riscos de segurança.

Jogos incluem: Doki Doki Literature Club, Katawa Shoujo.

**Como Editar**: Visualização apenas leitura é segura. Modificação requer re-pickling cuidadoso ou uso do console in-game.

**Ferramenta**: [Visualizador Ren'Py](/pt/editor/renpy) (apenas leitura)

---

### Binário Genérico (.dat, .sav, .bin)

**Motores**: Motores customizados, jogos antigos.

Esses arquivos não têm formato padrão. Podem conter:
*   Registros de tamanho fixo (por exemplo, 4 bytes para ouro, 4 bytes para nível)
*   Dados estruturados de várias formas sem padrão claro
*   Compressão ou criptografia

**Como Editar**: Use um editor hexadecimal (HxD, 010 Editor). Procure padrões. Frequentemente requer conhecimento específico do jogo ou pesquisa da comunidade.

**Ferramenta**: Editor hexadecimal (não baseado em web)

---

## Formatos Específicos de Plataforma

### Registro do Windows (PlayerPrefs)

Jogos Unity no Windows frequentemente armazenam PlayerPrefs no registro em:
```
HKEY_CURRENT_USER\Software\[NomeDaEmpresa]\[NomeDoProduto]
```

Valores são armazenados com nomes de chave baseados em hash e dados binários.

**Como Editar**: Use `regedit` ou ferramentas específicas para PlayerPrefs.

---

### iOS/macOS .plist

Arquivos Property List usados por plataformas Apple. Podem ser formato XML ou binário.

**Como Editar**: Se XML, use editor de texto. Se binário, use `plutil` para converter: `plutil -convert xml1 file.plist`

---

### SQLite (.db, .sqlite)

Alguns jogos usam bancos de dados SQLite.

**Como Editar**: Use DB Browser for SQLite ou ferramentas similares.

---

## Tabela de Referência Rápida

| Extensão | Tipo de Formato | Dificuldade | Nossa Ferramenta |
|---|---|---|---|
| `.json` | Texto (JSON) | Fácil | [GameMaker](/pt/editor/gamemaker) |
| `.ini` | Texto (INI) | Fácil | [GameMaker](/pt/editor/gamemaker) |
| `.xml` | Texto (XML) | Fácil | [Unity](/pt/editor/unity) |
| `.plist` | Texto/Binário | Fácil-Médio | [Unity](/pt/editor/unity) |
| `.rpgsave` | JSON Comprimido | Médio | [RPG Maker](/pt/editor/rpg-maker-mv) |
| `.nson` | JSON Codificado | Médio | [NaniNovel](/pt/editor/naninovel) |
| `.sav` (UE) | Binário (GVAS) | Difícil | [Unreal](/pt/editor/unreal) |
| `.save` (Ren'Py) | Binário (Pickle) | Muito Difícil | [Apenas Visualizador](/pt/editor/renpy) |
| `.dat`, `.bin` | Binário Customizado | Muito Difícil | Editor Hexadecimal |

## Perguntas Frequentes

**P: Como sei qual formato é meu arquivo de save?**
R: Abra em um editor de texto. Se você vir texto/JSON/XML legível, é baseado em texto. Se você vir caracteres ilegíveis, é binário.

**P: E se o formato do meu jogo não estiver listado aqui?**
R: Tente abrir em nosso editor genérico - pode detectar automaticamente o formato. Caso contrário, consulte comunidades específicas do jogo.

**P: Todos os arquivos de save podem ser editados?**
R: A maioria pode ser tecnicamente editada, mas alguns usam criptografia, checksums ou validação server-side que tornam impraticável.

**P: Edição de save é legal?**
R: Para jogos single-player em arquivos que você possui, sim. Modificar jogos online/competitivos pode violar termos de serviço.

## Conclusão

Entender seu formato de arquivo de save é metade da batalha. Uma vez que você sabe se está lidando com JSON simples, dados RPG Maker comprimidos ou arquivos GVAS complexos do Unreal, você pode escolher a ferramenta e abordagem certas.

Nosso Save Editor Online suporta a maioria dos formatos comuns automaticamente - apenas faça upload do seu arquivo e deixe-nos cuidar do resto!

## Leitura Adicional

Explore nossos guias detalhados para cada motor de jogo:

- 📖 [Guia de Edição de Save RPG Maker](/pt/blog/how-to-edit-rpg-maker-save) - Arquivos .rpgsave e .rvdata2
- 📖 [Guia de Edição de Save Unity](/pt/blog/how-to-edit-unity-saves) - PlayerPrefs e arquivos XML
- 📖 [Guia de Save Unreal Engine](/pt/blog/how-to-edit-unreal-engine-saves) - Arquivos GVAS .sav
- 📖 [Guia de Edição de Save Ren'Py](/pt/blog/renpy-save-editing-guide) - Arquivos Python pickle
- 📖 [Guia de Edição de Save GameMaker](/pt/blog/gamemaker-save-editing-guide) - Arquivos INI e JSON
- 📖 [Guia de Edição de Save NaniNovel](/pt/blog/naninovel-save-editing-guide) - Arquivos .nson

---

*Última atualização: Dezembro de 2025*

### Comece a Editar

- [Editor RPG Maker](/pt/editor/rpg-maker-mv)
- [Editor Unity](/pt/editor/unity)
- [Editor Unreal Engine](/pt/editor/unreal)
- [Visualizador Ren'Py](/pt/editor/renpy)
- [Editor GameMaker](/pt/editor/gamemaker)
- [Editor NaniNovel](/pt/editor/naninovel)

