# Gerenciamento de Contexto em Single-Agent

> Cópia congelada de *Gerenciamento de Contexto em Single-Agent* (LLMwiki, `wiki/conceitos/gerenciamento-de-contexto-em-single-agent.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.

O artigo trata do problema que sobra quando uma tarefa longa precisa permanecer em um agente único: o histórico de mensagens cresce a cada turno. O erro de desenho apontado é usar a lista de mensagens como banco de dados cumulativo. A solução proposta separa uma memória de trabalho estruturada, reinjetada a cada turno, das mensagens efêmeras, que podem ser podadas ou resumidas.[^contexto-single-agent]

## Três patologias do context bloat

1. **Degradação de atenção:** logs e leituras de arquivos acumulados dispersam a atenção do modelo, e a conformidade com instruções finas e restrições de sistema cai. A fonte situa o início do problema entre 15 mil e 30 mil tokens.
2. **Custo cumulativo:** cada turno reenvia como entrada todo o histórico anterior, então o custo total cresce quadraticamente com o número de turnos. Em trajetórias de 30 a 50 turnos, as saídas brutas de ferramentas tornam a execução inviável.
3. **Distratores obsoletos:** um erro de compilação já corrigido há dez turnos continua visível e induz o agente a consertar de novo o que já foi resolvido.[^contexto-single-agent]

## Estado estruturado separado do histórico

O agente não deve depender do histórico bruto para saber em que etapa do plano está. A aplicação mantém um objeto de estado fora da janela, em memória, banco ou cache, e o serializa de forma compacta no início de cada turno. O exemplo da fonte registra objetivo, causa raiz identificada, arquivos modificados e próximo passo ou bloqueio.[^contexto-single-agent]

O histórico é verboso e descartável; o scratchpad é conciso e persiste durante a execução. Na tabela de planos de memória de Segundo Cérebro Git-Native para Agentes de Código, o scratchpad é uma disciplina para o plano de trabalho, cuja falha descrita é justamente transbordar e enterrar o essencial no meio da janela. Specs e tickets cumprem papel parecido entre sessões, como em Spec-Driven Development para Agentes de Código; o scratchpad atua dentro de uma mesma sessão.

## Poda e compactação

### Mascaramento de observações

A fonte estima que 80% a 90% dos tokens em fluxos de engenharia de software e análise de dados vêm de saídas de ferramentas. A regra dos dois turnos parte de que a saída completa só é necessária no turno seguinte à chamada, quando o modelo raciocina sobre ela. Depois da decisão, o conteúdo bruto é substituído retroativamente por uma linha com volume, status e conclusão. No exemplo, 450 linhas de log de testes viram um registro de que um teste falhou e já foi analisado no passo seguinte.[^contexto-single-agent]

### Janela deslizante ancorada

Para tarefas de 30 turnos ou mais, o prompt é montado em quatro blocos:

1. **Âncora estática**, nunca podada: prompt de sistema e tarefa original do usuário.
2. **Estado consolidado**: o scratchpad com arquivos modificados, hipóteses descartadas e plano.
3. **Sumário da trajetória**: resumo do que foi tentado e concluído nos turnos antigos.
4. **Buffer local**: os últimos dois ou três turnos intactos, com a saída de ferramenta mais recente.[^contexto-single-agent]

### Leitura sob demanda

Em vez de carregar arquivos inteiros, o agente lê trechos delimitados por offset e limite e usa busca textual ou por símbolo para localizar o trecho relevante antes de trazer linhas para o contexto.[^contexto-single-agent] É o mesmo princípio de progressive disclosure de Arquitetura de Contexto para Agentes de IA, aplicado ao material operacional, e da recuperação por trecho em Livros como Skills Consultáveis.

## Montagem do prompt a cada turno

A aplicação orquestradora segue um pipeline determinístico. Carrega o prompt de sistema, injeta o enunciado da tarefa e serializa o scratchpad. Se o histórico passar de um limiar de segurança, 60% no exemplo da fonte, os turnos antigos são compactados em um sumário cronológico; abaixo dele, aplica-se o mascaramento às saídas antigas de ferramentas. Por fim, anexa os últimos dois ou três turnos e dispara a inferência.[^contexto-single-agent]

## Retenção por tipo de dado

| Dado | Ciclo de vida | Motivo |
| --- | --- | --- |
| Instrução inicial do usuário | Retida sempre | Evita desvio de objetivo |
| Arquivos alterados ou criados | Persistidos no scratchpad | Informa o estado sem reler logs de escrita |
| Logs de compilador e testes | Podados após 1 ou 2 turnos | Volume alto e ruído depois da correção |
| Conteúdo de arquivos inspecionados | Descartado ou paginado | Basta extrair a linha ou o método relevante |
| Tentativas anteriores que falharam | Resumidas em uma frase | Evita repetir o erro sem carregar detalhes mortos |

A tabela resume a matriz de retenção da fonte.[^contexto-single-agent]

## Relação com a delegação

Benchmarks de Single-Agent versus Multi-Agent recomenda manter tarefas sequenciais dependentes de estado em um agente único e aponta a saturação de contexto como a exceção em que multiagentes voltam a competir. Este artigo é o complemento operacional. Em vez de dividir uma cadeia sequencial para aliviar a janela e pagar a perda de cada handoff, a aplicação controla o que permanece nela. Delegar a subagents continua indicado quando o trabalho é desacoplado, como discutido em Skills e Subagents no Workflow de Coding com IA.

## Quando a sessão não comporta a tarefa

Os padrões desta página mantêm a tarefa em uma única sessão. Quando a sequência excede a janela útil mesmo com poda, [Checkpoint em Disco e Sessões Efêmeras](./disk-checkpoint-reset-loop.md) grava o equivalente ao scratchpad em arquivos e reinicia a sessão em marcos validados. [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md) expõe ao modelo o consumo de contexto que ele não percebe sozinho, e [Execução de Tarefas Longas com Agentes](./long-task-execution.md) compara as estratégias.

## Limites da fonte

O artigo não informa autor, data nem URLs. As referências a SWE-agent, *Lost in the Middle*, um texto de engenharia da Anthropic e a arquitetura do Aider não indicam qual afirmação cada uma sustenta. Os limiares de 15 mil a 30 mil tokens, a fatia de 80% a 90% de tokens de ferramentas e o gatilho de 60% não vêm acompanhados de medição.

A wiki já registra outras heurísticas de ocupação: 40% de uma janela de 200 mil tokens em Arquitetura de Contexto para Agentes de IA e a "smart zone" de 140 mil tokens em Spec-Driven Development para Agentes de Código. Elas diferem por até uma ordem de grandeza, e nenhuma deve ser tratada como propriedade geral dos modelos. Os exemplos em .NET da fonte são ilustrativos.

## Ver também

- Benchmarks de Single-Agent versus Multi-Agent — por que tarefas sequenciais dependentes de estado ficam melhor em um agente único.
- Arquitetura de Contexto para Agentes de IA — progressive disclosure e distribuição do contexto entre camadas.
- Segundo Cérebro Git-Native para Agentes de Código — planos de memória procedural, de trabalho e institucional.
- Operação Segura e Eficiente do Claude Code — compactação deliberada e ramificação de conversa no uso do Claude Code.
- [Checkpoint em Disco e Sessões Efêmeras](./disk-checkpoint-reset-loop.md) — reinício da sessão com plano e estado em arquivos.
- [Execução de Tarefas Longas com Agentes](./long-task-execution.md) — quando compactar, reiniciar ou delegar.

# Citations

[^contexto-single-agent]: Gerenciamento de Contexto em Single-Agent: Padrões de Poda, Estado Estruturado e Mitigação de Context Bloat (LLMwiki, `raw/gerenciamento_contexto_single_agent.md`).
