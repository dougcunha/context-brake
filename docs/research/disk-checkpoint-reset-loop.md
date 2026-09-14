# Checkpoint em Disco e Sessões Efêmeras

> Cópia congelada de *Checkpoint em Disco e Sessões Efêmeras* (LLMwiki, `wiki/conceitos/checkpoint-em-disco-e-sessoes-efemeras.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.

O artigo descreve o *reset loop*, um padrão para sequências de tarefas que com certeza não cabem na janela útil de contexto. Em vez de arrastar o histórico até o limite ou confiar em resumos mantidos em memória, o agente grava o estado em arquivos e a sessão é reiniciada do zero, como um `/new` ou um subprocesso limpo, com base em critérios objetivos.[^checkpoint-sessoes-efemeras]

## Runner determinístico e executor LLM

O padrão separa dois papéis. Um runner em código comum lê o plano, abre cada sessão limpa e monitora os critérios de corte. O LLM executa passos dentro de uma sessão, lê o estado do disco ao começar e o atualiza ao terminar. A sessão seguinte continua do próximo passo sem carregar o histórico anterior.[^checkpoint-sessoes-efemeras]

## Dois artefatos

| Arquivo | Papel | Conteúdo |
| --- | --- | --- |
| `task_plan.json` | Plano mestre, de estrutura estável | Passos numerados com título, status (`PENDING`, `IN_PROGRESS`, `COMPLETED`) e um comando de validação que serve de definição de pronto |
| `state_checkpoint.json` ou `.md` | Memória de trabalho, dinâmica | Passo ativo, branch, último commit, mudanças incompatíveis, restrições descobertas e arquivos tocados |

O comando de validação de cada passo, como um build ou um filtro de testes unitários, permite à sessão seguinte verificar se herdou um estado íntegro. O conhecimento acumulado é o que sobra das sessões anteriores: decisões e restrições, sem as tentativas que levaram a elas.[^checkpoint-sessoes-efemeras]

## Quando reiniciar

A fonte recomenda três gatilhos concorrentes:

| Gatilho | Limiar | Motivo |
| --- | --- | --- |
| Marco lógico | Fim de uma etapa atômica | O sistema está em ponto seguro, compilando e com testes verdes |
| Teto de tokens | 50% a 60% da janela | Evita a zona de lost-in-the-middle e a degradação de atenção |
| Limite de turnos | 8 a 12 turnos de ferramentas | Limita o acúmulo de saídas brutas antes que contaminem a sessão |

A regra central é nunca reiniciar no meio de uma edição que não compila ou não foi validada. Se o teto de tokens disparar no meio de um passo, o agente termina o sub-passo, faz um commit temporário, salva o checkpoint e só então pede o reinício.[^checkpoint-sessoes-efemeras]

## Protocolo de boot

Cada sessão nova recebe um prompt de inicialização fixo, sem histórico conversacional:

1. Ler o plano e localizar o primeiro passo `IN_PROGRESS` ou `PENDING`.
2. Ler o checkpoint para carregar conhecimento acumulado e restrições.
3. Inspecionar o repositório com `git status` e `git log -1`.
4. Executar o comando de validação do passo anterior para confirmar que o estado está íntegro.
5. Executar o próximo passo.
6. Ao concluir, atualizar plano e checkpoint, comitar e sinalizar que a sessão pode ser reiniciada.[^checkpoint-sessoes-efemeras]

## Benefícios alegados

- **Recuperação:** se a conexão cair, a API oscilar ou o agente entrar em loop, o progresso está no git e no checkpoint, e o rollback custa um passo, não a tarefa inteira.
- **Custo linear:** como o histórico é zerado periodicamente, o custo por etapa fica constante em vez de crescer com o acúmulo de turnos.
- **Sem distratores antigos:** erros e tentativas de passos anteriores saem do contexto, e só o aprendizado consolidado segue adiante.[^checkpoint-sessoes-efemeras]

## Relação com a wiki

[Gerenciamento de Contexto em Single-Agent](./single-agent-context-management.md) mantém o estado em um scratchpad dentro da mesma sessão e compacta o histórico. Este padrão leva o scratchpad para o disco e troca a compactação pelo reinício. O sinal de parada que dispara o reinício é tratado em [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md), e a escolha entre as estratégias em [Execução de Tarefas Longas com Agentes](./long-task-execution.md). [Especificação do ContextOps](./contextops-spec-review.md) propõe gerar os dois arquivos e gravar o protocolo de boot nos arquivos de instrução do projeto.

O plano com status e validação por passo é uma forma executável dos tickets de Spec-Driven Development para Agentes de Código. Também tem a forma da fila de itens bem definidos que Workflow de Engenharia Agêntica de Matt Pocock prefere a um loop cego de prompts.

## Limites da fonte

O artigo não informa autor, data nem referências, e os limiares de 50% a 60% da janela e de 8 a 12 turnos aparecem sem medição. A alegação de custo linear não contabiliza o custo de cada boot: reler plano e checkpoint, inspecionar o repositório e rodar a validação do passo anterior. No experimento com Stripe relatado em Skills e Subagents no Workflow de Coding com IA, um worker novo por task foi a estratégia mais lenta e mais cara justamente pelo recarregamento; cortes frequentes demais podem repetir o problema.

O checkpoint é escrito pelo próprio modelo, e a fonte não descreve nenhuma validação do seu conteúdo além do comando de validação do passo. Uma restrição errada registrada no conhecimento acumulado atravessa as sessões como fato. Segundo Cérebro Git-Native para Agentes de Código separa quem propõe de quem grava justamente para que entradas não validadas não ganhem autoridade. Os exemplos em .NET e o sinal `/checkpoint_ready` são convenções ilustrativas do artigo.

## Ver também

- [Execução de Tarefas Longas com Agentes](./long-task-execution.md) — quando compactar, reiniciar ou delegar.
- [Telemetria de Contexto e Auto-Parada de Agentes](./telemetry-self-pacing.md) — como o modelo e o host decidem o momento do reinício.
- [Gerenciamento de Contexto em Single-Agent](./single-agent-context-management.md) — scratchpad e compactação dentro da sessão.
- Spec-Driven Development para Agentes de Código — specs e tickets como memória entre sessões.

# Citations

[^checkpoint-sessoes-efemeras]: Padrão de Arquitetura: Checkpoint em Disco e Sessões Efêmeras (/new) para Tarefas Longas em LLMs (LLMwiki, `raw/padrao_checkpoint_disco_sessoes_efemeras.md`).
