## ADDED Requirements

### Requirement: Cada passagem estabelece um baseline completo da árvore de dependências
Antes de alterar dependências, a manutenção MUST registrar em container as versões diretas e transitivas relevantes, pacotes desatualizados, engines, peer dependencies, overrides ativos, resultado do `npm audit` e alertas Dependabot abertos.

#### Scenario: O baseline é capturado antes das atualizações
- **WHEN** uma passagem de manutenção de dependências começa
- **THEN** a implementação registra o estado do manifesto, lockfile, árvore resolvida, pacotes desatualizados, engines, peers, overrides, audit local e alertas remotos antes de aplicar mudanças

#### Scenario: Uma consulta do baseline não pode ser concluída
- **WHEN** uma fonte necessária está indisponível ou bloqueada
- **THEN** a implementação registra a limitação e não presume que a árvore está atualizada ou livre de vulnerabilidades

### Requirement: A árvore atualizada mantém resolução reproduzível e válida
A manutenção MUST manter `app/package.json` e `app/package-lock.json` sincronizados, produzir uma instalação limpa e não apresentar engines, peer dependencies ou overrides inválidos.

#### Scenario: A instalação limpa é validada
- **WHEN** a árvore final de dependências é instalada a partir do lockfile em container
- **THEN** a instalação termina sem alterar silenciosamente o contrato versionado e a árvore resolvida não contém dependências inválidas

#### Scenario: Um override deixa de ser necessário
- **WHEN** a árvore atualizada resolve uma versão segura sem depender de um override existente
- **THEN** o override é removido somente após a instalação limpa e a inspeção da árvore confirmarem que a remoção preserva compatibilidade e segurança

### Requirement: A validação cobre as superfícies afetadas pelas dependências
Após as atualizações, a manutenção MUST validar em container a análise estática, o build de produção, a segurança dos assets gerados, os testes automatizados, a cobertura configurada, os navegadores suportados e a inicialização dos processos aplicáveis, executando validações visuais quando uma dependência alterar superfície de interface.

#### Scenario: Uma atualização afeta somente uma superfície isolada durante a implementação
- **WHEN** um grupo de dependências é atualizado antes da estabilização da árvore final
- **THEN** a implementação executa a menor validação diretamente relacionada ao grupo e não repete gates completos já aprovados sem justificativa técnica

#### Scenario: A árvore final está pronta para validação
- **WHEN** todos os grupos de dependências e ajustes de compatibilidade estão estabilizados
- **THEN** a implementação executa uma vez todos os gates ainda necessários de instalação limpa, audit, árvore de dependências, lint, build, scan de credenciais, Vitest com cobertura, Chrome, Firefox e smokes de inicialização

#### Scenario: Uma dependência altera a superfície visual ou o DOM
- **WHEN** uma atualização muda framework, renderização DOM, CSS, ícones, assets ou baseline de navegador
- **THEN** a implementação verifica áreas representativas públicas e administrativas em desktop e mobile além dos testes automatizados
