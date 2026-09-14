# PRD 1.1 — Pendências de instalação, detecção e diagnóstico

## Problem and context

O [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md) está implementado, e o CA-20 foi verificado na matriz de CI. Ainda assim, restam pendências que precisam ser resolvidas antes do [PRD de telemetria, zonas e freio](../prd-02-telemetria-zonas-e-freio/prd.md), porque o freio depende das capacidades declaradas, da medição de overhead, do manifesto e dos assets instalados que o PRD-01 entrega:

1. **Ciclo de qualidade aberto:** a última revisão ([codereview_06](../prd-01-instalacao-deteccao-diagnostico/codereview_06/codereview.md)) terminou `REJECTED`. As correções T23 e T24 foram arquivadas sem nova revisão, e as correções posteriores dos hooks (`e490569`, `99643a5`) nunca passaram por revisão nem por QA.
2. **Requisito novo sem implementação:** a decisão de 14/09/2026 acrescentou ao PRD-01 o RF24 e o CA-21, que colocam plano e checkpoint no `.gitignore` e ajustam a remoção (RF19, CA-12).
3. **Garantias declaradas contra a documentação:**
   - O `doctor` diz que Claude Code e Cursor recebem o uso de contexto, mas nos dois o valor só chega fora dos hooks.
   - A matriz marca o Claude Code como completo, embora um hook que dá timeout ou falha libere a chamada.
   - Pelo mesmo tipo de motivo, o GitHub Copilot CLI aparece como parcial.
4. **Medição de overhead fora do caminho real:**
   - O `doctor` executa os hooks por processo sem o nome do evento que o registro passa.
   - O Copilot e o Antigravity CLI usam campos de payload que a documentação não define.
   - Nas integrações em processo, o `doctor` mede o último handler registrado em vez do handler de chamada de ferramenta.
5. **Atualização invisível:** o manifesto sempre registra a versão `1.0.0`. Com isso, o `doctor` não distingue assets instalados por uma versão anterior, e a troca dos hooks atuais pelos hooks do PRD-02 passaria despercebida.
6. **Ajustes menores:**
   - O `init` mostra duas vezes o aviso de bloco legado.
   - O README descreve o caminho errado do Oh-My-Pi e diz que o bloco de referência tem quatro linhas, quando tem três.
   - O arquivo de protocolo gerado ainda não reflete as decisões de 14/09/2026.
   - O typecheck ignora as fontes dos assets de runtime.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Ciclo de qualidade do PRD-01 fechado | Uma revisão de código `APPROVED` cobre T23, T24 e todas as mudanças de código desde `codereview_06`, e o primeiro relatório de QA do PRD-01 aprova RF1–RF24 e CA-01–CA-21 com as correções deste PRD. |
| OBJ-02 | Garantias transparentes | Nenhuma capacidade informada por `init` ou `doctor` contradiz a documentação registrada em [harness-integrations.md](../../docs/research/harness-integrations.md), e 8 de 8 harnesses têm o nível previsto em FR-02. |
| OBJ-03 | Medição fiel | Em 8 de 8 harnesses, a medição de overhead do `doctor` executa o mesmo evento, o mesmo formato documentado de payload e o mesmo handler de chamada de ferramenta que a integração registra. |
| OBJ-04 | Atualização visível | 100% dos assets gerenciados que diferem do asset do pacote em execução aparecem no `doctor` com a remediação. |
| OBJ-05 | Estado local fora do git | O CA-21 e o CA-12 do PRD-01 passam em Linux, macOS e Windows. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Desenvolvedor que usa Claude Code | Saber se o uso de contexto chega à integração | Não esperar medição onde só há estimativa | `doctor` mostra o uso de contexto como indisponível para a integração e explica que o valor será estimado. |
| US-02 | Desenvolvedor que usa GitHub Copilot CLI | Ver o nível real e o que um timeout causa | Decidir se aceita o risco sem ler a documentação do fornecedor | `doctor` mostra nível completo e a limitação de que um timeout libera a chamada. |
| US-03 | Desenvolvedor que atualiza o pacote | Descobrir que os hooks instalados vieram de uma versão anterior | Não rodar hooks antigos sem perceber | `doctor` avisa sobre o asset desatualizado e indica `context-brake init --yes`. |
| US-04 | Mantenedor que acompanha desempenho | Medir o overhead que o harness de fato paga | Confiar no p95 informado | `doctor` mede o handler de pré-ferramenta com payload documentado em cada harness. |
| US-05 | Desenvolvedor em repositório com git | Não ver plano e checkpoint como arquivos a comitar | Manter o estado local fora do repositório | Depois do `init`, os arquivos de estado ficam ignorados; na remoção padrão, continuam ignorados. |
| US-06 | Desenvolvedor que remove o ContextBrake | Controlar quando o estado local de execução é apagado | Não perder registros de sessão sem pedir | `remove` preserva o estado local de execução, e `remove --remove-state` o apaga junto com plano e checkpoint. |
| US-07 | Desenvolvedor com bloco `CONTEXTOPS` legado | Ler o aviso de migração uma única vez | Saída de terminal limpa | `init` sem `--migrate-legacy` mostra um aviso por arquivo com bloco legado. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Implementar o RF24 e o RF19 atualizado do PRD-01: plano e checkpoint entram no `.gitignore` do projeto, dentro de um bloco do ContextBrake, que só sai do arquivo junto com os arquivos de estado. | O CA-21 e o CA-12 do PRD-01 passam; `init --dry-run` lista a alteração do `.gitignore` sem gravar; marcadores duplicados ou fora de ordem deixam o arquivo intacto e aparecem como conflito com caminho e motivo. |
| FR-02 | Derivar o nível de suporte por esta regra:<br>- **Completo:** o harness respeita a negação explícita do hook em todas as chamadas de ferramenta e entrega contexto após a ferramenta e no início da sessão.<br>- **Parcial:** o harness bloqueia por negação explícita, mas alguma dessas capacidades falta, é indireta, não está confirmada ou não cobre todas as ferramentas.<br>- **Cooperativo:** o harness não bloqueia.<br><br>Timeout e falha da integração não rebaixam o nível. | `init` e `doctor` mostram Claude Code, Cursor, GitHub Copilot CLI, Pi e Oh-My-Pi como completos. Codex CLI, OpenCode e Antigravity CLI aparecem como parciais, com os motivos: ferramentas hospedadas ignoram os hooks, o contexto após a ferramenta não está confirmado, e o contexto é indireto, respectivamente. |
| FR-03 | Informar, por harness, o que acontece quando a integração falha ou excede o timeout, conforme a documentação consultada. | `init` e `doctor` mostram a limitação junto ao nível: Claude Code libera a chamada em timeout ou falha sem negação explícita; GitHub Copilot CLI libera em timeout e nega em falha de comando; Codex CLI libera em falha ou timeout. Cursor, com falha fechada ativa, não mostra essa limitação. Em harness sem documentação sobre o assunto, o texto diz "não documentado". A limitação não gera achado de aviso nem muda o código de saída. |
| FR-04 | Declarar o uso de contexto disponível apenas quando a integração o recebe. | Claude Code e Cursor aparecem com uso de contexto indisponível para a integração, com o impacto de que o valor será estimado. Pi e Oh-My-Pi aparecem com o uso disponível. Nenhum nível muda por causa dessa capacidade. |
| FR-05 | Medir o overhead executando o mesmo evento, formato de payload documentado e handler de chamada de ferramenta que a integração registra. | Nos 8 harnesses, a medição usa os fixtures documentados e o nome do evento registrado; nas integrações em processo, invoca o handler de pré-ferramenta. O status da comparação com a meta continua só informativo, sem achado e sem efeito no código de saída (decisão de 14/09/2026). |
| FR-06 | Ler os payloads dos harnesses pelos nomes de campos documentados. | O adaptador do Antigravity CLI lê `toolCall.name` e `toolCall.args`. Os fixtures de payload de cada harness seguem a documentação registrada, e campos extras são tolerados. |
| FR-07 | Registrar no manifesto a versão real do pacote que fez a instalação. | Depois de `init`, o manifesto contém a versão do `package.json` do pacote em execução. |
| FR-08 | Comparar cada asset gerenciado com o manifesto e com o asset do pacote em execução. | Asset igual ao do manifesto e diferente do pacote atual gera aviso de asset desatualizado, com a versão instalada e a remediação `context-brake init --yes`. Asset diferente do manifesto gera aviso de asset modificado, que o `init` e o `remove` não sobrescrevem. Asset atual não gera achado. |
| FR-09 | Apagar o estado local de execução do ContextBrake (sessões e registros de bloqueio criados pelo PRD-02) apenas com `--remove-state`. | Sem a opção, o diretório de estado de execução permanece. Com `--remove-state --yes`, ele é removido junto com plano, checkpoint e bloco do `.gitignore`. Sem o diretório, nada muda e nenhum erro é emitido. |
| FR-10 | Emitir um único aviso por arquivo com bloco legado `CONTEXTOPS`. | Em saída de texto, `init` sem `--migrate-legacy` mostra o aviso uma vez por arquivo. A saída JSON mantém um achado por arquivo. |
| FR-11 | Gerar o arquivo de protocolo alinhado às decisões de 14/09/2026. | Na zona crítica, o protocolo lista leitura e escrita de plano e checkpoint, o comando de validação, `git status`, `git add` e `git commit`. Na zona vermelha, instrui a comitar as mudanças de código. Em projeto instalado antes da mudança, o `doctor` aponta divergência do protocolo até o próximo `init --yes`. |
| FR-12 | Pesquisar, nas notas de versão oficiais, a versão mínima de cada harness para os mecanismos registrados. | A pesquisa de integrações registra, para cada harness, a versão mínima com a fonte ou "não documentada" com a data da consulta. Adaptadores com fonte declaram a versão, e o `doctor` deixa de emitir o aviso de versão mínima não verificada para eles. |
| FR-13 | Corrigir a documentação para refletir o estado real. | O README mostra `.omp/extensions/` para o Oh-My-Pi, o bloco de referência com três linhas e a tabela de suporte conforme FR-02 e FR-03. A pesquisa de integrações registra as divergências encontradas na consulta de 14/09/2026. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Portões de qualidade | `npm run lint`, `npm run typecheck`, que passa a incluir as fontes em `assets/runtime/`, `npm run coverage` com pelo menos 80%, `schemas:check`, `assets:check`, `dependencies:check` e `package:smoke` passam; cinco execuções seguidas de `npm test` passam sem falha nem timeout. |
| NFR-02 | Compatibilidade | A configuração continua em `schemaVersion: 1`. Os schemas publicados dos relatórios só recebem acréscimos (novos valores e códigos de achado), e nenhuma dependência de runtime é adicionada. |
| NFR-03 | Plataformas | Os critérios passam em Linux, macOS e Windows (PowerShell e Git Bash) com Node 20, 22 e 24 na matriz de CI. |
| NFR-04 | Desempenho | `init` e `doctor` continuam terminando em até 5 segundos no repositório com os oito harnesses, sem contar confirmação e medição de overhead. |
| NFR-05 | Não intrusão | Toda alteração em arquivo do usuário, incluindo o `.gitignore`, segue [file-changes.md](../../.agents/rules/file-changes.md): plano antes de gravar, preservação byte a byte, idempotência e recusa de marcadores inválidos. |

## User experience

- **Limitações no `doctor`:** cada harness mostra nível, capacidades ausentes e limitações de falha ou timeout com rótulos textuais (`OK`, `WARN`, `ERROR`), sem depender de cor, e o mesmo conteúdo sai em JSON.
- **Assets desatualizados ou modificados:** os avisos dizem o caminho, a versão instalada ou a divergência e a remediação.
- **`init` com `.gitignore`:** o resumo lista a criação ou a atualização do bloco, e a pré-visualização mostra o trecho.
- **Remoção:** sem `--remove-state`, a saída informa que plano, checkpoint, estado de execução e bloco do `.gitignore` foram preservados.
- **Mensagens:** ficam em inglês, respeitam `NO_COLOR` e nunca pedem confirmação sem TTY.

## Constraints and dependencies

- **Ordem:** este PRD deve ser concluído antes da implementação do PRD-02.
- **Precedência:**
  - O FR-02 substitui a regra de níveis das restrições técnicas do PRD-01, a linha do GitHub Copilot CLI na matriz e o CA-15 do PRD-01.
  - Com a nova regra, o freio do GitHub Copilot CLI passa a ser garantido, e o CA-17 do PRD-02 usa o Codex CLI, que não bloqueia todas as ferramentas, como exemplo de freio cooperativo.
- **Aceitação:** exige uma revisão de código aprovada, sucessora de `codereview_06`, e o primeiro QA do PRD-01 aprovado.
- **Harnesses:** o comportamento segue a documentação oficial reconferida em 14/09/2026 e registrada na pesquisa de integrações, e capacidades sem evidência nunca contam como garantidas.
- **Plataformas e distribuição:** Node.js 20 ou superior, pacote npm `context-brake` e as mesmas plataformas do PRD-01.

## Out of scope

- Telemetria, zonas e freio, tratados no PRD-02; plano, checkpoint e boot, tratados no PRD-03.
- Transformar overhead acima da meta em aviso ou erro: pela decisão de 14/09/2026, o status continua informativo.
- Detectar com git arquivos de estado que já foram comitados; o README orienta usar `git rm --cached`.
- Declarar versões mínimas sem fonte oficial.
- Mudar a lista de harnesses do MVP.
- Reorganizar o histórico de tarefas e revisões do PRD-01.

## Assumptions and sources

- **Decisões do responsável pelo produto (14/09/2026):**
  - O nível completo exige que o harness respeite a negação explícita, e timeout e falha viram limitação.
  - O overhead acima da meta continua só informativo.
  - Plano e checkpoint ficam no `.gitignore`.
  - Acima do teto, ficam liberados `git status`, `git add` e `git commit`.
- **Suposição:** o `preToolUse` do GitHub Copilot CLI respeita a negação para todas as ferramentas, conforme a referência de hooks. Se alguma ferramenta escapar dos hooks, o Copilot continua parcial.
- **Suposição:** o diretório de estado de execução do FR-09 é o definido no [TechSpec do PRD-02](../prd-02-telemetria-zonas-e-freio/techspec.md). Se o PRD-02 mudar o local, o FR-09 acompanha.
- **Fonte do projeto:** [codereview_06](../prd-01-instalacao-deteccao-diagnostico/codereview_06/codereview.md) — status `REJECTED`, CR-01, CR-02 e observações OI-01 a OI-03 — e as tarefas [T23](../prd-01-instalacao-deteccao-diagnostico/codereview_06/done/task_23.md) e [T24](../prd-01-instalacao-deteccao-diagnostico/codereview_06/done/task_24.md).
- **Fonte do projeto:** [`src/infrastructure/diagnostics/overhead-measurer.ts`](../../src/infrastructure/diagnostics/overhead-measurer.ts) — sem nome do evento e com o último handler registrado.
- **Fonte do projeto:** [`src/core/services/installation-builder.ts`](../../src/core/services/installation-builder.ts) — versão padrão `1.0.0` no manifesto.
- **Fonte do projeto:** [`src/infrastructure/harnesses/antigravity-cli/schemas.ts`](../../src/infrastructure/harnesses/antigravity-cli/schemas.ts) — campo `toolName` não documentado.
- **Fonte do projeto:** os `CAPABILITIES` de [`claude-code/adapter.ts`](../../src/infrastructure/harnesses/claude-code/adapter.ts) e [`cursor/adapter.ts`](../../src/infrastructure/harnesses/cursor/adapter.ts).
- **Fonte do projeto:** [`tsconfig.check.json`](../../tsconfig.check.json) e o [README](../../README.md).
- **Fontes externas:** [Claude Code hooks](https://code.claude.com/docs/en/hooks) (um timeout em `PreToolUse` não bloqueia a chamada), [Codex hooks](https://learn.chatgpt.com/docs/hooks) (erros e timeouts liberam), [Cursor hooks](https://cursor.com/docs/hooks) (`failClosed`), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference) (timeout libera, falha de comando nega), [Pi extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md), [Oh-My-Pi extension loading](https://github.com/can1357/oh-my-pi/blob/main/docs/extension-loading.md) (`.omp/extensions/`) e [Antigravity hooks](https://antigravity.google/docs/hooks/) (`toolCall.name` e `toolCall.args`).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
