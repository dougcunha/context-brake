# Pesquisa de apoio

Material de referência copiado ou derivado da base de conhecimento do autor (LLMwiki) em 13 de setembro de 2026, para implementar o ContextBrake sem consultar a base original. Os requisitos vigentes estão nos PRDs em `tasks/`; em caso de conflito, o PRD prevalece.

| Arquivo | Conteúdo | Quando ler | Manutenção |
| --- | --- | --- | --- |
| [harness-integrations.md](./harness-integrations.md) | APIs de hooks e plugins dos oito harnesses do MVP e dos harnesses excluídos | Antes de implementar ou alterar um adaptador | Mantido aqui; atualizar ao reconferir um harness |
| [contextops-srs-original.md](./contextops-srs-original.md) | Especificação original: módulos, esquemas, pseudocódigo do hook e roteiro | Ao desenhar esquemas e escrever a TechSpec | Cópia congelada, substituída pelos PRDs |
| [contextops-spec-review.md](./contextops-spec-review.md) | Análise da especificação original e das suas inconsistências | Ao escrever a TechSpec, para não repetir os erros | Cópia congelada |
| [telemetry-self-pacing.md](./telemetry-self-pacing.md) | Padrão de zonas, telemetria e guilhotina | Ao implementar telemetria e bloqueio | Cópia congelada |
| [disk-checkpoint-reset-loop.md](./disk-checkpoint-reset-loop.md) | Padrão de checkpoint em disco e sessões efêmeras | Ao implementar plano, checkpoint e boot | Cópia congelada |
| [long-task-execution.md](./long-task-execution.md) | Síntese sobre delegar, compactar ou reiniciar, com limiares e custo do boot | Ao calibrar valores padrão e ao trabalhar no runner | Cópia congelada |
| [single-agent-context-management.md](./single-agent-context-management.md) | Scratchpad, poda de saídas de ferramentas e compactação | Ao desenhar o resumo de boot | Cópia congelada |

As cópias congeladas preservam o texto da data da cópia; links para páginas que não foram copiadas viraram texto simples. Não versione cópias integrais da documentação dos fornecedores de harness neste repositório.
