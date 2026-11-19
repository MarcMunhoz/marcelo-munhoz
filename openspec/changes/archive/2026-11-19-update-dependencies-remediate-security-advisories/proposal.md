## Por quê

O repositório possui 34 alertas Dependabot abertos, correspondentes a 27 advisories distintos em 11 pacotes, incluindo dois alertas críticos e 13 de severidade alta. A árvore de dependências precisa ser atualizada e reconciliada com um novo `npm audit` executado em container para corrigir vulnerabilidades conhecidas e descobrir eventuais CVEs adicionais sem comprometer o funcionamento da aplicação.

## O que muda

- Registrar o baseline atual de alertas Dependabot, `npm audit`, pacotes desatualizados, versões resolvidas, engines e peer dependencies.
- Atualizar dependências npm diretas e transitivas compatíveis, priorizando a menor mudança segura que alcance as versões corrigidas.
- Tratar de forma coordenada os grupos com risco de compatibilidade, especialmente DOMPurify, Quasar, happy-dom, Vitest/Vite, Cypress e dependências relacionadas.
- Revisar overrides existentes e remover ou ajustar entradas obsoletas somente quando a árvore resolvida comprovar que não são mais necessárias.
- Corrigir apenas incompatibilidades de código, configuração ou testes causadas pelas atualizações de dependências.
- Documentar cada advisory remediado, a diferença entre a contagem do Dependabot e do `npm audit`, as evidências de validação e qualquer vulnerabilidade que não possa ser corrigida com segurança.
- Validar instalação limpa, auditoria, lint, build, scan de credenciais, testes automatizados, navegadores suportados e inicialização dos processos dentro do contexto de container.
- Manter fora do escopo novas funcionalidades, refatorações não exigidas pelas dependências, mudanças arquiteturais independentes e alterações deliberadas de comportamento do produto.

## Capacidades

### Novas capacidades

Nenhuma. Esta change reutiliza a capacidade existente de manutenção de dependências e não introduz comportamento de produto.

### Capacidades modificadas

- `dependency-maintenance`: Exige que cada passagem registre versões, pacotes desatualizados, engines, peer dependencies e overrides antes das mudanças, além de explicitar a matriz de validação necessária para comprovar instalação reproduzível e funcionamento da aplicação após atualizações.

## Impacto

- Manifestos e resolução npm: `app/package.json` e `app/package-lock.json`.
- Configuração de build, lint, testes, containers ou aplicação somente quando uma atualização exigir compatibilidade comprovada.
- Dependências de runtime que afetam sanitização, framework, HTTP, parsing e geração de source maps.
- Dependências de desenvolvimento que afetam DOM de testes, Vitest, Vite, Cypress, PostCSS e ferramentas transitivas.
- Relatório sanitizado de atualização com o mapeamento dos alertas, resultados da auditoria e evidências dos gates executados.
- Não há mudança intencional em APIs, rotas públicas, autorização administrativa, conteúdo, experiência visual ou integrações externas.
