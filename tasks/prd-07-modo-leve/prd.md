# PRD — Modo leve (só telemetria e momento do snapshot)

## Problem and context

Mesmo no modo `delegated` do PRD-06, o ContextBrake instala e mantém mais do que um fluxo com estado próprio precisa:

- gera o protocolo (`docs/context-brake-protocol.md`) e o bloco de referência nos arquivos de instrução (`protocol-service.ts`, `instruction-markers.ts`);
- adiciona ao `.gitignore` o bloco com `task_plan.json` e `state_checkpoint.json` (`gitignore-markers.ts`);
- consulta a existência do plano a cada evento que injeta algo, e o modo muda para `plan` se alguém criar `task_plan.json` (`zone-guidance.ts`, PD-01 do PRD-06);
- injeta boot ou comando de retomada no início de sessão (`boot-policy.ts`, FR-08 do PRD-06);
- freia acima do teto crítico e exige configurar caminhos e skills liberados para o snapshot não ser bloqueado (FR-06 do PRD-06).

Quem usa o fluxo SDD (`sdd-orchestrate-flow`, `sdd-snapshot`) já tem checkpoint, snapshot e retomada próprios e só precisa de duas coisas do ContextBrake: saber quanto do contexto está ocupado e em que zona (cor) ele está, e ser avisado do momento certo de gravar o snapshot. O protocolo de continuidade do SDD (`.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`) já lê o bloco de telemetria (`usage`, `zone`) e decide a pausa sozinho.

Esta feature adiciona um modo leve, escolhido explicitamente na instalação. Nele o ContextBrake só mede o contexto e injeta o bloco de telemetria com o tamanho, a zona e, a partir da zona de disparo, a orientação genérica de gravar o snapshot ou checkpoint, sem citar skill nem comando. Ele não cria, não configura e não lê arquivos de plano, checkpoint, snapshot ou protocolo, não mexe em arquivos de instrução nem no `.gitignore`, não injeta boot e não bloqueia chamadas de ferramenta.

A revisão técnica pediu um complemento: o `doctor` passa a mostrar, em qualquer modo, o uso atual da janela de contexto das sessões com atividade recente no repositório. O dado vem do registro interno de sessão que o ContextBrake já mantém.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Instalação mínima | Em um repositório de fixture, `init --light` cria ou altera só o arquivo de configuração, o manifesto, os ativos de runtime dos hooks, as entradas de hook dos harnesses ativos e, quando pedida, a ponte de status line do Claude Code. Nenhum protocolo, bloco em arquivo de instrução, bloco de `.gitignore`, plano, checkpoint ou snapshot aparece no disco. |
| OBJ-02 | Orientação de tamanho, cor e momento do snapshot | Em 100% dos blocos de telemetria injetados no modo leve aparecem `usage`, `tokens`, `zone` e uma `action`; a partir da zona de disparo a `action` manda gravar o snapshot ou checkpoint, sem citar skill nem comando. |
| OBJ-03 | Nenhuma interferência no fluxo do usuário | No modo leve, nenhuma chamada de ferramenta é negada em nenhuma zona, nenhum texto injetado cita `task_plan`, `state_checkpoint`, comando de validação ou commit, e nenhuma injeção acontece no início de sessão. |
| OBJ-04 | Não mudar os modos existentes | Sem o modo leve configurado, a suíte atual de testes unitários, de integração e e2e passa sem alteração nos resultados esperados, e toda saída fica igual byte a byte à atual, exceto pela informação do OBJ-05 quando há sessão ativa. |
| OBJ-05 | Ver o uso de contexto das sessões ativas | Com sessões ativas no repositório, `doctor` mostra, para cada uma, harness, sessão, percentual de uso, tokens, janela, zona e origem da medição, iguais aos da última leitura registrada. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Desenvolvedor que usa o fluxo SDD | Instalar o ContextBrake só como sensor de contexto | Telemetria sem arquivos nem regras que o SDD não usa | `context-brake init --light`, depois rodar `/sdd-orchestrate-flow` normalmente. |
| US-02 | Agente de código na sessão | Saber o tamanho e a zona do contexto a cada injeção | Decidir a pausa pelo protocolo do próprio fluxo | O bloco `[ContextBrake v2] … usage=… tokens=… zone=… action=…` chega nos resultados de ferramenta como hoje. |
| US-03 | Agente de código perto do limite | Ser avisado de que é hora de gravar o snapshot | Salvar o estado antes de perder contexto | Na zona de disparo e acima, a `action` diz para gravar o snapshot ou checkpoint agora; o agente usa o mecanismo que o próprio fluxo define. |
| US-04 | Agente de código acima do teto crítico | Continuar conseguindo gravar o snapshot | O estado é salvo em vez de a sessão travar | Nenhuma ferramenta é bloqueada; a `action` de `CRITICAL` pede o snapshot imediato e o fim da resposta com `[REQUEST_SESSION_RESET]`. |
| US-05 | Desenvolvedor que já tem o ContextBrake instalado no modo completo | Passar para o modo leve e voltar | Trocar de perfil sem reinstalar à mão | `init --light` mostra a prévia com a remoção do protocolo e dos blocos gerenciados (o do `.gitignore` só sai sem plano nem checkpoint no disco); `init --no-light` restaura o modo completo. Plano e checkpoint existentes nunca são apagados. |
| US-06 | Desenvolvedor com uma ou mais sessões abertas no repositório | Ver quanto da janela de contexto cada sessão está usando | Decidir quando pausar ou encerrar sessões sem abrir cada uma | `context-brake doctor` lista as sessões com atividade recente e o uso atual de cada uma; sem sessão ativa, essa parte não aparece. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | A configuração ganha um modo leve explícito, ligado por `init --light` e desligado por `init --no-light`. Com ele ligado, o modo em vigor é `light` independentemente de existir `task_plan.json` ou a seção de snapshot delegado. | Com o modo leve ligado, o modo em vigor é `light` com e sem `task_plan.json` no disco; sem ele, os modos `plan` e `delegated` seguem as regras atuais. |
| FR-02 | No modo leve, o ContextBrake nunca lê, cria ou altera o arquivo de plano, o de checkpoint ou arquivos de snapshot. | Com `task_plan.json` e `state_checkpoint.json` presentes, nenhum evento de hook do modo leve lê esses arquivos (verificável por teste de porta), e eles ficam iguais byte a byte depois de `init --light`, dos eventos de sessão e de `doctor`. |
| FR-03 | O bloco de telemetria continua na versão atual do formato (`[ContextBrake v2]`), com os mesmos campos, a mesma política de injeção (`injectionMode`, limiar de ativação) e os mesmos limites de zona; só o texto de `action` é do modo leve. | Os blocos do modo leve seguem o padrão `[ContextBrake v2] turn=… usage=… tokens=… source=… zone=… action=…` e aparecem nos mesmos eventos em que apareceriam no modo completo com a mesma configuração de telemetria. |
| FR-04 | A zona de disparo do snapshot é configurável entre `YELLOW` e `RED`, com padrão `RED`. O modo leve não aceita comando, skill nem caminho de snapshot configurado. | `init --light --snapshot-trigger YELLOW` grava a zona; uma zona inválida é rejeitada por `init` e `doctor` com o caminho do campo; a configuração do modo leve não tem campo de comando. |
| FR-05 | Ações do modo leve: `GREEN` trabalha normalmente; abaixo da zona de disparo, `YELLOW` mantém a ação atual sem plano; na zona de disparo e acima, a ação manda gravar o snapshot ou checkpoint agora e terminar a resposta com `[REQUEST_SESSION_RESET]`; em `CRITICAL`, a ação diz que a gravação é imediata. Nenhuma ação cita skill, slash command, arquivo de plano ou de checkpoint, comando de validação, commit ou bloqueio de ferramentas. | Os blocos em cada zona contêm o texto esperado; nenhum texto de `action` contém `/`, `task_plan`, `state_checkpoint`, `validation`, `commit` nem `blocked`. |
| FR-06 | No modo leve, o freio não nega nenhuma chamada de ferramenta, em nenhuma zona e em nenhum harness, inclusive quando a leitura de uso falha. | Em fixtures dos harnesses com freio garantido, acima do teto crítico, escrita em qualquer caminho, comando shell e skill são permitidos, e a política de falha não produz negação. |
| FR-07 | No modo leve, nenhum texto é injetado no início de sessão, na retomada, após `/clear` ou após compactação. | Os eventos de início de sessão dos harnesses devolvem resposta sem injeção, mesmo com `task_plan.json` presente ou comando de retomada configurado na seção delegada. |
| FR-08 | `init --light` instala só: configuração, manifesto, ativos de runtime, entradas de hook dos harnesses ativos e a ponte de status line do Claude Code quando pedida ou já instalada. Não gera o protocolo, não escreve o bloco de referência nos arquivos de instrução e não escreve o bloco do `.gitignore`. | Em fixture limpa, a lista de arquivos criados ou alterados é exatamente a do OBJ-01; a prévia de `init --light --dry-run` lista os mesmos caminhos. |
| FR-09 | Passar do modo completo para o leve remove os ativos que o ContextBrake gerencia e o modo leve não usa (protocolo registrado no manifesto e sem alteração, blocos entre marcadores nos arquivos de instrução), sem tocar em conteúdo fora dos marcadores e sem apagar plano, checkpoint ou snapshots. O bloco do `.gitignore` só é removido quando nem o plano nem o checkpoint existem no disco; com um deles presente, ele fica, porque `.agents/rules/file-changes.md` só permite removê-lo junto com esses arquivos. `init --no-light` reinstala esses ativos. | Depois de `init` completo, `init --light` e `init --no-light`, o conteúdo do usuário fica igual byte a byte, `task_plan.json` e `state_checkpoint.json` continuam no disco, e os ativos gerenciados voltam iguais aos de uma instalação completa nova; com `task_plan.json` presente, o bloco do `.gitignore` continua depois de `init --light`, e sem plano nem checkpoint ele sai. |
| FR-10 | `init --light` rejeita, com erro de uso, as opções que só fazem sentido nos outros modos: `--snapshot-command`, `--snapshot-path`, `--snapshot-skill`, `--resume-command` e as que escrevem em arquivos de instrução (`--create-instructions`, `--migrate-legacy`, `--instruction-file`). Vale também para `init` sem `--light` quando o modo leve já está configurado. Uma seção de snapshot delegado existente é preservada, mas ignorada enquanto o modo leve estiver ligado. | Cada combinação proibida termina com código de uso e mensagem que cita a opção; com a seção delegada presente, `init --light` a mantém no arquivo e `doctor` diz que ela está inativa. |
| FR-11 | `doctor` no modo leve valida a configuração do modo, não verifica protocolo, blocos de instrução, bloco de `.gitignore`, plano nem checkpoint, e aponta como divergência corrigível por `init` qualquer ativo gerenciado que o modo leve não usa e ainda esteja instalado. | Em instalação leve limpa, `doctor` sai saudável sem arquivos de protocolo, plano ou checkpoint; com o bloco de instrução restante, aponta divergência corrigível por `init --light`. |
| FR-12 | O diagnóstico e o relatório JSON expõem o modo em vigor `light`, o motivo (modo leve configurado) e a zona de disparo. | `doctor --json` inclui o modo `light` e esses valores; o relatório segue o schema publicado atualizado. |
| FR-13 | `wrap` funciona no modo leve com as ações do FR-05. `run` recusa o modo leve com código de uso e mensagem que diz que o runner exige o modo completo e como voltar a ele (`init --no-light`). | `wrap` injeta blocos com a ação do modo leve; `run` no modo leve termina com código de uso e a mensagem citada, mesmo com `task_plan.json` presente. |
| FR-14 | Em qualquer modo, `doctor` lista as sessões ativas do repositório: as que têm registro de sessão com a última atividade nos últimos 30 minutos, da mais recente para a mais antiga, até 10. Para cada uma mostra: harness, identificador da sessão, horário da última atividade e o uso atual (percentual, tokens usados, janela, zona e origem `measured` ou `estimated`). O uso vem da leitura mais recente depois do último reset, seja da ponte de status line, seja da última chamada de ferramenta. Uma sessão sem leitura depois do reset aparece com uso desconhecido. Sem sessão ativa, nada é acrescentado à saída. | Com registros de fixture de duas sessões recentes e uma antiga, `doctor` e `doctor --json` mostram só as duas recentes, na ordem certa, com os valores da última leitura. Uma sessão com reset e sem leitura posterior aparece com uso desconhecido. Sem registros recentes, a saída de texto e o JSON ficam iguais aos atuais. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Compatibilidade | Configurações e instalações existentes continuam válidas sem migração; sem o modo leve, toda saída e todo arquivo gerado ficam iguais byte a byte aos atuais, exceto pela lista de sessões ativas do FR-14, que só aparece quando há sessão ativa. |
| NFR-02 | Desempenho | No modo leve, nenhum evento de hook faz leitura do arquivo de plano, do checkpoint ou do Git para decidir a ação; a latência por hook fica dentro do orçamento do PRD-02. |
| NFR-03 | Plataforma | Comportamento idêntico em Linux, macOS e Windows (PowerShell e Git Bash), inclusive com arquivos de instrução que são links simbólicos na remoção dos blocos gerenciados. |
| NFR-04 | Tamanho da injeção | No pior caso, o bloco de telemetria do modo leve fica dentro do orçamento atual do bloco: até 60 tokens (`o200k_base`) e 220 caracteres. |
| NFR-05 | Isolamento do diagnóstico | Para o FR-14, `doctor` lê só o registro interno de sessão em `.context-brake/sessions/`: não lê transcrições dos harnesses, não abre processos e não altera nenhum arquivo. |

## User experience

- Instalação: `context-brake init --light [--snapshot-trigger RED|YELLOW] [--statusline-bridge]`. A prévia diz que o modo leve só injeta telemetria, não bloqueia ferramentas nem gerencia plano ou checkpoint, e lista o que será removido quando o repositório vinha do modo completo.
- Na sessão, a ação muda por zona, por exemplo: `zone=YELLOW action=keep working; finish the current unit before large new explorations` e `zone=RED action=save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]`.
- Volta ao modo completo: `context-brake init --no-light`.
- `doctor` acrescenta uma lista de sessões ativas, por exemplo: `claude-code 4f1c… 67% (670000/1000000, RED, measured), last activity 2 min ago`.
- Erros de configuração e de combinação de opções seguem o formato atual de `init` e `doctor`: caminho do campo ou opção, regra violada e correção sugerida, conforme `.agents/rules/cli-output.md`.

## Constraints and dependencies

- Depende do PRD-02 (zonas, telemetria, freio), do PRD-02.2 (janela real do Claude Code pela status line), do PRD-03 (boot) e do PRD-06 (modo delegado). Os modos `plan` e `delegated` preservam os critérios de aceitação desses PRDs sem mudança.
- A medição no modo leve é a mesma de hoje, incluindo o registro interno de sessão em `.context-brake/sessions/` e o estado da ponte de status line; esse estado interno de medição não conta como arquivo de status, snapshot ou checkpoint do usuário.
- As mudanças em arquivos do usuário seguem `.agents/rules/file-changes.md`; a saída da CLI segue `.agents/rules/cli-output.md`; os adaptadores seguem `.agents/rules/harness-adapters.md`.

## Out of scope

- Comando, skill ou caminho de snapshot configurável no modo leve, e verificar se o snapshot foi gravado.
- Saber se o processo do harness ainda está rodando: "sessão ativa" significa atividade recente no registro de sessão.
- Freio de qualquer tipo no modo leve, inclusive uma lista liberada opcional.
- Comando de retomada ou qualquer injeção de início de sessão no modo leve.
- Suporte ao runner (`context-brake run`) no modo leve.
- Ativação automática do modo leve (por exemplo, ao detectar o fluxo SDD).
- Mudar os limites das zonas, a política de injeção ou o formato versionado do bloco de telemetria.
- Alterar as skills SDD deste repositório ou migrar a instalação de dogfood deste repositório para o modo leve.

## Assumptions and sources

- Decisão de produto proposta (PD-01): o modo leve é explícito (`init --light`) e vence a presença do plano e a seção delegada. Alternativa: automático, como o PRD-06. Impacto se errada: criar `task_plan.json` não troca o modo; é preciso `init --no-light`.
- Decisão de produto proposta (PD-02): sem freio no modo leve. O pedido diz que a única coisa feita é monitorar e injetar orientação, e um freio sem lista liberada bloquearia a gravação do snapshot do SDD. Impacto se errada: acima de `CRITICAL` o agente pode seguir trabalhando se ignorar a ação.
- Decisão de produto (PD-03, revisada na HIL 2): a zona de disparo padrão é `RED` (65%), que coincide com o limiar de pausa de `session-continuity.md`. A ação é genérica ("snapshot ou checkpoint"), e o modo leve não tem comando de snapshot configurável. Impacto se errada: fluxos que precisem de um comando específico usam o modo delegado.
- Decisão de produto (PD-05, HIL 2): `doctor` mostra o uso das sessões ativas em qualquer modo. Proposta: uma sessão é "ativa" quando sua última atividade registrada foi nos últimos 30 minutos, até 10 sessões. Impacto se errada: uma sessão aberta e parada há mais tempo não aparece.
- Decisão de produto proposta (PD-04): sem protocolo e sem bloco de referência nos arquivos de instrução; o texto de `action` se explica sozinho, e o fluxo SDD já descreve o bloco. Impacto se errada: agentes fora do SDD recebem o bloco sem regra escrita sobre o que fazer.
- Fato: a telemetria e a medição rodam sem plano (`brake-engine.ts`); a ação sem plano em `YELLOW` já existe (`zone-actions.ts`); o registro de sessão guarda, por chamada, tokens usados, janela, zona e origem, e a ponte de status line grava leituras próprias (`session-ledger.ts`, `statusline-line.ts`).
- Fonte: PRD-02 (`tasks/prd-02-telemetria-zonas-e-freio/prd.md`), PRD-06 (`tasks/prd-06-modo-snapshot-delegado/prd.md`), `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
