# Integrações com harnesses

Referência técnica para os adaptadores do ContextBrake. Resume a documentação oficial consultada em 12 e 13 de setembro de 2026. Antes de implementar ou alterar um adaptador, confira os links da seção do harness e atualize este arquivo quando o comportamento divergir. A matriz de níveis de suporte fica no [PRD de instalação](../../tasks/prd-01-instalacao-deteccao-diagnostico/prd.md); aqui ficam os detalhes de API.

Itens marcados como *não documentado* não apareceram nas páginas consultadas, o que não prova que não existam.

## Resumo por canal

| Harness | Registro | Bloqueio antes da ferramenta | Telemetria depois da ferramenta | Boot no início da sessão | Uso de contexto | Falha da integração |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | `hooks` em `.claude/settings.json` | `PreToolUse`: `permissionDecision: "deny"` ou exit 2 | `PostToolUse`: `additionalContext` ou `updatedToolOutput` | `SessionStart` (`clear`, `compact`): stdout | Só no status line | Libera, salvo exit 2 ou negação explícita |
| Codex CLI | `.codex/hooks.json` ou `[hooks]` em `.codex/config.toml` | `PreToolUse`: `permissionDecision: "deny"` ou exit 2 | `PostToolUse`: `additionalContext` em JSON | `SessionStart` (`clear`, `compact`): stdout ou `additionalContext` | Só em `/status` e no status line | *Não documentado* |
| Cursor | `.cursor/hooks.json` | `preToolUse` e hooks `before*`: `permission: "deny"` ou exit 2 | `postToolUse`: `additional_context` | `sessionStart`: `additional_context` | Só no `preCompact` | Libera, salvo `failClosed: true` |
| GitHub Copilot CLI | `.github/hooks/*.json` | `preToolUse`: `permissionDecision: "deny"` | `postToolUse`: `additionalContext` ou `modifiedResult` | `sessionStart`: `additionalContext` | *Não documentado* | Timeout sempre libera; falha de comando sem timeout nega |
| OpenCode | Plugin em `.opencode/plugins/` | `tool.execute.before` lança erro | `tool.execute.after`: `output.output`, com efeito incerto | *Não documentado* na página oficial | A confirmar | *Não documentado* |
| Pi | Extensão em `.pi/extensions/` | `tool_call`: `{ block: true }` | `tool_result`: `{ content }` | `before_agent_start`: `message` e `systemPrompt` | `ctx.getContextUsage()` | Erro em `tool_call` bloqueia |
| Oh-My-Pi | Hooks em `.omp/hooks/pre` e `.omp/hooks/post` | `tool_call`: `{ block: true }` | `tool_result`: `{ content }` | `before_agent_start` e evento `context` | `ctx.getContextUsage()` | Erro em `tool_call` propaga |
| Antigravity CLI | `hooks.json` em `.agents/` | `PreToolUse`: `decision: "deny"` | *Não documentado*; indireto por `PreInvocation` | Indireto por `PreInvocation` | *Não documentado* | *Não documentado* |

## Consequências para o desenho

- **Telemetria sem reescrever a saída:** Claude Code, Codex CLI, Cursor e GitHub Copilot CLI aceitam contexto separado depois da ferramenta. Pi e Oh-My-Pi alteram o `content` do resultado, então o bloco deve ser acrescentado sem apagar o original. No Antigravity CLI, o único canal documentado é injetar passos antes da chamada ao modelo. No OpenCode, o canal precisa ser validado.
- **Medição de uso:** só Pi e Oh-My-Pi expõem o uso de contexto à integração. No Claude Code o valor chega ao status line, e uma ponte não documentada seria o script de status line gravar a porcentagem em arquivo para o hook ler. No Cursor, o valor só chega antes da compactação. Nos demais, a estimativa depende do transcript, que o Claude Code grava de forma assíncrona e o Codex CLI não trata como interface estável.
- **Estado entre invocações:** nos harnesses com hook por processo, contagens precisam ser persistidas por identificador de sessão: `session_id` (Claude Code, Codex CLI), `conversation_id` (Cursor), `sessionId` (GitHub Copilot CLI) e `conversationId` (Antigravity CLI).
- **Guilhotina:** Claude Code e Cursor liberam a ação quando o hook falha, salvo negação explícita ou `failClosed`; o GitHub Copilot CLI sempre libera em timeout; o Codex CLI não passa ferramentas hospedadas pelos hooks.
- **Reinício:** nenhum hook documentado abre sessão nova, exceto em Pi e Oh-My-Pi (`ctx.newSession`). Comandos verificados: `/clear` no Claude Code; `/new` e `/clear` no Codex CLI; `/new`, com alias `/clear`, no OpenCode; `/new` no Pi.
- **Latência:** Claude Code, Codex CLI, Cursor, GitHub Copilot CLI e Antigravity CLI iniciam um processo por evento; Claude Code e GitHub Copilot CLI também aceitam hooks HTTP para um endpoint já em execução. OpenCode, Pi e Oh-My-Pi rodam a integração dentro do processo do harness.

## Claude Code

- **Registro:** chave `hooks` em `.claude/settings.json` (projeto, versionável), `.claude/settings.local.json` (local), `~/.claude/settings.json` (usuário), políticas gerenciadas, `hooks/hooks.json` de plugins e frontmatter de skills e subagents. A estrutura é evento, depois grupo com `matcher` (por exemplo, `"Bash"`), depois handlers com `type` e `command`, além de `if`, `timeout`, `async` e `statusMessage` opcionais. Um script em `.claude/hooks/` só roda quando referenciado nessa chave.
- **Execução:** handlers `command`, `http`, `mcp_tool`, `prompt` e `agent`. Todos os hooks que casam com o evento rodam em paralelo. O timeout padrão é de 600 s para `command`, `http` e `mcp_tool`.
- **Entrada comum:** `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `prompt_id` e `effort`; `agent_id` e `agent_type` dentro de subagents. Nenhum campo de uso de tokens ou de janela.
- **Antes da ferramenta:** `PreToolUse` decide com `hookSpecificOutput.permissionDecision`: `allow` libera sem pedir permissão e ignora o fluxo normal de permissões, `deny` nega e mostra `permissionDecisionReason` ao modelo, `ask` pede confirmação e `defer` equivale a não decidir. Exit code 2 com o motivo no stderr também nega. Exit 0 sem saída não decide e mantém o fluxo normal.
- **Formato da resposta:** `hookSpecificOutput` exige `hookEventName` igual ao evento que disparou. Na versão 2.1.270, uma resposta sem esse campo gera o erro não bloqueante "Hook JSON output validation failed — hookSpecificOutput is missing required field \"hookEventName\"", e o hook é ignorado.
- **Depois da ferramenta:** `PostToolUse` recebe `tool_output`. A resposta aceita `additionalContext`, texto mostrado ao modelo ao lado do resultado; `updatedToolOutput`, que substitui o que o modelo vê em qualquer ferramenta, com `type` `text`, `error` ou `file`; e `updatedMCPToolOutput`, só para MCP. `decision: "block"` apenas anexa o motivo, e o modelo continua vendo a saída original. A ferramenta já executou quando o hook roda. `PostToolBatch` recebe o lote de chamadas paralelas antes da próxima chamada ao modelo.
- **Início da sessão:** `SessionStart` com matcher `startup`, `resume`, `clear`, `compact` ou `fork`. Texto puro no stdout, com exit 0, entra no contexto.
- **Fim de resposta:** `Stop` pode impedir a parada e continuar a conversa.
- **Compactação:** `PreCompact` e `PostCompact`, com matcher `manual` ou `auto`.
- **Uso de contexto:** só o comando de status line recebe `context_window`, com `used_percentage`, `remaining_percentage`, `total_input_tokens`, `context_window_size` e `current_usage`. A porcentagem considera apenas tokens de entrada da resposta mais recente da API e é nula antes da primeira chamada e logo após `/compact`.
- **Transcript:** gravado de forma assíncrona; pode não conter as mensagens mais recentes do turno quando o hook dispara.
- **Falhas:** exit code diferente de 2, JSON inválido ou resposta fora do schema geram erro não bloqueante, e a ação segue.
- **Reinício:** `/clear` dispara `SessionStart` com origem `clear`. Nenhum hook documentado abre sessão nova.
- **Instruções:** o Claude Code lê `CLAUDE.md`, não `AGENTS.md`; um `CLAUDE.md` com `@AGENTS.md` importa o arquivo compartilhado. Comentários HTML em bloco são removidos antes da injeção.
- **Fontes:** [Hooks reference](https://code.claude.com/docs/en/hooks), [Status line](https://code.claude.com/docs/en/statusline) e [Memory](https://code.claude.com/docs/en/memory).

## Codex CLI

- **Registro:** `hooks.json` ou tabela `[hooks]` em `config.toml`, em `~/.codex/` ou `<repo>/.codex/`. Hooks ficam ativos por padrão; `[features] hooks = false` desativa, e a chave antiga `codex_hooks` ainda funciona. Hooks gerenciados podem vir de `requirements.toml`.
- **Execução:** só handlers `command` e `mcp_tool` executam; `prompt` e `agent` são lidos e ignorados. O timeout padrão é de 600 s, e cada sessão roda até oito hooks em segundo plano ao mesmo tempo.
- **Entrada comum:** `session_id`, `transcript_path` (pode ser nulo), `cwd`, `hook_event_name` e `model`; `turn_id` e `permission_mode` em eventos de turno. Nenhum campo de uso de tokens.
- **Eventos:** `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, `Stop` e `Interrupt`.
- **Cobertura de ferramentas:** Bash, `apply_patch` (matcher `apply_patch`, `Edit` ou `Write`), ferramentas MCP (`mcp__servidor__ferramenta`) e demais ferramentas locais. Ferramentas hospedadas, como `WebSearch`, não passam por `PreToolUse` nem `PostToolUse`.
- **Antes da ferramenta:** `hookSpecificOutput.permissionDecision: "deny"` com `permissionDecisionReason`, ou exit code 2. A forma antiga `{"decision": "block", "reason": "..."}` também é aceita, e `updatedInput` com `permissionDecision: "allow"` reescreve a entrada. Exit 0 sem saída conta como sucesso, e a Codex continua.
- **Formato da resposta:** em `PreToolUse`, `PostToolUse` e `SessionStart`, `hookSpecificOutput` exige `hookEventName` com o nome do evento.
- **Depois da ferramenta:** `PostToolUse` recebe `tool_response`. Texto puro no stdout é ignorado. JSON com `hookSpecificOutput.additionalContext` entra como contexto de desenvolvedor. `decision: "block"` com `reason`, ou exit 2 com stderr, substitui o resultado da ferramenta pelo feedback e continua o modelo a partir dele. `additionalContextLimit` ajusta o limite do contexto adicional por hook, com padrão de cerca de 2.500 tokens.
- **Início da sessão:** `SessionStart` com origem `startup`, `resume`, `clear` ou `compact`; texto puro no stdout ou `additionalContext` entram como contexto de desenvolvedor.
- **Fim de resposta:** `Stop` com `decision: "block"` e `reason` continua o turno com um novo prompt de continuação.
- **Compactação:** `PreCompact` e `PostCompact`, com matcher `manual` ou `auto`; `continue: false` interrompe o processamento.
- **Uso de contexto:** `/status` mostra uso de tokens e capacidade restante, e `/statusline` configura itens de contexto no rodapé. Nada disso chega aos hooks, e o formato do transcript não é interface estável.
- **Falhas:** o comportamento em erro ou timeout não é descrito na página consultada.
- **Reinício:** `/new` inicia um chat novo na mesma sessão da CLI; `/clear` limpa o terminal e inicia chat novo; `/compact` resume o chat.
- **Fontes:** [Hooks](https://learn.chatgpt.com/docs/hooks) e [Slash commands](https://learn.chatgpt.com/docs/developer-commands).

## Cursor

- **Registro:** `.cursor/hooks.json` no projeto e `~/.cursor/hooks.json` do usuário, além de arquivos de equipe e corporativos. Formato `{"version": 1, "hooks": {"<evento>": [{"command": "..."}]}}`, com `matcher`, `timeout`, `failClosed` e `loop_limit` opcionais.
- **Execução:** processo por evento, com JSON por stdin e stdout. Exit 0 é sucesso, exit 2 nega e outros códigos liberam a ação.
- **Entrada comum:** `conversation_id`, `generation_id`, `model`, `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email` e `transcript_path`, nulo quando transcripts estão desativados.
- **Eventos do agente:** `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse` e `afterAgentThought`.
- **Antes da ferramenta:** `preToolUse`, `beforeShellExecution`, `beforeMCPExecution` e `beforeReadFile` decidem com `permission`, com `user_message` e `agent_message` opcionais; `preToolUse` também aceita `updated_input`. Em `preToolUse`, `permission` é obrigatório: `allow` libera e `deny` nega; `ask` passa no schema, mas ainda não é aplicado nesse evento. Por isso, um hook neutro precisa responder `allow`.
- **Depois da ferramenta:** `postToolUse` aceita `additional_context`, injetado depois do resultado, e `updated_mcp_tool_output`, que substitui a saída só de ferramentas MCP. `afterShellExecution`, `afterMCPExecution` e `afterFileEdit` apenas observam.
- **Início da sessão:** `sessionStart` aceita `additional_context`, acrescentado ao contexto inicial do sistema, e `env`; o loop do agente não espera a resposta desse hook.
- **Fim de resposta:** `stop` aceita `followup_message`, enviado como próxima mensagem do usuário e limitado por `loop_limit`, com padrão 5.
- **Uso de contexto:** só `preCompact` recebe `context_usage_percent`, `context_tokens` e `context_window_size`.
- **Falhas:** por padrão, crash, timeout e exit code diferente de 0 e 2 liberam a ação, e a Cursor registra a falha. `failClosed: true` bloqueia nesses casos e também quando o hook não escreve nada. Hooks de permissão bloqueiam com JSON inválido ou resposta fora do schema mesmo sem `failClosed`.
- **CLI e nuvem:** agentes em nuvem executam só hooks de comando do projeto. A página diz que `workspaceOpen` roda no app e na CLI, sem detalhar a cobertura dos demais eventos na CLI, e há relato no fórum de que a ferramenta AskQuestion não dispara `preToolUse` nem `postToolUse` na CLI.
- **Pendências:** se o `additional_context` do `sessionStart` chega antes da primeira chamada ao modelo; cobertura de eventos na CLI; comando de nova sessão.
- **Fontes:** [Hooks](https://cursor.com/docs/hooks) e [relato sobre hooks na Cursor CLI](https://forum.cursor.com/t/cursor-cli-askquestion-tool-skips-pretooluse-and-posttooluse-hooks/161836).

## GitHub Copilot CLI

- **Registro:** `.github/hooks/*.json` no repositório, `~/.copilot/hooks/` do usuário, blocos `hooks` em `.github/copilot/settings.json` e `~/.copilot/settings.json`, políticas e plugins. Formato `{"version": 1, "hooks": {...}}`.
- **Execução:** hooks de comando em todos os eventos e hooks HTTP em arquivos de configuração. O timeout padrão é de 30 s, e a saída é limitada a 10 MiB por invocação.
- **Eventos:** `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `userPromptTransformed`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `permissionRequest`, `preCompact`, `subagentStart`, `subagentStop`, `agentStop`, `errorOccurred` e `notification`.
- **Entrada:** `sessionId`, `timestamp` em milissegundos, `cwd`, `toolName` e `toolArgs`; `postToolUse` também recebe `toolResult`. Nenhum campo de uso de tokens.
- **Antes da ferramenta:** `preToolUse` decide `permissionDecision` entre `allow`, `deny` e `ask`; `permissionDecisionReason` é obrigatório com `deny`. Os campos são opcionais: saída vazia mantém o comportamento padrão, enquanto `allow` pula o fluxo normal de permissões.
- **Depois da ferramenta:** `postToolUse` aceita `additionalContext` e `modifiedResult`, que substitui o resultado da ferramenta e exige `resultType: "success"`; `modifiedResult` é respeitado por hooks de comando e HTTP. `{}` ou saída vazia mantêm o resultado original.
- **Início da sessão:** `sessionStart` aceita `additionalContext`.
- **Falhas e limites:** timeouts sempre liberam a ação, inclusive em `preToolUse` e em hooks de política. Erros de execução de comando sem timeout (como saída com código de erro ou processo falho) negam a chamada de ferramenta. Depois de oito continuações de bloqueio seguidas, a CLI encerra o turno.
- **Pendências:** comando de nova sessão.
- **Fontes:** [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) e [Using hooks with GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks).

## OpenCode

- **Registro:** plugins TypeScript ou JavaScript em `.opencode/plugins/` e `~/.config/opencode/plugins/`, ou pacotes npm listados em `plugin` no `opencode.json` do projeto ou global.
- **Execução:** dentro do processo do OpenCode.
- **Eventos:** `tool.execute.before`, `tool.execute.after`, `session.created`, `session.compacted`, `session.idle`, `session.updated`, `session.error`, `message.updated`, `message.part.updated`, `command.executed`, `file.edited`, `permission.asked`, `permission.replied`, `shell.env` e `experimental.session.compacting`, entre outros.
- **Antes da ferramenta:** lançar um erro em `tool.execute.before` impede a execução.
- **Depois da ferramenta:** `tool.execute.after` expõe `output.title`, `output.output` e `output.metadata`. A issue #13574, fechada sem correção, relata que alterações em `output.output` são ignoradas na interface; o efeito no contexto do modelo não foi confirmado.
- **Início da sessão:** não aparece na página oficial consultada. Guias da comunidade citam `experimental.chat.system.transform` para acrescentar texto ao prompt de sistema.
- **Uso de contexto:** o OpenCode registra tokens por sessão (entrada, saída, raciocínio e cache); falta confirmar como um plugin lê esses valores.
- **Reinício:** `/new`, com alias `/clear`, inicia sessão nova; `/compact`, com alias `/summarize`, compacta.
- **Pendências:** efeito de `tool.execute.after` no modelo; hook estável de injeção de contexto; leitura de tokens pelo plugin; comportamento quando um plugin falha fora de `tool.execute.before`.
- **Fontes:** [Plugins](https://opencode.ai/docs/plugins/), [TUI](https://opencode.ai/docs/tui/) e [issue #13574](https://github.com/anomalyco/opencode/issues/13574).

## Pi

- **Registro:** extensões em `.pi/extensions/*.ts` ou `.pi/extensions/*/index.ts` no projeto e em `~/.pi/agent/extensions/`; caminhos extras em `extensions` no `settings.json`.
- **Execução:** dentro do processo do Pi, com permissões completas. Handlers se inscrevem com `pi.on(evento, handler)`.
- **Eventos:** `session_start`, `session_before_switch`, `session_before_fork`, `session_shutdown`, `session_before_compact`, `session_compact`, `before_agent_start`, `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_call`, `tool_result`, `tool_execution_start`, `tool_execution_end`, `context`, `input`, `before_provider_request` e `after_provider_response`, entre outros.
- **Antes da ferramenta:** `tool_call` retorna `{ block: true, reason?, terminate? }`.
- **Depois da ferramenta:** `tool_result` retorna `{ content, details, isError, usage }`; campos omitidos mantêm o valor atual, e os handlers se encadeiam como middleware.
- **Início da sessão:** `before_agent_start` pode retornar `message` e `systemPrompt`; `pi.sendMessage` injeta mensagens com os modos de entrega `steer`, `followUp` e `nextTurn`.
- **Uso de contexto:** `ctx.getContextUsage()` retorna o uso de contexto do modelo ativo.
- **Reinício:** `ctx.newSession({ withSession })`, `ctx.fork(entryId)` e `ctx.switchSession(sessionPath)`; comandos `/new` e `/compact`.
- **Falhas:** o documento de hooks descreve que um erro em handler de `tool_call` bloqueia a ferramenta e que os demais eventos têm timeout padrão de 30 s, com erros registrados sem bloquear.
- **Fontes:** [extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) e [hooks.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/hooks.md).

## Oh-My-Pi

- **Registro:** hooks em `.omp/hooks/pre/*.{ts,js}` e `.omp/hooks/post/*.{ts,js}` no projeto e em `~/.omp/agent/hooks/pre` e `post` do usuário. Arquivos colocados direto em `hooks/`, fora de `pre/` ou `post/`, não são carregados e não geram erro. A API de hooks é legada; a documentação recomenda a API de extensões, cujas regras de carregamento estão em `extension-loading.md`.
- **Execução:** dentro do processo.
- **Eventos:** eventos de sessão (`session_start`, `session_before_compact`, `session_compact`, `session_shutdown` e outros), `context`, `before_agent_start`, `agent_start`, `agent_end`, `turn_start`, `turn_end`, `auto_compaction_start`, `auto_compaction_end`, `tool_call` e `tool_result`; a API de extensões acrescenta `session_stop`, `tool_approval_requested` e outros.
- **Antes da ferramenta:** `tool_call` retorna `{ block: true, reason }`, ou `input` para reescrever os argumentos. Erros em handlers de `tool_call` propagam para quem chamou.
- **Depois da ferramenta:** `tool_result` pode substituir `content`, `details` e `isError`, em cadeia.
- **Contexto:** `before_agent_start` retorna mensagem customizada; o evento `context` pode filtrar ou transformar as mensagens enviadas ao modelo; `pi.sendMessage`, `pi.sendUserMessage` e `pi.appendEntry` injetam conteúdo.
- **Uso de contexto:** `ctx.getContextUsage()`.
- **Reinício:** `ctx.newSession(...)` em contexto de comando.
- **Falhas:** erros de handlers dos demais eventos viram `HookError`, e a execução continua.
- **Pendências:** caminhos de carregamento de extensões; comandos de nova sessão.
- **Fontes:** [hooks.md](https://github.com/can1357/oh-my-pi/blob/main/docs/hooks.md) e [extensions.md](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md).

## Antigravity CLI

- **Registro:** `hooks.json` no diretório de customização: `.agents/` no workspace ou `~/.gemini/config/`. A documentação descreve os hooks do Antigravity 2.0, e a página da CLI não detalha a cobertura; há guia da comunidade sobre hooks na CLI.
- **Execução:** comando por evento, com JSON por stdin e stdout e `timeout` opcional, padrão de 30 s.
- **Entrada comum:** `conversationId`, `workspacePaths`, `transcriptPath`, `artifactDirectoryPath` e `modelName`. Nenhum campo de uso de tokens.
- **Eventos:** `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation` e `Stop`.
- **Antes da ferramenta:** `PreToolUse` exige `decision` entre `allow`, `deny`, `ask`, `force_ask` e `deny_unless_prior_grant`, com `reason` e `permissionOverrides` opcionais; `allow` libera a ferramenta automaticamente. A documentação não descreve o que acontece com saída vazia ou `{}`.
- **Depois da ferramenta:** `PostToolUse` retorna objeto vazio; não há alteração de saída nem contexto adicional documentados.
- **Antes e depois do modelo:** `PreInvocation` recebe `invocationNum` e `initialNumSteps` e pode retornar `injectSteps`, inseridos antes da chamada ao modelo. `PostInvocation` aceita `injectSteps` e `terminationBehavior` (`force_continue` ou `terminate`).
- **Fim:** `Stop` recebe `terminationReason` e `fullyIdle`; `decision: "continue"` impede a parada e injeta `reason` como mensagem de sistema.
- **Pendências:** comportamento em falha e timeout; cobertura dos hooks na CLI; comando de nova sessão; formato de `injectSteps`.
- **Fontes:** [Hooks](https://antigravity.google/docs/hooks/), [CLI overview](https://antigravity.google/docs/cli/overview/) e [guia de hooks na Antigravity CLI](https://medium.com/google-cloud/a-developers-guide-to-agent-hooks-in-antigravity-cli-4c1440febd11).

## Fora do MVP

- **Aider:** a referência de opções não oferece hooks. `--env-file` só indica o arquivo `.env` a carregar; existem `--lint-cmd`, `--test-cmd`, `--auto-test` e `--notifications-command`. No chat, `/tokens` informa os tokens do contexto atual, `/clear` limpa o histórico e `/reset` também remove os arquivos da conversa. Fontes: [Options](https://aider.chat/docs/config/options.html) e [In-chat commands](https://aider.chat/docs/usage/commands.html).
- **Windsurf (Cascade):** hooks em `.windsurf/hooks.json`; `pre_read_code`, `pre_write_code`, `pre_run_command`, `pre_mcp_tool_use` e `pre_user_prompt` bloqueiam com exit code 2; os hooks `post_*` rodam depois da ação, sem injeção de contexto documentada. Fonte: [Cascade Hooks](https://docs.windsurf.com/windsurf/cascade/hooks).
- **OpenHands SDK:** hooks configurados com `HookConfig` em Python; `PreToolUse`, `UserPromptSubmit` e `Stop` bloqueiam com exit code 2; `PostToolUse`, `SessionStart` e `SessionEnd` não bloqueiam, e a página não diz se `PostToolUse` altera a observação. Fonte: [Hooks](https://docs.openhands.dev/sdk/guides/hooks).
