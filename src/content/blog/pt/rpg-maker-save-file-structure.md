---
title: "Estrutura de Arquivos de Save RPG Maker Explicada - Guia MV, MZ, VX Ace"
description: "Guia completo para entender a estrutura de arquivos de save do RPG Maker. Aprenda sobre formatos .rpgsave, .rmmzsave, .rvdata2 e como eles armazenam dados do jogo. Perfeito para edição de saves e desenvolvimento de jogos."
pubDate: 2026-01-05
updatedDate: 2026-03-28
tags: ["rpg-maker", "rpgsave", "guia", "técnico"]
author: "Paradox"
lang: "pt"
image: "/images/blog/rpg-maker-structure-cover-v2.webp"
---

## Introdução

RPG Maker capacita criadores de jogos há décadas, do MV e MZ ao VX Ace e versões anteriores. Seja você um jogador querendo editar seu save ou um desenvolvedor debugando seu jogo, entender a **estrutura de arquivos de save do RPG Maker** é essencial.

Este guia detalha exatamente como o RPG Maker armazena dados de save, o que cada propriedade significa e como você pode editar esses arquivos com segurança usando nosso **editor de save RPG Maker** gratuito.

## Formatos de Arquivo de Save por Versão

| Engine | Extensão | Formato | Criptografia |
|--------|----------|---------|--------------|
| **RPG Maker MZ** | .rmmzsave | JSON (Base64) | Opcional |
| **RPG Maker MV** | .rpgsave | JSON (Base64 + LZString) | Opcional |
| **RPG Maker VX Ace** | .rvdata2 | Ruby Marshal | Nenhuma |
| **RPG Maker VX** | .rvdata | Ruby Marshal | Nenhuma |
| **RPG Maker XP** | .rxdata | Ruby Marshal | Nenhuma |

## Estrutura de Save RPG Maker MV/MZ

Saves MV e MZ são os mais comuns e fáceis de editar. Eles usam JSON codificado em Base64.

![Diagrama visualizando a estrutura do arquivo de save JSON do RPG Maker com nós de Sistema, Grupo, Atores e Mapa](/images/blog/rpg-maker-structure-content.webp)

### Estrutura Básica

```json
{
  "system": { ... },
  "screen": { ... },
  "timer": { ... },
  "switches": { ... },
  "variables": { ... },
  "selfSwitches": { ... },
  "actors": { ... },
  "party": { ... },
  "map": { ... },
  "player": { ... }
}
```

### Propriedades Principais Explicadas

#### 1. Dados do Grupo (`party`)
Contém o estado principal do jogo:

```json
{
  "_gold": 5000,
  "_steps": 12345,
  "_items": { "1": 10, "2": 5 },
  "_weapons": { "1": 1 },
  "_armors": { "1": 1 },
  "_actors": [1, 2, 3, 4]
}
```

- `_gold`: Dinheiro do grupo
- `_steps`: Contador de passos
- `_items`: Mapa ID do item → quantidade
- `_weapons`/`_armors`: Inventário de equipamentos
- `_actors`: IDs dos atores na ordem do grupo

#### 2. Dados dos Atores (`actors`)
Status individuais dos personagens:

```json
{
  "_hp": 500,
  "_mp": 100,
  "_level": 25,
  "_exp": { "1": 50000 },
  "_skills": [1, 2, 3, 10, 15],
  "_equips": [1, 0, 1, 0, 0],
  "_name": "Herói",
  "_class": 1
}
```

#### 3. Switches (`switches`)
Flags booleanas que controlam eventos do jogo:

```json
{
  "1": true,    // Exemplo: "Conheceu o Rei"
  "2": false,
  "10": true    // Exemplo: "Chefe Derrotado"
}
```

#### 4. Variáveis (`variables`)
Valores numéricos para lógica do jogo:

```json
{
  "1": 500,     // Exemplo: "Progresso da Missão"
  "2": 10,      // Exemplo: "Itens Coletados"
  "5": 99       // Exemplo: "Contador Secreto"
}
```

## Localizações de Arquivos de Save

### RPG Maker MV/MZ (Desktop)
```
[Pasta do Jogo]/www/save/
[Pasta do Jogo]/save/
```

Arquivos são nomeados `file1.rpgsave`, `file2.rpgsave`, etc.

### RPG Maker MV/MZ (Navegador)
Saves são armazenados no `localStorage` do navegador:
```
RPG [Título do Jogo]
```

### RPG Maker VX Ace
```
[Pasta do Jogo]/Save/
```

Arquivos são `Save01.rvdata2`, `Save02.rvdata2`, etc.

## Como Editar Saves RPG Maker

### Método 1: Editor Online (Recomendado)

1. Vá para nosso [Editor de Save RPG Maker](/pt/editor/rpg-maker-mv)
2. Carregue seu arquivo `.rpgsave` ou `.rmmzsave`
3. Edite valores na interface visual
4. Baixe e substitua o arquivo original

### Método 2: Edição Manual (Avançado)

Para arquivos MV/MZ:

1. Abra o arquivo em um editor de texto
2. Copie a string Base64
3. Decodifique com decodificador Base64
4. Para MV: Descomprima com LZString
5. Edite o JSON
6. Inverta o processo

Nosso editor online faz tudo isso automaticamente!

## Edições Comuns

### Adicionar Ouro Máximo
Defina `party._gold` para a quantidade desejada (máx: 99999999 tipicamente).

### Nível Máximo para Todos os Personagens
Para cada ator em `actors`, defina `_level` para o máximo e ajuste `_exp` adequadamente.

### Desbloquear Todas as Habilidades
Adicione IDs de habilidades ao array `_skills` de cada ator.

### Completar Todas as Missões
Encontre os switches ou variáveis relevantes e defina-os para o estado "completado".

### Adicionar Qualquer Item
Adicione entradas em `party._items` com o ID do item e quantidade.

## Diferenças MZ vs MV

Embora similares, MZ tem algumas melhorias:

| Recurso | MV | MZ |
|---------|----|----|
| Compressão | LZString | Nenhuma (JSON puro) |
| Auto-save | Opcional | Integrado |
| Formato de itens | Igual | Igual |
| Formato de variáveis | Igual | Igual |

## Solução de Problemas

### Erro "Arquivo de save corrompido"
- A estrutura JSON foi quebrada durante a edição
- Restaure o backup e tente novamente com mudanças menores
- Use nosso editor online para evitar erros de sintaxe JSON

### Mudanças Não Aparecem no Jogo
- Certifique-se de que está editando o slot de save correto
- Alguns valores são cacheados; pode precisar mudar de mapa ou reiniciar
- Verifique se o jogo tem criptografia habilitada

### Não Consigo Encontrar a Pasta de Save
- Clique com botão direito no jogo → Propriedades → Arquivos Locais → Navegar
- Para jogos de navegador, verifique localStorage nas Ferramentas do Desenvolvedor

## Dicas para Desenvolvedores

Se você está criando um jogo RPG Maker:

1. **Documente seus switches/variáveis** - Mantenha uma planilha
2. **Use IDs significativos** - Agrupe switches relacionados
3. **Teste compatibilidade de saves** - Edite saves para testar casos extremos
4. **Considere criptografia** - Para elementos competitivos/multiplayer

## Leitura Adicional

Expanda seu conhecimento de RPG Maker com estes guias relacionados:

- 📖 [Como Editar Arquivos de Save RPG Maker](/pt/blog/how-to-edit-rpg-maker-save) - Tutorial passo a passo de edição
- 📂 [Extensões Comuns de Arquivos de Save](/pt/blog/common-save-file-extensions-explained) - Entendendo .rpgsave, .sav e mais
- 🔧 [Editor RPG Maker](/pt/editor/rpg-maker-mv) - Ferramenta online para edição de saves
- 🎭 [Guia de Edição de Save Ren'Py](/pt/blog/renpy-save-editing-guide) - Outro motor popular de visual novel

## Conclusão

Entender a **estrutura de arquivos de save do RPG Maker** te capacita a debugar jogos, recuperar progresso perdido ou simplesmente aproveitar jogos do jeito que você quer. Seja adicionando ouro, maximizando status ou desbloqueando conteúdo, nosso **editor de save RPG Maker** gratuito torna isso seguro e fácil.

**Pronto para editar?** [Abrir o Editor de Save RPG Maker →](/pt/editor/rpg-maker-mv)

---

*Última atualização: Janeiro de 2026*

### Artigos Relacionados

- [Como Editar Arquivos de Save RPG Maker](/pt/blog/how-to-edit-rpg-maker-save)
- [Extensões Comuns de Arquivos de Save](/pt/blog/common-save-file-extensions-explained)
- [Guia de Edição de Save GameMaker](/pt/blog/gamemaker-save-editing-guide)
