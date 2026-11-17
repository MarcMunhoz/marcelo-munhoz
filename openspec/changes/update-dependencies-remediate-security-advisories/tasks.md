## 1. Baseline de dependências e segurança

- [x] 1.1 Registrar no relatório sanitizado os alertas Dependabot abertos, agrupando duplicidades entre manifesto e lockfile por advisory e pacote.
- [x] 1.2 Executar em container `npm audit`, `npm outdated` e a inspeção das versões resolvidas, salvando somente os resultados sanitizados necessários para o baseline.
- [x] 1.3 Mapear cada advisory do Dependabot e do audit local para pacote direto ou transitivo, cadeia de dependência, escopo de runtime ou desenvolvimento e primeira versão corrigida.
- [x] 1.4 Registrar engines, peer dependencies, pins exatos e overrides atuais, identificando incompatibilidades ou entradas sem correspondência na árvore resolvida.

## 2. Remediação das dependências de runtime

- [ ] 2.1 Atualizar DOMPurify para uma versão que corrija todos os advisories atuais e validar de forma direcionada sanitização, Markdown, URLs e conteúdo editorial não confiável.
- [ ] 2.2 Atualizar Quasar para a versão segura compatível e validar de forma direcionada build, aliases, roteamento, ícones, assets e inicialização do frontend.
- [ ] 2.3 Atualizar os pacotes pais ou o lockfile para corrigir `follow-redirects`, `body-parser`, `qs` e `source-map-js`, verificando a resolução final e os caminhos de runtime afetados.
- [ ] 2.4 Aplicar somente os ajustes de código ou configuração exigidos pelas atualizações de runtime e adicionar ou adaptar testes quando um contrato observável precisar ser preservado.

## 3. Remediação das dependências de desenvolvimento

- [ ] 3.1 Atualizar de forma coordenada Vitest, coverage, Vite e plugins relacionados para versões compatíveis que eliminem os advisories do grupo.
- [ ] 3.2 Executar os projetos Vitest diretamente afetados pelo grupo e confirmar configuração, descoberta de testes, transforms e instrumentação de cobertura.
- [ ] 3.3 Atualizar `happy-dom` isoladamente para a linha corrigida, revisar incompatibilidades da major e executar os testes DOM e de componentes afetados.
- [ ] 3.4 Atualizar os pacotes pais necessários para corrigir `systeminformation` e `postcss-selector-parser`, validando a árvore e a ferramenta consumidora correspondente.
- [ ] 3.5 Avaliar as demais atualizações compatíveis encontradas no baseline e aplicar somente aquelas que preservem engines, peers e o escopo de manutenção.

## 4. Lockfile, overrides e reprodutibilidade

- [ ] 4.1 Atualizar `app/package.json` e `app/package-lock.json` exclusivamente no container e revisar o diff para impedir mudanças não explicadas de resolução.
- [ ] 4.2 Verificar os overrides de `form-data` e `nanoid` contra seus consumidores e mantê-los ou ajustá-los conforme a árvore segura final exigir.
- [ ] 4.3 Remover os overrides sem correspondência de `esbuild` e `js-yaml` somente se uma instalação limpa e `npm ls` confirmarem que não são necessários.
- [ ] 4.4 Verificar se os CLIs globais sem pin no `Dockerfile` interferem no build reproduzível e alterar sua configuração somente se isso for necessário para a atualização solicitada.
- [ ] 4.5 Executar uma instalação limpa a partir do lockfile no container e confirmar manifesto sincronizado, engines compatíveis, peers válidos e ausência de dependências inválidas.

## 5. Validação funcional e de segurança

- [ ] 5.1 Executar no container o audit final e confirmar ausência de vulnerabilidades acionáveis ou documentar individualmente qualquer exceção com bloqueio e mitigação.
- [ ] 5.2 Executar lint, build de produção e scan de credenciais dos assets gerados, corrigindo somente regressões causadas pelas dependências.
- [ ] 5.3 Executar a suíte Vitest completa com os thresholds configurados de cobertura e registrar o resultado consolidado.
- [ ] 5.4 Executar as jornadas críticas em Chrome e Firefox nos viewports desktop e mobile usando os perfis isolados do projeto.
- [ ] 5.5 Executar os smokes de inicialização do frontend e do middleware Express e verificar rotas públicas, healthcheck e segurança do admin deslogado.
- [ ] 5.6 Realizar verificação visual representativa das áreas pública e administrativa se as atualizações alterarem framework, DOM, CSS, ícones, assets ou baseline de navegador.

## 6. Evidência da manutenção

- [ ] 6.1 Criar `dependency-update-report.md` com baseline, pacotes atualizados, advisories remediados, versões finais, overrides, exceções e validações executadas.
- [ ] 6.2 Reconciliar no relatório a contagem final do Dependabot com o agrupamento do `npm audit` e associar cada advisory à mudança e à evidência correspondente.
- [ ] 6.3 Revisar o diff final e confirmar que ele contém somente dependências, lockfile, documentação da change e ajustes de compatibilidade necessários.
