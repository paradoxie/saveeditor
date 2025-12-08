---
title: "Como Editar Unity PlayerPrefs e Saves XML - Guia Completo"
description: "Um guia completo para modificar arquivos de save de jogos Unity no Android, iOS e PC. Aprenda a editar arquivos PlayerPrefs, XML, JSON e Plist para qualquer jogo Unity."
pubDate: 2025-10-15
tags: ["Unity", "guia", "tutorial", "PlayerPrefs"]
author: "SaveEditor Team"
lang: "pt"
image: "/images/blog/unity-cover.webp"
---

## Introdução

![Interface do Editor de Save Unity](/images/blog/unity-content.webp)

Unity é o motor de jogos mais popular do mundo, alimentando mais de 50% de todos os jogos mobile e um enorme número de títulos indie em PC e console. Se você já quis modificar seu progresso em um jogo Unity - seja para desbloquear níveis, adicionar moeda ou apenas experimentar - este guia ensinará tudo o que você precisa saber.

Diferente de alguns motores que usam um único formato de save, jogos Unity podem armazenar dados de várias maneiras diferentes. Os métodos mais comuns são:

*   **PlayerPrefs**: Um sistema de armazenamento chave-valor integrado.
*   **Arquivos XML**: Arquivos de texto estruturados, comuns em mobile.
*   **Arquivos JSON**: Formato de dados legível por humanos.
*   **Arquivos Binários**: Dados serializados personalizados (mais difíceis de editar).

Nosso **Save Editor Online** suporta PlayerPrefs (XML/Plist), XML e formatos JSON diretamente no seu navegador.

## Entendendo as Localizações de Save do Unity

A localização dos arquivos de save depende da plataforma:

### Windows
*   **PlayerPrefs**: Armazenados no Registro do Windows em `HKCU\Software\[CompanyName]\[ProductName]`. Isso é complicado de editar diretamente.
*   **Arquivos**: Frequentemente em `%AppData%\LocalLow\[CompanyName]\[ProductName]\` ou na pasta de instalação do jogo.

### Android
*   **PlayerPrefs (XML)**: Localizados em `/data/data/[package.name]/shared_prefs/[package.name].v2.playerprefs.xml`.
*   Requer acesso root ou ADB para recuperar.

### iOS / macOS
*   **PlayerPrefs (Plist)**: Armazenados como arquivos `.plist` no container do app.
*   No macOS, frequentemente em `~/Library/Preferences/`.

### Steam Cloud
*   Alguns jogos sincronizam saves com o Steam Cloud. Você pode precisar desativar a sincronização em nuvem antes de editar.

## Passo 1: Localize e Extraia Seu Arquivo de Save

### Para Android (Com Root):
1.  Use um explorador de arquivos root (por exemplo, Solid Explorer com acesso root).
2.  Navegue até `/data/data/[package.name]/shared_prefs/`.
3.  Copie o arquivo `.xml` para uma localização que você possa acessar (por exemplo, pasta Download).

### Para Android (Sem Root com ADB):
1.  Ative o Modo Desenvolvedor no seu telefone.
2.  Conecte via USB e execute: `adb backup -f backup.ab [package.name]`
3.  Extraia o backup usando uma ferramenta como `android-backup-extractor`.

### Para PC:
1.  Navegue até a pasta de save do jogo (veja localizações acima).
2.  Copie o arquivo de save para uma localização segura.

## Passo 2: Crie um Backup

Antes de editar, **sempre** crie uma cópia de backup do seu arquivo de save. Nomeie como algo tipo `savegame.xml.backup`.

## Passo 3: Carregue no Editor Online

1.  Acesse nosso [Editor Unity](/pt/editor/unity).
2.  Arraste e solte seu arquivo `.xml`, `.plist` ou `.json`.
3.  Aguarde a análise ser concluída.

O editor exibirá uma visualização em árvore de todas as chaves e valores no arquivo de save.

## Passo 4: Modifique Valores

Unity PlayerPrefs normalmente armazena valores simples com nomes de chave descritivos:

*   `PlayerLevel` (int)
*   `Coins` ou `Gold` (int)
*   `UnlockedLevels` (string, frequentemente separada por vírgulas)
*   `SoundEnabled` (int, 0 ou 1)

Clique em um valor para editá-lo. Mude `Coins` de `500` para `99999` para ter moeda quase infinita.

### Trabalhando com Dados Complexos
Alguns jogos armazenam dados complexos como strings JSON serializadas dentro de uma única chave PlayerPrefs. Neste caso:
1.  Encontre a chave (por exemplo, `SaveData`).
2.  Copie o valor.
3.  Cole em um formatador JSON para torná-lo legível.
4.  Edite os valores que deseja.
5.  Cole o JSON modificado de volta.

## Passo 5: Baixe e Substitua

1.  Clique em **Download Modified Save**.
2.  Transfira o arquivo de volta para sua localização original:
    *   No Android, use seu gerenciador de arquivos ou comando ADB `push`.
    *   No PC, simplesmente copie e substitua.
3.  Inicie o jogo e verifique suas alterações.

## Solução de Problemas

### O jogo reseta minhas alterações
*   O jogo pode estar sincronizando com um servidor. Tente jogar em modo offline.
*   Alguns jogos validam dados de save com checksums. Esses são mais difíceis de contornar e requerem técnicas mais avançadas.

### O formato do arquivo parece errado
*   Certifique-se de que está editando o arquivo correto. Jogos Unity podem ter múltiplos arquivos de save.
*   Se o arquivo for binário/criptografado, nosso editor pode exibir dados brutos. Procure um mecanismo de save diferente.

### Android: Permissão negada
*   Você precisa de acesso root ou deve usar ADB para acessar a pasta `shared_prefs`.

## Perguntas Frequentes

**P: Isso funciona para todos os jogos Unity?**
R: Funciona para jogos que usam PlayerPrefs (XML/Plist) ou saves JSON/XML padrão. Jogos com formatos binários personalizados ou criptografia podem não ser suportados.

**P: Editar saves vai me banir?**
R: Para jogos single-player, não. Para jogos com componentes online, modificar saves pode resultar em banimento se o servidor detectar inconsistências. Use por sua conta e risco para jogos online.

**P: Posso desbloquear compras in-app desta forma?**
R: Potencialmente, se o jogo armazena o status de IAP localmente. No entanto, compras validadas por servidor não podem ser contornadas.

**P: Acesso root é necessário no Android?**
R: Para a maioria das edições de PlayerPrefs, sim. Alternativamente, você pode usar backups ADB sem root.

## Avançado: Editando PlayerPrefs no Registro do Windows

Para jogos que armazenam PlayerPrefs no Registro do Windows:

1.  Pressione `Win+R`, digite `regedit`, pressione Enter.
2.  Navegue até `HKEY_CURRENT_USER\Software\[CompanyName]\[ProductName]`.
3.  Você verá chaves com nomes como `Coins_h[hashcode]`. Os valores são binários.
4.  Use uma ferramenta específica para PlayerPrefs ou decodifique manualmente os dados binários.

Isso é mais complexo que saves baseados em arquivo, mas possível com as ferramentas certas.

## Conclusão

Editar saves do Unity pode variar de trivialmente fácil (arquivos XML simples) a bastante desafiador (dados binários criptografados). Nosso editor online gratuito lida com os casos comuns automaticamente, permitindo que você modifique seu progresso de jogo em segundos. Sempre faça backup dos seus saves e aproveite sua experiência de jogo aprimorada!

---

*Relacionado: [Extensões Comuns de Arquivos de Save Explicadas](/pt/blog/pt/common-save-file-extensions-explained)*
