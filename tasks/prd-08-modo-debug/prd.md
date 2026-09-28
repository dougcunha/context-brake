# PRD — Modo debug (percentual de contexto impresso pelo agente)

Nível `sdd-lean` (`DEC-HIL-00`): PRD curto, com problema, requisitos com aceite e fora de escopo.

## Problem and context

Para calibrar o ContextBrake, quem o desenvolve ou avalia precisa comparar o uso de contexto que ele calcula com o valor real do harness (por exemplo `/context` ou a status line do Claude Code). Hoje o agente só vê o bloco de telemetria (`[ContextBrake v2] … usage=<p>% tokens=<u>/<w> source=<measured|estimated> zone=<ZONA> …`, `telemetry-block.ts`) e só a partir de 50% de uso, porque o padrão é `injectionMode: threshold_only` com `activationThresholdPercentage: 50` (`configuration.ts:81`, `injection-policy.ts`). O leitor humano não vê esse bloco na conversa e não tem um ponto fácil de comparação.

O modo debug, ligado por `context-brake init --debug`, instrui o agente a terminar cada resposta com uma linha destacada por emoji que repete a última leitura da telemetria. As decisões de produto vieram do usuário antes deste PRD (`DEC-PD-01`).

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | `init --debug` liga o modo debug e grava essa escolha em `context-brake.config.json`, validada por `schemas/context-brake.config.schema.json`. Um `init` seguinte sem `--debug` nem `--no-debug` mantém o modo como está. | Depois de `init --debug`, a configuração registra o modo ligado e passa na validação do schema; um novo `init` sem as opções mantém o registro e não altera nenhum arquivo. |
| FR-02 | Com o modo ligado, o bloco gerenciado entre `<!-- CONTEXTBRAKE:START -->` e `<!-- CONTEXTBRAKE:END -->` de cada arquivo de instrução alvo ganha uma linha que manda o agente terminar cada resposta que recebeu pelo menos um bloco de telemetria com a linha `📊 ContextBrake: <usage>% · <usados>/<janela> · <source> · <ZONA>`, copiando os valores do bloco mais recente. O conteúdo fora dos marcadores não muda, e o fim de linha do arquivo é preservado. | Em repositório de fixture com `AGENTS.md` e `CLAUDE.md` (incluindo um symlink), o bloco contém a linha com o formato exato acima; o conteúdo fora dos marcadores fica igual byte a byte, com LF e CRLF. |
| FR-03 | Com o modo ligado, todo resultado de ferramenta em que o ContextBrake injeta telemetria recebe o bloco, em qualquer zona e percentual, como se `injectionMode` fosse `always`; o valor gravado de `injectionMode` não muda. Com o modo desligado, a injeção segue `injectionMode` como hoje. | Com `threshold_only`, uso de 10% e zona `GREEN`, o hook devolve o bloco de telemetria com o modo ligado e não devolve nada com o modo desligado; `injectionMode` continua `threshold_only` no arquivo. |
| FR-04 | `init --no-debug` desliga o modo: remove o registro da configuração e a linha do bloco gerenciado, deixando o bloco igual ao de uma instalação sem debug. `--debug` e `--no-debug` juntos são erro de uso. | Depois de `init --debug` e `init --no-debug`, configuração e arquivos de instrução ficam iguais byte a byte aos de uma instalação nova sem debug; as duas opções juntas terminam com código de uso e mensagem que cita ambas. |
| FR-05 | O modo leve não escreve arquivos de instrução, então não aceita o debug: `init --light --debug`, e `init --debug` com o modo leve já configurado, são erro de uso. `init --light` com o debug ligado também é erro de uso, cuja mensagem pede `--no-debug`; `init --light --no-debug` desliga o debug e liga o modo leve num só comando. | Cada combinação proibida termina com código de uso, sem escrever arquivos, e a mensagem cita a opção conflitante e como resolver; `init --light --no-debug` com o debug ligado termina com sucesso, no modo leve e sem registro de debug. |
| FR-06 | `init --dry-run` e `init --json` mostram a ligação ou o desligamento do debug como mudanças planejadas, e `doctor` informa que o modo está ligado. Um bloco gerenciado que não corresponde à configuração (linha de debug faltando ou sobrando) é reescrito pelo próximo `init`, como já acontece com qualquer bloco desatualizado. `remove` remove o bloco inteiro, com a linha de debug, como já faz. | O relatório de `init --dry-run --json` lista a mudança na configuração e nos arquivos de instrução e passa no schema do relatório; `doctor` (texto e `--json`) mostra o modo debug ligado; um bloco sem a linha de debug com o modo ligado volta ao formato de FR-02 depois de `init --yes`; depois de `remove`, nenhuma linha de debug fica nos arquivos. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Custo de contexto | A linha de debug no bloco gerenciado tem no máximo 60 tokens; o formato do bloco de telemetria `v2` não muda. |
| NFR-02 | Plataforma | Funciona em Linux, macOS e Windows (PowerShell e Git Bash), incluindo arquivos de instrução que são symlinks. |

## Out of scope

- A estimativa do próprio agente sobre o uso de contexto: a linha repete apenas a leitura do ContextBrake.
- Modo leve e qualquer injeção de instrução dentro do bloco de telemetria.
- Cadência configurável (a cada N chamadas ou só na troca de zona).
- Comparação automática com o valor real do harness: quem compara é a pessoa.
- Mudança nas zonas, no freio ou no formato do bloco de telemetria.
- Diagnóstico no `doctor` de conteúdo divergente no bloco gerenciado: hoje ele só verifica a presença do marcador (`doctor-checks.ts`, `INSTRUCTION_REFERENCE_MISSING`), e isso não muda.

## Assumptions and sources

- Decisões de produto: `DEC-PD-01` em `workflow.md` (valor, local, cadência e injeção forçada).
- Assumption: o emoji `📊` e o separador `·` passam intactos pelos arquivos de instrução em UTF-8 e pelo terminal dos harnesses suportados; se um harness os corromper, o formato troca o emoji por um marcador ASCII sem mudar os demais requisitos.
- Assumption: o agente obedece à instrução do bloco gerenciado na maior parte das respostas; o ContextBrake não verifica nem força a impressão.
- Fonte: `src/core/services/telemetry-block.ts`, `src/core/services/injection-policy.ts`, `src/core/services/instruction-markers.ts`, `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, PRD-07 FR-09 e FR-10 (restrições do modo leve).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
