# PRD 2.2 — Janela de contexto real no Claude Code

## Problem and context

O [PRD 2.1](../prd-02.1-freio-por-uso-medido/prd.md) passou a medir o uso de contexto do Claude Code pelo `message.usage` do transcript, mas o transcript não grava o tamanho da janela. Pelo FR-07 daquele PRD, a janela passa então a ser `contextWindowCeiling`, 128.000 tokens por padrão. No Claude Code, portanto, todo percentual é calculado sobre esse orçamento, e não sobre a janela do modelo ativo:

- **Janela de 1M.** Opus 4.7 e posteriores, Sonnet 5 e os modelos Fable rodam com 1.000.000 de tokens na API da Anthropic. A sessão chega a `RED` com cerca de 83.000 tokens e a `CRITICAL` com 96.000, menos de 10% da janela real. Quem quer sessões longas precisa descobrir e ajustar `contextWindowCeiling` à mão.
- **Bloco enganoso.** `tokens=<used>/<window>` mostra `128000` como janela e `source=measured`, e o agente lê o percentual como se fosse da janela real.
- **Troca de modelo.** Um valor fixo na configuração não acompanha `/model` nem modelos diferentes entre sessões.

O Claude Code documenta o tamanho da janela só no JSON que envia ao comando de status line: `context_window.context_window_size` (200.000, ou 1.000.000 em modelos com contexto estendido), com `used_percentage`, `total_input_tokens` e `current_usage`, calculados sobre os mesmos três campos de entrada que o PRD 2.1 soma. Os hooks não recebem esse dado. Só o `SessionStart` pode receber `model`, e a documentação diz que ele nem sempre vem.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Percentuais calculados sobre a janela real no Claude Code | Com a ponte ativa, 100% dos blocos emitidos depois da primeira execução da status line na sessão mostram como janela o `context_window_size` mais recente dessa sessão. |
| OBJ-02 | Status line do usuário intacta | A saída exibida é byte a byte igual à do comando do usuário, ou vazia quando não há comando, em 100% dos cenários de fixture, inclusive quando a ponte falha. |
| OBJ-03 | Sem regressão para quem não liga a ponte | Sem a ponte, os critérios do PRD 2.1 continuam passando sem alteração. |
| OBJ-04 | Overhead mantido | Sem a ponte, o p95 por chamada de hook no Claude Code continua em até 100 ms. Com 200 linhas `statusline` no ledger, fica em até 120 ms. A ponte acrescenta ao tempo da status line do usuário no máximo 50 ms além de uma inicialização do Node (revisado em 26/09/2026, DEC-HIL-05). |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Desenvolvedor com modelo de 1M | Ter as zonas calculadas sobre a janela do modelo | Sessões longas sem ajustar `contextWindowCeiling` | Com Opus 5.5, o bloco mostra `tokens=…/1000000` e a zona `RED` começa em 650.000 tokens. |
| US-02 | Desenvolvedor que já tem status line | Ligar a ponte sem perder a status line que usa | Continuar vendo as mesmas informações | Depois do `init`, a status line mostra exatamente o que mostrava antes. |
| US-03 | Desenvolvedor que troca de modelo | Ver a janela acompanhar o modelo | Percentuais corretos após `/model` | Ao trocar de um modelo de 200.000 para um de 1M, a janela do bloco muda depois da próxima resposta do assistente. |
| US-04 | Mantenedor que diagnostica a instalação | Saber de onde vem a janela e por que a ponte não atua | Corrigir a configuração sem ler código | O `doctor` informa a origem da janela e aponta quando a ponte deixou de estar no `statusLine` local, quando o script sumiu ou quando a status line anterior mudou. |
| US-05 | Desenvolvedor que desinstala | Voltar à configuração anterior | Nenhum resíduo da ponte | A remoção restaura o `statusLine` local anterior, ou remove a chave quando ela não existia. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Instalar a ponte de status line do Claude Code só por opção explícita no `init` (`--statusline-bridge`), gravando `statusLine` em `.claude/settings.local.json`, o escopo local e não versionado, com o caminho absoluto do script da ponte. A opção vale para quem a executou; o `.claude/settings.json` versionado não muda. | Sem a opção, o `init` não cria nem altera `statusLine`. Com ela, o `statusLine` local aponta para a ponte com caminho absoluto em barras normais, e `--dry-run` mostra a mudança sem gravá-la. Um `init` posterior sem a opção mantém a ponte instalada. |
| FR-02 | Preservar a status line do usuário: a ponte executa o comando que estava efetivo antes da instalação, na ordem local, projeto e usuário, com o mesmo stdin, e devolve a saída dele sem alteração. Sem comando anterior, não imprime nada. | Com um comando anterior em qualquer um dos três escopos, a saída exibida é igual byte a byte à dele, incluindo várias linhas e sequências ANSI. Sem comando anterior, a saída é vazia. O código de saída, o `padding` e o `refreshInterval` anteriores são mantidos. |
| FR-03 | Registrar, a cada execução da ponte, os dados de contexto da sessão principal no estado local de runtime: `context_window_size`, `total_input_tokens`, `used_percentage`, `model.id` e o instante da leitura, chaveados pelo `session_id`. | Depois de uma execução com o JSON de exemplo da documentação, o estado da sessão contém esses cinco valores. Campos nulos ou ausentes não sobrescrevem valores válidos anteriores. |
| FR-04 | Usar como janela o `context_window_size` registrado pela ponte para a mesma sessão, como valor que o harness informa no sentido do FR-07 do PRD 2.1. Sem registro válido, a janela continua sendo `contextWindowCeiling`. | Com registro de 1.000.000 e uso medido de 200.000, o bloco mostra `usage=20%` e `tokens=200000/1000000`. Sem registro, sessão diferente ou registro ilegível, o bloco mostra a janela `contextWindowCeiling`, como no PRD 2.1. |
| FR-05 | Usar o `total_input_tokens` da ponte como uso medido quando a leitura do transcript do PRD 2.1 não produzir valor e o registro for posterior ao último reinício da sessão. | Com transcript ausente e registro posterior ao reinício, o bloco mostra `source=measured` com o valor da ponte. Com o registro anterior ao reinício, o bloco é estimado, conforme o FR-05 do PRD 2.1. |
| FR-06 | Após nova sessão, `/clear` ou compactação (FR-06 do PRD 2.1), manter a janela registrada e descartar o uso registrado antes do reinício. | Depois de uma compactação, a janela do bloco continua sendo a registrada, e o uso vem da primeira leitura posterior ao reinício. |
| FR-07 | Mostrar no `doctor` o estado da ponte e a origem da janela. | O `doctor` e o `doctor --json` informam se a ponte está instalada e efetiva, a origem da janela (`statusline` ou `contextWindowCeiling`) e a última janela registrada. Geram aviso com remediação quando o `statusLine` local já não aponta para a ponte, quando o script da ponte não existe no caminho gravado, quando a status line anterior dos escopos de projeto ou de usuário mudou desde a instalação e quando `.claude/settings.local.json` não é ignorado pelo Git. |
| FR-08 | Remover a ponte na desinstalação ou com `init --no-statusline-bridge`, restaurando o `statusLine` local anterior. | Depois da remoção, o `.claude/settings.local.json` fica igual ao anterior à instalação nessa chave, nenhuma outra chave é alterada, e o arquivo é apagado quando a ponte o criou e ele ficou sem outras chaves. |
| FR-09 | Atualizar a documentação. | O README descreve a opção, o efeito sobre as zonas em modelos de 1M e o limite do modo não interativo. A seção do Claude Code em `docs/research/harness-integrations.md` registra os campos de `context_window`, os gatilhos de atualização da status line e a data da verificação. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Desempenho | Sem a ponte, o p95 por chamada de hook continua em até 100 ms (NFR-01 do PRD 2.1). Com 200 linhas `statusline` no ledger, o p95 fica em até 120 ms. A ponte acrescenta ao tempo do comando do usuário, medido no p95 com o estado de runtime existente, no máximo 50 ms além do p95 de um `node -e` vazio na mesma máquina, porque roda como um segundo processo Node no pipeline. Revisado em 26/09/2026 (DEC-HIL-05): no CI de macOS e Windows, só a inicialização do Node leva de 42 a 85 ms. |
| NFR-02 | Resiliência | JSON inválido, campos ausentes, estado ilegível ou falha de escrita não alteram a saída da status line do usuário nem fazem o hook falhar. Falhas de leitura ou escrita do estado vão para o log local de erros de runtime. |
| NFR-03 | Privacidade | A ponte grava só os cinco valores do FR-03 e o instante da leitura. Custos, caminhos, nome do workspace, conteúdo de mensagens e a saída do comando do usuário nunca entram em ledger, log ou saída própria. |
| NFR-04 | Compatibilidade | A configuração continua em `schemaVersion: 1`, os schemas publicados só recebem campos opcionais, o formato do bloco de telemetria não muda e nenhuma dependência de runtime é adicionada. |
| NFR-05 | Portões de qualidade | `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage` com pelo menos 80%, `schemas:check` e `package:smoke` passam. |
| NFR-06 | Plataformas | Os critérios passam em Linux, macOS e Windows (PowerShell e Git Bash), inclusive com comando anterior que contenha espaços, aspas ou caminho com acentos. |

## User experience

- **`init`:** sem a opção, nada muda na status line. Com ela, a saída do `init` informa que a status line anterior foi preservada, ou que nenhuma havia.
- **Bloco de telemetria:** mesmo formato; só a janela e o percentual passam a refletir o modelo ativo.
- **`doctor`:** uma linha por verificação: ponte instalada, ponte efetiva, origem da janela e, quando houver, o aviso de sobreposição pelo escopo local.
- **Status line:** o usuário vê exatamente o que via antes. Instalar uma status line vazia faz o Claude Code esconder a maior parte das dicas do rodapé; por isso a ponte é opcional e o README avisa esse efeito.

## Constraints and dependencies

- **Precedência:** complementa o FR-07 do PRD 2.1 ao fazer o Claude Code informar a janela, e o FR-05 dele ao acrescentar uma segunda fonte medida. Os demais requisitos do PRD 2.1 continuam valendo.
- **Harness:** a status line roda só em sessões interativas. Ela executa ao iniciar ou retomar a sessão, a cada nova mensagem do assistente e ao fim de `/compact`, com debounce de 300 ms, e o Claude Code cancela a execução em curso quando chega nova atualização. A janela pode chegar com uma resposta de atraso, e sessões `claude -p`, inclusive as do `context-brake run`, continuam com `contextWindowCeiling`.
- **Escopos de configuração:** a ponte é gravada no escopo local (`.claude/settings.local.json`), que tem precedência sobre projeto e usuário, então ela vale mesmo com uma status line versionada no projeto. O `statusLine` do projeto não aceita caminho absoluto, porque o arquivo é versionado, e um caminho relativo quebra quando o Claude Code é aberto numa subpasta. O ContextBrake lê `~/.claude/settings.json` para encontrar a status line anterior e não altera arquivos fora do repositório. Configurações gerenciadas pela organização e `disableAllHooks` podem desativar a ponte e ficam fora da verificação do `doctor`.
- **Numeração:** a pasta segue o precedente dos PRDs 1.1 e 2.1 para revisões de um PRD já implementado.
- **Plataformas e distribuição:** Node.js 20 ou superior, pacote npm `context-brake` e as mesmas plataformas do PRD-01.

## Out of scope

- Derivar a janela pelo nome do modelo, pelo sufixo `[1m]` ou por tabela de modelos. Os modelos atuais de 1M rodam sem o sufixo, e uma tabela envelhece a cada lançamento.
- Usar o hook `PreCompact`: a documentação não descreve campos de janela nele, e ele só dispara na compactação.
- Um orçamento menor que a janela informada. Com a ponte, `contextWindowCeiling` deixa de limitar a sessão no Claude Code, como já acontece nos harnesses que informam a janela.
- Status line própria do ContextBrake, com zona ou uso exibidos no rodapé.
- Pontes equivalentes em outros harnesses.
- Alterar o formato do bloco de telemetria ou os percentuais padrão das zonas.

## Assumptions and sources

- **Decisão do usuário (25/09/2026):** obter o tamanho correto da janela no Claude Code e registrar a mudança como PRD.
- **Decisão do usuário (25/09/2026):** a ponte é opcional no `init`, porque instalar um `statusLine` muda o rodapé do Claude Code.
- **Decisão do usuário (25/09/2026):** a ponte fica no escopo local, `.claude/settings.local.json`, com caminho absoluto; revisa FR-01, FR-02, FR-07, FR-08, US-04 e US-05, antes escritos para o escopo de projeto.
- **Decisão do usuário (25/09/2026):** com a ponte, a janela informada define os percentuais, e `contextWindowCeiling` deixa de limitar a sessão no Claude Code; um orçamento abaixo da janela fica fora do escopo.
- **Suposição:** o `session_id` recebido pela status line é o mesmo recebido pelos hooks da sessão principal. Se divergir, o FR-04 não encontra o registro e a janela volta a `contextWindowCeiling`, sem erro.
- **Suposição:** `context_window_size` já vem preenchido na primeira execução da status line, antes da primeira chamada à API. Se vier nulo, a janela passa a valer a partir da primeira resposta do assistente.
- **Fonte do projeto:** [`usage-resolver.ts`](../../src/core/services/usage-resolver.ts) (a janela medida vence `contextWindowCeiling`), [`runtime.ts`](../../src/infrastructure/harnesses/claude-code/runtime.ts) (`contextWindow: null` no Claude Code), [`planner.ts`](../../src/infrastructure/harnesses/claude-code/planner.ts) (entradas gerenciadas em `.claude/settings.json`) e [`harness-integrations.md`](../../docs/research/harness-integrations.md#claude-code).
- **Fontes externas, verificadas em 25/09/2026:** [Status line](https://code.claude.com/docs/en/statusline) (campos de `context_window`, `session_id`, gatilhos de atualização, debounce e efeito sobre o rodapé); [Hooks](https://code.claude.com/docs/en/hooks) (campos comuns e `model` só no `SessionStart`, nem sempre presente); [Model configuration](https://code.claude.com/docs/en/model-config) (modelos de 1M e sufixo `[1m]` removido antes do envio ao provedor).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
