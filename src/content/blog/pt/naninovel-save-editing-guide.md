---
title: "Guia de Edição de Saves NaniNovel: Arquivos .nson Completo"
description: "Aprenda a editar arquivos de save de visual novels NaniNovel (.nson). Guia completo cobrindo estrutura do formato NSON, algoritmos de compressão, modificação de variáveis e dicas de solução de problemas."
pubDate: 2025-12-08
tags: ["naninovel", "visual-novel", "guide", "tutorial", "nson"]
author: "SaveEditor Team"
image: "/images/blog/naninovel-cover.webp"
---

## Introdução aos Arquivos de Save NaniNovel

![Interface do Editor de Save NaniNovel](/images/blog/naninovel-content.webp)

[NaniNovel](https://naninovel.com/) é um poderoso motor de visual novel baseado em Unity que ganhou popularidade significativa entre desenvolvedores indie e estúdios. Diferente dos saves tradicionais do Unity, o NaniNovel usa seu próprio formato proprietário **NSON** (arquivos `.nson`) para armazenar o estado do jogo, que requer tratamento especializado.

Este guia completo ensinará tudo o que você precisa saber sobre editar arquivos de save NaniNovel – desde entender o formato do arquivo até modificar seu progresso no jogo com segurança.

## Entendendo o Formato de Arquivo NSON

O formato NSON do NaniNovel é essencialmente **dados JSON comprimidos**:

### Estrutura Técnica

```
┌─────────────────────────────────┐
│     Compressão Raw DEFLATE      │
│     (Sem cabeçalho zlib)        │
├─────────────────────────────────┤
│                                 │
│        Estado do Jogo JSON      │
│    - Variáveis Globais          │
│    - Posição do Script          │
│    - Histórico de Escolhas      │
│    - Conteúdo Desbloqueado      │
│                                 │
└─────────────────────────────────┘
```

### Características Principais

1. **Compressão Raw DEFLATE**: Diferente do zlib padrão, NSON usa Raw DEFLATE sem cabeçalhos
2. **Núcleo JSON**: Os dados subjacentes são JSON padrão, legível após descompressão
3. **Codificação UTF-8**: Todo texto é armazenado em formato UTF-8
4. **Sem Criptografia**: NaniNovel não criptografa arquivos de save por padrão

## O Que Há Dentro de um Save NaniNovel?

Quando você descomprime um arquivo NSON, encontrará um objeto JSON estruturado contendo:

### Variáveis de Estado Global

```json
{
  "GlobalState": {
    "variableMap": {
      "g_affection_sarah": 85,
      "g_story_chapter": 3,
      "g_ending_unlocked": true,
      "g_coins": 1500
    }
  }
}
```

### Estado de Execução do Script

- **Script Atual**: Qual arquivo de script está sendo executado
- **Linha do Script**: Posição exata na narrativa
- **Histórico de Rollback**: Pilha de estados anteriores para funcionalidade de desfazer

## Guia Passo a Passo

### Passo 1: Localize Seu Arquivo de Save

Arquivos de save NaniNovel são tipicamente armazenados em:

**Windows:**
```
%AppData%\..\LocalLow\[NomeEmpresa]\[NomeJogo]\Saves\
```

**macOS:**
```
~/Library/Application Support/[NomeEmpresa]/[NomeJogo]/Saves/
```

### Passo 2: Crie um Backup

Antes de qualquer modificação, **sempre faça backup dos seus arquivos de save**.

### Passo 3: Envie para Nosso Editor

1. Navegue até nosso [Editor de Save NaniNovel](/pt/editor/naninovel)
2. Arraste e solte seu arquivo `.nson` na área de upload
3. Aguarde a descompressão e análise automática

### Passo 4: Modifique Valores

Modificações comuns incluem:

#### Modificar Pontos de Afeição

```json
"g_affection_character1": 50  →  "g_affection_character1": 100
```

#### Desbloquear Todos os Finais

```json
"g_ending_a_unlocked": false  →  "g_ending_a_unlocked": true
```

#### Adicionar Moeda do Jogo

```json
"g_coins": 100  →  "g_coins": 99999
```

### Passo 5: Baixe e Substitua

1. Clique em **Baixar Save Modificado**
2. Substitua o arquivo original pela versão modificada
3. Inicie o jogo e verifique suas mudanças

## Múltiplos Formatos de Save

| Formato | Extensão | Compressão | Suporte |
|---------|----------|------------|---------|
| NSON (Padrão) | `.nson` | Raw DEFLATE | ✅ Total |
| JSON (Debug) | `.json` | Nenhuma | ✅ Total |
| Base64 JSON | `.json` | Base64 | ✅ Total |
| Gzip JSON | `.json` | Gzip | ✅ Total |

## Solução de Problemas

### Arquivo de Save Não Carrega

**Soluções**:
1. Verifique se está editando o slot correto
2. Verifique se a sintaxe JSON é válida
3. Restaure do backup e tente novamente

### Mudanças Não Aparecem

**Causas Possíveis**:
1. **Conflito de Save na Nuvem**: Desabilite sincronização Steam/Unity Cloud
2. **Arquivo Errado**: NaniNovel usa arquivos separados para saves globais vs slots

## Ferramentas Relacionadas

- [Editor Unity PlayerPrefs](/pt/editor/unity) – Para jogos usando saves padrão Unity
- [Visualizador de Save Ren'Py](/pt/editor/renpy) – Para visual novels baseados em Python
- [Guia de Extensões de Arquivo de Save](/blog/pt/common-save-file-extensions-explained)

## Conclusão

O formato NSON do NaniNovel, embora use compressão, é fundamentalmente acessível uma vez que você entende sua estrutura. Nosso editor online lida com a complexidade técnica da descompressão e recompressão, permitindo que você se concentre nas mudanças que deseja fazer.

Lembre-se de sempre fazer backup de seus saves e, se encontrar problemas ou tiver sugestões, por favor [contate-nos](/pt/contact).

Boa edição!
