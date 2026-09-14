# Execução de Tarefas Longas com Agentes

> Cópia congelada de *Execução de Tarefas Longas com Agentes* (LLMwiki, `wiki/conceitos/execucao-de-tarefas-longas-com-agentes.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.

Uma tarefa que não cabe em uma janela de contexto tem três saídas: dividir partes entre subagents, manter um agente e controlar o que permanece na janela, ou encerrar a sessão e retomar em outra a partir de estado salvo. Esta síntese combina quatro artigos sobre essas escolhas e uma especificação de ferramenta com o que a wiki já registra sobre subagents, specs e memória, e organiza a decisão pela forma da tarefa.

## Primeiro, a forma da tarefa

A pergunta inicial é se as partes dependem umas das outras. Nos estudos reunidos em Benchmarks de Single-Agent versus Multi-Agent, sistemas multiagente ganharam quando as subtarefas eram independentes e perderam acurácia quando cada ação dependia do estado deixado pela anterior.[^benchmarks-single-vs-multi]

- **Partes independentes**, como buscas amplas em fontes distintas, vão para subagents efêmeros que devolvem só um resumo. Trabalho coeso deve ser agrupado em vez de ganhar um worker por item, como discutido em Skills e Subagents no Workflow de Coding com IA.
- **Cadeias dependentes de estado** ficam com um único executor lógico. O problema passa a ser como esse executor atravessa mais trabalho do que cabe em uma janela.

## Três formas de manter uma cadeia sequencial

| Estratégia | Onde fica o estado | Quando cabe | Custo principal |
| --- | --- | --- | --- |
| [Compactação na sessão](./single-agent-context-management.md) | Scratchpad mantido pela aplicação e reinjetado a cada turno | A tarefa cabe em uma sessão se o histórico for podado | Sumários perdem detalhe, e a sessão continua acumulando |
| [Reinício com checkpoint](./disk-checkpoint-reset-loop.md) | Plano e estado em arquivos, com commits no git | A sequência excede com certeza a janela útil | Boot de cada sessão: reler plano, estado e repositório e validar o passo anterior |
| Specs e tickets | Spec, tickets e documentos versionados | Trabalho que atravessa dias, pessoas ou revisões | Artefatos e cerimônia de processo |

As estratégias se combinam. Dentro de cada sessão de um reset loop, o mascaramento de saídas de ferramentas continua valendo.[^contexto-single-agent] O checkpoint em disco é o scratchpad persistido, e o plano com status e comando de validação por passo é uma lista de tickets que um runner consegue percorrer.[^checkpoint-sessoes-efemeras]

## O estado que atravessa cada fronteira

Toda fronteira transforma o contexto com perda, seja um handoff para subagent, um sumário de compactação ou uma sessão nova. Nos benchmarks, resumos de handoff tendem a perder restrições negativas, como "não altere a função X".[^benchmarks-single-vs-multi] Os padrões de agente único reduzem essa perda trocando resumo livre por estado estruturado. O scratchpad registra objetivo, causa raiz, arquivos modificados e próximo passo,[^contexto-single-agent] e o checkpoint separa mudanças incompatíveis, restrições descobertas e o último commit.[^checkpoint-sessoes-efemeras]

Três práticas decorrem disso:

1. **Registrar restrições em campo próprio**, em vez de esperar que sobrevivam a um resumo.
2. **Validar o estado herdado com um comando**, como o boot do reset loop faz ao rodar a validação do passo anterior antes de continuar.[^checkpoint-sessoes-efemeras]
3. **Tratar o estado escrito pelo modelo como proposta.** Um checkpoint errado atravessa as sessões como fato, e a fronteira entre propor e gravar de Segundo Cérebro Git-Native para Agentes de Código vale também para ele.

## Quando cortar

O modelo não percebe quantos tokens ocupou, perde a conta de turnos em cadeias longas e tende a insistir em um conserto difícil até o limite da API.[^telemetria-auto-parada] A decisão de parar precisa de três peças:

- **Sinal:** o host injeta tokens, turnos e zona em cada resposta de ferramenta.
- **Protocolo cooperativo:** o prompt de sistema define uma zona de pré-finalização, em que o agente não começa passo novo, e uma zona de parada, em que grava o checkpoint e pede o reinício.
- **Limite rígido:** acima de uma barreira crítica, o host bloqueia ferramentas e força checkpoint, commit e sessão nova.[^telemetria-auto-parada]

O corte deve cair em um marco validado, com o código compilando. Se o teto disparar no meio de um passo, o agente termina o sub-passo e faz um commit temporário antes de reiniciar.[^checkpoint-sessoes-efemeras] Detalhes em [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md).

A [Especificação do ContextOps](./contextops-spec-review.md) propõe instalar essas peças por hooks em harnesses existentes. Nesse caso, os tokens são estimados por tokenizador ou heurística, e não lidos da API, então as zonas passam a ser aproximadas.[^contextops-spec]

A frequência de corte custa nos dois sentidos. Cortar tarde traz de volta o acúmulo de contexto; cortar cedo demais repete o boot a cada poucas etapas. No experimento com Stripe registrado em Skills e Subagents no Workflow de Coding com IA, um worker novo por task foi a estratégia mais lenta e mais cara por causa do recarregamento. Nenhuma das fontes mede o ponto de equilíbrio.

## Limiares registrados na wiki

| Heurística | Valor | Registrado em |
| --- | --- | --- |
| Ocupação moderada da janela | 40% de 200 mil tokens | Arquitetura de Contexto para Agentes de IA |
| Contexto sob controle | cerca de 200 mil tokens | Spec-Driven Development para Agentes de Código |
| Smart zone | cerca de 140 mil tokens | Spec-Driven Development para Agentes de Código |
| Início da degradação de atenção | 15 mil a 30 mil tokens | [Gerenciamento de Contexto em Single-Agent](./single-agent-context-management.md) |
| Gatilho de compactação | 60% da janela | [Gerenciamento de Contexto em Single-Agent](./single-agent-context-management.md) |
| Teto para reiniciar | 50% a 60% da janela; 8 a 12 turnos de ferramentas | [Checkpoint em Disco e Sessões Efêmeras](./disk-checkpoint-reset-loop.md) |
| Zonas amarela e vermelha e guilhotina | 50% a 65%, acima de 65% e 75% da janela; 8 a 10, 11 ou mais e 12 turnos | [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md) |
| Configuração padrão proposta | injeção a partir de 50%; zonas até 50%, 65% e 75%; teto de 12 turnos; janela de 128 mil tokens | [Especificação do ContextOps](./contextops-spec-review.md) |

Os valores misturam tokens absolutos, porcentagens da janela e turnos de ferramentas, e os absolutos diferem por até uma ordem de grandeza. Nenhum foi medido nas fontes. Trate-os como configuração inicial e calibre com a telemetria do próprio fluxo: tokens por passo, custo de cada boot e frequência com que o estado herdado falha na validação.

## Procedimento

1. Classifique a tarefa: partes independentes vão para subagents com retorno resumido; cadeias dependentes de estado ficam com um executor.
2. Se a cadeia couber em uma sessão com poda, mantenha um scratchpad e resuma saídas de ferramentas depois de usadas.
3. Se não couber, escreva um plano com status e comando de validação por passo e um arquivo de estado com as restrições descobertas.
4. Exponha tokens e turnos ao modelo e defina zonas de pré-finalização e de parada.
5. Imponha no host um limite que o modelo não consiga ignorar, liberando apenas as chamadas necessárias para gravar o estado e comitar.
6. Corte apenas em marcos validados e comite antes de reiniciar.
7. Na sessão nova, valide o estado herdado antes de continuar.
8. Meça o custo de boot e ajuste a frequência de corte.

## Limites

Os quatro artigos não informam autor, data nem URLs, e a especificação do ContextOps é uma proposta sem implementação. Os artigos de contexto, checkpoint e telemetria não apresentam medições próprias, e os números do artigo de benchmarks não foram conferidos nas publicações originais. Nenhuma fonte compara empiricamente compactação na sessão com reinício por checkpoint; a tabela de estratégias é uma organização desta wiki, não um resultado medido.

## Ver também

- Arquitetura de Contexto para Agentes de IA — camadas de contexto e quando delegar.
- Segundo Cérebro Git-Native para Agentes de Código — planos de memória e fronteira de escrita.
- Workflow de Engenharia Agêntica de Matt Pocock — autonomia organizada como fila, com checkpoints humanos.
- Operação Segura e Eficiente do Claude Code — compactação deliberada, hooks e verificação.

# Citations

[^benchmarks-single-vs-multi]: Benchmarks Empíricos: Single-Agent vs. Multi-Agent / Subagentes em LLMs (LLMwiki, `raw/benchmarks_single_vs_multi_agentes.md`).

[^contexto-single-agent]: Gerenciamento de Contexto em Single-Agent: Padrões de Poda, Estado Estruturado e Mitigação de Context Bloat (LLMwiki, `raw/gerenciamento_contexto_single_agent.md`).

[^checkpoint-sessoes-efemeras]: Padrão de Arquitetura: Checkpoint em Disco e Sessões Efêmeras (/new) para Tarefas Longas em LLMs (LLMwiki, `raw/padrao_checkpoint_disco_sessoes_efemeras.md`).

[^telemetria-auto-parada]: Telemetria de Contexto e Autonomia de Interrupção em LLMs: Padrões de Auto-Parada (Self-Paced Checkpointing) (LLMwiki, `raw/telemetria_contexto_autonomia_interrupcao.md`).

[^contextops-spec]: [Especificação de Requisitos de Software (SRS): ContextOps CLI / Tooling](./contextops-srs-original.md).
