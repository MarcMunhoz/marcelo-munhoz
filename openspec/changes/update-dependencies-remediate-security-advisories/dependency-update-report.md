# Relatório de atualização de dependências

## Estado da passagem

- Data do baseline: 2026-11-17.
- Escopo concluído neste registro: grupo 1, baseline de dependências e segurança.
- Manifestos analisados: `app/package.json` e `app/package-lock.json`.
- Nenhuma dependência foi instalada ou atualizada e nenhum manifesto foi alterado durante o baseline.
- Toda operação npm foi executada em container efêmero e somente leitura; nenhuma operação npm foi executada no host.

## Fronteira e metodologia

O baseline local utilizou a imagem já disponível `node:22.22.2-alpine`, com Node `22.22.2` e npm `10.9.7`. Somente `app/package.json` e `app/package-lock.json` foram montados como leitura; cache e arquivos temporários permaneceram em `tmpfs`. Nenhum `.env`, segredo, credential, chave privada, código-fonte ou URL privada foi lido ou enviado.

O `npm audit` foi limitado ao endpoint Bulk público do npm, enviando somente nomes e versões presentes no lockfile e impedindo fallback para Quick Audit. Como a imagem de testes existente contém um lockfile diferente do versionado, `npm ls` e `npm outdated` carregaram a árvore virtual do lockfile atual em vez de usar o `node_modules` da imagem. Um preload temporário, mantido apenas no container, direcionou `npm outdated` à árvore virtual; nenhum script de pacote ou instalação foi executado.

Forma sanitizada equivalente das consultas usadas como evidência; a consulta `outdated` incluiu o preload efêmero de árvore virtual descrito acima:

```bash
gh api --paginate 'repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100'
docker run --rm --read-only --tmpfs /tmp --tmpfs /npm-cache -w /workspace \
  -e NPM_CONFIG_CACHE=/npm-cache \
  -e NODE_OPTIONS=--require=/tmp/<preload-bulk-only>.cjs \
  -v <repo>/app/package.json:/workspace/package.json:ro \
  -v <repo>/app/package-lock.json:/workspace/package-lock.json:ro \
  -v <preload-bulk-only>:/tmp/<preload-bulk-only>.cjs:ro \
  node:22.22.2-alpine npm audit --package-lock-only --ignore-scripts --json
docker run --rm --read-only --tmpfs /tmp --tmpfs /npm-cache -w /workspace \
  -e NPM_CONFIG_CACHE=/npm-cache \
  -e NODE_OPTIONS=--require=/tmp/<preload-virtual-tree>.cjs \
  -v <repo>/app/package.json:/workspace/package.json:ro \
  -v <repo>/app/package-lock.json:/workspace/package-lock.json:ro \
  -v <preload-virtual-tree>:/tmp/<preload-virtual-tree>.cjs:ro \
  node:22.22.2-alpine npm outdated --include=dev --include=optional --include=peer --ignore-scripts --json
```

Os preloads acima representam os controles efêmeros efetivamente injetados no container: `<preload-bulk-only>` rejeitou o fallback Quick Audit, e `<preload-virtual-tree>` direcionou o comando `outdated` ao lockfile. Eles não fazem parte da aplicação nem permaneceram no workspace.

## Resumo reconciliado

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

## Alertas Dependabot abertos

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

Todos os 34 alertas informam uma primeira versão corrigida. O snapshot atual mantém as mesmas contagens, pacotes e correções mínimas agregadas registradas na issue #66; a issue não contém os IDs individuais anteriores, portanto não comprova identidade alerta a alerta.

## Advisories adicionais encontrados pelo audit local

| Pacote | Severidade | GHSA / CVE | Versão atual | Faixa vulnerável | Primeira correção | Relação | Escopo | Cadeia principal |
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

O GitHub ainda não publica `first_patched_version` para `picomatch`. O audit informa uma correção disponível por pacote pai, mas a versão sugerida precisa ser validada contra os peers atuais antes de qualquer alteração.

## Pacotes afetados por metapropagação do audit

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

## Cadeias dos pacotes já presentes no Dependabot

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

## Dependências diretas desatualizadas

| Pacote | Atual | Wanted | Latest | Observação inicial |
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

## Engines e peer dependencies

- `app/package.json` declara Node `>=22.22.0`, mas a árvore atual exige pelo menos `22.22.2` na linha Node 22 por `nopt@10.0.1` e `abbrev@5.0.0`.
- O estágio de testes usa Node `22.22.2` e satisfaz as engines.
- A imagem Cypress usa Node `22.21.0` e viola as engines do projeto, de `@quasar/app-vite`, `nopt` e `abbrev`.
- O estágio base usa `node:22.22-alpine`; a tag não fixa o patch exato exigido pela árvore.
- Foram encontrados 25 peers obrigatórios e 20 peers opcionais presentes, todos dentro das faixas declaradas. Outros 43 peers opcionais estão ausentes, sem tornar a árvore inválida.
- `@vitest/coverage-v8@4.1.11` exige exatamente `vitest@4.1.11`; qualquer atualização deve manter o par alinhado.
- `@quasar/app-vite@3.8.1` e `@quasar/vite-plugin@2.0.2` exigem Quasar `^2.24.0`; o lock atual resolve `2.27.0` dentro da faixa.
- O grupo Quasar/Vite/Router/Plugin Vue está válido nas versões atuais. Vite 9 ficaria fora das faixas declaradas por Router, Vitest e plugins, portanto não é candidato automático desta passagem.
- `happy-dom` 20 → 21 cruza major e é usado pelos projetos `unit-dom` e `component` de Vitest.
- Cypress está pinado e acoplado à imagem de browser; atualizar apenas o pacote não prova compatibilidade do runner.

## Pins exatos e overrides

Pins exatos atuais:

- Runtime: `dompurify@3.4.15`, `emoji-picker-element@1.29.1` e `emoji-picker-element-data@1.8.0`.
- Desenvolvimento: `@quasar/vite-plugin@2.0.2`, `@vitejs/plugin-vue@6.0.8`, `@vitest/coverage-v8@4.1.11`, `@vue/test-utils@2.5.0`, `cypress@16.0.0`, `happy-dom@20.12.0` e `vitest@4.1.11`.

Estado dos overrides:

| Override | Resolução atual | Consumidores / risco |
| --- | --- | --- |
| `form-data: ^4.0.6` | `4.0.6` | Usado por Axios e `@cypress/request`; ambos aceitam a resolução |
| `nanoid: ^3.3.18` | `3.3.18` | Usado por PostCSS em ramos de runtime e build |
| `esbuild: 0.25.12` | Sem entrada no lock | Pin fora do peer opcional `^0.27.0 || ^0.28.0` de Vite; pode conflitar se o peer passar a ser instalado |
| `js-yaml: ^5.1.0` | Sem entrada no lock | Nenhum consumidor atual; Vite usa o pacote distinto `yaml@2.9.0` |

O `Dockerfile` também instala `@quasar/cli` e `contentful-cli` globalmente sem versão e fora do lockfile. O projeto já possui o binário Quasar local fornecido por `@quasar/app-vite`; não foi encontrada referência equivalente ao Contentful CLI nas entradas analisadas.

## Limitações e decisões para os próximos grupos

- O `fixAvailable` do npm sugere `happy-dom@20.14.6`, mas essa versão permanece vulnerável a dois advisories altos; o alvo mínimo agregado é `21.0.4`.
- Para metapropagações de `glob`/`minimatch` e `picomatch`, o npm sugere downgrades de `@vue/test-utils`, `vue-router` ou `@quasar/app-vite`. Esses downgrades contradizem a arquitetura atual e não serão aplicados sem análise do pacote pai atualizado.
- O advisory de `picomatch` não publica primeira versão corrigida no GitHub; a remediação deverá ser comprovada por atualização segura dos pais e novo audit.
- A incompatibilidade Node da imagem Cypress é um blocker de validação conhecido e deverá ser corrigida antes do gate de navegador.
- Este baseline não afirma remediação. Os resultados serão atualizados após cada grupo e reconciliados novamente no audit final.
