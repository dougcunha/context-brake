# PRD — Modo de snapshot delegado (sem plano de tarefas)

## Problem and context

Hoje o ContextBrake mede o contexto e injeta o bloco de telemetria mesmo sem `task_plan.json` (`src/core/services/brake-engine.ts`, `handlePostTool` não consulta o plano). Todo o resto, porém, supõe que o plano e o checkpoint existem:

- a ação das zonas `RED` e `CRITICAL` manda atualizar `task_plan.json` e `state_checkpoint.json` (`src/core/services/zone-actions.ts`, RF16 do PRD-02);
- acima do teto crítico, o freio só libera escrita nesses dois arquivos e o comando de validação do passo, lido do plano (`src/core/services/brake-allowlist.ts`, RF18 do PRD-02);
- o protocolo gerado, o bloco de referência nos arquivos de instrução e o bloco do `.gitignore` citam o plano (`protocol-service.ts`, `instruction-markers.ts`, `gitignore-markers.ts`);
- o boot após `/clear` ou compactação depende do plano e do checkpoint (`boot-policy.ts`, PRD-03).

Quem já tem um mecanismo próprio para salvar estado, como uma skill de snapshot (por exemplo, `sdd-orchestrate-flow` com `context-snapshot.md`), não consegue usar o ContextBrake só como sensor e freio. As instruções injetadas mandam o agente escrever arquivos que esse fluxo não usa, e no teto crítico o freio bloqueia justamente a escrita do snapshot próprio.

Esta feature adiciona um modo delegado: o ContextBrake continua medindo, injetando telemetria e freando, mas não exige plano nem checkpoint. Perto do vermelho, injeta um comando configurável que o agente deve executar para salvar o estado. O comando pode ser o nome de uma skill, um slash command ou uma instrução curta. O modo entra sozinho quando o comando de snapshot está configurado e o arquivo de plano não existe; sem o comando configurado, nada muda.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Usar o ContextBrake sem plano nem checkpoint | Em um repositório com comando de snapshot configurado e sem `task_plan.json`, nenhum bloco de telemetria, mensagem de bloqueio, injeção de início de sessão ou alerta de `doctor` manda criar ou atualizar `task_plan.json` ou `state_checkpoint.json`. |
| OBJ-02 | Delegar o snapshot a um mecanismo escolhido pelo usuário | O texto configurado aparece literalmente na ação injetada em 100% dos blocos de telemetria da zona de disparo e das zonas acima dela. |
| OBJ-03 | O freio continua determinístico no modo delegado | Acima do teto crítico, chamadas fora da lista liberada são negadas nos harnesses com freio garantido, e o agente consegue concluir o snapshot configurado sem ser bloqueado. |
| OBJ-04 | Não mudar o comportamento de quem usa plano | Sem comando de snapshot configurado, ou com `task_plan.json` presente, a suíte atual de testes unitários, de integração e e2e passa sem alteração nos resultados esperados. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Desenvolvedor que já tem uma skill de snapshot | Instalar o ContextBrake sem criar plano de tarefas | Telemetria e freio sem mudar o fluxo de trabalho | `context-brake init --snapshot-command "/sdd-snapshot"`, depois trabalhar normalmente sem `task_plan.json`. |
| US-02 | Agente de código na sessão | Saber o que fazer quando o contexto se aproxima do limite | Salvar o estado antes de perder contexto | Ao entrar na zona de disparo, o bloco de telemetria diz para executar o comando configurado e depois pedir reinício. |
| US-03 | Agente de código acima do teto crítico | Terminar o snapshot mesmo com o freio ativo | O estado é salvo em vez de a sessão travar | A invocação do comando e a escrita nos caminhos de snapshot configurados são liberadas; as demais ferramentas continuam negadas. |
| US-04 | Desenvolvedor após `/clear` ou compactação | Retomar o trabalho a partir do próprio mecanismo | Continuidade sem boot baseado em plano | Com um comando de retomada configurado, a nova sessão recebe a instrução de executá-lo. Sem esse comando, nada é injetado. |
| US-05 | Desenvolvedor que alterna entre tarefas com e sem plano | Usar o plano quando existir e o próprio snapshot quando não existir | Sem reconfigurar a cada tarefa | Criar `task_plan.json` com `context-brake plan init` passa o repositório para o modo `plan`; apagar o plano volta ao modo `delegated`; `doctor` mostra o modo em vigor e o motivo. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | A configuração ganha uma seção opcional de snapshot delegado com o comando de snapshot, a zona de disparo, o comando de retomada e os padrões de caminho liberados. O modo em vigor é `delegated` quando o comando de snapshot está configurado e o arquivo de plano configurado não existe; em qualquer outro caso é `plan`, o comportamento atual. | Sem a seção, ou com a seção e `task_plan.json` presente (válido ou não), o comportamento é o do modo `plan`; com a seção e sem o arquivo de plano, é `delegated`; criar ou apagar o plano muda o modo no evento seguinte, sem reinstalar. |
| FR-02 | O comando de snapshot, e o de retomada quando existir, é texto de uma linha, sem espaços nas pontas e com até 200 caracteres, repassado ao agente literalmente. | Configuração com comando vazio, com quebra de linha, com espaços nas pontas ou com mais de 200 caracteres é rejeitada por `init` e `doctor` com o caminho do campo; um texto válido aparece idêntico nos blocos injetados. |
| FR-03 | A zona de disparo do comando é configurável entre `YELLOW` e `RED`, com padrão `RED`. | Com o padrão, o bloco em `YELLOW` mantém a ação atual e o bloco em `RED` e `CRITICAL` cita o comando; com `YELLOW`, o comando aparece a partir de `YELLOW`. |
| FR-04 | No modo `delegated`, a ação das zonas de disparo instrui executar o comando configurado e depois terminar a resposta com `[REQUEST_SESSION_RESET]`, sem citar plano, checkpoint, comando de validação do passo nem commit. | Os blocos de telemetria em `RED` e `CRITICAL` contêm o comando e o sinal de reinício e não contêm `task_plan`, `state_checkpoint`, `validation` nem `commit`. |
| FR-05 | O formato do bloco de telemetria continua na versão 1, com os mesmos campos; só o texto de `action` muda. | Os blocos dos dois modos seguem o mesmo padrão de campos `[ContextBrake v1] turn=… usage=… tokens=… source=… zone=… action=…`. |
| FR-06 | No modo `delegated`, acima do teto crítico, o freio libera: a invocação do comando configurado quando o harness a expõe como chamada de ferramenta identificável; leitura e escrita em caminhos de snapshot configuráveis (padrões relativos ao repositório); `git status`, `git add`, `git commit`; e os comandos adicionais já configuráveis. Todo o resto é negado. | Em fixture de harness com freio garantido, acima do teto: escrever em um caminho que casa com o padrão configurado e invocar o comando configurado são permitidos; escrever fora dos padrões e rodar um comando shell não liberado são negados com a mensagem de bloqueio. |
| FR-07 | A mensagem de bloqueio do modo `delegated` lista os caminhos e comandos liberados e instrui executar o comando configurado e pedir reinício, sem citar plano, checkpoint nem comando de validação. | O texto da negação contém o comando configurado, os padrões de caminho e `[REQUEST_SESSION_RESET]`, e não contém `task_plan` nem `state_checkpoint`. |
| FR-08 | No modo `delegated`, um comando de retomada opcional é injetado no início de nova sessão e após compactação, nos mesmos harnesses e eventos em que o boot do PRD-03 é injetado hoje; o boot baseado em plano não roda nesse modo. | Com o comando de retomada configurado e sem plano, o evento de reinício devolve um bloco `[ContextBrake boot v1]` que o contém; sem ele, nada é injetado; com o plano presente, o boot do PRD-03 continua igual. |
| FR-09 | `init` aceita o comando de snapshot, a zona de disparo, o comando de retomada e os padrões de caminho por opções de linha de comando e pelo arquivo de configuração. Com a seção configurada, o protocolo gerado descreve os dois caminhos: com plano, as regras atuais; sem plano, executar o comando configurado. | Com a seção configurada, o protocolo contém as regras do modo `plan` e uma seção do modo delegado com o comando e a zona de disparo; sem a seção, o protocolo fica igual byte a byte ao atual. |
| FR-10 | Adicionar, alterar ou remover a seção com `init` atualiza os ativos gerenciados sem tocar em conteúdo fora dos marcadores e sem apagar plano ou checkpoint existentes. | Depois de adicionar e depois remover a seção, o protocolo e os blocos gerenciados mudam como esperado, o conteúdo do usuário fica igual byte a byte e `task_plan.json` e `state_checkpoint.json` existentes continuam no disco. |
| FR-11 | `doctor` valida a seção de snapshot delegado e, no modo `delegated`, não alerta sobre a ausência de plano ou checkpoint. | Em repositório com a seção e sem plano, `doctor` sai saudável; com comando inválido, aponta o campo; com protocolo gerado antes da seção, aponta divergência corrigível por `init`. |
| FR-12 | `wrap` funciona nos dois modos. `run` continua exigindo plano; no modo `delegated`, o erro de plano ausente diz que o runner não suporta esse modo e como criar um plano. | `wrap` injeta telemetria com a ação do modo em vigor; `run` sem plano e com a seção configurada termina com código de uso e mensagem que cita o modo `delegated` e `context-brake plan init`. |
| FR-13 | O diagnóstico e o relatório JSON expõem o modo em vigor, o motivo (seção configurada ou não, plano presente ou não) e os valores da seção. | A saída de `doctor --json` inclui o modo em vigor e o motivo e, com a seção configurada, os comandos, a zona de disparo e os padrões de caminho liberados. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Compatibilidade | Configurações e instalações existentes continuam válidas sem migração; sem a seção de snapshot delegado, toda saída fica igual byte a byte à atual. |
| NFR-02 | Segurança | Os padrões de caminho liberados só aceitam caminhos relativos ao repositório, sem `..` nem caminhos absolutos; o comando de snapshot nunca é executado pelo ContextBrake, só repassado como texto ao agente. |
| NFR-03 | Desempenho | A checagem de existência do plano ocorre no máximo uma vez por evento e só quando a seção está configurada e o evento vai produzir um bloco, uma negação ou uma injeção de início de sessão; a latência por hook fica dentro do orçamento do PRD-02. |
| NFR-04 | Plataforma | Comportamento idêntico em Linux, macOS e Windows (PowerShell e Git Bash), inclusive na comparação de caminhos liberados com separadores `\` e `/`. |
| NFR-05 | Tamanho da injeção | O bloco de telemetria do modo `delegated` com um comando de 200 caracteres fica abaixo de 400 caracteres. |

## User experience

- Instalação: `context-brake init --snapshot-command "<texto>" [--resume-command "<texto>"] [--snapshot-trigger RED|YELLOW] [--snapshot-path <padrão>]...`. A prévia de mudanças mostra os comandos e explica que o modo delegado vale enquanto não houver plano.
- Na sessão, a partir da zona de disparo, a ação do bloco de telemetria diz, por exemplo: `action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]`.
- No bloqueio, a mensagem nomeia a ferramenta negada, o comando a executar e os caminhos e comandos liberados.
- Erros de configuração seguem o formato atual de `doctor` e `init`: caminho do campo, regra violada e correção sugerida.

## Constraints and dependencies

- Depende do PRD-02 (zonas, telemetria, freio) e do PRD-03 (boot); o modo `plan` preserva os critérios de aceitação desses PRDs sem mudança.
- A detecção da invocação do comando configurado como chamada de ferramenta depende de cada harness expor skills ou slash commands nos hooks de pré-ferramenta; onde não expõe, só os caminhos e comandos shell liberados valem, e essa limitação aparece no diagnóstico. Antes de implementar, a TechSpec confere `docs/research/harness-integrations.md` e a documentação de cada fornecedor.
- A saída da CLI segue `.agents/rules/cli-output.md`; as mudanças em arquivos do usuário seguem `.agents/rules/file-changes.md`.

## Out of scope

- Executar o comando de snapshot pelo ContextBrake ou verificar se o snapshot foi gravado.
- Suporte ao runner de reinício automático (`context-brake run`, PRD-04) no modo `delegated`.
- Espaços reservados ou variáveis dentro do texto do comando (por exemplo, zona ou porcentagem).
- Mudar os limites das zonas ou o formato versionado do bloco de telemetria.
- Um campo explícito que force o modo `delegated` mesmo com o plano presente.

## Assumptions and sources

- Decisão de produto (PD-01, HIL 1): o modo é automático. Vale `delegated` quando o comando de snapshot está configurado e o arquivo de plano não existe; senão, `plan`. Um plano inválido mantém o modo `plan` e as instruções de reparo atuais. Impacto: o protocolo gerado precisa descrever os dois caminhos, e o modo pode mudar durante a sessão se o plano for criado ou apagado.
- Decisão de produto (PD-02, HIL 1): a zona de disparo padrão é `RED`, que é "perto do vermelho" do pedido, e `YELLOW` pode ser configurada para quem quer salvar antes. Impacto se errada: o snapshot começa tarde demais para skills longas.
- Decisão de produto (PD-03, HIL 1): o freio continua ativo no modo `delegated`, com lista liberada baseada em padrões de caminho configuráveis e na invocação do comando. A alternativa, freio só cooperativo neste modo, perde a garantia do OBJ-03. Impacto se errada: padrões mal configurados bloqueiam a escrita do snapshot.
- Decisão de produto (PD-04, HIL 1): o modo `delegated` mantém o sinal `[REQUEST_SESSION_RESET]` e não instrui commit; commitar fica a cargo do comando configurado, e `git status`, `git add` e `git commit` continuam liberados.
- Fato: a telemetria e o freio já rodam sem plano (`brake-engine.ts`); o boot devolve `none` quando o plano não existe (`boot-policy.ts`).
- Fonte: PRD-02 (`tasks/prd-02-telemetria-zonas-e-freio/prd.md`, RF12–RF22), PRD-03 (boot) e `docs/research/harness-integrations.md`.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
