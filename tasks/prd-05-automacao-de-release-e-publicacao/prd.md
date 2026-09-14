# PRD — Automação de Release e Publicação no npm

## Problem and context

Atualmente, o ContextBrake possui pipelines robustos de integração contínua (`.github/workflows/ci.yml`) e scripts de validação de empacotamento (`scripts/check-package.ts`), mas não possui um fluxo automatizado e seguro de release e publicação para o registro oficial do npm (`release.yml`).

A realização de publicações manuais a partir da máquina local do desenvolvedor introduz riscos graves:
1. Risco de publicar código não testado, com assets desatualizados ou com modificações locais não commitadas.
2. Exposição desnecessária de tokens de longa duração e ausência de atestação criptográfica de procedência (*npm Provenance*).
3. Inconsistência entre tags Git do repositório, versões no `package.json` e notas de release públicas.
4. Ausência de documentação sobre como configurar o secret do repositório (`NPM_TOKEN`) e as permissões de acesso ao npmjs.com.

Esta funcionalidade resolve esse problema implementando um pipeline de entrega contínua que automatiza o build, verificação rigorosa, empacotamento, publicação no npm com provenance e geração de GitHub Releases ao criar uma tag de versão, mantendo a integridade do pacote e a segurança dos segredos do repositório.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Publicação 100% automatizada e reproduzível | 0 passos manuais de build ou upload executados na máquina local após o push da tag `v*.*.*`. |
| OBJ-02 | Segurança e integridade de fornecimento de software | 100% dos pacotes publicados no npm contêm atestação criptográfica de procedência (*npm Provenance* via OIDC do GitHub Actions). |
| OBJ-03 | Blindagem contra releases quebrados | 100% das tentativas de release abortam imediatamente sem publicar nada no npm se qualquer teste, lint, verificação de schemas ou smoke test (`package:smoke`) falhar. |
| OBJ-04 | Sincronia estrita de versão | 0 discrepâncias aceitas entre a tag Git criada (`vX.Y.Z`) e o campo `"version"` do `package.json` (`X.Y.Z`). |
| OBJ-05 | Eficiência da esteira de release | Tempo total do workflow de release inferior a 5 minutos a partir do disparo. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Mantenedor do projeto | Criar uma tag Git (ex: `v1.0.0`) e enviá-la para o GitHub | Ter a versão compilada, testada, validada e publicada automaticamente no registro público do npm. | O mantenedor roda `git tag v1.0.0 && git push origin v1.0.0`, acionando o workflow de release. |
| US-02 | Mantenedor do projeto | Garantir que segredos e credenciais de publicação nunca vazem | Proteger o registro de pacotes contra invasão ou vazamento de credenciais locais. | O workflow utiliza o secret `NPM_TOKEN` protegido do repositório ou OIDC confiável, com log masking nativo. |
| US-03 | Mantenedor do projeto | Disparar um release manualmente com aprovação controlada | Permitir publicação sob demanda mesmo sem push direto de tag caso necessário para manutenção. | Disparo manual via `workflow_dispatch` selecionando a tag ou versão de destino com confirmação explícita. |
| US-04 | Usuário da CLI (`npx` / `npm`) | Obter as atualizações imediatamente após o release | Usar a versão mais recente e estável do ContextBrake via `npx context-brake init` sem atritos. | O npm atualiza a tag de distribuição `latest` imediatamente após o término do workflow. |
| US-05 | Mantenedor do projeto | Ter um guia claro de configuração de credenciais e release | Configurar novos secrets no repositório GitHub e tokens no npm sem depender de conhecimento tácito. | Acesso ao documento `docs/release-guide.md` com o passo a passo para criar o token com escopo correto no npmjs.com e adicioná-lo ao GitHub Secrets. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Workflow de release no GitHub Actions (`.github/workflows/release.yml`) | O workflow deve ser disparado automaticamente em eventos `push` de tags correspondentes ao padrão `v[0-9]+.[0-9]+.[0-9]+*` e manual via `workflow_dispatch`. |
| FR-02 | Validação rigorosa pré-publicação no pipeline | O workflow deve executar em sequência obrigatória: checkout, setup do Node.js (v20), `npm ci --ignore-scripts`, checagem de schemas (`npm run schemas:check`), checagem de scripts (`npm run dependencies:check`), build (`npm run build`), typecheck (`npm run typecheck`), lint (`npm run lint`), testes unitários/integração (`npm test`), cobertura (`npm run coverage`) e teste de fumaça de pacote (`npm run package:smoke`). Se qualquer etapa falhar, o job é interrompido com erro e nada é publicado. |
| FR-03 | Validação de consistência entre Git Tag e `package.json` | O workflow deve validar que a versão da tag (sem o prefixo `v`, ex: `1.0.0`) é estritamente igual à chave `"version"` do `package.json`. Em caso de divergência, o workflow falha imediatamente antes de qualquer tentativa de publicação. |
| FR-04 | Publicação autenticada no npm com Provenance | A publicação deve ser executada com `npm publish --access public --provenance`, utilizando autenticação via `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` e permissão `id-token: write` para geração de atestação OIDC. |
| FR-05 | Criação automática de GitHub Release | Após publicação bem-sucedida no npm, o workflow deve criar automaticamente uma GitHub Release associada à tag, contendo notas geradas automaticamente a partir dos commits ou changelog. |
| FR-06 | Script de checagem pré-release no `package.json` | O `package.json` deve disponibilizar um comando `npm run release:check` que execute localmente todos os gates necessários (build, checks, schemas, testes e smoke) antes de o mantenedor criar e subir a tag. |
| FR-07 | Guia operacional de release e configuração de secrets | Deve existir um guia (`docs/release-guide.md`) documentando: criação de token Granular ou Automation no npmjs.com, configuração do secret `NPM_TOKEN` nas configurações de repositório do GitHub, requisitos de 2FA, e instruções passo a passo para gerar tags e acompanhar o release. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Segurança de Credenciais | O token de publicação do npm (`NPM_TOKEN`) nunca deve ser commitado, logado ou exposto nos outputs do GitHub Actions. Permissões de token do job devem ser restritas estritamente ao mínimo necessário (`contents: write`, `id-token: write`). |
| NFR-02 | Integridade de Conteúdo | O pacote publicado deve conter apenas os artefatos permitidos pela lista de inclusão do `package.json` e validados pelo `scripts/check-package.ts`, rejeitando qualquer arquivo `.ts` não compilado ou diretórios proibidos (`tests/`, `.agents/`, `tasks/`). |
| NFR-03 | Idempotência e Tratamento de Erro | Se uma versão já tiver sido publicada no registro do npm, a tentativa de re-publicação deve falhar com log explícito sem corromper versões existentes nem deixar artefatos parciais. |
| NFR-04 | Desempenho e Confiabilidade da CI | O job de release deve ser executado no ambiente `ubuntu-latest` padrão do GitHub Actions e concluir em menos de 5 minutos sob condições normais de rede. |

## User experience

- **Mantenedor do projeto**:
  1. O mantenedor roda `npm run release:check` localmente para garantir sanidade.
  2. Cria a tag correspondente à versão: `git tag v1.0.0` e `git push origin v1.0.0`.
  3. No GitHub Actions, a aba *Actions* exibe o workflow *Release* com etapas claras e com feedback visual de cada validação.
  4. Na aba *Releases* do repositório GitHub, a versão aparece publicada com release notes.
  5. No npmjs.com, a página do pacote exibe a nova versão com o selo verde de *Provenance* atestando que a build veio do repositório oficial.
- **Configuração inicial de Secrets**:
  - O guia em `docs/release-guide.md` fornece instruções diretas para:
    - Entrar no npmjs.com -> *Access Tokens* -> *Generate New Token* (tipo *Automation* ou *Granular* com permissão Read & Write no pacote `context-brake`).
    - Ir no repositório GitHub -> *Settings* -> *Secrets and variables* -> *Actions* -> *New repository secret* com o nome `NPM_TOKEN`.

## Constraints and dependencies

- Node.js versão >= 20 e npm >= 10.
- GitHub Actions com suporte a runner `ubuntu-latest` e atestação OIDC (`id-token: write`).
- Registro oficial do npm (`https://registry.npmjs.org`).
- Pacote público com nome reservado/gerenciado `context-brake`.
- Não deve modificar a arquitetura interna nem criar dependências de runtime adicionais para o CLI.

## Out of scope

- Publicação em registries alternativos privados ou gerenciadores de pacotes de sistemas operacionais (como Homebrew, Apt, Winget, Chocolatey).
- Automação autônoma de incremento de versão (bump de SemVer sem supervisão humana no MVP; a decisão de versão permanece sob controle explícito do mantenedor via tag Git).
- Publicação de canais canary/nightly automatizados diários (apenas releases oficiais ou pré-releases explicitamente tagueados com sufixo, ex: `-beta.1`).

## Assumptions and sources

- Assumption: O mantenedor possui uma conta no npmjs.com com privilégios de publicação para o pacote `context-brake`.
- Assumption: O repositório no GitHub possui permissões administrativas para adicionar Repository Secrets (`NPM_TOKEN`) e executar GitHub Actions.
- External source: [npm Provenance documentation](https://docs.npmjs.com/generating-provenance-statements) — requisitos para geração de atestação criptográfica via GitHub Actions.
- External source: [GitHub Actions OIDC with npm](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) — configuração de permissões seguras.
- Project source: [`package.json`](../../package.json) — mapeamento de arquivos e scripts.
- Project source: [`scripts/check-package.ts`](../../scripts/check-package.ts) — regras de sanidade do pacote npm.
- Project source: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — matriz de validação e linters existentes.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
