## Contexto

A aplicação usa Node.js 22, Vue 3, Quasar 2 e Vite, com Functions e middleware Express. A árvore atual contém 37 dependências diretas, sendo 16 de runtime e 21 de desenvolvimento, além de 669 entradas de pacotes no lockfile. O Dependabot registra 34 alertas abertos, equivalentes a 27 advisories distintos em 11 pacotes: 16 alertas atingem dependências de runtime e 18 atingem dependências de desenvolvimento.

Os riscos imediatos concentram-se em DOMPurify, Quasar e transitivas de runtime como `follow-redirects`, `body-parser`, `qs` e `source-map-js`. A atualização de `happy-dom` cruza uma versão major, enquanto Vitest, Vite, Cypress e suas transitivas exigem alinhamento de engines e peer dependencies. O projeto já possui uma plataforma de validação containerizada e a capacidade `dependency-maintenance` estabelece reconciliação entre Dependabot e `npm audit`, atualização compatível, documentação de exceções e validação funcional.

O baseline local de `npm audit` e `npm outdated` ainda precisa ser capturado no início da implementação. Toda consulta e operação npm será executada em container, sem leitura de `.env`, credenciais, chaves ou outros arquivos sensíveis.

## Objetivos / Não objetivos

**Objetivos:**

- Remediar todos os advisories atuais que possuam atualização segura e tratar eventuais vulnerabilidades adicionais encontradas pelo audit local.
- Atualizar dependências diretas e transitivas compatíveis sem alterar intencionalmente o comportamento da aplicação.
- Manter manifesto, lockfile, engines, peers e overrides coerentes e reproduzíveis.
- Preservar sanitização de conteúdo, rotas públicas, fluxos administrativos, Functions, middleware, build, testes e navegadores suportados.
- Produzir evidência reconciliada entre alertas Dependabot, pacotes agrupados pelo `npm audit`, mudanças aplicadas e gates executados.

**Não objetivos:**

- Adicionar funcionalidades ou alterar contratos de produto.
- Refatorar componentes, APIs ou arquitetura sem necessidade causada por uma dependência atualizada.
- Executar atualizações forçadas e indiscriminadas para alcançar versões mais recentes.
- Alterar deliberadamente o baseline de navegadores ou do Node sem uma exigência comprovada das correções.
- Modificar integrações externas, dados de produção ou configurações que exijam segredos.

## Decisões

### Capturar e reconciliar o baseline antes das mudanças

A implementação começará consultando os 34 alertas Dependabot e executando `npm audit`, `npm outdated` e inspeções da árvore instalada dentro do container. O relatório preservará separadamente a contagem de alertas do GitHub e o agrupamento por pacote do npm, porque sete pares atuais representam o mesmo advisory em `package.json` e `package-lock.json`.

Executar diretamente `npm update` ou `npm audit fix` antes do baseline foi rejeitado porque eliminaria a relação verificável entre advisory, pacote alterado e resultado.

### Atualizar em grupos de risco e compatibilidade

As mudanças serão organizadas na seguinte ordem técnica:

1. Dependências diretas críticas ou de runtime, começando por DOMPurify e Quasar.
2. Transitivas de runtime resolvidas por atualização do pacote pai ou refresh controlado do lockfile, incluindo `follow-redirects`, `body-parser`, `qs` e `source-map-js`.
3. Ferramentas alinhadas por ecossistema, especialmente Vitest, coverage, Vite e plugins relacionados.
4. `happy-dom` como atualização major isolada, com foco nos contratos DOM usados pelos testes.
5. Transitivas de ferramentas, incluindo `systeminformation` e `postcss-selector-parser`, por atualização segura de seus pais.
6. Demais atualizações compatíveis identificadas por `npm outdated`, desde que não ampliem o escopo com migração independente.

Uma única atualização ampla foi rejeitada porque esconderia incompatibilidades entre grupos e aumentaria o custo de diagnóstico.

### Preferir o pacote pai e usar overrides apenas como exceção

Uma vulnerabilidade transitiva será corrigida primeiro atualizando o pacote direto responsável e refrescando o lockfile. Um override será mantido, ajustado ou adicionado somente quando a versão corrigida respeitar o contrato do pacote pai e a árvore instalada demonstrar resolução válida.

Os overrides de `form-data` e `nanoid` possuem correspondência atual no lockfile. As entradas de `esbuild` e `js-yaml`, que não correspondem a pacotes resolvidos hoje, serão removidas apenas após instalação limpa e inspeção confirmarem que não são necessárias. `npm audit fix --force` foi rejeitado por poder introduzir majors sem controle.

### Manter o container como fronteira de execução

Instalação, atualização, audit, lint, build, testes e smokes serão executados somente pelos contextos Docker do projeto, com arquivo de ambiente vazio e sem montar arquivos sensíveis. O host será usado apenas para inspeção do repositório e comandos Git/OpenSpec.

O `Dockerfile` instala `@quasar/cli` e `contentful-cli` globalmente sem versão e fora do lockfile. A implementação verificará se esse comportamento afeta a atualização; pinagem, remoção ou ajuste só ocorrerá se necessário para tornar o build utilizado pela aplicação reproduzível, evitando transformar a change numa revisão geral da imagem.

### Validar incrementalmente e executar a matriz completa uma vez ao final

Cada grupo receberá a validação mínima diretamente relacionada, por exemplo testes DOM para `happy-dom` e build/rotas para Quasar/Vite. Depois que a árvore final estiver estabilizada, serão executados uma única vez os gates completos ainda necessários: instalação limpa, audit, árvore/peers, lint, build, scan de credenciais, Vitest com cobertura, Chrome, Firefox e smokes de inicialização.

Essa abordagem limita regressões sem repetir suítes completas já aprovadas na mesma árvore de trabalho sem justificativa técnica.

### Tratar validação visual como obrigatória quando a superfície do navegador mudar

Atualizações que alterem framework, DOM, CSS, ícones, assets ou baseline de navegador exigirão inspeção representativa das áreas pública e administrativa em desktop e mobile. Build e testes automatizados isolados não detectaram todas as regressões visuais em migrações anteriores.

## Riscos / Trade-offs

- **[DOMPurify altera sanitização ou renderização de Markdown]** → Preservar a allowlist vigente e executar testes de conteúdo seguro, XSS e renderização editorial.
- **[Quasar ou Vite altera aliases, assets, roteamento ou build]** → Atualizar o grupo de forma coordenada e validar rotas, imports, ícones, build e inicialização antes de avançar.
- **[happy-dom 21 muda comportamento DOM usado pelos testes]** → Isolar a major, revisar changelog aplicável e corrigir somente expectativas que não representem comportamento real do navegador.
- **[Vitest, coverage e Vite ficam desalinhados]** → Manter versões compatíveis do conjunto e confirmar peers, projetos de teste e thresholds de cobertura.
- **[Atualização de Cypress exige outra imagem de browsers]** → Validar a compatibilidade entre pacote, cache e imagem antes de modificar qualquer pin; manter a versão atual se a migração não for necessária para remediação.
- **[Override corrigido quebra o consumidor transitivo]** → Preferir atualização do pai, verificar `npm ls` e remover o override se houver peer inválido ou incompatibilidade funcional.
- **[Dependabot permanece aberto após o lockfile estar corrigido]** → Registrar a versão instalada e o audit local, distinguindo atraso de reprocessamento remoto de vulnerabilidade ainda presente.
- **[Uma atualização compatível por semver muda comportamento]** → Manter grupos pequenos e usar os testes direcionados antes da matriz final.
- **[Um advisory não possui caminho seguro dentro do escopo]** → Registrar pacote, advisory, cadeia, exposição, bloqueio e mitigação sem forçar uma migração insegura.

## Sequência de implementação e reversão técnica

1. Registrar os baselines remoto e local no relatório sanitizado.
2. Atualizar os grupos na ordem definida, revisando o diff do manifesto e do lockfile após cada grupo.
3. Aplicar somente ajustes de compatibilidade diretamente causados pelas dependências.
4. Executar as validações direcionadas e, após estabilização, a matriz completa necessária.
5. Consolidar no relatório os pacotes, advisories, versões corrigidas, exceções e evidências.

Se um grupo falhar em compatibilidade, restaurar apenas as mudanças desse grupo ao estado anterior registrado e manter os grupos independentes já validados. Se a árvore final não alcançar instalação limpa, audit aceitável e funcionamento comprovado, a implementação não será considerada concluída.

## Questões em aberto

- Quais vulnerabilidades adicionais e atualizações compatíveis serão identificadas pelo `npm audit` e pelo `npm outdated` no início da implementação?
- Alguma correção transitiva exigirá atualização do pacote pai além do intervalo atualmente declarado?
- A atualização de `happy-dom` para a linha 21 exigirá adaptações em testes que representem diferenças reais de navegador?
- Os CLIs globais sem pin interferem no build atual ou podem permanecer documentados fora do escopo desta passagem?
