---
title: "Como Editar Arquivos de Save do RPG Maker MV (.rpgsave) - Guia Completo"
description: "Um guia completo sobre como editar arquivos de save do RPG Maker MV usando nossa ferramenta online gratuita. Modifique ouro, status, itens e variáveis facilmente. Funciona para MV e MZ."
pubDate: 2025-12-05
author: "Save Editor Team"
tags: ["RPG Maker", "tutorial", "rpgsave", "guia"]
lang: "pt"
image: "/images/blog/rpg-maker-cover.webp"
---

## Introdução

![Interface do Editor de Save RPG Maker](/images/blog/rpg-maker-content.webp)

RPG Maker MV e MZ são dois dos motores de jogos mais populares para criar JRPGs e jogos de aventura. Eles alimentam milhares de jogos indie no Steam, itch.io e outras plataformas. Se você já quis modificar seu arquivo de save para contornar um chefe difícil, dar a si mesmo mais ouro ou experimentar diferentes builds, este guia mostrará exatamente como fazer isso.

Jogos do RPG Maker MV usam a extensão de arquivo `.rpgsave`, enquanto jogos MZ normalmente usam o mesmo formato. Esses arquivos são frequentemente compactados usando LZString e não são legíveis por humanos em um editor de texto padrão. É aí que nosso **Save Editor Online** entra - ele lida com toda a descompressão e análise para você, inteiramente no seu navegador.

## Entendendo o Formato de Save do RPG Maker

Antes de mergulharmos na edição, ajuda entender o que está dentro de um arquivo `.rpgsave`. Quando você o descompacta e decodifica, encontrará um objeto JSON contendo todos os dados do estado do jogo:

*   **system**: Configurações do jogo e flags globais.
*   **party**: Dados do seu grupo, incluindo ouro (armazenado como `$gameParty._gold`).
*   **actors**: Dados individuais dos personagens, incluindo HP, MP, nível e equipamento.
*   **map**: Estado atual do mapa e eventos.
*   **switches**: Flags booleanas usadas por eventos do jogo.
*   **variables**: Valores numéricos usados por eventos do jogo.

Nosso editor analisa tudo isso e apresenta em uma interface fácil de navegar.

## Passo 1: Localize Seu Arquivo de Save

Para a maioria dos jogos do Windows, os arquivos de save estão localizados em um destes diretórios:

1.  **Dentro da pasta do jogo**: Procure por `www/save/` ou apenas `save/`. Os arquivos são nomeados como `file1.rpgsave`, `file2.rpgsave`, etc., correspondendo aos slots de save 1, 2, 3...
2.  **Local Storage (Jogos Web/NW.js)**: Alguns jogos armazenam saves no IndexedDB ou LocalStorage do navegador.

Para jogos Steam, você pode clicar com o botão direito no jogo em sua biblioteca, selecionar "Gerenciar" > "Navegar pelos arquivos locais", depois navegar até a pasta de save.

## Passo 2: Crie um Backup

**Este é o passo mais importante.** Antes de fazer qualquer modificação:

1.  Copie seu arquivo `.rpgsave`.
2.  Cole-o com um nome diferente, por exemplo, `file1.rpgsave.backup`.

Se algo der errado durante a edição, você sempre pode restaurar a partir deste backup.

## Passo 3: Carregue no Editor Online

1.  Navegue até nosso [Editor de RPG Maker MV](/pt/editor/rpg-maker-mv).
2.  Arraste e solte seu arquivo `.rpgsave` na área de upload, ou clique para navegar.
3.  Aguarde alguns segundos para o arquivo ser analisado.

Todo o processamento acontece **localmente no seu navegador**. Seu arquivo de save nunca é enviado para nenhum servidor.

## Passo 4: Edite Valores Comuns

Uma vez que o arquivo é carregado, você verá um painel de "Edição Rápida" para valores comuns:

### Ouro
Altere o campo `Gold / Money` para qualquer valor que desejar. Definir como `999999` dará a você fundos quase ilimitados.

### Nível do Personagem
Para RPG Maker MV/MZ, os níveis dos personagens são armazenados dentro do array `actors`. Usando o painel de Edição Rápida, você pode modificar o nível do líder do grupo diretamente. Para alterar outros personagens, mude para o modo "Avançado (JSON)" e navegue até `actors._data.[character_id].level`.

### HP e MP
No modo Avançado, você pode encontrar os campos `_hp` e `_mp` para cada ator. Defina-os com os valores desejados.

## Passo 5: Edite Valores Avançados (Variáveis e Switches)

Muitos jogos usam **switches** (flags liga/desliga) e **variables** (valores numéricos) para rastrear progresso de missões, desbloqueios e mais.

*   **Switches**: Armazenados como um array de booleanos. Switch ID 1 está no índice 1, etc. Definir um switch como `true` pode desbloquear portas, acionar eventos ou pular cutscenes.
*   **Variables**: Armazenados como um array de números. Variable ID 5 pode rastrear "número de inimigos derrotados", por exemplo.

Para descobrir qual switch ou variável controla o quê, você pode precisar consultar a wiki da comunidade do jogo ou experimentar.

## Passo 6: Baixe e Substitua

1.  Clique no botão **Download Modified Save**.
2.  O arquivo será baixado com seu nome original (por exemplo, `file1.rpgsave`).
3.  Mova o arquivo baixado para a pasta de save do seu jogo, substituindo o original.
4.  Inicie o jogo e carregue seu save!

## Solução de Problemas

### O jogo diz que meu save está corrompido
*   Restaure seu backup e tente novamente.
*   Certifique-se de que você não alterou acidentalmente a estrutura do JSON (por exemplo, removendo um colchete).
*   Se estiver usando o modo Avançado, verifique novamente se todos os campos são válidos (sem valores `NaN`, sem vírgulas faltando).

### Minhas alterações não tiveram efeito
*   Alguns valores são calculados ao carregar (por exemplo, HP máximo baseado no nível). Você pode precisar alterar o status subjacente, não apenas o valor atual.
*   O jogo pode ter medidas anti-cheat que resetam valores ao carregar. Isso é raro para jogos RPG Maker single-player.

## Perguntas Frequentes

**P: Isso é seguro?**
R: Sim. Todo o processamento acontece no seu navegador. Seu arquivo nunca é enviado para nenhum servidor.

**P: Isso funcionará para RPG Maker MZ?**
R: Sim! MZ usa o mesmo formato `.rpgsave` que MV.

**P: Posso usar isso no celular?**
R: Se você conseguir acessar o arquivo de save (por exemplo, via gerenciador de arquivos no Android), você pode enviá-lo do seu telefone.

**P: Isso funciona para jogos criptografados?**
R: Se o jogo apenas criptografa assets (imagens, áudio) mas não saves, sim. Se o próprio arquivo de save estiver criptografado, você precisará da chave de descriptografia do jogo.

## Conclusão

Editar saves do RPG Maker é simples com a ferramenta certa. Seja para experimentar, pular grinding ou apenas se divertir, nosso editor online gratuito torna isso fácil. Lembre-se de fazer backup dos seus saves e bom jogo!

---

*Relacionado: [Extensões Comuns de Arquivos de Save Explicadas](/pt/blog/pt/common-save-file-extensions-explained)*
