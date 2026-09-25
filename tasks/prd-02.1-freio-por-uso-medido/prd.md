# PRD 2.1 — Freio por uso medido de contexto

## Problem and context

O [PRD-02](../prd-02-telemetria-zonas-e-freio/prd.md) classifica a sessão por uso de contexto **ou** por turnos, e conta um turno por chamada de ferramenta (RF1). Com os valores padrão (RF10), a sessão fica amarela com 8 chamadas, vermelha com 11 e crítica com 12, e o RF11 obriga o teto de turnos a iniciar o teto crítico. Em 25/09/2026, no repositório catalogo-2-0, o Claude Code (Opus) parou no turno 10 de 12, em zona amarela, antes de começar uma revisão de código: concluiu que a revisão, que precisa de dezenas de chamadas, seria cortada no meio.

As causas, por ordem de impacto:

1. **Turnos bloqueiam sem relação com o contexto.** Uma sessão de trabalho normal usa de 30 a 200 chamadas de ferramenta, e muitas delas ocupam poucos tokens. A própria pesquisa registra que os limiares de 8 a 12 turnos aparecem nas fontes sem medição ([disk-checkpoint-reset-loop.md](../../docs/research/disk-checkpoint-reset-loop.md), [long-task-execution.md](../../docs/research/long-task-execution.md)).
2. **O uso de contexto no Claude Code é só estimado.** O hook não recebe tokens nem janela ([harness-integrations.md](../../docs/research/harness-integrations.md#claude-code)). A estimativa soma uma base fixa, os caracteres vistos pelos hooks e um custo por turno, e não enxerga system prompt, definições de ferramentas, instruções nem raciocínio. Por isso o eixo de turnos acaba decidindo.
3. **O protocolo manda parar mesmo sem plano.** Na zona amarela, ele proíbe iniciar um novo passo do plano. Sem `task_plan.json`, o agente lê isso como "não comece trabalho novo" e para sem ter onde salvar o estado.

Um dado viabiliza a correção. Cada resposta do assistente gravada no transcript do Claude Code (`transcript_path`, recebido por todos os hooks) traz `message.usage` com `input_tokens`, `cache_creation_input_tokens` e `cache_read_input_tokens`. A soma é o tamanho do contexto enviado naquela chamada ao modelo, contado pela API. Isso foi verificado em transcripts locais da versão em uso em 25/09/2026. O transcript não grava o tamanho da janela.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | O número de chamadas de ferramenta, sozinho, nunca bloqueia | Em sessões simuladas com 200 chamadas e uso abaixo do teto crítico, 0 chamadas são bloqueadas e nenhuma zona acima de `GREEN` é informada com os valores padrão e uso abaixo de 50%. |
| OBJ-02 | Uso real no Claude Code | Em 100% das leituras em que o transcript tem uma resposta do assistente válida desde o último reinício, a origem é `measured` e o valor é igual à soma dos três campos de `usage` da resposta mais recente da sessão principal. |
| OBJ-03 | Protocolo que não paralisa trabalho sem plano | Sem arquivo de plano, 0 instruções das zonas `YELLOW` e `RED` mandam deixar de iniciar trabalho; a regra só vale quando existe plano. |
| OBJ-04 | Overhead mantido | O p95 por chamada no Claude Code continua em até 100 ms, com transcript de até 20 MB. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Desenvolvedor | Rodar tarefas longas, como revisões, com o ContextBrake ligado | Não perder a sessão por contagem de chamadas | Uma revisão com 80 chamadas e uso de 40% termina sem bloqueio nem ordem de parada. |
| US-02 | Agente no Claude Code | Receber o uso real de contexto | Decidir quando parar com base no contexto de fato | O bloco marca `source=measured` com o valor contado pela API. |
| US-03 | Mantenedor que calibra limites | Continuar usando limites de turnos, se quiser | Ter um aviso por volume de chamadas sem bloqueio | Com limites de turnos ativados, a zona sobe até `RED` por turnos, mas `CRITICAL` só vem do uso. |
| US-04 | Desenvolvedor com instalação anterior | Sair dos limites antigos sem editar a configuração à mão | Ter o novo comportamento depois de atualizar | O `doctor` aponta os limites antigos e `init --yes` os remove. |
| US-05 | Agente sem `task_plan.json` | Receber instruções coerentes | Não parar sem motivo nem sem destino para o estado | Na zona amarela, continua o trabalho; na vermelha, conclui a unidade atual e informa o usuário. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Classificar a zona `CRITICAL` apenas pelo uso de contexto. Substitui a parte de turnos do RF10 e do RF17 do PRD-02. | Com os valores padrão, uso de 74% e 500 turnos não resultam em `CRITICAL`, e uso de 75% com 1 turno resulta em `CRITICAL`. Nenhuma chamada é bloqueada abaixo de 75% de uso, qualquer que seja o número de turnos. |
| FR-02 | Tornar opcionais os limites de turnos, desligados por padrão. Quando ligados, podem elevar a zona até `RED`, nunca até `CRITICAL`. Substitui o RF11 do PRD-02 na regra que iguala o teto de turnos ao início da zona crítica. | Na configuração padrão, a zona depende só do uso. Com limites de amarelo em 60 e vermelho em 100 turnos, 60 turnos e uso de 10% resultam em `YELLOW`, e 100 turnos em `RED`. Limites de turnos não crescentes são rejeitados com campo e regra violada. |
| FR-03 | Continuar contando turnos (RF1–RF4 do PRD-02) e mostrá-los no bloco de telemetria. O teto só aparece quando os limites de turnos estão ligados. | Com os limites desligados, o bloco mostra o turno sem teto. Com eles ligados, mostra turno e limite de `RED`. CA-06, CA-07 e CA-08 do PRD-02 continuam passando. |
| FR-04 | No Claude Code, medir o uso pela resposta mais recente do assistente no transcript da sessão principal: `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`. | Com um transcript de fixture cuja última resposta traz 2, 784 e 193.645, o bloco mostra 194.431 tokens e `source=measured`. Respostas marcadas como de subagente (`isSidechain: true`) não entram na leitura da sessão principal. |
| FR-05 | Recorrer à estimativa do PRD-02 (RF6) quando a medição falhar: transcript ausente, ilegível ou sem resposta com `usage` desde o último reinício. | Em cada um desses casos, o bloco mostra `source=estimated`, e o hook não falha nem bloqueia por causa da leitura. |
| FR-06 | Após nova sessão ou compactação (RF3 do PRD-02), ignorar respostas gravadas antes do reinício. | Depois de uma compactação, enquanto o transcript não tiver resposta nova, a leitura é estimada; a primeira resposta posterior volta a ser `measured` com o valor dela. |
| FR-07 | Usar como janela o valor que o harness informar e, se ele não informar, `contextWindowCeiling`, que passa a ser documentado como orçamento de contexto da sessão (RF7 do PRD-02). | No Claude Code, a janela do bloco é `contextWindowCeiling`, e o README e o protocolo explicam que esse campo define o orçamento sobre o qual as porcentagens são calculadas. |
| FR-08 | Nas zonas `YELLOW` e `RED`, escolher a instrução pela existência do arquivo de plano. | Com plano: mantém as ações do PRD-02. Sem plano: `YELLOW` diz para continuar e preferir concluir a unidade de trabalho atual antes de explorações grandes; `RED` diz para concluir ou pausar a unidade atual, registrar o progresso onde o projeto já guarda estado ou informar o usuário, e encerrar com `[REQUEST_SESSION_RESET]`. Nenhuma das duas proíbe começar a tarefa pedida. O texto do protocolo e o bloco de telemetria usam as mesmas regras (RF9 do PRD-02). |
| FR-09 | Manter válidas as configurações existentes e migrar os limites de turnos padrão antigos. | Uma configuração gravada pelo PRD-02 é aceita. Nela, os limites de turnos iguais aos padrões antigos (7, 10 e 12) geram aviso no `doctor`, com a remediação `context-brake init --yes`; o `init --yes` os remove. Limites personalizados são preservados e passam a valer como limites opcionais do FR-02. |
| FR-10 | Atualizar a documentação ao novo comportamento. | O README, `docs/telemetry-block.md` e o protocolo gerado descrevem zonas por uso, limites de turnos opcionais e a origem medida no Claude Code. A seção do Claude Code em `harness-integrations.md` registra o campo `usage` do transcript, a data da verificação e que ele não é interface documentada. O `doctor` passa a mostrar o uso de contexto do Claude Code como obtido pelo transcript, e não mais como indisponível (FR-04 do PRD 1.1). |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Desempenho | O p95 por chamada no Claude Code continua em até 100 ms (objetivo de overhead do PRD-02), medido com transcript de 20 MB; a leitura não carrega o arquivo inteiro na memória. |
| NFR-02 | Resiliência | Linha parcial no fim do arquivo, JSON inválido, campos ausentes ou formato desconhecido levam à estimativa, sem erro visível ao agente. Só falhas de leitura do arquivo são registradas no log local de erros de runtime; linhas que não dão parse são ignoradas sem registro (decisão DEC-HIL-03). |
| NFR-03 | Privacidade | A integração lê apenas campos de metadados e de `usage` do transcript; nenhum texto de mensagem é gravado em ledger, log ou saída. |
| NFR-04 | Compatibilidade | A configuração continua em `schemaVersion: 1`, os schemas publicados só recebem acréscimos ou campos opcionais, e nenhuma dependência de runtime é adicionada. Qualquer mudança no formato do bloco atualiza a versão documentada em `docs/telemetry-block.md` e mantém o limite de 60 tokens (CA-13 do PRD-02). |
| NFR-05 | Portões de qualidade | `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage` com pelo menos 80%, `schemas:check` e `package:smoke` passam. |
| NFR-06 | Plataformas | Os critérios passam em Linux, macOS e Windows (PowerShell e Git Bash), inclusive com caminho de transcript com espaços ou acentos. |

## User experience

- **Bloco de telemetria:** continua em uma linha em inglês, sem cor, com `source=measured` quando o uso vem do transcript.
- **`doctor`:** mostra o aviso de limites de turnos antigos com a remediação e informa que o uso de contexto do Claude Code vem do transcript, com a limitação de que esse formato não é interface documentada.
- **Protocolo:** a tabela de zonas mostra condições por uso e só inclui condições por turnos quando os limites estão ligados.

## Constraints and dependencies

- **Precedência:** FR-01 a FR-03 substituem a parte de turnos de RF10, RF11 e RF17 e os critérios CA-03, CA-22 e CA-23 do PRD-02; FR-07 complementa o RF7; FR-08 altera as ações das zonas descritas no protocolo; FR-10 atualiza o FR-04 do PRD 1.1 para o Claude Code. Os demais requisitos do PRD-02 e do PRD-03 continuam valendo.
- **Harness:** o formato do transcript do Claude Code não é interface documentada e é gravado de forma assíncrona, então a leitura pode estar atrasada em uma chamada ao modelo. Qualquer divergência cai na estimativa (FR-05).
- **Numeração:** a pasta segue o precedente do PRD 1.1 para revisões de um PRD já implementado, e este PRD é implementado depois do PRD-05.
- **Plataformas e distribuição:** Node.js 20 ou superior, pacote npm `context-brake` e as mesmas plataformas do PRD-01.

## Out of scope

- Medir pelo transcript em outros harnesses. No Codex CLI o formato não é interface estável, e Cursor, Copilot CLI, OpenCode e Antigravity CLI ficam com a estimativa atual.
- Ponte pelo status line do Claude Code.
- Descobrir o tamanho da janela pelo nome do modelo ou por tabela de modelos.
- Tokenizar localmente ou chamar a API `count_tokens`.
- Recalibrar os percentuais padrão das zonas (50%, 65% e 75%) ou o `contextWindowCeiling` padrão.
- Mudar a lista de permissão acima do teto crítico (RF18 do PRD-02).

## Assumptions and sources

- **Decisão do usuário (25/09/2026):** turnos deixam de bloquear; limites de turnos ficam opcionais e desligados por padrão; o uso no Claude Code vem de `usage` no transcript, com estimativa como reserva; o protocolo sem plano não manda parar.
- **Suposição:** `contextWindowCeiling` padrão de 128.000 tokens continua adequado como orçamento. Se o usuário preferir outro padrão, só muda o valor inicial, sem mudar requisitos.
- **Suposição:** respostas de subagente no transcript da sessão principal têm `isSidechain: true`. Se o Claude Code gravar subagentes em arquivos separados, o FR-04 continua valendo sem filtro extra.
- **Fonte do projeto:** [`zone-classifier.ts`](../../src/core/services/zone-classifier.ts), [`session-counters.ts`](../../src/core/services/session-counters.ts), [`usage-resolver.ts`](../../src/core/services/usage-resolver.ts), [`configuration.ts`](../../src/core/contracts/configuration.ts) e [`protocol-service.ts`](../../src/core/services/protocol-service.ts).
- **Evidência local:** transcript do Claude Code em `~/.claude*/projects/<projeto>/<sessão>.jsonl`, entradas `type: "assistant"` com `message.usage`, `message.model`, `isSidechain` e `requestId`; verificado em 25/09/2026, sem campo de janela.
- **Fontes externas:** [Claude Code hooks](https://code.claude.com/docs/en/hooks) (`transcript_path` na entrada comum) e [Status line](https://code.claude.com/docs/en/statusline) (`context_window` só no status line).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
