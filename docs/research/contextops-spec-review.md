# Especificação do ContextOps

> Cópia congelada de *Especificação do ContextOps* (LLMwiki, `wiki/conceitos/especificacao-do-contextops.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.
>
> A referência mantida sobre APIs de harness é [harness-integrations.md](./harness-integrations.md); a seção de hooks abaixo reflete a checagem de 12 de setembro de 2026.

O documento é uma especificação de requisitos de software para uma CLI chamada provisoriamente `contextops`, datada de 12 de setembro de 2026 e marcada como pronta para implementação. A ferramenta empacota os padrões de [checkpoint em disco](./disk-checkpoint-reset-loop.md) e de [telemetria com auto-parada](./telemetry-self-pacing.md) para os harnesses já instalados em um projeto. Ela detecta os agentes de terminal, instala hooks que injetam telemetria e cortam chamadas acima de um teto, grava o protocolo de zonas nos arquivos de instrução e gera os arquivos de plano e estado.[^contextops-spec]

É uma proposta: não há implementação, medição nem referência à documentação dos harnesses citados. A seção "Hooks nos harnesses" confere essas APIs na documentação oficial de cada ferramenta.

## Módulos

| Módulo | Comandos e requisitos | Responsabilidade |
| --- | --- | --- |
| Descoberta | `contextops init`, `contextops doctor` | Detectar Claude Code, Aider, Cursor ou Windsurf e OpenHands ou SWE-agent por arquivos de configuração e binários no `PATH`, com modo explícito `--harness`; relatar hooks instalados, limites e integridade dos arquivos de instrução |
| Hooks | FR-03 a FR-06 | Registrar hooks conforme a API de cada harness; anexar a cada saída de ferramenta um bloco com turnos, uso estimado de contexto, zona e ação; injetar sempre ou só a partir de um limiar; cancelar chamadas acima do teto crítico e devolver um prompt de emergência |
| Instruções | FR-07 e FR-08 | Criar ou atualizar `CLAUDE.md` e `AGENTS.md` com um bloco entre os marcadores `CONTEXTOPS:START` e `CONTEXTOPS:END`, embutido ou apontando para `docs/contextops-protocol.md` |
| Estado | `contextops plan init --task` | Gerar `task_plan.json` e `state_checkpoint.json` iniciais |

A tabela resume os requisitos funcionais da especificação.[^contextops-spec]

## Configuração e esquemas

O arquivo `contextops.config.json`, na raiz do repositório, lista os harnesses ativos e calibra a telemetria: injeção só a partir de 50% da janela, janela de 128 mil tokens, teto de 12 turnos e zonas até 50%, 65% e 75%. Também define os caminhos dos arquivos de estado, o commit automático e os arquivos de instrução que recebem o bloco.[^contextops-spec]

Os esquemas evoluem os do padrão de checkpoint. O plano ganha descrição por passo, artefatos produzidos, passo corrente e o status `FAILED`. O checkpoint agrupa o estado do git, com branch, último commit e árvore limpa, e a memória de trabalho, com restrições descobertas, decisões tomadas e itens bloqueados; o campo de mudanças incompatíveis do artigo original não aparece. O roteiro prevê validar os três arquivos com schemas Zod.[^contextops-spec]

O bloco injetado nas instruções repete as zonas do artigo de telemetria e o protocolo de boot do artigo de checkpoint. Na zona vermelha, o agente atualiza plano e checkpoint, comita com o prefixo `checkpoint:` se os testes passarem e termina a resposta com a marca textual `[REQUEST_SESSION_RESET]`.[^contextops-spec]

## Requisitos não funcionais e roteiro

- Hook com no máximo 15 ms de latência adicional.
- `contextops init` idempotente, sem duplicar blocos nem hooks.
- Telemetria textual, independente do provedor de modelo.
- Suporte a Linux, macOS e Windows, em PowerShell e Git Bash.
- Runtime de hook leve, em TypeScript compilado ou shell que chama o binário local.

O roteiro tem quatro sprints: núcleo e schemas; detecção de harnesses e gerenciador de instruções; runtime de hooks, com estimador de tokens por `tiktoken` ou heurística e lógica de zonas; e interface de linha de comando, com testes de idempotência e distribuição por npm.[^contextops-spec]

## O que muda em relação aos padrões

- **Tokens estimados, não medidos.** No artigo de telemetria, o host conta os tokens exatos informados pela API. A especificação instala hooks em harnesses de terceiros e estima o uso com tokenizador ou heurística, então as zonas passam a ser aproximações.[^contextops-spec]
- **Reinício fora do escopo.** O protocolo pede que "o usuário ou o runner" dê o `/new`. Nenhum requisito funcional especifica o runner que abre a sessão seguinte; o comando `contextops hook wrap` aparece só no roteiro. O loop do padrão de checkpoint continua dependendo de algo externo à ferramenta.[^contextops-spec]
- **Outro sinal de reinício.** O artigo de telemetria usa uma ferramenta `request_session_reset`, o de checkpoint um sinal `/checkpoint_ready`, e a especificação uma marca textual na resposta.

## Inconsistências e riscos para implementação

Os itens abaixo comparam partes da própria especificação entre si, com os padrões de origem e com a documentação dos harnesses; nenhum foi testado.

1. **Hook e protocolo discordam das zonas.** O pseudocódigo marca amarelo a partir de `yellow_max_percentage` (65%) e vermelho a partir de `red_critical_percentage` (75%). O protocolo injetado define amarelo a partir de 50% e vermelho acima de 65%. Entre 50% e 65%, o hook informa zona verde enquanto as instruções pedem pré-finalização; entre 65% e 75%, informa amarelo enquanto as instruções mandam parar. O teto crítico ainda aparece como 70% no FR-06.
2. **Turnos só entram no vermelho.** O pseudocódigo usa apenas o teto de 12 turnos, sem faixa amarela por turnos, enquanto o protocolo manda parar com 11. A lacuna do sétimo turno, herdada do artigo de telemetria, continua.
3. **A guilhotina bloqueia o que o modelo precisa para salvar.** O FR-06 cancela chamadas acima do teto e exige gravar o checkpoint, mas gravar arquivo e comitar também são chamadas de ferramenta. Falta a lista de chamadas permitidas nessa situação.
4. **O boot consome o orçamento de turnos.** O protocolo de boot lê dois arquivos, consulta o git e valida o passo anterior. Com teto de 12 turnos, parte relevante de cada sessão vai para essa inicialização.
5. **Latência de 15 ms.** Nos harnesses consultados, um hook de comando roda como processo separado a cada evento, e estimar os tokens do contexto a cada chamada soma custo. O Claude Code e o GitHub Copilot CLI também aceitam hooks HTTP, que enviam o evento a um endpoint já em execução em vez de iniciar um processo; o Codex executa hooks de comando e de ferramenta MCP.[^claude-code-hooks][^copilot-hooks][^codex-hooks] O limite precisa ser medido cedo em cada harness.
6. **Estado entre invocações.** O pseudocódigo incrementa `sessionState.currentTurn` em memória, mas cada hook de comando é um processo novo. A contagem de turnos precisa ser persistida fora do processo, por exemplo em arquivo indexado pelo identificador de sessão que os harnesses enviam no evento (`session_id` no Claude Code e no Codex, `conversation_id` no Cursor).[^claude-code-hooks][^codex-hooks][^cursor-hooks]
7. **Arquivos de instrução com link simbólico.** Em repositórios onde `AGENTS.md` aponta para `CLAUDE.md`, como esta wiki, a atualização dos dois arquivos precisa preservar o link.
8. **Formato do bloco.** Os campos de telemetria têm nomes diferentes no FR-04 e no pseudocódigo.

## Hooks nos harnesses

A especificação descreve os hooks com nomes genéricos (`post_tool_execution` e `pre_tool_execution`) e não documenta a API de nenhum harness. A tabela abaixo resume a documentação oficial consultada em 12 de setembro de 2026.

| Harness | Registro | Antes da ferramenta | Depois da ferramenta | Uso de contexto |
| --- | --- | --- | --- | --- |
| Claude Code[^claude-code-hooks][^claude-code-statusline] | Chave `hooks` em `.claude/settings.json`, `.claude/settings.local.json` ou `~/.claude/settings.json`, e também em plugins, skills e subagents | `PreToolUse` nega com `permissionDecision: "deny"` ou exit code 2 | `PostToolUse` acrescenta `additionalContext`; `updatedToolOutput` substitui a saída de qualquer ferramenta; `decision: "block"` só anexa um motivo à saída original | Não chega aos hooks; o status line recebe `context_window.used_percentage`; o hook recebe `transcript_path`, gravado de forma assíncrona |
| Codex CLI[^codex-hooks][^codex-commands] | `hooks.json` ou tabela `[hooks]` em `config.toml`, em `~/.codex` ou `<repo>/.codex`; ativos por padrão | `PreToolUse` nega com `permissionDecision: "deny"` ou exit code 2; cobre Bash, `apply_patch`, MCP e ferramentas locais, não ferramentas hospedadas como `WebSearch` | `PostToolUse` acrescenta `additionalContext` em JSON, e texto puro no stdout é ignorado; `decision: "block"` troca o resultado da ferramenta pelo feedback do hook | Não chega aos hooks; `/status` e o status line mostram a capacidade restante; o formato do transcript não é interface estável |
| Cursor[^cursor-hooks] | `.cursor/hooks.json` e `~/.cursor/hooks.json`, com eventos em camelCase | `preToolUse`, `beforeShellExecution`, `beforeMCPExecution` e `beforeReadFile` negam com `permission: "deny"` | `postToolUse` acrescenta `additional_context`; `updated_mcp_tool_output` substitui a saída só de ferramentas MCP | Só o `preCompact` recebe `context_usage_percent` e `context_window_size` |
| GitHub Copilot CLI[^copilot-hooks] | `.github/hooks/*.json` no repositório e `~/.copilot/hooks/` | `preToolUse` decide `allow`, `deny` ou `ask` em `permissionDecision` | `postToolUse` acrescenta `additionalContext`; `modifiedResult` substitui o resultado | Nenhum campo documentado |
| Windsurf (Cascade)[^windsurf-hooks] | `.windsurf/hooks.json`, além de arquivos de usuário e de sistema | Hooks `pre_*`, como `pre_run_command`, bloqueiam com exit code 2 | Hooks `post_*` rodam após a ação; a documentação não descreve injeção de contexto nem troca de saída | Nenhum campo documentado |
| OpenHands SDK[^openhands-hooks] | `HookConfig` em Python ou carregado de um dicionário | `PreToolUse` bloqueia com exit code 2 | `PostToolUse` não bloqueia; a página não diz se altera a observação ou injeta contexto | Nenhum campo documentado |
| Aider[^aider-options][^aider-commands] | Sem sistema de hooks na referência de opções; há `--lint-cmd`, `--test-cmd` e `--notifications-command` | Não há | Não há | O comando `/tokens` informa os tokens do contexto atual dentro do chat |

### O que isso muda na especificação

- **Registro (FR-03).** Nenhum dos harnesses consultados usa `post_tool_execution` ou `pre_tool_execution`. Claude Code, Codex e OpenHands usam `PreToolUse` e `PostToolUse`; Cursor e Copilot, `preToolUse` e `postToolUse`; o Windsurf separa por ação, como `pre_run_command`. O registro também não é por pasta: no Claude Code, um script em `.claude/hooks/` só roda quando referenciado na chave `hooks` de um arquivo de configuração, plugin, skill ou subagent.[^claude-code-hooks] Cada harness precisa de um adaptador próprio para evento, formato de entrada e formato de saída.
- **Aider.** A referência de opções não oferece hooks, e `--env-file` apenas indica o arquivo `.env` a carregar.[^aider-options] Não há ponto para anexar telemetria às saídas de ferramentas nem para bloquear chamadas; no Aider, o reset loop só funcionaria com um runner externo.
- **Injeção de telemetria (FR-04).** Não é preciso reescrever a saída da ferramenta. Claude Code, Codex, Cursor e Copilot aceitam contexto adicional depois da ferramenta, que pode carregar o bloco de telemetria sem tocar no resultado original.[^claude-code-hooks][^codex-hooks][^cursor-hooks][^copilot-hooks] No Codex, o bloco precisa sair em JSON, e o contexto adicional tem limite padrão de cerca de 2.500 tokens por hook.[^codex-hooks] O Windsurf não documenta esse caminho, e a documentação do OpenHands não o confirma.[^windsurf-hooks][^openhands-hooks]
- **Medição de tokens.** Nenhum hook pós-ferramenta recebe o uso de contexto. O Claude Code entrega essa informação ao status line, calculada a partir dos tokens de entrada da resposta mais recente da API; o Cursor só a envia ao `preCompact`; o Codex a mostra em `/status` e no status line.[^claude-code-statusline][^cursor-hooks][^codex-commands] Para estimar, o hook teria de ler o transcript, que o Claude Code grava de forma assíncrona e o Codex declara não ser uma interface estável.[^claude-code-hooks][^codex-hooks] Uma alternativa não documentada pelos harnesses seria o script de status line do Claude Code gravar a porcentagem em arquivo para o hook ler.
- **Guilhotina (FR-06).** O bloqueio antes da ferramenta existe em todos os harnesses com hooks, mas várias falhas deixam a ação seguir. No Claude Code, erros e saídas inválidas são não bloqueantes, e só o exit code 2 ou uma negação explícita bloqueiam.[^claude-code-hooks] No Cursor, falhas liberam a ação a menos que o hook declare `failClosed: true`.[^cursor-hooks] No Copilot, timeouts sempre liberam a chamada, inclusive no `preToolUse`.[^copilot-hooks] No Codex, ferramentas hospedadas não passam pelo hook.[^codex-hooks]
- **Reinício e boot.** Nenhum harness documenta um hook capaz de abrir uma sessão nova. O `SessionStart` do Claude Code e o do Codex aceitam a origem `clear` e acrescentam a saída do hook ao contexto do modelo; no Codex, `/new` e `/clear` iniciam um chat novo.[^claude-code-hooks][^codex-hooks][^codex-commands] Cursor e Copilot também aceitam contexto adicional no início da sessão.[^cursor-hooks][^copilot-hooks] Isso permite injetar o protocolo de boot e o resumo do checkpoint quando a sessão começa, em vez de manter o bloco permanentemente em `CLAUDE.md`.
- **Cobertura.** A especificação não inclui o Codex e cita o Copilot CLI no propósito, mas não na detecção. Os dois têm hooks compatíveis com o desenho da ferramenta.

## Relação com a wiki

A especificação é ela mesma um artefato de Spec-Driven Development para Agentes de Código, com requisitos numerados, esquemas de dados e divisão em sprints. As divergências acima são o tipo de problema que uma revisão da spec deve resolver antes da implementação.

A interrupção por hook aplica o princípio de impor pelo harness, e não apenas pedir ao modelo, que aparece na escada de verificação de Operação Segura e Eficiente do Claude Code. Embutir o protocolo em `CLAUDE.md` coloca cerca de 25 linhas em toda sessão, inclusive nas curtas. Apontar para `docs/contextops-protocol.md` ou injetar o protocolo pelo `SessionStart` segue o carregamento sob demanda de Arquitetura de Contexto para Agentes de IA e de Manual para Criar Skills de Agentes. A escolha entre compactar, reiniciar e delegar está em [Execução de Tarefas Longas com Agentes](./long-task-execution.md).

## Limites da fonte

A especificação não tem autor declarado nem implementação de referência, e o nome do pacote e os endereços de schema são sugestões do documento. Os limiares repetem os do artigo de telemetria, sem medição nova. A comparação de hooks reflete a documentação consultada em 12 de setembro de 2026; essas APIs mudam entre versões e devem ser conferidas de novo antes de cada adaptador ser implementado.

## Ver também

- [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md) — o padrão de zonas e guilhotina que a CLI instala.
- [Checkpoint em Disco e Sessões Efêmeras](./disk-checkpoint-reset-loop.md) — plano, estado e protocolo de boot que a CLI gera.
- [Execução de Tarefas Longas com Agentes](./long-task-execution.md) — quando compactar, reiniciar ou delegar.
- Spec-Driven Development para Agentes de Código — especificação, design e tarefas antes da implementação.

# Citations

[^contextops-spec]: [Especificação de Requisitos de Software (SRS): ContextOps CLI / Tooling](./contextops-srs-original.md).

[^claude-code-hooks]: [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks).

[^claude-code-statusline]: [Customize your status line — Claude Code Docs](https://code.claude.com/docs/en/statusline).

[^codex-hooks]: [Hooks — Codex, OpenAI](https://learn.chatgpt.com/docs/hooks).

[^codex-commands]: [Slash commands — Codex, OpenAI](https://learn.chatgpt.com/docs/developer-commands).

[^cursor-hooks]: [Hooks — Cursor Docs](https://cursor.com/docs/hooks).

[^copilot-hooks]: [GitHub Copilot hooks reference — GitHub Docs](https://docs.github.com/en/copilot/reference/hooks-reference).

[^windsurf-hooks]: [Cascade Hooks — Windsurf Docs](https://docs.windsurf.com/windsurf/cascade/hooks).

[^openhands-hooks]: [Hooks — OpenHands Docs](https://docs.openhands.dev/sdk/guides/hooks).

[^aider-options]: [Options reference — aider](https://aider.chat/docs/config/options.html).

[^aider-commands]: [In-chat commands — aider](https://aider.chat/docs/usage/commands.html).
