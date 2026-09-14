# Documento de Requisitos do Produto (PRD)

## Visão geral

Durante uma sessão, o agente de código não percebe quanto da janela de contexto já ocupou nem quantas ferramentas executou, e tende a insistir em uma correção difícil até bater no limite do modelo sem salvar o progresso. Confiar só nas instruções não resolve, porque o agente pode ignorar a hora de parar. Este PRD define o freio em execução do ContextBrake: contar turnos e medir o uso de contexto por sessão, classificar a sessão em zonas, informar o agente com um bloco curto de telemetria e bloquear chamadas acima de um teto crítico, liberando apenas o necessário para salvar o estado.

O público são os desenvolvedores descritos no [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md), e o agente em execução é o consumidor direto da telemetria. O valor é trocar sessões que terminam degradadas ou cortadas por sessões que param num marco validado, com o estado salvo para o [boot da sessão seguinte](../prd-03-plano-checkpoint-e-boot/prd.md).

## Objetivos

- **Zonas coerentes:** 0 divergências entre a zona informada ao agente e a zona descrita no protocolo, verificadas em testes nos valores de fronteira de uso (49%, 50%, 65%, 66%, 74% e 75%) e de turnos (7, 8, 10, 11 e 12).
- **Freio eficaz:** em sessões simuladas de tarefa longa nos harnesses de nível completo, nenhuma chamada fora da lista de permissão é executada acima do teto crítico, e todas as sessões que atingem o teto conseguem salvar plano e checkpoint e comitar o código.
- **Medição honesta:** 100% dos blocos de telemetria indicam se o uso de contexto foi medido pelo harness ou estimado; em sessões simuladas com uso medido, a estimativa fica a no máximo 10 pontos percentuais do valor medido.
- **Custo baixo por injeção:** cada bloco de telemetria ocupa no máximo 60 tokens, e, no modo padrão, nenhum bloco é injetado enquanto a sessão está na zona verde e abaixo do limiar de ativação.
- **Overhead contido:** p95 de até 100 ms por chamada de ferramenta nos harnesses cuja integração roda como processo por evento, e de até 15 ms nos harnesses com extensão em processo.
- **Falha previsível:** abaixo do teto crítico, uma falha da integração nunca bloqueia o trabalho; acima dele, bloqueia por negação explícita sempre que a integração ainda responde e, quando ela não responde, sempre que o harness oferecer falha fechada.

## Histórias de usuário

- US1: Como agente em execução, quero receber turno, uso de contexto e zona junto ao resultado das ferramentas para decidir quando finalizar o passo.
- US2: Como desenvolvedor, quero que o agente pare de iniciar passos novos ao entrar na zona amarela e conclua a edição em andamento.
- US3: Como desenvolvedor, quero que, se o agente ignorar a zona vermelha, as chamadas de ferramenta sejam bloqueadas acima do teto crítico, exceto as necessárias para salvar plano e checkpoint e comitar o código.
- US4: Como desenvolvedor, quero ajustar janela, tetos e zonas por projeto e ter a configuração rejeitada quando os limites forem incoerentes.
- US5: Como desenvolvedor preocupado com custo, quero que a telemetria não gaste tokens enquanto a sessão está folgada.
- US6: Como desenvolvedor usando um harness de nível parcial, quero ser avisado de quais garantias do freio não valem.
- US7: Como desenvolvedor, quero saber, quando o agente pedir reinício, qual comando do meu harness devo usar.
- US8: Como desenvolvedor auditando uma sessão, quero ver quando e por que chamadas foram bloqueadas.
- Casos de borda: chamadas de ferramenta em paralelo; subagentes com contexto próprio; compactação feita pelo harness no meio da sessão; troca de modelo com janela diferente; sessão reiniciada; harness que não informa uso de contexto; integração que falha ou excede o timeout.

## Principais funcionalidades

### Contagem por sessão

Dá ao freio uma noção de progresso que o modelo não tem.

- RF1: Contar como turno cada chamada de ferramenta concluída, inclusive quando várias chamadas ocorrem em paralelo.
- RF2: Manter contagens isoladas por sessão e persistentes entre invocações da integração.
- RF3: Zerar turnos e uso de contexto quando o harness iniciar sessão nova ou concluir compactação.
- RF4: Contar subagentes separadamente da sessão principal quando o harness os identificar.

### Medição do uso de contexto

- RF5: Usar o uso de contexto informado pelo harness sempre que ele estiver disponível para a integração.
- RF6: Estimar o uso a partir dos dados da sessão disponíveis localmente quando o harness não informar o valor.
- RF7: Usar o tamanho da janela do modelo ativo quando o harness o informar e, caso contrário, o valor da configuração.
- RF8: Registrar a origem do valor, medido ou estimado, em cada leitura.

### Zonas

- RF9: Derivar zonas e tetos de uma única configuração, usada tanto pela integração quanto pelo texto de zonas do arquivo de protocolo.
- RF10: Classificar a sessão, com valores padrão, em: verde quando o uso está abaixo de 50% e há até 7 turnos; amarela quando o uso vai de 50% a 65% ou há de 8 a 10 turnos; vermelha quando o uso passa de 65% ou há 11 turnos ou mais; teto crítico a partir de 75% de uso ou 12 turnos.
- RF11: Validar que os limites são crescentes e cobrem todos os valores de uso e de turnos, sem lacunas nem sobreposições, e que o teto de turnos é o mesmo valor que inicia o teto crítico.

### Bloco de telemetria

- RF12: Entregar ao agente, junto ao resultado de cada ferramenta ou pelo canal equivalente do harness, um bloco com turno e teto, uso e janela com porcentagem, origem da medição, zona e ação recomendada.
- RF13: Oferecer modo de injeção contínua e modo padrão, que injeta assim que a sessão sai da zona verde ou o uso atinge o limiar de ativação, o que ocorrer primeiro, com limiar padrão de 50% de uso.
- RF14: Não alterar a saída original da ferramenta quando o harness permitir acrescentar contexto separado.
- RF15: Manter o formato do bloco versionado e documentado, com nomes de campos estáveis.
- RF16: Na zona vermelha, a ação recomendada instrui gravar plano e checkpoint, comitar as mudanças de código se a validação passar e emitir o sinal de reinício.

### Bloqueio acima do teto crítico

A barreira determinística para quando o agente não obedece.

- RF17: Acima do teto crítico, bloquear chamadas de ferramenta com mensagem que instrui a salvar o estado e pedir reinício.
- RF18: Permitir, mesmo acima do teto, leitura e escrita nos arquivos de plano e checkpoint, execução do comando de validação do passo e os comandos `git status`, `git add` e `git commit`, com lista configurável de comandos adicionais.
- RF19: Abaixo do teto, falhas da integração não bloqueiam; acima, bloqueiam por negação explícita enquanto a integração ainda responde e, quando ela não responde, sempre que o harness oferecer falha fechada.
- RF20: Registrar localmente cada bloqueio com sessão, ferramenta, zona e motivo, sem gravar o conteúdo das ferramentas.
- RF21: Nos harnesses sem bloqueio garantido, isto é, que não respeitam a negação explícita da integração em todas as chamadas de ferramenta, marcar o freio da sessão como cooperativo e expor esse estado no diagnóstico.

### Sinal de reinício

- RF22: Reconhecer o sinal `[REQUEST_SESSION_RESET]` ao fim de uma resposta, quando o harness oferecer evento de fim de resposta, e exibir ao usuário o comando de nova sessão daquele harness.

## Critérios de aceitação

- CA-01 (US1, RF12, RF13): Dada uma sessão com uso de 55% no modo padrão, quando uma ferramenta termina, então o agente recebe um bloco com turno, uso, janela, origem, zona amarela e ação recomendada.
- CA-02 (US5, RF13): Dada uma sessão na zona verde, com uso de 30% e 5 turnos no modo padrão, quando uma ferramenta termina, então nenhum bloco é entregue ao agente.
- CA-03 (RF10): Dados os valores padrão, quando a sessão está com uso de 49% e 7 turnos, então a zona é verde; com 50% ou 8 turnos, amarela; com 66% ou 11 turnos, vermelha; com 75% ou 12 turnos, teto crítico.
- CA-04 (RF9): Dada uma configuração personalizada de zonas, quando a instalação gera o arquivo de protocolo e a integração classifica a sessão, então os limites do texto e da classificação são iguais.
- CA-05 (US4, RF11): Dada uma configuração em que a zona vermelha começa antes da amarela, quando qualquer comando é executado, então a configuração é rejeitada com campo e regra violada.
- CA-06 (RF1, RF2): Dadas três chamadas de ferramenta em paralelo seguidas de uma chamada isolada, quando a última termina, então o bloco informa 4 turnos, mesmo que cada chamada seja tratada por uma invocação separada da integração.
- CA-07 (RF3): Dada uma sessão com 9 turnos, quando o harness inicia sessão nova ou conclui compactação, então a leitura seguinte informa 1 turno e o uso de contexto atualizado.
- CA-08 (RF4): Dado um subagente executando ferramentas, quando a sessão principal recebe telemetria, então as contagens do subagente não são somadas às da sessão principal.
- CA-09 (RF5, RF8): Dado um harness que informa o uso de contexto à integração, quando uma ferramenta termina, então o bloco marca a origem como medida e o valor coincide com o do harness.
- CA-10 (RF6, RF8): Dado um harness que não informa o uso de contexto, quando uma ferramenta termina, então o bloco marca a origem como estimada.
- CA-11 (Objetivo de medição): Dadas sessões simuladas de tarefa longa em uma integração com uso medido, quando a estimativa é calculada em paralelo, então a diferença para o valor medido fica em até 10 pontos percentuais em todas as leituras.
- CA-12 (RF14): Dado um harness que aceita contexto separado, quando o bloco é entregue, então o resultado original da ferramenta chega ao agente sem alteração.
- CA-13 (RF15, Objetivo de custo): Dado qualquer bloco gerado com valores padrão, quando seu tamanho é medido, então ele ocupa no máximo 60 tokens.
- CA-14 (US3, RF17): Dada uma sessão acima do teto crítico em harness de nível completo, quando o agente tenta ler um arquivo de código, então a chamada não é executada e o agente recebe a instrução de salvar o estado e pedir reinício.
- CA-15 (US3, RF18): Dada a mesma sessão, quando o agente grava o checkpoint, roda o comando de validação, adiciona as mudanças com `git add` e faz commit, então as quatro chamadas são executadas.
- CA-16 (RF19): Dada uma falha da integração com uso de 40%, quando o agente chama uma ferramenta, então a chamada é executada; dada a mesma falha acima do teto crítico em harness de nível completo, então a chamada fora da lista de permissão é bloqueada.
- CA-17 (US6, RF21): Dada uma sessão no Codex CLI, quando o usuário consulta o diagnóstico, então a sessão aparece com freio cooperativo e o motivo: ferramentas hospedadas não passam pelos hooks.
- CA-18 (US8, RF20): Dado um bloqueio ocorrido, quando o usuário consulta o registro local, então encontra sessão, ferramenta, zona e motivo, e nenhum conteúdo de saída de ferramenta.
- CA-19 (US7, RF22): Dada uma resposta do agente terminada com `[REQUEST_SESSION_RESET]` em harness com evento de fim de resposta, quando a resposta termina, então o usuário vê o comando de nova sessão daquele harness.
- CA-20 (Objetivo de overhead): Dada uma sequência simulada de chamadas de ferramenta, quando o overhead por chamada é medido na integração de cada harness, então o p95 fica em até 100 ms nas integrações por processo e em até 15 ms nas integrações em processo.
- CA-21 (Objetivo de eficácia): Dadas 20 sessões simuladas de tarefa longa em cada harness de nível completo, com agentes que seguem e que ignoram as zonas, quando as sessões atingem o teto crítico, então nenhuma chamada fora da lista de permissão é executada e todas salvam plano e checkpoint e comitam o código.
- CA-22 (US1, RF13): Dada uma sessão com uso de 30% e 8 turnos no modo padrão, quando uma ferramenta termina, então o agente recebe o bloco com zona amarela.
- CA-23 (US4, RF11): Dada uma configuração em que o teto de turnos difere do número de turnos que inicia o teto crítico, quando qualquer comando é executado, então a configuração é rejeitada com campo e regra violada.

## Experiência do usuário

**Perfis**

- Agente em execução: consome o bloco de telemetria e as mensagens de bloqueio, e precisa de texto curto, determinístico e sem ambiguidade.
- Desenvolvedor acompanhando a sessão: precisa entender por que o agente parou ou foi bloqueado e o que fazer em seguida.
- Mantenedor que calibra limites: ajusta a configuração e confere o efeito no diagnóstico.

**Fluxo principal**

1. Na zona verde, o agente trabalha sem blocos de telemetria.
2. Assim que a sessão sai da zona verde, ou o uso atinge o limiar de ativação, cada resultado de ferramenta chega com o bloco; na zona amarela, o agente conclui a edição atual e valida.
3. Na zona vermelha, o agente grava plano e checkpoint, comita as mudanças de código e emite o sinal de reinício.
4. Se o agente continuar, acima do teto crítico as chamadas fora da lista de permissão são bloqueadas com instrução de salvar o estado.
5. O usuário vê o sinal de reinício e o comando de nova sessão do harness; o boot da sessão seguinte é tratado no PRD de plano, checkpoint e boot.

**Diretrizes de UI/UX e acessibilidade**

- Bloco e mensagens de bloqueio em inglês, em texto simples, sem emoji e sem cor, com a zona escrita por extenso (`GREEN`, `YELLOW`, `RED`, `CRITICAL`).
- Mensagens de bloqueio dizem o motivo, os valores atuais e as ações permitidas.
- Mensagens ao usuário seguem as diretrizes de acessibilidade do PRD de instalação: rótulos textuais, `NO_COLOR` e saída JSON quando houver relatório.

## Restrições técnicas de alto nível

- **Capacidades por harness:** telemetria, bloqueio e medição dependem da matriz de capacidades do [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md) e da regra de níveis do [PRD 1.1](../prd-01.1-pendencias-da-instalacao/prd.md), que deve estar concluído antes deste PRD. Na documentação consultada, nenhum hook pós-ferramenta de Claude Code, Codex CLI, Cursor ou GitHub Copilot CLI recebe o uso de contexto; nesses harnesses o valor é estimado ou obtido por outro canal local do próprio harness.
- **Execução isolada:** nas integrações por processo, cada evento roda em um processo novo; as contagens precisam sobreviver entre invocações sem depender de serviço externo.
- **Falha aberta dos harnesses:** o Claude Code libera a ação quando a integração falha sem negar explicitamente; o Cursor libera salvo configuração de falha fechada; o GitHub Copilot CLI libera sempre em timeout; o Codex CLI não passa ferramentas hospedadas pela integração.
- **Offline:** medição e estimativa funcionam sem rede, e nenhum dado de sessão sai da máquina.
- **Privacidade:** registros locais não guardam conteúdo de ferramentas, prompts nem segredos.
- **Desempenho:** metas de overhead definidas nos objetivos.
- **Arquivos de estado locais:** plano e checkpoint ficam só na máquina, ignorados pelo git conforme o [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md); o commit da zona vermelha registra apenas o código.
- **Verificação por simulação:** os critérios que dependem de tarefas longas usam sessões simuladas que reproduzem os formatos documentados de cada harness; a adesão de modelos reais ao protocolo não é medida.

## Fora do escopo

- Reinício automático de sessões e o comando `wrap`, tratados no PRD do runner.
- Acionar a compactação nativa do harness ou alterar seus limites internos.
- Cálculo de custo financeiro e painéis de consumo.
- Tokenizadores exatos para todos os provedores de modelo; a estimativa pode ser aproximada dentro da meta de erro.
- Bloqueio na chamada à API do modelo, fora do mecanismo de extensão do harness.
- Harnesses fora da lista do MVP.
- Medir a adesão de modelos reais ao protocolo em execuções repetidas de tarefas longas.
