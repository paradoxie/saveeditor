---
title: 'Matriz de Compatibilidade'
subtitle: 'Uma visão geral dos motores e formatos atualmente suportados.'
---

## Formatos Genéricos

| Formato | Extensões | Descrição |
|---|---|---|
| JSON | `.json` / `.sav` | Texto estruturado. Usado por muitos motores de jogos e jogos web. |
| XML | `.xml` | Formato de texto baseado em tags. Comum em jogos Flash e títulos mais antigos. |
| INI | `.ini` | Arquivos de configuração chave-valor simples. Freqüentemente usado em jogos independentes de pequena escala. |

## Série RPG Maker

| Motor | Estabilidade | Exemplos de Jogos Testados | Notas |
|---|---|---|---|
| RPG Maker MV / MZ | 🟢 Alta | Omori, OneShot, Lisa | O formato `rpgsave` é JSON compactado com LZString. |
| RPG Maker XP / VX | 🔴 Sem Suporte | To the Moon | `rxdata` e `rvdata2` (Ruby Marshal Data) não são suportados atualmente devido às dificuldades de desserialização segura e precisa do lado do cliente do navegador. |

## Ren'Py

| Motor | Estabilidade | Notas |
|---|---|---|
| Ren'Py | 🟡 Média | Analisa Python Pickles complexos (compactados com zlib). Como depende fortemente dos tipos de variáveis, a modificação da estrutura dos valores pode corromper o jogo. |

## Unity

| Motor | Estabilidade | Notas |
|---|---|---|
| Unity PlayerPrefs | 🟢 Alta | Jogos baseados em navegador ou jogos PC/Mobile usando PlayerPrefs. |
| Unity BinaryFormatter | 🟡 Média | Suporte limitado para alguns tipos complexos comuns. Serão melhorados em atualizações futuras. |

## Unreal Engine

| Motor / Formato | Estabilidade | Notas |
|---|---|---|
| GVAS Padrão | 🟢 Alta | Suporta propriedades descompactadas do padrão Unreal Save Game (jogos como Hogwarts Legacy, Palworld). |
| GVAS Comprimido | 🟡 Média | Detecta e descompacta automaticamente a compactação zlib (ex: Deep Rock Galactic). Devido ao risco na reconstrução segura para salvar no jogo, opera atualmente no modo "Somente Leitura". |

## GameMaker

| Formato | Estabilidade | Notas |
|---|---|---|
| INI / Texto Simples | 🟢 Alta | Detecta e expande automaticamente a estrutura de despejos `ds_map` ou saves INI. Se for codificado em Base64, ele será decodificado para exibição (ex: Undertale). |

## NaniNovel (VNDS)

| Formato | Estabilidade | Notas |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 Alta | Um formato serializado JSON para o motor Unity NaniNovel. |
