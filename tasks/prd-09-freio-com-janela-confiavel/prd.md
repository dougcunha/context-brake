# PRD — Freio só com janela confiável

Nível `sdd-lean` (`DEC-HIL-00`): PRD curto, com problema, requisitos com aceite e fora de escopo. Direção de produto em `DEC-PD-00` e decisões em `DEC-PD-01`, `DEC-PD-02` e `DEC-HIL-01` (runner incluído) (`workflow.md`).

## Problem and context

O percentual de uso que decide as zonas é `tokens usados / janela`. Os tokens vêm de fonte medida (transcript do Claude Code, PRD-02.1). Já a janela só vem do harness em três casos: no Claude Code, pela ponte da status line (PRD-02.2); no Pi e no Oh-My-Pi, por `ctx.getContextUsage()`. Em qualquer outro caso, vale `telemetry.contextWindowCeiling` (padrão 128000, `configuration.ts:81`), um valor de configuração que não diz nada sobre o modelo em uso (`usage-resolver.ts:24`). A ponte é opcional desde a decisão de 25/09/2026 (PRD-02.2, FR-01), e o `doctor` não avisa quando ela nunca foi instalada (`statusline-diagnostics.ts:30`).

Incidente em 28/09/2026, no repositório TokenHound, sessão `d91a5026`: o freio negou `Bash` e `Edit` em `CRITICAL` com 77% (`.context-brake/runtime/blocks.jsonl`). A conta usou a janela de 128000 do fallback, mas a janela real, registrada depois pela ponte, era de 1000000, com uso real de 9% a 18%. O bloco de telemetria mostrava `source=measured`, porque esse campo só descreve a origem dos tokens. Por isso o número parecia confiável.

Regra do usuário (`DEC-PD-00`): sem uma fonte confiável do tamanho da janela, o ContextBrake não bloqueia nada e, no máximo, avisa. O bloqueio só é ativado quando o valor da janela é confiável. Num harness em que a única fonte confiável é a status line, a ponte passa a ser obrigatória.

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | A janela de cada leitura tem uma origem: `harness`, quando o harness a informou para a mesma sessão (registro da ponte no Claude Code, `ctx.getContextUsage()` no Pi e no Oh-My-Pi); `declared`, quando vem da janela declarada pelo usuário (FR-05); ou `config`, quando vem do fallback `contextWindowCeiling`. Só `harness` e `declared` são confiáveis. | Em fixtures de cada harness: com registro da ponte na sessão, a origem é `harness`; sem registro e sem declaração, é `config`; num harness sem fonte e com janela declarada, é `declared`. |
| FR-02 | Com a janela de origem `config`, o freio nunca nega uma chamada de ferramenta, em nenhuma zona e seja qual for o sinal que definiu a zona (percentual ou contagem de turnos). Continua injetando a telemetria e a orientação de zona. Com origem confiável, o comportamento atual do freio não muda. | Reproduzindo o incidente (janela de 128000 do fallback, 98000 tokens medidos, `CRITICAL`), o `pre_tool` de `Bash` e `Edit` devolve neutro, e a telemetria mostra `zone=CRITICAL`; com registro da ponte de 128000 para a sessão, o mesmo cenário nega como hoje. |
| FR-03 | A negação por falha de integração (`integration_failure`, `failure-policy.ts:61`) segue a mesma regra: só nega quando a última leitura registrada da sessão estava em `CRITICAL` com janela confiável. | Com a última leitura em `CRITICAL` e janela de origem `config`, um `pre_tool` que estoura o prazo interno devolve neutro e registra o erro em `errors.jsonl`; com janela de origem `harness`, nega como hoje. |
| FR-04 | No Claude Code, o `init` instala a ponte da status line por padrão, sem precisar de opção. `--no-statusline-bridge` continua a existir como opção para não instalar ou para remover a ponte, e sem ponte o freio só avisa (FR-02). Enquanto a sessão não tem registro da ponte (primeiras chamadas, ou `claude -p`, que não roda a status line), a origem é `config`, a menos que outra fonte confiável exista. A instalação preserva a status line do usuário como na PRD-02.2 (FR-02, FR-08). | `init --yes` num projeto com Claude Code grava o `statusLine` da ponte em `.claude/settings.local.json`, e `init --no-statusline-bridge --yes` não grava ou restaura o anterior. Um `init` repetido não muda nada. Numa instalação anterior sem a ponte, o próximo `init` sem opções a instala. |
| FR-05 | Num harness sem fonte de janela (Codex, Cursor, GitHub Copilot, Antigravity, OpenCode), o usuário pode declarar a janela na configuração. Essa declaração é distinta do fallback `contextWindowCeiling` e passa a valer como janela confiável (origem `declared`). Sem declaração, esses harnesses só avisam. | Com a janela declarada, uma sessão Codex em `CRITICAL` nega como hoje e a telemetria mostra a origem `declared`; sem declaração, o mesmo cenário devolve neutro. A configuração com a declaração passa em `schemas/context-brake.config.schema.json`. |
| FR-06 | O bloco de telemetria ganha o campo `window=` com a origem da janela (`harness`, `declared` ou `config`), numa nova versão do bloco. Com origem `config`, a ação do bloco diz que o freio só avisa e como obter uma janela confiável. A linha do modo debug (PRD-08) repete a origem da janela. | O bloco de uma leitura com fallback contém `window=config`, e sua ação não promete bloqueio; o de uma leitura com a ponte contém `window=harness`. Com o modo debug ligado, a linha do bloco gerenciado inclui a origem da janela. |
| FR-07 | O `doctor` (texto e `--json`) mostra, para cada harness ativo, se o freio pode negar ou só avisa, e o motivo: janela do harness, janela declarada, ponte ausente ou por opção, ou harness sem fonte. No Claude Code sem a ponte, o `doctor` emite um aviso com a remediação `context-brake init`. | Numa instalação do Claude Code sem ponte, o `doctor` mostra o modo só-aviso e o aviso com a remediação; com a ponte ativa, mostra que o freio pode negar. O `doctor --json` passa em `schemas/doctor-report.schema.json`. |
| FR-08 | O README e `docs/context-brake-protocol.md` descrevem a regra, o campo `window=`, a ponte padrão e a janela declarada. `docs/research/harness-integrations.md` registra qual fonte de janela cada harness tem. | As três fontes citam a regra do FR-02 e a origem de cada harness. |
| FR-09 | O runner (`run`, PRD-04) só encerra uma sessão por `CRITICAL` quando a janela da última leitura registrada é confiável. Com origem `config`, como nas sessões `claude -p`, ele continua registrando a zona final, mas não corta a sessão por esse motivo. Os demais limites do runner não mudam. | Com a última linha do ledger em `CRITICAL` e janela de origem `config`, a sessão não termina com `critical_ceiling` depois da carência e segue até outro motivo de fim; com origem `harness` ou `declared`, termina como hoje. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Desempenho | O p95 por chamada de hook continua dentro dos limites da PRD-02.1 (100 ms) e da PRD-02.2 (120 ms com 200 linhas `statusline` no ledger). |
| NFR-02 | Compatibilidade | A configuração continua em `schemaVersion: 1`, e os schemas publicados só recebem campos opcionais. Configs existentes continuam válidas. O único campo novo no bloco de telemetria é `window=`, e ele custa no máximo 10 tokens `o200k_base`. |
| NFR-03 | Plataforma | Os critérios passam em Linux, macOS e Windows (PowerShell e Git Bash). |

## Out of scope

- Descobrir a janela pelo nome do modelo. O transcript registra `claude-opus-5-5` para uma sessão de 1M, e a PRD-02.1 já excluiu esse caminho.
- Renomear `contextWindowCeiling` ou mudar o padrão de 128000. O fallback continua servindo para calcular zonas e avisos, só não autoriza bloqueio.
- Pontes de status line para outros harnesses, como a status line do Codex, que não executa comando.
- Registrar em `blocks.jsonl` as negações evitadas por falta de janela confiável.
- O `DEADLINE_EXCEEDED` do TokenHound (17:05:08Z): foi uma ocorrência isolada, com a zona abaixo de `CRITICAL`, e resolveu como neutro. Aqui só se ajusta a regra de negação por falha (FR-03).

## Assumptions and sources

- Decisão (`DEC-PD-02`): sem janela confiável, a zona definida pela contagem de turnos também não nega.
- Decisão (`DEC-PD-02`): a janela declarada (FR-05) vale só para harnesses sem fonte da janela. No Claude Code, no Pi e no Oh-My-Pi, a janela confiável é a do harness, e uma declaração não reativa o bloqueio antes do primeiro registro nem no `claude -p`.
- Fontes: `src/core/services/usage-resolver.ts`, `brake-engine.ts:46`, `failure-policy.ts:54-61`, `src/infrastructure/harnesses/common/in-process-support.ts:46`, `claude-code/runtime.ts:64`, `claude-code/statusline-planner.ts:38-44`, `claude-code/statusline-diagnostics.ts`, `src/core/services/telemetry-block.ts`, `docs/research/harness-integrations.md` (coluna "Uso de contexto"), PRD-02.1, PRD-02.2 e PRD-08.
- Evidência do incidente: `D:/MyProjects/TokenHound/.context-brake/runtime/blocks.jsonl` e `runtime/sessions/claude-code/0da38c73b0f97187f306bac037047c3e.jsonl` (`windowTokens` 128000 nas linhas `tool` até 17:15Z; linhas `statusline` com 1000000 a partir de 17:21Z).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
