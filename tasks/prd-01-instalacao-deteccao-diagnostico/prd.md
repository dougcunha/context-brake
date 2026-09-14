# Documento de Requisitos do Produto (PRD)

## Visão geral

O ContextBrake é uma CLI open source que freia agentes de código em tarefas longas antes que o contexto degrade: mede o uso da sessão, avisa o agente, bloqueia chamadas acima de um teto e guarda o estado em disco para a sessão seguinte continuar. Este PRD cobre a porta de entrada do produto: detectar os harnesses usados no projeto, registrar a integração do ContextBrake em cada um, adicionar aos arquivos de instrução uma referência curta ao protocolo, criar a configuração e diagnosticar a instalação.

O público são desenvolvedores que usam agentes de código de terminal em repositórios reais, sozinhos ou em times, muitas vezes com mais de um harness no mesmo repositório. O valor é ativar o freio com um comando, sem editar a configuração de cada ferramenta à mão, sem duplicar nada em execuções repetidas e sabendo quais garantias o freio oferece em cada harness. Este é o primeiro de quatro PRDs: [telemetria, zonas e freio](../prd-02-telemetria-zonas-e-freio/prd.md), [plano, checkpoint e boot](../prd-03-plano-checkpoint-e-boot/prd.md) e, numa fase seguinte ao MVP, [runner de reinício automático](../prd-04-runner-de-reinicio-automatico/prd.md).

## Objetivos

- **Instalação rápida:** em um repositório com um harness suportado, o usuário chega a um diagnóstico sem erros em até 2 minutos, com um comando de instalação e nenhuma edição manual de arquivo.
- **Detecção correta:** 100% de acerto na detecção dos oito harnesses do MVP nos cenários de teste, e nenhum harness configurado em repositório que só tenha arquivos de instrução compartilhados.
- **Idempotência:** três execuções seguidas da instalação resultam em exatamente uma integração por harness, um bloco de referência por arquivo de instrução, um bloco no `.gitignore` e nenhuma alteração fora das entradas do ContextBrake.
- **Pegada mínima no contexto:** a referência adicionada aos arquivos de instrução tem no máximo 10 linhas.
- **Diagnóstico confiável:** o diagnóstico identifica 100% das falhas introduzidas nos cenários de teste: integração removida, configuração inválida, marcador corrompido, arquivo de protocolo ausente e harness abaixo da versão mínima.
- **Transparência de garantias:** todo harness configurado aparece com nível de suporte, com as capacidades que faltam e com as limitações de falha e timeout, e nenhum harness aparece como "completo" sem respeitar a negação explícita da integração em todas as chamadas de ferramenta.

## Histórias de usuário

- US1: Como desenvolvedor que usa Claude Code, quero rodar um comando na raiz do projeto para ativar o ContextBrake sem editar a configuração do harness à mão.
- US2: Como desenvolvedor que usa mais de um harness no mesmo repositório, como Codex CLI e Cursor, quero que a instalação configure todos os detectados de uma vez.
- US3: Como mantenedor de um repositório com `AGENTS.md` compartilhado, possivelmente como link simbólico para `CLAUDE.md`, quero que a referência ao protocolo apareça uma única vez e que o link continue funcionando.
- US4: Como desenvolvedor cauteloso, quero ver antes quais arquivos serão criados ou alterados.
- US5: Como desenvolvedor, quero um diagnóstico que diga, por harness, se a integração está instalada, qual é o nível de suporte e o que está quebrado.
- US6: Como autor de scripts de automação, quero executar instalação e diagnóstico sem prompts, com saída JSON e códigos de saída previsíveis.
- US7: Como desenvolvedor, quero remover o ContextBrake do projeto preservando todo o conteúdo que não foi criado por ele.
- US8: Como usuário de um repositório que já tem um bloco legado `CONTEXTOPS`, quero que a instalação não apague conteúdo meu ao migrar para o novo formato.
- Casos de borda: harness instalado na máquina, mas não usado no projeto; configuração do harness que já contém integrações do usuário; arquivo de configuração do harness inválido; repositório sem git; bloco legado que envolve conteúdo além do protocolo; execução em Windows com links simbólicos.

## Principais funcionalidades

### Detecção de harnesses

Descobre quais agentes de código o projeto usa, para que o usuário não precise saber onde cada ferramenta guarda sua configuração.

- RF1: Detectar Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, OpenCode, Pi, Oh-My-Pi e Antigravity CLI a partir de sinais no projeto e no ambiente do usuário.
- RF2: Informar, para cada detecção, se o sinal veio do projeto ou da instalação na máquina, e a versão do harness quando disponível.
- RF3: Não considerar arquivos de instrução compartilhados, como `AGENTS.md`, prova suficiente de um harness específico.
- RF4: Permitir incluir ou excluir harnesses explicitamente por opção de linha de comando, com precedência sobre a detecção.

### Registro de integrações

Liga o ContextBrake ao mecanismo de extensão de cada harness, respeitando o que o usuário já configurou.

- RF5: Registrar a integração no mecanismo de extensão documentado por cada harness, seja hook ou plugin, no escopo do projeto por padrão.
- RF6: Preservar integrações e configurações existentes do usuário nos mesmos arquivos.
- RF7: Não alterar arquivo de configuração de harness inválido; reportar arquivo e problema e seguir com os demais harnesses.
- RF8: Atribuir a cada harness um nível de suporte (completo, parcial ou cooperativo) conforme a matriz de capacidades e exibir o nível ao fim da instalação.
- RF9: Avisar quando a versão detectada do harness for anterior à mínima que oferece as capacidades usadas.

### Referência ao protocolo

Mantém o protocolo fora do contexto sempre carregado, conforme decidido para o MVP.

- RF10: Criar o arquivo de protocolo do projeto, cujo conteúdo é definido pelos PRDs de telemetria e de plano e checkpoint.
- RF11: Adicionar aos arquivos de instrução existentes, por padrão `CLAUDE.md` e `AGENTS.md` e configuráveis, uma referência curta ao arquivo de protocolo, entre marcadores próprios do ContextBrake.
- RF12: Não criar arquivos de instrução novos, salvo por opção explícita.
- RF13: Quando dois arquivos de instrução forem o mesmo arquivo por link simbólico, alterar uma única vez e preservar o link.
- RF14: Detectar blocos legados delimitados por `CONTEXTOPS:START` e `CONTEXTOPS:END` e oferecer migração com pré-visualização, sem nunca remover conteúdo desses blocos sem confirmação explícita.

### Configuração

- RF15: Criar `context-brake.config.json` com valores padrão para harnesses ativos, janela de contexto, tetos de turnos, zonas, arquivos de estado e arquivos de instrução.
- RF16: Validar a configuração em toda execução e, quando inválida, indicar campo, valor recebido e regra violada.
- RF17: Publicar com o pacote um schema da configuração que editores possam usar para validação e autocompletar.
- RF24: Adicionar ao `.gitignore` da raiz do projeto, entre marcadores próprios do ContextBrake, os caminhos de plano e checkpoint definidos na configuração, criando o arquivo quando não existir, atualizando os caminhos quando a configuração mudar e preservando o restante do conteúdo. Plano e checkpoint são estado local e não devem ser comitados.

### Pré-visualização e remoção

- RF18: Oferecer modo de pré-visualização da instalação que lista cada arquivo e trecho a criar ou alterar sem gravar nada.
- RF19: Oferecer comando de remoção que retira integrações, referência e arquivo de protocolo, preservando o restante do conteúdo; plano e checkpoint só são removidos com confirmação explícita, e as entradas do ContextBrake no `.gitignore` saem apenas junto com eles.

### Diagnóstico

- RF20: O comando `context-brake doctor` lista harnesses detectados, estado da integração (instalada, ausente ou quebrada), versão, nível de suporte e capacidades ausentes com seu impacto.
- RF21: Validar configuração, marcadores, arquivo de protocolo e, quando existirem, os arquivos de plano e checkpoint.
- RF22: Medir o overhead da integração em cada harness configurado e comparar com a meta definida no PRD de telemetria.
- RF23: Oferecer saída legível e saída JSON com os mesmos achados, e códigos de saída distintos para estado saudável, avisos e erros.

## Critérios de aceitação

- CA-01 (US1, RF1, RF5, RF15): Dado um repositório com configuração de projeto do Claude Code e sem ContextBrake, quando o usuário executa `context-brake init --yes`, então a integração fica registrada na configuração de projeto do Claude Code, `context-brake.config.json` é criado e o resumo final lista o Claude Code com seu nível de suporte.
- CA-02 (US2, RF1): Dado um repositório com sinais de Codex CLI e Cursor, quando o usuário executa a instalação, então os dois harnesses são configurados e aparecem no resumo.
- CA-03 (RF3): Dado um repositório apenas com `AGENTS.md` e sem sinais de harness no projeto nem na máquina, quando o usuário executa a instalação, então nenhuma integração é registrada e a CLI explica como selecionar um harness explicitamente, com código de saída de aviso.
- CA-04 (RF4): Dado um repositório com sinais de Cursor e GitHub Copilot CLI, quando o usuário executa a instalação excluindo o GitHub Copilot CLI, então só o Cursor é configurado.
- CA-05 (US1, RF6): Dada uma configuração de harness com integrações do usuário, quando a instalação é executada três vezes, então as integrações do usuário permanecem idênticas e existe exatamente uma integração do ContextBrake.
- CA-06 (RF7): Dado um arquivo de configuração de harness com sintaxe inválida, quando o usuário executa a instalação, então esse arquivo não é modificado, a saída indica caminho e erro, e os demais harnesses são configurados.
- CA-07 (US3, RF11, RF13): Dado um repositório em que `AGENTS.md` é link simbólico para `CLAUDE.md`, quando o usuário executa a instalação, então o arquivo real contém um único bloco do ContextBrake e `AGENTS.md` continua sendo link simbólico.
- CA-08 (RF11): Dado qualquer arquivo de instrução alterado pela instalação, quando o bloco é inspecionado, então ele tem no máximo 10 linhas entre os marcadores e aponta para o arquivo de protocolo.
- CA-09 (RF12): Dado um repositório sem `CLAUDE.md` e sem `AGENTS.md`, quando o usuário executa a instalação sem a opção de criação, então nenhum arquivo de instrução é criado e a saída informa a opção disponível.
- CA-10 (US8, RF14): Dado um `AGENTS.md` cujo bloco `CONTEXTOPS` contém conteúdo além do protocolo, quando o usuário executa a instalação sem confirmar a migração, então o arquivo permanece byte a byte igual e a saída mostra a mudança proposta.
- CA-11 (US4, RF18): Dado qualquer repositório, quando o usuário executa a instalação em modo de pré-visualização, então nenhum arquivo muda e a saída lista cada criação e alteração prevista.
- CA-12 (US7, RF19): Dado um repositório com o ContextBrake instalado, quando o usuário executa a remoção, então integrações, bloco de referência e arquivo de protocolo deixam de existir, o restante do conteúdo dos arquivos permanece e plano e checkpoint continuam no disco e ignorados pelo git.
- CA-13 (RF16): Dada uma configuração com o limite da zona amarela menor que o da zona verde, quando qualquer comando é executado, então a CLI termina com código de erro e aponta campo, valor e regra.
- CA-14 (US5, RF20): Dada uma integração removida manualmente da configuração do harness, quando o usuário executa `doctor`, então o harness aparece com integração ausente e o comando termina com código de erro.
- CA-15 (RF8, RF20): Dado o GitHub Copilot CLI configurado, quando o usuário executa `doctor`, então o harness aparece com nível completo e com a limitação de que um timeout da integração libera a chamada de ferramenta, conforme a regra de níveis do [PRD 1.1](../prd-01.1-pendencias-da-instalacao/prd.md).
- CA-16 (RF9): Dado um harness em versão anterior à mínima suportada, quando o usuário executa `doctor`, então a saída mostra versão detectada, versão mínima e capacidade afetada.
- CA-17 (US6, RF23): Dado qualquer estado de instalação, quando o usuário executa `doctor --json`, então a saída é JSON válido conforme o schema publicado e contém os mesmos achados da saída legível.
- CA-18 (RF22): Dado um harness configurado, quando o usuário executa `doctor`, então a saída mostra o overhead p95 medido e se ele cumpre a meta.
- CA-19 (Objetivo de instalação): Dado um usuário seguindo o README em um repositório com um harness suportado, quando executa a instalação e o diagnóstico, então obtém diagnóstico sem erros em até 2 minutos.
- CA-20 (Restrição de plataforma): Dados Linux, macOS e Windows, em PowerShell e Git Bash, quando os cenários CA-01, CA-05 e CA-07 são executados, então todos passam.
  - Verificação (2026-09-14): a execução [34881898428](https://github.com/dougcunha/context-brake/actions/runs/34881898428) do GitHub Actions no commit `1d4bbb5` passou em Ubuntu, macOS e Windows com Node 20, 22 e 24. Em todas as combinações, o E2E-10 executou CA-01, CA-05 e CA-07; no Windows, em PowerShell e Git Bash. O CA-20 está verificado sem exceção.
  - Histórico: no mesmo dia, antes da publicação do repositório, o responsável pelo produto registrou uma exceção, porque não havia máquina macOS nem distribuição Linux além do WSL 2. A aceitação usaria evidência de Linux (Ubuntu no WSL 2) e de Windows, e o macOS ficaria como não verificado. A verificação acima encerrou essa exceção; o registro completo está em `DEC-01` na [TechSpec](./techspec.md).
- CA-21 (RF24): Dado um repositório com `.gitignore` do usuário, quando a instalação é executada três vezes, então o arquivo contém um único bloco do ContextBrake com os caminhos de plano e checkpoint da configuração e o conteúdo do usuário permanece byte a byte igual; sem `.gitignore`, o arquivo é criado apenas com o bloco.

## Experiência do usuário

**Perfis**

- Desenvolvedor solo com um harness, que quer ativar o freio sem estudar a configuração da ferramenta.
- Desenvolvedor com vários harnesses no mesmo repositório, que precisa de comportamento igual em todos.
- Mantenedor de time, que versiona a configuração e revisa em pull request o que a instalação alterou.
- Automação e CI, que executam os comandos sem terminal interativo.

**Fluxo principal**

1. `npx context-brake init` detecta os harnesses e mostra a lista com a origem de cada sinal.
2. A CLI mostra o resumo das alterações previstas e pede confirmação; `--yes` pula a confirmação.
3. A instalação registra integrações, cria protocolo e configuração, adiciona a referência curta e inclui plano e checkpoint no `.gitignore`.
4. O resumo final mostra, por harness, nível de suporte, capacidades ausentes e o próximo passo sugerido, `context-brake plan init`.
5. `context-brake doctor` confirma o estado e aponta como corrigir cada problema.

**Diretrizes de UI/UX e acessibilidade**

- Mensagens da CLI em inglês, como o restante do projeto; cada erro diz o que aconteceu, em qual arquivo e como corrigir.
- Estado nunca comunicado só por cor ou emoji: toda linha tem rótulo textual (`OK`, `WARN`, `ERROR`).
- Respeitar `NO_COLOR` e terminais sem TTY, sem animações obrigatórias.
- Modo não interativo completo, sem prompts, para automação.
- Saída legível utilizável por leitores de tela, sem depender de alinhamento de tabela para transmitir significado; os mesmos dados ficam disponíveis em JSON.

## Restrições técnicas de alto nível

- **Harnesses obrigatórios:** a integração usa apenas mecanismos de extensão documentados por cada harness. A matriz abaixo resume a documentação oficial consultada em 12 e 13 de setembro de 2026 e deve ser reconfirmada por versão na TechSpec.

| Harness | Execução da integração | Bloquear antes da ferramenta | Contexto após a ferramenta | Contexto no início da sessão | Uso de contexto disponível | Nível previsto |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Processo por evento ou HTTP | Sim; timeout ou falha sem negação explícita libera a chamada | Sim | Sim | Só no status line | Completo |
| Codex CLI | Processo por evento | Sim, exceto ferramentas hospedadas | Sim | Sim | Não | Parcial |
| Cursor | Processo por evento | Sim, com falha fechada opcional | Sim | Sim | Só antes da compactação | Completo |
| GitHub Copilot CLI | Processo por evento ou HTTP | Sim; timeout libera a chamada | Sim | Sim | Não | Completo |
| OpenCode | Plugin em processo | Sim | A confirmar | Sim, por recurso experimental | A confirmar | Parcial |
| Pi | Extensão em processo | Sim | Sim | Sim | Sim | Completo |
| Oh-My-Pi | Extensão em processo | Sim | Sim | Sim | Sim | Completo |
| Antigravity CLI | Processo por evento | Sim | Indireto, antes da chamada ao modelo | Indireto, antes da chamada ao modelo | Não | Parcial |

- **Níveis de suporte:** completo quando o harness respeita a negação explícita da integração em todas as chamadas de ferramenta e entrega telemetria junto aos resultados de ferramenta e boot no início da sessão; parcial quando o harness bloqueia por negação explícita, mas alguma dessas capacidades falta, é indireta, não está confirmada ou não cobre todas as ferramentas; cooperativo quando não há bloqueio e só o protocolo atua. Timeout e falha da integração que liberam a chamada aparecem como limitação e não rebaixam o nível (regra atualizada pelo [PRD 1.1](../prd-01.1-pendencias-da-instalacao/prd.md), FR-02). A documentação do Antigravity descreve hooks para o Antigravity 2.0, e a cobertura específica do CLI precisa ser confirmada.
- **Fontes da matriz:** [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Claude Code status line](https://code.claude.com/docs/en/statusline), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Cursor hooks](https://cursor.com/docs/hooks), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [OpenCode plugins](https://opencode.ai/docs/plugins/), [issue do OpenCode sobre saída de ferramenta](https://github.com/anomalyco/opencode/issues/13574), [Pi extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md), [Oh-My-Pi hooks](https://github.com/can1357/oh-my-pi/blob/main/docs/hooks.md) e [Antigravity hooks](https://antigravity.google/docs/hooks/).
- **Runtime e distribuição:** Node.js 20 ou superior, TypeScript, pacote npm `context-brake` e execução via `npx`.
- **Plataformas:** Linux, macOS e Windows, em PowerShell e Git Bash. As três plataformas têm evidência de aceitação no CI; ver CA-20.
- **Não intrusão:** a CLI só altera entradas e blocos que ela mesma criou e nunca sobrescreve configuração inválida.
- **Privacidade:** nenhum dado sai da máquina; a CLI não coleta métricas de uso nem grava segredos ou conteúdo de ferramentas em logs.
- **Desempenho:** `init` e `doctor` terminam em até 5 segundos em repositório com os oito harnesses configurados, sem contar confirmação e medição de overhead.
- **Licença:** MIT.

## Fora do escopo

- Telemetria, zonas e bloqueio, tratados no PRD de telemetria, zonas e freio.
- Plano, checkpoint e boot, tratados no PRD de plano, checkpoint e boot.
- Reinício automático de sessões e o comando `wrap`, tratados no PRD do runner.
- Aider, Windsurf e outros harnesses fora da lista do MVP; o Aider não oferece mecanismo de hooks.
- Configuração global, políticas corporativas e hooks gerenciados por administradores.
- Agentes em nuvem, como os agentes remotos do Cursor e do Copilot, e extensões de IDE.
- Atualização automática do pacote e das integrações.
- Coleta de métricas de uso do produto.
