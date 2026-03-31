---
title: "Como Editar Arquivos de Save do Unreal Engine (.sav) - Guia Completo GVAS"
description: "Guia com foco em compatibilidade para `.sav` do Unreal Engine 4/5. Aprenda a analisar GVAS com segurança e quando migrar para ferramentas específicas de cada jogo."
pubDate: 2026-01-05
tags: ["Unreal Engine", "GVAS", "guia", "Palworld", "Hogwarts Legacy"]
author: "Paradox"
lang: "pt"
image: "/images/blog/unreal-cover.webp"
---

> **Status de suporte (fevereiro de 2026):** O editor web prioriza arquivos **GVAS padrão e sem criptografia**. Variantes com contêiner/compressão específica do jogo podem ficar em somente leitura ou sem reconstrução segura.

## Introdução

![Interface do Editor de Save Unreal Engine](/images/blog/unreal-content.webp)

Unreal Engine é um dos motores de jogos mais poderosos do mundo, usado por estúdios AAA e desenvolvedores indie. Jogos como **Palworld**, **Hogwarts Legacy**, **Satisfactory** e **Deep Rock Galactic** todos usam Unreal Engine e armazenam seus dados de save em um formato binário proprietário.

Se você quer inspecionar saves Unreal e editar apenas variantes compatíveis, este guia mostra o fluxo prático. Diferente de arquivos JSON ou XML simples, saves UE exigem parsers especializados. Nosso editor web prioriza GVAS padrão e muda para somente leitura quando a reconstrução segura não é possível.

## O que é o Formato GVAS?

Unreal Engine usa um formato de serialização binário chamado **GVAS** (Game Variable Archive Save) para seus arquivos de save. Esses arquivos normalmente têm a extensão `.sav`.

Um arquivo GVAS contém:

*   **Header**: Magic bytes (`GVAS`), versão do save game, versão do engine e dados de versão customizada.
*   **Properties**: Uma estrutura hierárquica de propriedades tipadas (IntProperty, StrProperty, ArrayProperty, StructProperty, etc.).
*   **Footer**: Checksum opcional ou padding.

Por ser binário, você não pode simplesmente abrir um arquivo `.sav` no Bloco de Notas. Você precisa de um parser que entenda a estrutura GVAS.

## Jogos Comuns Usando Saves GVAS

| Jogo | Localização do Save | Notas |
|---|---|---|
| **Palworld** | `%LocalAppData%\Pal\Saved\SaveGames\` | Estruturas aninhadas complexas |
| **Hogwarts Legacy** | `%LocalAppData%\Hogwarts Legacy\Saved\SaveGames\` | Formato UE5 padrão |
| **Satisfactory** | `%LocalAppData%\FactoryGame\Saved\SaveGames\` | Arquivos muito grandes |
| **Deep Rock Galactic** | `%LocalAppData%\FSD\Saved\SaveGames\` | Progressão do jogador |

## Passo 1: Localize Seu Arquivo de Save

A maioria dos jogos Unreal Engine armazena saves em:

```
%LocalAppData%\[GameName]\Saved\SaveGames\
```

Por exemplo, saves do Palworld estão em:
```
C:\Users\[SeuNome]\AppData\Local\Pal\Saved\SaveGames\[SteamID]\
```

Você encontrará arquivos como `Level.sav`, `Players\[PlayerID].sav`, etc.

## Passo 2: Crie um Backup

**Crítico**: Sempre copie seu arquivo `.sav` antes de editar. Arquivos binários são implacáveis - um byte errado pode corromper todo o save.

Crie uma pasta chamada `Backups` e copie seus arquivos de save lá antes de prosseguir.

## Passo 3: Carregue no Editor Online

1.  Navegue até nosso [Editor de Save Unreal Engine](/pt/editor/unreal).
2.  Arraste e solte seu arquivo `.sav`.
3.  Aguarde o parser GVAS processar o arquivo.

Nosso editor tenta analisar primeiro o GVAS padrão e mostrar os dados como árvore JSON quando possível. Variantes com contêiner/compressão específica podem cair em modo somente leitura.

## Passo 4: Navegue e Edite Propriedades

Uma vez analisado, você verá uma visualização hierárquica de todas as propriedades:

### Propriedades Comuns para Procurar:

*   **Inventory**: Geralmente um ArrayProperty contendo IDs de itens e quantidades.
*   **PlayerStats**: StructProperty com saúde, stamina, nível, etc.
*   **Currency/Money**: IntProperty com nomes como `Gold`, `Credits` ou `Money`.
*   **Unlocks**: BoolProperty ou ArrayProperty rastreando itens/habilidades desbloqueados.

Clique em uma propriedade para expandir e editar seu valor. Para propriedades numéricas, simplesmente mude o número. Para strings, você pode modificar valores de texto.

## Passo 5: Baixe e Substitua

1.  Clique em **Download Modified Save** apenas quando o editor indicar modo compatível e editável.
2.  A ferramenta tentará reconstruir o GVAS binário com suas alterações.
3.  Se estiver em somente leitura, use uma ferramenta dedicada ao jogo.
4.  Só substitua o arquivo original após validar seus backups.

## Solução de Problemas

### O editor mostra "Análise GVAS falhou"
*   Alguns jogos usam formatos GVAS modificados com compressão ou criptografia customizada.
*   Tente uma ferramenta específica da comunidade para esse jogo, se disponível.

### Meu save está corrompido após editar
*   Restaure seu backup.
*   Certifique-se de que você apenas mudou valores, não nomes ou tipos de propriedades.
*   Alguns jogos recalculam checksums; podem rejeitar saves adulterados.

### Valores resetam após carregar
*   O jogo pode ter validação server-side (comum em modos multiplayer).
*   Alguns valores são derivados de outros ao carregar (por exemplo, HP máximo do nível).

## Ferramentas Alternativas

Se o editor online não suportar seu jogo específico, considere estas alternativas:

*   **uesave-rs**: Uma ferramenta de linha de comando baseada em Rust que pode converter `.sav` para `.json` e vice-versa.
*   **Palworld Save Tools**: Ferramentas da comunidade especificamente para saves do Palworld.
*   **UAssetGUI**: Para editar outros arquivos de asset do Unreal Engine.

## Perguntas Frequentes

**P: Isso é seguro de usar?**
R: Sim. Toda a análise acontece no seu navegador. Arquivos nunca são enviados para nenhum servidor.

**P: Isso funcionará para saves multiplayer?**
R: Para saves co-op onde você é o host, frequentemente sim. Para jogos de servidor dedicado, saves geralmente são server-side e inacessíveis.

**P: Posso transferir saves entre plataformas?**
R: O formato GVAS é cross-platform, mas jogos podem embutir dados específicos da plataforma. Transferência é possível mas não garantida.

**P: E se meu jogo usa um formato de save customizado?**
R: Se não for GVAS padrão, você pode precisar de ferramentas de modding específicas do jogo.

## Conclusão

Editar saves do Unreal Engine exige entender os limites de compatibilidade do GVAS. Use o editor web para variantes padrão e recorra a ferramentas específicas quando o arquivo estiver encapsulado ou sem reconstrução segura.

Lembre-se: sempre faça backup dos seus saves, nunca edite jogos multiplayer/competitivos de forma injusta, e bom modding!

## Leitura Adicional

Expanda seu conhecimento de edição de saves Unreal Engine:

- 📖 [Guia de Edição de Save Palworld](/pt/blog/palworld-save-editing-guide) - Tutorial dedicado ao Palworld
- 📖 [uesave-rs no GitHub](https://github.com/trumank/uesave-rs) - Parser GVAS open-source
- 🎮 [Página do Jogo Palworld](/pt/games/palworld) - Localizações de save e itens editáveis
- 📂 [Extensões Comuns de Arquivos de Save](/pt/blog/common-save-file-extensions-explained) - Entenda .sav e outros formatos
- 🔧 [Editor Unreal Engine](/pt/editor/unreal) - Ferramenta online usada neste guia
- 🎭 [Guia de Edição de Save Unity](/pt/blog/how-to-edit-unity-saves) - Outro motor de jogo popular

---

*Última atualização: Janeiro de 2026*

### Artigos Relacionados

- [Guia de Edição de Save Palworld](/pt/blog/palworld-save-editing-guide)
- [Extensões Comuns de Arquivos de Save](/pt/blog/common-save-file-extensions-explained)
- [Edição de Save Unity](/pt/blog/how-to-edit-unity-saves)

