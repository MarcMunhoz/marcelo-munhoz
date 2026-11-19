## Purpose

Defines the dependency update, CVE remediation, and container-only validation workflow for this application.

## Requirements

### Requirement: Container-only dependency maintenance
The maintenance workflow MUST run dependency install, update, audit, build, lint, and test commands inside the project container context.

#### Scenario: Dependency commands are executed
- **WHEN** dependency maintenance commands are run
- **THEN** they execute inside the container context instead of directly on the host

#### Scenario: Secret files remain unread
- **WHEN** the container workflow references environment configuration
- **THEN** the implementation MUST NOT read `.env`, `.env.*`, credential, secret, or private key files directly

### Requirement: Packages are updated where compatible
The application MUST update all feasible direct and transitive npm dependencies while preserving compatibility with the current application and supported Node runtime.

#### Scenario: Compatible updates exist
- **WHEN** a package has a compatible update available
- **THEN** `app/package.json` and `app/package-lock.json` reflect the updated dependency set

#### Scenario: Update is not compatible
- **WHEN** a package cannot be updated safely because of runtime, framework, or breaking API constraints
- **THEN** the package remains pinned and the implementation documents the reason

### Requirement: Known CVEs are remediated or documented
The dependency set MUST remediate known npm audit vulnerabilities where a safe fix exists, and MUST document any remaining vulnerability that cannot be safely fixed in this change.

#### Scenario: Safe CVE fix exists
- **WHEN** `npm audit` reports a vulnerability with a compatible remediation
- **THEN** the dependency set is updated so the vulnerability no longer appears in the audit result

#### Scenario: Safe CVE fix does not exist
- **WHEN** `npm audit` reports a vulnerability without a compatible remediation
- **THEN** the implementation documents the advisory, affected package, reason it remains, and mitigation or follow-up

### Requirement: Application validation passes after updates
The updated dependency set MUST pass the available application validation commands inside the container.

#### Scenario: Validation commands run
- **WHEN** dependency updates are complete
- **THEN** install, audit, lint, build, and available test commands run inside the container

#### Scenario: Validation succeeds
- **WHEN** the validation commands finish
- **THEN** they complete successfully or any non-passing result is explicitly documented with the remaining blocker and next action

### Requirement: Runtime smoke coverage is performed
The implementation MUST verify the application can start in the container context after dependency updates.

#### Scenario: Application starts
- **WHEN** the updated application is started through the container workflow
- **THEN** the frontend and backend processes start without dependency-related runtime failures

#### Scenario: Startup failure occurs
- **WHEN** the updated application fails to start because of a dependency change
- **THEN** the implementation fixes the compatibility issue or documents the unresolved blocker before completion

### Requirement: Each Maintenance Pass Produces Reconciled Security Evidence
Each dependency maintenance pass MUST record the current npm audit result and open GitHub Dependabot alerts, reconcile alert-level and package-level findings, map remediated advisories to package changes and validation evidence, and document any alert that remains unresolved.

#### Scenario: Dependabot and npm audit use different counts
- **WHEN** Dependabot reports open alerts and `npm audit` groups the same dependency state into a different number of vulnerable packages
- **THEN** the implementation report lists both counts and explains the difference between alert-level tracking and package-level audit grouping

#### Scenario: Dependabot alert remains open
- **WHEN** an open Dependabot alert cannot be safely remediated in the current pass
- **THEN** the implementation report documents the alert number, advisory, package, affected manifest, blocker, mitigation, and follow-up path

#### Scenario: Dependabot alert is remediated
- **WHEN** a package update, lockfile refresh, or override remediates an open Dependabot alert
- **THEN** the implementation report records the alert number, package, advisory, and validation evidence used to confirm the remediation

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
