---
createdAt: "2017-07-05"
draft: false
title: Versionamento, por favor!
description: Há alguns anos fui destacado para trabalhar em conjunto com uma equipe de outra empresa. Nosso site receberia nova estrutura e layout.
tags:
  - control version
  - git
author:
  name: Marcelo Munhoz
  bio: But first... ☕ | Arts 🎭 | frond-end dev 💻 | Games 🎮 | 🤟 Music 🎧 | Movies 🎥 | Tattoo ☠
  image: https://secure.gravatar.com/avatar/357cd42b0a2cc03c5c2ffb011aec5e8f?s=180
lang: pt-BR
---

<img src="https://res.cloudinary.com/marcelo-munhoz/image/upload/c_fill,f_auto,h_240,q_auto,w_337/marcelo-munhoz-website/cvc.png" class="d-block mt-0 mx-auto mb-4">

Ao sentar para trabalhar pergunto onde posso encontrar os arquivos a serem tratados (era uma leva de PSDs). O pessoal começou a falar repositório, "dar um *pull*" sei lá onde. Resumindo, eu não fazia ideia do que falavam e precisei fazer tudo localmente em minha máquina, tomar o tempo de alguém que pudesse receber minhas alterações via rede e mesclar com o que todo mundo fazia. Essa situação foi péssima primeiro porque, eu nunca sabia no que os outros trabalhavam, atrapalhava alguém para ajustar minhas alterações e o risco de conflitos entre o que eu tinha e todos outros tinham era muito alto.

Passado o projeto, procurei conhecer as maravilhas desse tal versionamento. Veja, eu já fazia *backup* dos meus códigos de forma rudimentar: cópias em disquetes/CDs/pendrives/HDs e afins. Veio a <em>cloud</em> e obviamente eu aderi a ela. Mas, isso é pouco prático para equipes, uma vez que caso você altere um arquivo ao mesmo tempo que um colega alguém sobrescreverá o código e... bem, caos.

O meu objetivo com este artigo não é explicar os meandros de um repositório e seu versionamento. Não obstante, vamos a algumas definições:

- **Repositório**: local onde os dados são armazenados e administrados.
- **Versionamento**: Cada conjunto de alterações (em termos gerais) gera um <em>commit</em>, que é submetido à aprovação e pode ou não ser mesclado à versão existente no repositório. Quando um _commit_ é aceito, uma nova versão do projeto é criada, mantendo um histórico.

Deste modo, cada desenvolvedor tem uma cópia local do projeto e, ao terminar seu trabalho (ou parte dele) gera quantos <em>commits</em> necessários e submete para aprovação. Caso ocorra conflitos entre a versão armazenada e a enviada, um log de conflito é enviado ao desenvolvedor para que seja solucionado.

Mesmo que dois ou mais desenvolvedores enviem seus códigos ao mesmo tempo o VCS(_Version Control System_) fará a magia de manter tudo organizado, versionado e com indicações do que cada desenvolvedor criou/modificou.

Tem algum trabalho a fazer? Versionamento, por favor!
