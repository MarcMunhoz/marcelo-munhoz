# Relatório de atualização de dependências

## Estado da passagem

- Data do baseline: 2026-11-17.
- Escopo concluído neste registro: grupos 1 a 6, incluindo baseline, remediação, reprodutibilidade, validação funcional e reconciliação final.
- Manifestos analisados: `app/package.json` e `app/package-lock.json`.
- O baseline não alterou dependências; os grupos 2 a 5 atualizaram somente os manifestos, as resoluções, as imagens de container e o harness Cypress necessários à compatibilidade comprovada.
- Toda operação npm, instalação limpa, inspeção, teste e build foi executada em container; nenhuma operação npm foi executada no host.

## Fronteira e metodologia

O baseline local utilizou a imagem já disponível `node:22.22.2-alpine`, com Node `22.22.2` e npm `10.9.7`. Somente `app/package.json` e `app/package-lock.json` foram montados como leitura; cache e arquivos temporários permaneceram em `tmpfs`. Nenhum `.env`, segredo, credential, chave privada, código-fonte ou URL privada foi lido ou enviado.

O `npm audit` foi limitado ao endpoint Bulk público do npm, enviando somente nomes e versões presentes no lockfile e impedindo fallback para Quick Audit. Como a imagem de testes existente contém um lockfile diferente do versionado, `npm ls` e `npm outdated` carregaram a árvore virtual do lockfile atual em vez de usar o `node_modules` da imagem. Um preload temporário, mantido apenas no container, direcionou `npm outdated` à árvore virtual; nenhum script de pacote ou instalação foi executado.

Forma sanitizada equivalente das consultas usadas como evidência; a consulta `outdated` incluiu o preload efêmero de árvore virtual descrito acima:

```bash
gh api --paginate 'repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100'
docker run --rm --read-only --tmpfs <temporary-dir> --tmpfs <npm-cache> -w <workspace> \
  -e NPM_CONFIG_CACHE=<npm-cache> \
  -e NODE_OPTIONS=--require=<temporary-dir>/<preload-bulk-only>.cjs \
  -v <repo>/app/package.json:<workspace>/package.json:ro \
  -v <repo>/app/package-lock.json:<workspace>/package-lock.json:ro \
  -v <preload-bulk-only>:<temporary-dir>/<preload-bulk-only>.cjs:ro \
  node:22.22.2-alpine npm audit --package-lock-only --ignore-scripts --json
docker run --rm --read-only --tmpfs <temporary-dir> --tmpfs <npm-cache> -w <workspace> \
  -e NPM_CONFIG_CACHE=<npm-cache> \
  -e NODE_OPTIONS=--require=<temporary-dir>/<preload-virtual-tree>.cjs \
  -v <repo>/app/package.json:<workspace>/package.json:ro \
  -v <repo>/app/package-lock.json:<workspace>/package-lock.json:ro \
  -v <preload-virtual-tree>:<temporary-dir>/<preload-virtual-tree>.cjs:ro \
  node:22.22.2-alpine npm outdated --include=dev --include=optional --include=peer --ignore-scripts --json
```

Os preloads acima representam os controles efêmeros efetivamente injetados no container: `<preload-bulk-only>` rejeitou o fallback Quick Audit, e `<preload-virtual-tree>` direcionou o comando `outdated` ao lockfile. Eles não fazem parte da aplicação nem permaneceram no workspace.

## Remediação de runtime — grupo 2

O lockfile foi regenerado em workspace sanitizado dentro de `node:22.22.2-alpine`, sem `.npmrc`, arquivos `.env`, código-fonte ou scripts de pacote. A atualização seletiva preservou o restante da árvore e alterou somente dependências diretas selecionadas, seus ramos necessários e transitivas vulneráveis identificadas no baseline.

### Versões diretas atualizadas

| Pacote | Versão anterior | Versão final | Motivo |
| --- | --- | --- | --- |
| `axios` | `1.20.0` | `1.21.1` | Permitir a resolução corrigida de `follow-redirects` e manter o cliente HTTP na versão compatível mais recente. |
| `dompurify` | `3.4.15` | `3.4.18` | Corrigir os cinco advisories conhecidos de sanitização, incluindo o advisory adicional encontrado pelo audit local. |
| `express` | `5.2.1` | `5.3.0` | Atualizar os ramos de `body-parser`, `proxy-addr` e `qs` para versões corrigidas. |
| `quasar` | `2.27.0` | `2.35.5` | Corrigir GHSA-89vp-x45c-52cq e permanecer dentro dos peers dos plugins atuais. |
| `vue` | `3.5.41` | `3.5.45` | Corrigir `@vue/server-renderer` e manter todos os pacotes Vue alinhados. |

### Resoluções transitivas verificadas

| Pacote | Versão anterior | Versão final | Situação |
| --- | --- | --- | --- |
| `follow-redirects` | `1.16.0` | `1.16.3` | Acima das primeiras versões corrigidas dos três advisories conhecidos. |
| `body-parser` | `2.3.0` | `2.4.0` | Corrige GHSA-27r3-jxmh-p828. |
| `proxy-addr` | `2.0.7` | `2.0.8` | Corrige GHSA-jqcg-44mw-7w3h. |
| `qs` | `6.15.3` | `6.17.1` | Corrige os três advisories conhecidos e é compartilhado pelos ramos Express e Cypress. |
| `source-map-js` | `1.2.1` | `1.2.2` | Corrige GHSA-68fv-2mgg-jv7q. |
| `@vue/server-renderer` | `3.5.41` | `3.5.45` | Corrige GHSA-g2v6-rqmx-r4w6 e permanece alinhado a `vue`. |

As atualizações de compiladores Vue, parser Babel e PostCSS presentes no diff são consequências das faixas das dependências diretas atualizadas e mantêm versões únicas coerentes na árvore. Nenhum override foi adicionado ou alterado neste grupo.

### Compatibilidade e validação

- A instalação limpa por `npm ci --ignore-scripts` concluiu com 592 pacotes instalados e lockfile sincronizado.
- A árvore efetiva foi verificada com `npm ls --all`, sem dependências inválidas; Quasar `2.35.5` continua dentro dos peers `^2.24.0` de `@quasar/app-vite` e `@quasar/vite-plugin`.
- Os testes direcionados de DOMPurify, conteúdo editorial e previews concluíram com 3 arquivos e 46 testes aprovados.
- Os testes direcionados de middleware, contratos, router, shell, layout e páginas públicas concluíram com 7 arquivos e 129 testes aprovados.
- O build SPA de produção concluiu com sucesso usando Quasar `2.35.5`, `@quasar/app-vite` `3.8.1` e Vite `8.2.2`.
- Nenhuma alteração de código-fonte, configuração ou teste foi necessária: os contratos observáveis permaneceram válidos com as novas versões.

### Exceção e audit do grupo

`picomatch@4.0.7` permanece na árvore por `vue-router`, `@quasar/app-vite`, Vitest e seus utilitários. Em 2026-11-18, `4.0.7` ainda era a versão mais recente publicada e o advisory GHSA-fc5q-39xc-vjpf não informava uma versão corrigida; forçar downgrade de pais ou override sem release segura não é uma remediação válida.

O `npm ci` informou 27 vulnerabilidades agregadas na árvore completa, incluindo dependências de desenvolvimento ainda reservadas aos próximos grupos. Duas tentativas de `npm audit --omit=dev --json` falharam por indisponibilidade de DNS do registry e não produziram resultado utilizável. O audit final permanece pendente na tarefa 5.1; a conclusão deste grupo se apoia nas versões corrigidas conferidas na árvore, nos advisories mapeados e nos gates funcionais direcionados.

## Remediação de desenvolvimento — grupo 3

O grupo atualizou somente dependências diretas necessárias aos advisories e transitivas permitidas pelos intervalos dos pais existentes. Cypress, sua imagem de navegadores e os pacotes opcionais sem benefício de segurança permaneceram inalterados.

### Versões diretas atualizadas

| Pacote | Versão anterior | Versão final | Motivo |
| --- | --- | --- | --- |
| `vitest` | `4.1.11` | `4.1.12` | Manter a linha 4 e alinhar os pacotes internos com as correções de `@vitest/mocker`. |
| `@vitest/coverage-v8` | `4.1.11` | `4.1.12` | Preservar o peer exato de Vitest e a instrumentação V8. |
| `happy-dom` | `20.12.0` | `21.0.4` | Menor versão que corrige conjuntamente GHSA-5fpq-26gf-qwcr, GHSA-c8p4-j97h-3vg8 e GHSA-834v-8h66-3h79. |
| `eslint` | `10.9.1` | `10.15.0` | Primeiro pai seguro que substitui o ramo vulnerável de `minimatch` 10 pelo ramo 11. |
| `eslint-plugin-vue` | `10.10.0` | `10.12.1` | Elevar o piso corrigido de `postcss-selector-parser` e preservar os peers de ESLint e Vue parser. |
| `concurrently` | `10.0.5` | `10.0.7` | Substituir o pin vulnerável de `shell-quote` por uma resolução corrigida. |

### Resoluções transitivas verificadas

| Pacote | Versão anterior | Versão final | Situação |
| --- | --- | --- | --- |
| `@vitest/mocker` e demais pacotes internos | `4.1.11` | `4.1.12` | Corrigem GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp mantendo versões alinhadas. |
| `vite` | `8.2.2` | `8.3.8` | Acima da primeira versão corrigida `8.2.4` para os seis advisories conhecidos da linha 8.2. |
| `systeminformation` | `5.33.7` | `5.33.23` | Corrige os três advisories conhecidos sem atualizar Cypress, cujo intervalo `^5.31.1` aceita a resolução. |
| `postcss-selector-parser` | `7.1.5` | `7.2.1` | Corrige GHSA-rj75-hqrm-r3gf e permanece no ramo 7 aceito pelo plugin Vue. |
| `shell-quote` | `1.9.0` | `1.12.0` | Corrige GHSA-pqg4-j6r4-53mv pelo pacote pai `concurrently`. |
| `serialize-javascript` | `7.1.0` | `7.1.4` | Corrige GHSA-m5mm-p8h7-m29v dentro do intervalo de `@quasar/app-vite`. |
| `minimatch` no ramo ESLint | `10.2.6` | `11.0.9` | Corrige GHSA-g3hv-75wg-m249; o ramo separado de `@vue/test-utils` permanece documentado como exceção. |
| `brace-expansion` | `5.0.9` | `5.0.13` | Corrige os três advisories conhecidos e atende aos ramos 10 e 11 de `minimatch`. |

### Compatibilidade, geração e validação

- O npm `10.9.7` encontrou um erro interno do Arborist ao montar peers opcionais de Vitest (`Cannot read properties of null (reading 'edgesOut')`). A geração temporária ignorou peers somente durante o refresh do lockfile; a aceitação exigiu depois `npm ci` normal, sem essa opção, concluído com 602 pacotes.
- `npm ls --all` confirmou a árvore válida, os peers exatos de Vitest/coverage, Vite compartilhado e todas as resoluções acima sem dependências inválidas.
- O contrato de configuração do Vitest concluiu com 1 arquivo e 2 testes aprovados; a descoberta listou com sucesso os projetos `unit-node`, `unit-dom` e `component`.
- Os projetos completos `unit-dom` e `component` concluíram com 21 arquivos e 161 testes aprovados.
- A instrumentação V8 direcionada concluiu com 1 arquivo e 3 testes aprovados e cobertura integral de `src/App.vue` no recorte executado.
- O lint completo concluiu sem erros, e o lint localizado permaneceu válido durante a investigação de compatibilidade.
- O build SPA concluiu com sucesso usando Vite `8.3.8`, Quasar `2.35.5` e `@quasar/app-vite` `3.8.1`.
- A CLI consumidora Cypress iniciou no container Node compatível e retornou a versão `16.0.0`, validando a inicialização da ferramenta com `systeminformation@5.33.23` sem executar navegador.
- O `happy-dom` 21 bloqueia por padrão o carregamento externo de páginas de iframe. Os testes que renderizam players confiáveis permanecem aprovados; a mensagem `NotSupportedError` observada no console confirma o bloqueio de rede esperado. Os opt-ins de carregamento não foram habilitados e nenhuma supressão global de erros foi mantida.

### Atualizações avaliadas e exceções

- `@quasar/app-vite`, `@vitejs/plugin-vue`, `@quasar/extras`, Tailwind, Marked, Prettier, Sass, `sass-loader`, `vue-eslint-parser` e `@vue/test-utils` possuem atualizações compatíveis, mas não corrigem advisory adicional desta passagem. Elas foram mantidas para evitar ampliar desnecessariamente a superfície visual, de build ou runtime.
- Cypress permanece em `16.0.0`; sua transitive `systeminformation` foi corrigida independentemente, evitando misturar a atualização com a imagem de navegadores que ainda possui incompatibilidade conhecida de Node.
- O `npm ci` passou a informar 18 vulnerabilidades agregadas, 5 moderadas e 13 altas, contra 27 no grupo 2, sem vulnerabilidades críticas. A tentativa de `npm audit --json` voltou a falhar por DNS no endpoint Quick Audit; o detalhamento final permanece reservado à tarefa 5.1.

Riscos adiados conforme `SECURITY.md`:

| Cadeia | Impacto sanitizado | Mitigação | Racional do adiamento | Responsável | Acompanhamento |
| --- | --- | --- | --- | --- | --- |
| `@vue/test-utils@2.5.0 → js-beautify@2.0.3 → glob@13.0.6 → minimatch@10.2.6` | Ramo exclusivo de desenvolvimento; não foi demonstrado caminho de entrada não confiável até os padrões usados pelos testes. | Testes operam sobre paths controlados pelo repositório em containers isolados; `brace-expansion` foi atualizado para `5.0.13`. | `@vue/test-utils@2.6.0` conserva a mesma cadeia, e forçar `glob` 14 ou `minimatch` 11 ultrapassa as majors declaradas sem evidência de compatibilidade. | Mantenedor do repositório. | Reavaliar na tarefa 5.1 e quando `@vue/test-utils` ou `js-beautify` publicar uma cadeia corrigida. |

O advisory GHSA-fc5q-39xc-vjpf de `picomatch@4.0.7`, tratado anteriormente como exceção, foi retirado em 2026-11-18. O pacote continua na árvore, mas não aparece no audit final e não representa vulnerabilidade pendente nesta passagem.

## Lockfile, overrides e reprodutibilidade — grupo 4

O lockfile foi regenerado em workspace sanitizado dentro de `node:22.22.2-alpine`, sem código-fonte, `.npmrc`, arquivos `.env` ou execução de scripts. A revisão comparativa confirmou apenas duas mudanças de versão: Cypress passou de `16.0.0` para `16.3.0`, e Nano ID passou de `3.3.18` para `3.3.20`. O npm também recalculou 18 marcadores de nós compartilhados de `dev` para `devOptional`, sem alterar suas versões, integridades ou consumidores; essa classificação representa pacotes alcançáveis simultaneamente por dependências de desenvolvimento e pares opcionais. As demais alterações do lockfile refletem o manifesto atualizado e a remoção dos overrides.

### Overrides e consumidores

- O override de `form-data` foi removido porque Axios e `@cypress/request` já aceitam `4.0.6`, que permaneceu como resolução natural da árvore.
- O override de `nanoid` foi removido porque PostCSS exige `^3.3.20`; a resolução natural `3.3.20` é superior ao piso artificial anterior e permanece compatível.
- Os overrides de `esbuild` e `js-yaml` foram removidos por não possuírem nós correspondentes. O pin de Esbuild ainda poderia conflitar com o peer opcional de Vite se esse peer fosse instalado.
- A instalação limpa e `npm ls --all` confirmaram que nenhum dos quatro overrides é necessário e que `esbuild` e `js-yaml` continuam ausentes.

### Engines, imagens e ferramentas

| Item | Estado final | Evidência |
| --- | --- | --- |
| Engine do projeto | `^22.22.2 || ^24.15.0 || ^26 || ^28 || ^30` | Combina os pisos efetivos de `nopt` e `abbrev` com as linhas pares aceitas por `@quasar/app-vite`. |
| Estágios base e de testes | `node:22.22.2-alpine` | O patch exato atende `nopt@10.0.1` e `abbrev@5.0.0` e elimina a flutuação da tag anterior. |
| Imagem de navegador | Node `26.13.1`, Chrome `157.0.8103.50`, Firefox `160.0` e Edge `157.0.4341.46` | A imagem oficial correspondente foi construída e os runtimes disponíveis foram inspecionados no container. |
| Cypress | `16.3.0` | Pacote e binário retornaram a mesma versão na imagem de navegador. |
| Quasar CLI | Binário local de `@quasar/app-vite@3.8.1` | O build e a consulta de versão funcionaram sem instalação global. |
| Contentful CLI | Removido da imagem | Nenhum uso foi encontrado no repositório; sua instalação global sem pin não participava do build. |

O estágio base passou a usar `npm ci --ignore-scripts`, tornando a instalação dependente do lockfile. As instalações globais de `@quasar/cli` e `contentful-cli` foram removidas; a imagem de produção confirmou que nenhum dos comandos está no PATH global, enquanto o binário Quasar local continua funcional.

### Validação do grupo

- A instalação limpa com engine estrita concluiu com 602 pacotes, e `npm ls --all` retornou zero problemas de dependência, peer ou engine.
- Os targets Docker de produção, dependências de teste e navegador foram construídos com sucesso a partir do lockfile atualizado.
- O build SPA do target de produção concluiu com Quasar `2.35.5`, `@quasar/app-vite` `3.8.1` e Vite `8.3.8`.
- A imagem de navegador confirmou Node `26.13.1`, Cypress `16.3.0`, Chrome `157.0.8103.50` e Firefox `160.0`.
- O `npm ci` das imagens de teste passou a informar 5 vulnerabilidades moderadas, contra 18 vulnerabilidades ao fim do grupo 3. O detalhamento e a decisão sobre as exceções restantes permanecem reservados ao audit final da tarefa 5.1.

## Validação funcional e de segurança — grupo 5

### Audit final e exceções

O audit foi executado contra o lockfile versionado e a árvore instalada correspondente. `npm ls --all` confirmou uma árvore válida. O audit completo retornou cinco nós moderados, todos propagados por dois advisories exclusivos de desenvolvimento; o audit com `--omit=dev` retornou zero vulnerabilidades.

| Pacote e advisory | Cadeia | Versão e correção | Bloqueio e mitigação |
| --- | --- | --- | --- |
| `glob`, GHSA-3g3m-2fjr-6pw4 / CVE-2026-118773 | `@vue/test-utils@2.5.0 → js-beautify@2.0.3 → glob@13.0.6` | Instalada `13.0.6`; correção em `14.0.2` | `js-beautify@2.0.3` permanece a versão mais recente e declara Glob 13; forçar a major 14 não possui compatibilidade comprovada. |
| `minimatch`, GHSA-g3hv-75wg-m249 / CVE-2026-118764 | `@vue/test-utils → js-beautify → glob/editorconfig → minimatch@10.2.6` | Instalada `10.2.6`; correção em `11.0.1` | Glob e EditorConfig restringem o ramo 10; forçar a major 11 viola os intervalos declarados. |

Os cinco nós agregados são `@vue/test-utils`, `js-beautify`, `editorconfig`, `glob` e `minimatch`. As versões mais recentes dos pacotes pais conservam a cadeia, e o downgrade automático sugerido pelo npm também permanece em faixas vulneráveis. Não existe remediação segura diretamente acionável. O risco é mitigado pelo uso exclusivo em testes, paths controlados pelo repositório e execução em containers isolados.

### Análise estática, build, assets e testes

- O lint completo concluiu sem diagnósticos.
- O build SPA de produção concluiu com Quasar `2.35.5`, `@quasar/app-vite` `3.8.1` e Vite `8.3.8`.
- O scan dos assets gerados não encontrou credenciais nem padrões proibidos.
- A suíte Vitest `4.1.12` aprovou 46 arquivos e 454 testes: 293 em `unit-node`, 81 em `unit-dom` e 80 em `component`.
- A cobertura V8 atingiu 91,03% de statements, 83,49% de branches, 86,49% de functions e 92,56% de lines, atendendo respectivamente aos thresholds de 91%, 83%, 86% e 92%.

### Smokes e verificação visual

- O middleware respondeu `200 OK` em `/healthz`; o frontend respondeu 200 em `/`, `/about`, `/blog` e no shell `/admin`.
- A API administrativa deslogada respondeu 401 tanto diretamente quanto pelo proxy do frontend.
- A inspeção visual representativa em 1440×900 e 375×812 não encontrou clipping, sobreposição ou overflow horizontal nas áreas pública e administrativa. Menu, cards, filtros e conteúdo permaneceram responsivos.

### Matriz de navegadores e correção de compatibilidade

A matriz executou 29 cenários em cada combinação de Chrome 157 e Firefox 160 com viewports 1440×900 e 375×812. Na primeira passagem, 25 cenários passaram em cada perfil e os mesmos quatro testes de `session.cy.js` falharam. As jornadas públicas, editorial administrativa, artigo/autor, redirects e segurança deslogada já estavam aprovadas nos quatro perfis.

Os testes de lifecycle gravavam `admin_browser_session` com atributo `Secure` sobre a origem HTTP do harness. Nos browsers atualizados, a aplicação não reconstruía essa sessão, caía em `Local preview` e retornava antes de iniciar timers, alerta de expiração e listener entre abas. A correção ficou restrita ao harness: o atributo `Secure` agora deriva do protocolo de `Cypress.config("baseUrl")`, permanecendo ativo em HTTPS e sendo omitido somente na origem HTTP local.

Após reconstruir as imagens, `session.cy.js` foi executado novamente somente nos quatro perfis afetados. Chrome desktop, Chrome mobile, Firefox desktop e Firefox mobile aprovaram 4 de 4 cenários cada, totalizando 16 de 16 execuções direcionadas. Com os 25 cenários não afetados já aprovados em cada perfil, a matriz final cobre 116 de 116 execuções com sucesso, sem alterar o contrato de cookie da aplicação em produção.

## Reconciliação final entre Dependabot e npm audit — grupo 6

Na consulta final em modo somente leitura, o Dependabot ainda apresenta 34 alertas abertos, correspondentes a 27 advisories únicos em 11 pacotes. O conjunto de pacotes e GHSAs permanece igual ao snapshot do baseline. Essa permanência é esperada: as versões corrigidas estão na branch de trabalho, enquanto a branch padrão ainda contém os manifestos anteriores. A contagem remota atual não indica falha da remediação local e somente poderá ser recalculada pelo GitHub após o conteúdo atualizado chegar à branch padrão e a árvore ser reprocessada.

As severidades atuais dos 34 alertas são 11 altas, 12 moderadas e 11 baixas, sem alertas críticos. No baseline eram 2 críticas, 13 altas, 12 moderadas e 7 baixas. A diferença decorre da reclassificação dos advisories GHSA-cg2g-xh64-v4q7 e GHSA-mrv2-3pqr-j5jr de DOMPurify para severidade baixa; os pacotes e as duplicidades entre manifesto e lockfile não mudaram.

O baseline do npm audit continha 39 advisories em 19 pacotes. Na árvore final, 36 advisories foram remediados, o advisory GHSA-fc5q-39xc-vjpf de Picomatch foi retirado e dois advisories moderados exclusivos de desenvolvimento permanecem como exceções. O resultado final é de cinco nós propagados por Glob e Minimatch, com zero vulnerabilidades no audit de runtime:

`39 advisories do baseline = 36 remediados + 1 retirado + 2 exceções de desenvolvimento`.

| Grupo | Advisories | Mudança e versão final | Evidência final |
| --- | --- | --- | --- |
| `dompurify` | GHSA-c6gr-qvv4-5v3f, GHSA-mrv2-3pqr-j5jr, GHSA-cg2g-xh64-v4q7, GHSA-p98j-92pf-mc4p e GHSA-6688-9rhm-gjv2 | Atualização direta para `3.4.18` | Manifesto e lock sincronizados; grupo ausente do audit final; testes de sanitização aprovados. |
| `follow-redirects` | GHSA-mrwp-f3q8-3g9p, GHSA-q3jh-wrc6-jgq8 e GHSA-8r9p-f939-6h3c | `axios@1.21.1` resolveu `follow-redirects@1.16.3` | Lock confirma a versão; audit final de runtime igual a zero. |
| `body-parser` e `proxy-addr` | GHSA-27r3-jxmh-p828 e GHSA-jqcg-44mw-7w3h | `express@5.3.0` resolveu `body-parser@2.4.0` e `proxy-addr@2.0.8` | Lock confirma as versões; smokes do middleware e audit de runtime aprovados. |
| `qs` | GHSA-4mjr-xmp4-gh2g, GHSA-x5fp-wj9c-mxmx e GHSA-6pq8-jhm2-2vcw | Ramos Express/Cypress convergiram em `6.17.1` | Lock confirma resolução única; audit final de runtime igual a zero. |
| `source-map-js` | GHSA-68fv-2mgg-jv7q | Refresh dos consumidores resolveu `1.2.2` | Lock confirma a versão; advisory ausente do audit final. |
| `quasar` | GHSA-89vp-x45c-52cq | Atualização direta para `2.35.5` | Manifesto/lock, build SPA e matriz de navegadores aprovados. |
| `@vue/server-renderer` | GHSA-g2v6-rqmx-r4w6 | `vue@3.5.45` alinhou o renderer em `3.5.45` | Lock confirma alinhamento; audit final de runtime igual a zero. |
| `happy-dom` | GHSA-5fpq-26gf-qwcr, GHSA-c8p4-j97h-3vg8 e GHSA-834v-8h66-3h79 | Atualização direta para `21.0.4` | Projetos DOM/component aprovados; grupo ausente do audit final. |
| `@vitest/mocker` | GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp | Vitest, coverage e mocker alinhados em `4.1.12` | Lock, descoberta de projetos, suíte completa e cobertura aprovados. |
| `vite` | GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm e GHSA-698v-4r3x-3vcv | Atualização transitiva para `8.3.8` | Lock, build SPA e Vitest aprovados. |
| `systeminformation` | GHSA-3f7j-7jwc-fxfj, GHSA-7648-jmwf-vw7j e GHSA-4vjg-vx72-qq4g | Resolução elevada para `5.33.23`; Cypress final `16.3.0` | Lock, CLI e imagem Cypress validados. |
| `postcss-selector-parser` | GHSA-rj75-hqrm-r3gf | `eslint-plugin-vue@10.12.1` resolveu `7.2.1` | Lock e lint completo aprovados. |
| `brace-expansion` | GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7 e GHSA-6j4f-fj2g-mc7p | Resolução elevada para `5.0.13` | Lock confirma a versão; advisories ausentes do audit final. |
| `serialize-javascript` e `shell-quote` | GHSA-m5mm-p8h7-m29v e GHSA-pqg4-j6r4-53mv | Resoluções finais `7.1.4` e `1.12.0` | Lock confirma as versões; advisories ausentes do audit final. |
| `glob` | GHSA-3g3m-2fjr-6pw4 | Permanece `13.0.6` via `@vue/test-utils → js-beautify` | Exceção dev: a correção exige Glob 14 fora do intervalo do pai. |
| `minimatch` | GHSA-g3hv-75wg-m249 | Ramos ESLint corrigidos em `11.0.9`; ramo de testes permanece `10.2.6` | Exceção dev: Glob e EditorConfig restringem a major 10. |
| `picomatch` | GHSA-fc5q-39xc-vjpf | Permanece `4.0.7`; advisory retirado | Não aparece no audit final nem integra os cinco nós moderados. |

### Revisão do diff final

A comparação da branch de trabalho com o merge-base de `develop`, somada às alterações ainda não commitadas, confirmou somente as categorias autorizadas:

| Categoria | Arquivos | Justificativa |
| --- | --- | --- |
| Dependências e resolução | `app/package.json` e `app/package-lock.json` | Atualizações diretas, transitivas, engines e remoção de overrides descritas nos grupos 2 a 4. |
| Containers | `Dockerfile` | Pins de Node/browser, instalação reproduzível e remoção de CLIs globais sem pin. |
| Compatibilidade de testes | `app/cypress/e2e/session.cy.js` | Ajuste mínimo para que o atributo `Secure` acompanhe o protocolo do harness, preservando HTTPS. |
| OpenSpec | Arquivos da change e configuração associada | Proposta, design, spec, tarefas e relatório de evidências. |

Não foram encontrados código de produto fora do escopo, artefatos gerados, binários, arquivos não rastreados, dados sensíveis ou identificadores do ambiente local. O diff final não introduz funcionalidade, refatoração independente nem mudança intencional de contrato da aplicação.

## Resumo reconciliado do baseline

| Fonte | Resultado | Interpretação |
| --- | --- | --- |
| Dependabot | 34 alertas abertos | Registros por manifesto e advisory: 2 críticos, 13 altos, 12 moderados e 7 baixos |
| Dependabot desduplicado | 27 advisories em 11 pacotes | 1 crítico, 10 altos, 11 moderados e 5 baixos; 12 de runtime e 15 de desenvolvimento |
| `npm audit` | 39 advisories em 19 pacotes com advisory direto | 3 críticos, 14 altos, 15 moderados e 7 baixos |
| Metapropagação do `npm audit` | 36 nós vulneráveis em 669 entradas | 4 críticos, 19 altos, 11 moderados e 2 baixos segundo `metadata.vulnerabilities` |
| Diferença local | 12 advisories adicionais | O audit local encontrou advisories ainda ausentes dos alertas Dependabot abertos |
| `npm outdated` | 27 dependências diretas | Inclui atualizações compatíveis e majors bloqueadas por pins exatos |
| Árvore virtual | 37 dependências diretas declaradas | 16 de runtime e 21 de desenvolvimento; o `npm ls` confirmou os mesmos 37 nós diretos, sem contabilizar a raiz |

As contagens não são equivalentes: Dependabot mantém alertas separados por manifesto, enquanto npm agrupa advisories por pacote e propaga vulnerabilidade pelos consumidores. Os sete pares duplicados do Dependabot são quatro advisories de `dompurify` e três de `happy-dom` presentes simultaneamente em `package.json` e `package-lock.json`.

## Alertas Dependabot abertos no baseline

| Alertas | Pacote | Severidade | GHSA / CVE | Faixa vulnerável | Primeira correção | Relação | Escopo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #206 | `follow-redirects` | Alta | GHSA-mrwp-f3q8-3g9p / CVE-2026-116689 | `>=1.16.0 <=1.16.1` | `1.16.2` | Transitiva | Runtime |
| #205 | `systeminformation` | Alta | GHSA-3f7j-7jwc-fxfj / CVE-2026-116576 | `<5.33.16` | `5.33.16` | Transitiva | Desenvolvimento |
| #204 | `systeminformation` | Moderada | GHSA-7648-jmwf-vw7j / CVE-2026-116674 | `<5.33.13` | `5.33.13` | Transitiva | Desenvolvimento |
| #203 | `systeminformation` | Baixa | GHSA-4vjg-vx72-qq4g / CVE-2026-116673 | `<5.33.14` | `5.33.14` | Transitiva | Desenvolvimento |
| #201/#202 | `happy-dom` | Moderada | GHSA-5fpq-26gf-qwcr / CVE-2026-118661 | `<=20.14.5` | `20.14.6` | Direta | Desenvolvimento |
| #199/#200 | `happy-dom` | Alta | GHSA-c8p4-j97h-3vg8 / CVE-2026-118660 | `<=20.14.6` | `21.0.0` | Direta | Desenvolvimento |
| #191/#192 | `happy-dom` | Alta | GHSA-834v-8h66-3h79 / CVE-2026-115895 | `>=17.0.0 <=21.0.3` | `21.0.4` | Direta | Desenvolvimento |
| #198 | `postcss-selector-parser` | Moderada | GHSA-rj75-hqrm-r3gf / CVE-2026-104844 | `>=7.0.0 <7.1.6` | `7.1.6` | Transitiva | Desenvolvimento |
| #197 | `body-parser` | Alta | GHSA-27r3-jxmh-p828 / CVE-2026-111181 | `>=2.0.0 <2.4.0` | `2.4.0` | Transitiva | Runtime |
| #195/#196 | `dompurify` | Baixa | GHSA-c6gr-qvv4-5v3f | `<=3.4.16` | `3.4.17` | Direta | Runtime |
| #193/#194 | `dompurify` | Alta | GHSA-mrv2-3pqr-j5jr | `<=3.4.16` | `3.4.17` | Direta | Runtime |
| #189/#190 | `dompurify` | Crítica | GHSA-cg2g-xh64-v4q7 | `>=3.4.4 <=3.4.16` | `3.4.17` | Direta | Runtime |
| #173/#174 | `dompurify` | Baixa | GHSA-p98j-92pf-mc4p | `>=3.4.13 <=3.4.15` | `3.4.16` | Direta | Runtime |
| #188 | `@vitest/mocker` | Moderada | GHSA-qxg6-89mg-rqv8 / CVE-2026-112949 | `>=2.1.0-beta.7 <4.1.12` | `4.1.12` | Transitiva | Desenvolvimento |
| #187 | `@vitest/mocker` | Moderada | GHSA-xp26-3454-mjgp / CVE-2026-112950 | `>=4.1.11 <4.1.12` | `4.1.12` | Transitiva | Desenvolvimento |
| #186 | `vite` | Baixa | GHSA-9jrq-w75r-8gcw / CVE-2026-112945 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #185 | `vite` | Moderada | GHSA-rq7h-c2jc-7f22 / CVE-2026-112946 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #184 | `vite` | Moderada | GHSA-vfpm-58rq-9qcg / CVE-2026-112947 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #183 | `vite` | Moderada | GHSA-r825-w8mm-5pxw / CVE-2026-112944 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #182 | `vite` | Alta | GHSA-587h-7wmj-h5pm / CVE-2026-112942 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #181 | `vite` | Moderada | GHSA-698v-4r3x-3vcv / CVE-2026-112943 | `>=8.2.0 <=8.2.3` | `8.2.4` | Transitiva | Desenvolvimento |
| #180 | `follow-redirects` | Alta | GHSA-q3jh-wrc6-jgq8 / CVE-2026-111756 | `>=1.16.0 <1.16.1` | `1.16.1` | Transitiva | Runtime |
| #179 | `follow-redirects` | Alta | GHSA-8r9p-f939-6h3c / CVE-2026-111755 | `>=1.16.0 <1.16.1` | `1.16.1` | Transitiva | Runtime |
| #177 | `source-map-js` | Alta | GHSA-68fv-2mgg-jv7q / CVE-2026-93749 | `>=1.0.0 <1.2.2` | `1.2.2` | Transitiva | Runtime |
| #176 | `quasar` | Baixa | GHSA-89vp-x45c-52cq / CVE-2026-106101 | `<=2.32.1` | `2.32.2` | Direta | Runtime |
| #172 | `qs` | Moderada | GHSA-4mjr-xmp4-gh2g / CVE-2026-82417 | `>=2.2.5 <6.16.0` | `6.16.0` | Transitiva | Runtime |
| #171 | `qs` | Moderada | GHSA-x5fp-wj9c-mxmx / CVE-2026-82562 | `>=6.14.2 <=6.15.3` | `6.16.0` | Transitiva | Runtime |

Todos os 34 alertas informam uma primeira versão corrigida. O snapshot consultado no baseline mantém as mesmas contagens, pacotes e correções mínimas agregadas registradas na issue #66; a issue não contém os IDs individuais anteriores, portanto não comprova identidade alerta a alerta.

## Advisories adicionais encontrados pelo audit local no baseline

| Pacote | Severidade | GHSA / CVE | Versão no baseline | Faixa vulnerável | Primeira correção | Relação | Escopo | Cadeia principal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `@vue/server-renderer` | Alta | GHSA-g2v6-rqmx-r4w6 | `3.5.41` | `<3.5.42` | `3.5.42` | Transitiva | Runtime | `vue → @vue/server-renderer` |
| `brace-expansion` | Moderada | GHSA-q2hr-2g5m-vwhr / CVE-2026-102277 | `5.0.9` | `<5.0.12` | `5.0.12` | Transitiva | Desenvolvimento | `eslint → minimatch`; `@vue/test-utils → js-beautify → editorconfig → minimatch` |
| `brace-expansion` | Alta | GHSA-qhr7-859c-m2p7 / CVE-2026-102278 | `5.0.9` | `<5.0.11` | `5.0.11` | Transitiva | Desenvolvimento | Mesmas cadeias de `minimatch` |
| `brace-expansion` | Alta | GHSA-6j4f-fj2g-mc7p / CVE-2026-102276 | `5.0.9` | `<5.0.10` | `5.0.10` | Transitiva | Desenvolvimento | Mesmas cadeias de `minimatch` |
| `dompurify` | Baixa | GHSA-6688-9rhm-gjv2 | `3.4.15` | `<=3.4.15` | `3.4.16` | Direta | Runtime | Dependência direta de runtime |
| `glob` | Moderada | GHSA-3g3m-2fjr-6pw4 / CVE-2026-118773 | `13.0.6` | `>=9.0.0 <=14.0.1` | `14.0.2` | Transitiva | Desenvolvimento | `@vue/test-utils → js-beautify → glob` |
| `minimatch` | Moderada | GHSA-g3hv-75wg-m249 / CVE-2026-118764 | `10.2.6` | `>=7.0.0 <11.0.1` | `11.0.1` | Transitiva | Desenvolvimento | `eslint → minimatch`; `@vue/test-utils → js-beautify → editorconfig → minimatch` |
| `picomatch` | Alta | GHSA-fc5q-39xc-vjpf / CVE-2026-112366 | `4.0.7` | `<=4.0.7` | Não publicada no GitHub | Transitiva | Runtime e desenvolvimento | `vue-router`, `@quasar/app-vite` e `vitest` por `tinyglobby`, `fdir` e `unplugin` |
| `proxy-addr` | Crítica | GHSA-jqcg-44mw-7w3h / CVE-2026-90711 | `2.0.7` | `>=1.1.0 <2.0.8` | `2.0.8` | Transitiva | Runtime | `express → proxy-addr` |
| `qs` | Moderada | GHSA-6pq8-jhm2-2vcw / CVE-2026-110816 | `6.15.3` | `>=6.7.0 <=6.16.0` | `6.16.1` | Transitiva | Runtime e desenvolvimento | `express → qs`, `express → body-parser → qs` e `cypress → @cypress/request → qs` |
| `serialize-javascript` | Baixa | GHSA-m5mm-p8h7-m29v / CVE-2026-115897 | `7.1.0` | `<7.1.3` | `7.1.3` | Transitiva | Desenvolvimento | `@quasar/app-vite → serialize-javascript` |
| `shell-quote` | Crítica | GHSA-pqg4-j6r4-53mv / CVE-2026-102422 | `1.9.0` | `>=1.8.4 <1.11.0` | `1.11.0` | Transitiva | Desenvolvimento | `concurrently → shell-quote` |

No snapshot do baseline, o GitHub ainda não publicava `first_patched_version` para `picomatch`. O advisory foi posteriormente retirado, conforme a reconciliação final.

## Pacotes afetados por metapropagação do audit no baseline

Os 19 pacotes com advisory próprio propagam o resultado para outros 17 consumidores. Essa soma explica os 36 nós informados em `metadata.vulnerabilities`.

| Pacote afetado | Severidade propagada | Relação / escopo | Via |
| --- | --- | --- | --- |
| `@eslint/config-array@0.23.5` | Moderada | Transitiva / desenvolvimento | `minimatch` |
| `@parcel/watcher@2.6.0` | Alta | Transitiva / desenvolvimento | `picomatch` |
| `@quasar/app-vite@3.8.1` | Alta | Direta / desenvolvimento | `picomatch`, `tinyglobby` e `vue-router` |
| `@vitest/coverage-v8@4.1.11` | Moderada | Direta / desenvolvimento | `vitest` |
| `@vue-macros/common@3.1.4` | Alta | Transitiva / runtime | `unplugin-utils` |
| `@vue/test-utils@2.5.0` | Moderada | Direta / desenvolvimento | `js-beautify` |
| `concurrently@10.0.5` | Crítica | Direta / desenvolvimento | `shell-quote` |
| `editorconfig@3.0.2` | Moderada | Transitiva / desenvolvimento | `minimatch` |
| `eslint@10.9.1` | Moderada | Direta / desenvolvimento | `minimatch` |
| `fdir@6.5.0` | Alta | Transitiva / runtime | `picomatch` |
| `js-beautify@2.0.3` | Moderada | Transitiva / desenvolvimento | `editorconfig` e `glob` |
| `tinyglobby@0.2.17` | Alta | Transitiva / runtime | `fdir` e `picomatch` |
| `unplugin@3.3.0` | Alta | Transitiva / runtime | `picomatch` |
| `unplugin-utils@0.3.2` | Alta | Transitiva / runtime | `picomatch` |
| `vitest@4.1.11` | Alta | Direta / desenvolvimento | `@vitest/coverage-v8`, `@vitest/mocker`, `picomatch` e `tinyglobby` |
| `vue@3.5.41` | Alta | Direta / runtime | `@vue/server-renderer` |
| `vue-router@5.2.0` | Alta | Direta / runtime | `@vue-macros/common`, `picomatch`, `tinyglobby`, `unplugin` e `unplugin-utils` |

## Cadeias dos pacotes presentes no Dependabot no baseline

| Pacote vulnerável | Versão | Cadeia ou consumidor principal |
| --- | --- | --- |
| `dompurify` | `3.4.15` | Dependência direta de runtime |
| `quasar` | `2.27.0` | Dependência direta de runtime e peer de `@quasar/app-vite`/`@quasar/vite-plugin` |
| `follow-redirects` | `1.16.0` | `axios → follow-redirects` |
| `body-parser` | `2.3.0` | `express → body-parser` |
| `qs` | `6.15.3` | `express → qs`, `express → body-parser → qs` e `cypress → @cypress/request → qs` |
| `source-map-js` | `1.2.1` | Ramos de runtime de Vue/compilers/PostCSS e ramos de build/testes por Sass, Tailwind, Quasar e Vitest |
| `happy-dom` | `20.12.0` | Dependência direta de desenvolvimento e peer opcional de Vitest |
| `@vitest/mocker` | `4.1.11` | `vitest → @vitest/mocker` |
| `vite` | `8.2.2` | `@quasar/app-vite → vite`, `vitest → vite` e peer opcional do Vue Router |
| `systeminformation` | `5.33.7` | `cypress → systeminformation` |
| `postcss-selector-parser` | `7.1.5` | `eslint-plugin-vue → postcss-selector-parser` |

## Dependências diretas desatualizadas no baseline

| Pacote | Atual no baseline | Wanted | Latest | Observação inicial |
| --- | --- | --- | --- | --- |
| `@quasar/app-vite` | `3.8.1` | `3.10.4` | `3.10.4` | Atualização compatível; coordenar com Quasar/Vite |
| `@quasar/extras` | `2.0.4` | `2.1.0` | `2.1.0` | Atualização compatível; validar ícones/assets |
| `@tailwindcss/postcss` | `4.3.3` | `4.3.5` | `4.3.5` | Atualização compatível |
| `@vitejs/plugin-vue` | `6.0.8` | `6.0.8` | `6.0.11` | Pin exato impede wanted |
| `@vitest/coverage-v8` | `4.1.11` | `4.1.11` | `5.1.0` | Pin exato; vínculo obrigatório com Vitest |
| `@vue/test-utils` | `2.5.0` | `2.5.0` | `2.6.0` | Pin exato |
| `axios` | `1.20.0` | `1.21.1` | `1.21.1` | Atualização compatível; corrige ramo HTTP |
| `concurrently` | `10.0.5` | `10.0.7` | `10.0.7` | Atualização compatível; ramo `shell-quote` |
| `cypress` | `16.0.0` | `16.0.0` | `16.3.0` | Pin exato e acoplado à imagem de browsers |
| `dompurify` | `3.4.15` | `3.4.15` | `3.4.18` | Pin exato; correção de runtime prioritária |
| `dotenv` | `17.4.2` | `17.4.2` | `18.0.10` | Major fora do intervalo `^17.4.2`; sem relação com o baseline de secrets |
| `eslint` | `10.9.1` | `10.15.0` | `10.15.0` | Atualização compatível; ramo `minimatch` |
| `eslint-plugin-vue` | `10.10.0` | `10.12.1` | `10.12.1` | Atualização compatível; ramo `postcss-selector-parser` |
| `express` | `5.2.1` | `5.3.0` | `5.3.0` | Atualização compatível; ramos `body-parser`, `proxy-addr` e `qs` |
| `happy-dom` | `20.12.0` | `20.12.0` | `21.0.4` | Major obrigatória para cobrir os advisories altos |
| `marked` | `18.0.11` | `18.2.1` | `18.2.1` | Atualização compatível; plugins aceitam `<19` |
| `marked-mangle` | `1.1.13` | `1.1.14` | `1.1.14` | Atualização compatível |
| `postcss` | `8.5.26` | `8.5.33` | `8.5.33` | Atualização compatível; ramo `source-map-js` |
| `prettier` | `3.9.6` | `3.10.1` | `3.10.1` | Atualização compatível |
| `quasar` | `2.27.0` | `2.35.5` | `2.35.5` | Atualização compatível e necessária para advisory |
| `sass` | `1.103.1` | `1.108.2` | `1.108.2` | Atualização compatível |
| `sass-loader` | `17.0.0` | `17.1.0` | `17.1.0` | Atualização compatível |
| `tailwindcss` | `4.3.3` | `4.3.5` | `4.3.5` | Atualização compatível |
| `vitest` | `4.1.11` | `4.1.11` | `5.1.0` | Pin exato; não subir major sem alinhar coverage/Vite |
| `vue` | `3.5.41` | `3.5.45` | `3.5.45` | Atualização compatível; corrige server renderer |
| `vue-eslint-parser` | `10.4.1` | `10.4.2` | `10.4.2` | Atualização compatível |
| `vue-router` | `5.2.0` | `5.5.1` | `5.5.1` | Atualização compatível; validar peers e transitivas |

## Engines e peer dependencies registradas no baseline

- `app/package.json` declara Node `>=22.22.0`, mas a árvore atual exige pelo menos `22.22.2` na linha Node 22 por `nopt@10.0.1` e `abbrev@5.0.0`.
- O estágio de testes usa Node `22.22.2` e satisfaz as engines.
- A imagem Cypress usa Node `22.21.0` e viola as engines do projeto, de `@quasar/app-vite`, `nopt` e `abbrev`.
- O estágio base usa `node:22.22-alpine`; a tag não fixa o patch exato exigido pela árvore.
- Foram encontrados 25 peers obrigatórios e 20 peers opcionais presentes, todos dentro das faixas declaradas. Outros 43 peers opcionais estão ausentes, sem tornar a árvore inválida.
- `@vitest/coverage-v8@4.1.12` exige exatamente `vitest@4.1.12`; o par permanece alinhado após o grupo 3.
- `@quasar/app-vite@3.8.1` e `@quasar/vite-plugin@2.0.2` exigem Quasar `^2.24.0`; após o grupo 2, o lock resolve `2.35.5` dentro da faixa.
- O grupo Quasar/Vite/Router/Plugin Vue está válido com Vite `8.3.8`. Vite 9 ficaria fora das faixas declaradas por Router, Vitest e plugins, portanto não é candidato automático desta passagem.
- `happy-dom@21.0.4` foi validado nos projetos `unit-dom` e `component` de Vitest.
- Cypress está pinado e acoplado à imagem de browser; atualizar apenas o pacote não prova compatibilidade do runner.

## Pins exatos e overrides após o grupo 4

Pins exatos atuais:

- Runtime: `dompurify@3.4.18`, `emoji-picker-element@1.29.1` e `emoji-picker-element-data@1.8.0`.
- Desenvolvimento: `@quasar/vite-plugin@2.0.2`, `@vitejs/plugin-vue@6.0.8`, `@vitest/coverage-v8@4.1.12`, `@vue/test-utils@2.5.0`, `cypress@16.3.0`, `happy-dom@21.0.4` e `vitest@4.1.12`.

O manifesto não possui mais overrides. `form-data@4.0.6` e `nanoid@3.3.20` são resolvidos naturalmente pelos consumidores, enquanto `esbuild` e `js-yaml` não integram a árvore. O `Dockerfile` também não instala CLIs globais sem pin; o build usa o binário Quasar local fornecido por `@quasar/app-vite`.

## Estado final e limitações

- O ramo `glob`/`minimatch` de `@vue/test-utils` permanece como exceção exclusiva de desenvolvimento, com impacto, mitigação, bloqueio e acompanhamento registrados no grupo 5.
- Picomatch não permanece como risco: o advisory foi retirado e não integra o audit final.
- A incompatibilidade Node da imagem Cypress e o harness de cookie HTTP foram corrigidos; a matriz Chrome/Firefox desktop/mobile foi aprovada.
- As contagens e tabelas identificadas como baseline preservam o snapshot histórico anterior às alterações; a seção do grupo 6 contém a reconciliação final.
