# Telemetria de Contexto e Auto-Parada de Agentes

> Cópia congelada de *Telemetria de Contexto e Auto-Parada de Agentes* (LLMwiki, `wiki/conceitos/telemetria-de-contexto-e-auto-parada.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.

O artigo complementa o [checkpoint em disco](./disk-checkpoint-reset-loop.md): trata de como o agente pode decidir sozinho o momento de salvar o estado e pedir o reinício da sessão. O ponto de partida é que o modelo não percebe o próprio consumo. A aplicação que o executa precisa expor tokens e turnos, dar ao modelo um protocolo de parada e manter uma interrupção determinística para quando ele não obedecer.[^telemetria-auto-parada]

## Cegueira de infraestrutura

Sem ajuda do host, o modelo:

1. não sabe quanto da janela está ocupado;
2. perde a conta de quantos turnos de ferramentas executou em cadeias longas;
3. tende a insistir em consertar um problema difícil até bater no limite de tokens da API, sem salvar o progresso.[^telemetria-auto-parada]

## Duas formas de expor o orçamento

- **Injeção passiva, a recomendada:** o host anexa a toda resposta de ferramenta um bloco com o turno atual e o limite da sessão, os tokens ocupados e a porcentagem da janela, a zona correspondente e o status do último comando. O modelo recebe o dado sem gastar passos.
- **Ferramenta de introspecção:** o modelo chama uma função sem parâmetros que devolve tokens consumidos, turnos restantes e tempo de execução, útil antes de abrir um arquivo grande ou rodar uma suíte longa de testes.[^telemetria-auto-parada]

## Protocolo de zonas

O prompt de sistema traduz a telemetria em comportamento:

| Zona | Condição | Comportamento |
| --- | --- | --- |
| Verde | Contexto abaixo de 50% e menos de 7 turnos | Trabalho normal: descoberta, edição e testes |
| Amarela | Contexto entre 50% e 65% ou 8 a 10 turnos | Pré-finalização: não iniciar passo novo do plano, concluir a edição em andamento e rodar a validação mínima |
| Vermelha | Contexto acima de 65% ou 11 turnos ou mais | Parada imediata: gravar o checkpoint, comitar se o código estiver funcional e pedir o reinício da sessão |

A tabela reproduz as zonas propostas pela fonte.[^telemetria-auto-parada]

## Parada cooperativa com guilhotina

Confiar só na obediência do modelo é tratado como antipadrão *fail-unsafe*: ele pode ignorar a zona vermelha ou insistir em um último conserto. A arquitetura proposta combina parada cooperativa com um limite rígido no host. Abaixo de uma barreira crítica, de 75% da janela ou 12 turnos no exemplo, o modelo decide se pede o reinício. Acima dela, o host intercepta: não executa a chamada de ferramenta pendente, devolve uma mensagem que só permite gravar o checkpoint e pedir o reinício e, por fim, força o commit e abre uma sessão nova.[^telemetria-auto-parada]

As responsabilidades ficam divididas. O host conta os tokens exatos informados pela API, conta turnos, injeta os dados e aplica a guilhotina. O modelo lê a telemetria, reconhece a zona e encerra o raciocínio em um marco coerente, com checkpoint salvo e commit feito.[^telemetria-auto-parada]

## Relação com a wiki

A guilhotina aplica ao orçamento da sessão a mesma ideia de condição de parada que o modelo não pode disputar, discutida para a qualidade do resultado em Grafo de Conhecimento Tipado e ContextPacks. Também se aproxima do degrau de verificação que bloqueia a conclusão por hook em Operação Segura e Eficiente do Claude Code: a regra crítica é imposta pelo harness, não apenas pedida ao modelo. A combinação de telemetria, checkpoint e compactação é discutida em [Execução de Tarefas Longas com Agentes](./long-task-execution.md). [Especificação do ContextOps](./contextops-spec-review.md) propõe uma CLI que instala este padrão por hooks nos harnesses de um projeto.

## Limites da fonte

O artigo não informa autor, data nem referências, e as zonas e barreiras não vêm acompanhadas de medição. As ferramentas `write_checkpoint`, `git_commit` e `request_session_reset` são nomes do exemplo, que o host teria de implementar. Há inconsistências internas:

- o texto chama a ferramenta de introspecção de `get_session_metrics`, mas o exemplo a define como `get_session_budget`;
- a zona verde vale para menos de 7 turnos e a amarela começa em 8, deixando o sétimo turno sem regra;
- os limiares não coincidem com os do artigo de checkpoint, que manda reiniciar entre 50% e 60% da janela e entre 8 e 12 turnos, enquanto aqui a parada obrigatória começa acima de 65% e a guilhotina em 75%.

## Ver também

- [Checkpoint em Disco e Sessões Efêmeras](./disk-checkpoint-reset-loop.md) — o que é salvo e como a sessão seguinte retoma.
- [Execução de Tarefas Longas com Agentes](./long-task-execution.md) — quando compactar, reiniciar ou delegar.
- Operação Segura e Eficiente do Claude Code — hooks e escada de verificação.
- Grafo de Conhecimento Tipado e ContextPacks — condição de parada determinística em loops autônomos.

# Citations

[^telemetria-auto-parada]: Telemetria de Contexto e Autonomia de Interrupção em LLMs: Padrões de Auto-Parada (Self-Paced Checkpointing) (LLMwiki, `raw/telemetria_contexto_autonomia_interrupcao.md`).
