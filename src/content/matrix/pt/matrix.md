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
| RPG Maker XP / VX / VX Ace | 🟡 Estável limitado | To the Moon, LISA: The Painful | Permite edição limitada de campos comuns em `.rxdata`, `.rvdata` e `.rvdata2`, como dinheiro, itens, variáveis, switches e valores de atores; objetos Ruby personalizados e mudanças estruturais são bloqueados. |

## Ren'Py

| Motor | Estabilidade | Notas |
|---|---|---|
| Ren'Py | 🟡 Estável limitado | Permite visualizar `.save` e salvar valores simples em `persistent`, como strings, números e booleanos; objetos complexos, estado fora de persistent e mudanças estruturais são bloqueados. |

## Unity

| Motor | Estabilidade | Notas |
|---|---|---|
| Unity PlayerPrefs | 🟢 Alta | Jogos baseados em navegador ou jogos PC/Mobile usando PlayerPrefs. |
| Unity BinaryFormatter | 🟡 Média | Suporte limitado para alguns tipos complexos comuns. Serão melhorados em atualizações futuras. |

## Unreal Engine

| Motor / Formato | Estabilidade | Notas |
|---|---|---|
| GVAS Padrão | 🟢 Alta | Suporta propriedades descompactadas do padrão Unreal Save Game (jogos como Hogwarts Legacy, Palworld). |
| GVAS gzip/zlib | 🟢 Alta | Descompacta, permite editar e reconstrói o wrapper gzip/zlib original. Outros contêineres personalizados mostram modo somente leitura ou uma causa de falha separada. |

## GameMaker

| Formato | Estabilidade | Notas |
|---|---|---|
| INI / Texto Simples | 🟢 Alta | Detecta e expande automaticamente a estrutura de despejos `ds_map` ou saves INI. Se for codificado em Base64, ele será decodificado para exibição (ex: Undertale). |

## NaniNovel (VNDS)

| Formato | Estabilidade | Notas |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 Alta | Um formato serializado JSON para o motor Unity NaniNovel. |
