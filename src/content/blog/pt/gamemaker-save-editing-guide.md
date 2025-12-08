---
title: "Guia de Edição de Saves GameMaker: INI e JSON Completo"
description: "Domine a arte de editar arquivos de save do GameMaker Studio. Aprenda a modificar configurações INI, saves JSON para jogos como Undertale, Deltarune e mais."
pubDate: 2025-12-08
tags: ["gamemaker", "undertale", "guide", "tutorial", "ini", "json"]
author: "SaveEditor Team"
image: "/images/blog/gamemaker-cover.webp"
---

## Introdução aos Saves GameMaker

![Interface do Editor de Save GameMaker](/images/blog/gamemaker-content.webp)

**GameMaker Studio** (GMS) é um dos motores de jogos mais populares para jogos 2D, impulsionando títulos icônicos como **Undertale**, **Deltarune**, **Hotline Miami**, **Hyper Light Drifter** e inúmeros hits indie.

Diferente de motores com um sistema de save padronizado, o GameMaker dá aos desenvolvedores liberdade completa em como armazenar dados. Isso significa que os formatos de save variam amplamente, mas a maioria se enquadra em algumas categorias comuns que nosso editor suporta totalmente.

## Formatos Comuns de Save GameMaker

### 1. Arquivos INI (Mais Comum)

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

**Jogos usando INI**: Undertale (PC), Deltarune Chapter 1

### 2. Arquivos JSON

Jogos GameMaker modernos frequentemente usam JSON:

```json
{
  "player": {
    "name": "Kris",
    "hp": 100,
    "items": ["healing_item", "weapon_01"]
  },
  "chapter": 2
}
```

**Jogos usando JSON**: Deltarune Chapter 2, títulos GMS2 mais recentes

## Localizando Saves GameMaker

### Windows

A maioria dos jogos GameMaker armazena saves em:

```
%LocalAppData%\[NomeDoJogo]\
```

Exemplos:
- **Undertale**: `%LocalAppData%\UNDERTALE\`
- **Deltarune**: `%LocalAppData%\DELTARUNE\`

## Guia de Edição Undertale

Como o jogo GameMaker mais famoso, Undertale merece atenção especial:

### Estrutura de Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `file0` | Dados de save principais (sem extensão, formato INI) |
| `file8` | Dados persistentes (memória do Flowey) |
| `undertale.ini` | Dados do sistema (valor fun, configurações) |

### Variáveis Principais no file0

```ini
[General]
Name="Frisk"        ; Nome do jogador
Love=1              ; LV (Nível de Violência)
HP=20               ; HP atual
MaxHP=20            ; HP máximo
Gold=100            ; Dinheiro

[Kills]
kills=0             ; Total de mortes (afeta rotas)
```

## Guia Passo a Passo

### Passo 1: Localizar e Fazer Backup

1. Navegue até a pasta de save do jogo
2. **Sempre crie backups antes de editar**

### Passo 2: Enviar para o Editor

1. Vá para nosso [Editor GameMaker](/pt/editor/gamemaker)
2. Envie seu arquivo de save (`.ini`, `.json`)
3. O editor detectará automaticamente o formato

### Passo 3: Fazer Alterações

Para arquivos INI, você verá uma visão hierárquica:
- Seções (ex: `[player]`, `[flags]`)
- Pares chave-valor sob cada seção

### Passo 4: Baixar e Substituir

1. Clique em **Baixar Save Modificado**
2. Substitua o arquivo original
3. Inicie o jogo para verificar as alterações

## Solução de Problemas

### Erro "Dados de Save Corrompidos"

**Causas**:
- Sintaxe INI inválida
- Tipos de dados alterados
- Seções obrigatórias removidas

### Alterações Não Salvam

**Possíveis Problemas**:
1. **Steam Cloud**: Sobrescrevendo suas alterações locais
2. **Arquivo somente leitura**: Verifique as permissões

## Editores Relacionados

- [Editor Unity Save](/pt/editor/unity) – Para jogos baseados em Unity
- [Editor RPG Maker](/pt/editor/rpg-maker-mv) – Para títulos RPG Maker
- [Visualizador Ren'Py](/pt/editor/renpy) – Para visual novels

## Conclusão

A flexibilidade do GameMaker significa que não há uma abordagem única para edição de saves, mas os formatos mais comuns (INI e JSON) são bem suportados pelo nosso editor.

Se encontrar problemas ou tiver sugestões, por favor [contate-nos](/pt/contact). Boa edição!
