---
createdAt: 2021-07-30T13:24:00Z
draft: false
title: Linux CLI - Comandos básicos
description: Introdução à interface de comandos do Linux
thumb: ''
alt: ''
tags:
- linux
- linuxtips
- CLI
author:
  name: Marcelo Munhoz
  bio: ''
  image: https://secure.gravatar.com/avatar/357cd42b0a2cc03c5c2ffb011aec5e8f?s=180
lang: pt-BR

---
O Linux parece assustador e pouco acolhedor no início. Mas como tudo na vida, quando nos interessamos nos aplicamos as coisas tomam forma e clareza.

Falaremos de alguns comandos básicos e comuns no dia-a-dia, seja qual for sua profissão ou uso do sistema.

Minha experiência em sistemas Linux está em breves aventuras nos finados [Kurumin](https://distrowatch.com/table.php?distribution=kurumin "Kurumin"), [Kalango](https://distrowatch.com/table.php?distribution=kalango "Kalango") e [Conectiva](https://distrowatch.com/table.php?distribution=conectiva "Conectiva"); no [Slackware](https://distrowatch.com/table.php?distribution=slackware "Slackware") e finalmente, no [Ubuntu](https://distrowatch.com/table.php?distribution=ubuntu "Ubuntu"), o qual uso há 2 anos.

# Um pouco de história

O Bourne Shell (sh) foi desenvolvido por Stephen Bourne quando ele trabalha na Bell Labs.

Lançado em 1979 com a versão 7 do Unix distribuído em colégios e universidades.

O Bourne Again Shell (_bash_) foi escrito como uma opção gratuita e _open source_ do Bourne Shell.

Dada a natureza aberta do Bash, com o tempo ele foi adotado como o _shell_ padrão na maioria dos sistemas Linux.

# Comecemos do início

<img src="https://res.cloudinary.com/marcelo-munhoz/image/upload/marcelo-munhoz-website/shell-ubuntu.jpg" class="d-block mt-0 mx-auto mb-4" title="Ubuntu Shell">

Este é o terminal(Shell) padrão do Ubuntu.

**ubuntu@ubuntu:\~$**

* **Usuário ou perfil**: Exibido antes do  **arroba(@)**. Nome do usuário logado.
* **Hostname**: Exibido após do **arroba(@)** e antes do **dois-pontos(:)**. Nome do sistema no qual estamos logados.
* **Diretório/pasta**: Diretório no qual estamos. No exemplo acima, `/home/ubuntu`.
* **$**: Delimita o final do _prompt_.

Existem outros consoles que podem variar na exibição e layout, mas todos seguem essa estrutura. Eu, particularmente gosto do [Konsole](https://konsole.kde.org "Konsole").

# Comandos, por favor

**Sintaxe**: comando \[-argumento abreviado\] \[--argumento\] arquivo

_* A maioria dos comandos listados abaixo aceitam argumentos. Serão mostrados como eu mais os uso._

* **whoami**: Perfil/Usuário logado.
* **pwd**: Diretório completo atual.
* **uname --all**: Informações gerais sobre o sistema. Tais como: OS, nome do sistema, versão etc.
* **free -m**: Informações sobre memória física e _swap_ em megabytes.
* **ls -al**: Lista o conteúdo do diretório atual, exibindo as permissões, pesos (tamanho) e proprietário de cada arquivo.
* **cd \~**: Volta ao diretório `/home/`.
* **cd /**: Volta ao diretório raiz do sistema.
* **cat > nome_arquivo.txt**: Cria um arquivo em formato txt.
* **cat nome_arquivo.txt**: Exibe o conteúdo do arquivo.
* **clear**: Limpa o terminal.
* **mv arquivo novo_diretório**: Move um arquivo para o diretório especificado.
* **mv arquivo novo_nome_arquivo**: Nomeia o arquivo para o nome especificado. Curiosamente essa técnica é muito utilizada, inclusive por mim.
* **rm arquivo**: Deleta _permanentemente_ o arquivo.
* **rm -rf diretório**: Deleta _permanentemente_ o diretório.
* **mkdir nome_diretório**: Cria um diretório.

Esses são os comandos básicos com os quais já podemos fazer várias ações que no Windows fazemos corriqueiramente no Explorer.

:smile: