# Documento de Requisitos do Produto (PRD)

## Visão geral

Uma tarefa sequencial que não cabe em uma janela precisa atravessar sessões sem perder decisões, restrições e o ponto em que parou. Resumos livres perdem justamente as restrições negativas, e um estado escrito pelo agente pode estar errado. Este PRD define como o ContextBrake mantém esse estado: um plano de passos com comando de validação, um checkpoint estruturado com o estado do git e a memória de trabalho, e um boot que entrega o essencial à sessão nova e exige validar o estado herdado antes de continuar.

O público são desenvolvedores que conduzem tarefas longas com agentes e reiniciam a sessão manualmente quando o [freio](../prd-02-telemetria-zonas-e-freio/prd.md) pede. O valor é retomar do passo certo, com as restrições intactas e o repositório conferido, sem que a pessoa precise repetir contexto a cada `/clear` ou `/new`. O reinício automático fica para o [PRD do runner](../prd-04-runner-de-reinicio-automatico/prd.md).

## Objetivos

- **Retomada rápida:** em sessões simuladas, um agente que usa apenas o boot executa o comando de validação do passo ativo em até 3 chamadas de ferramenta após o início.
- **Estado íntegro:** 100% dos planos e checkpoints inválidos são detectados antes do boot, e nenhum conteúdo inválido é entregue ao agente.
- **Restrições preservadas:** 100% das restrições descobertas registradas no checkpoint aparecem no boot sem resumo.
- **Boot enxuto:** o conteúdo injetado no início da sessão ocupa no máximo 1.000 tokens para um plano de até 20 passos e um checkpoint com até 20 restrições e decisões, com limite configurável.
- **Divergências visíveis:** 100% dos casos de commit do checkpoint ausente, fora do histórico da branch atual ou com árvore de trabalho alterada são apontados no boot.
- **Protocolo executável:** em sessões simuladas que chegam à zona vermelha, um agente que segue o protocolo deixa checkpoint válido e commit com o prefixo `checkpoint:` em todas as sessões, sem bloqueio do freio.

## Histórias de usuário

- US1: Como desenvolvedor, quero criar o plano de uma tarefa com passos e comandos de validação para o agente seguir entre sessões.
- US2: Como agente iniciando uma sessão nova, quero receber o passo ativo, as restrições, as decisões e os bloqueios sem abrir os arquivos inteiros.
- US3: Como desenvolvedor, quero que, depois de `/clear` ou `/new`, a sessão continue do passo pendente sem eu repetir o contexto.
- US4: Como desenvolvedor, quero que a sessão nova confirme com o comando de validação que o estado herdado está íntegro antes de editar código.
- US5: Como desenvolvedor, quero identificar no histórico do git os commits com prefixo `checkpoint:` e poder desligar a instrução de commit.
- US6: Como desenvolvedor, quero ver o progresso da tarefa e a validade dos arquivos de estado com um comando.
- US7: Como desenvolvedor usando um harness sem injeção no início da sessão, quero que o agente ainda encontre a rotina de boot pelo arquivo de protocolo.
- Casos de borda: plano com todos os passos concluídos; passo marcado como falho; passo sem comando de validação; checkpoint com JSON inválido escrito pelo agente; commit do checkpoint que não pertence à branch atual; árvore de trabalho com mudanças não comitadas; repositório sem git; duas sessões usando o mesmo plano.

## Principais funcionalidades

### Criação do plano

Dá à tarefa uma estrutura que sobrevive ao fim da sessão.

- RF1: O comando `context-brake plan init --task="<nome>"` cria plano e checkpoint iniciais no local definido na configuração.
- RF2: Não sobrescrever plano ou checkpoint existentes sem confirmação explícita.
- RF3: O plano inicial traz ao menos um passo de exemplo com status e comando de validação a preencher.

### Conteúdo e validação dos arquivos de estado

Registra o estado em campos próprios, para que decisões e restrições não dependam de um resumo livre.

- RF4: O plano registra identificador e título da tarefa, passo corrente e passos com identificador, título, descrição, status (`PENDING`, `IN_PROGRESS`, `COMPLETED` ou `FAILED`), comando de validação e artefatos produzidos.
- RF5: O checkpoint registra tarefa, passo ativo, estado do git (branch, último commit e árvore limpa), restrições descobertas, decisões tomadas, itens bloqueados, mudanças incompatíveis, arquivos modificados e data da gravação.
- RF6: Publicar schemas versionados dos dois arquivos junto com o pacote.
- RF7: Validar os dois arquivos antes de qualquer uso, incluindo consistência: identificadores únicos, no máximo um passo em andamento e passo ativo do checkpoint existente no plano.
- RF8: Aceitar arquivos de versões anteriores do schema ou informar a migração necessária.

### Boot no início da sessão

Entrega à sessão nova o mínimo para agir, sem manter o protocolo sempre carregado.

- RF9: Nos harnesses que permitem contexto no início da sessão, entregar ao agente, em sessão nova (inclusive após limpar o contexto quando isso abre uma sessão nova), um resumo com tarefa, passo ativo e próximo passo, restrições, decisões e bloqueios, divergências do git e o comando de validação a executar primeiro. Após compactação, reinjetar o boot somente nos harnesses com canal documentado para isso: Claude Code, Codex CLI, Pi e Oh-My-Pi. Cursor e GitHub Copilot CLI continuam com a rotina completa no arquivo de protocolo, sem promessa de reinjeção após compactação.
- RF10: Não entregar boot quando não houver plano ativo ou quando todos os passos estiverem concluídos.
- RF11: Quando plano ou checkpoint forem inválidos, entregar no lugar do boot uma instrução curta apontando o arquivo e o erro.
- RF12: Respeitar o limite de tamanho do boot; ao excedê-lo, reduzir primeiro arquivos modificados e decisões antigas, nunca restrições, e apontar para o checkpoint completo.
- RF13: Manter no arquivo de protocolo a rotina de boot para harnesses sem injeção no início da sessão.

### Verificação do estado herdado

Trata o estado escrito pelo agente como proposta a confirmar.

- RF14: Comparar o checkpoint com o repositório: commit existente, pertencente ao histórico da branch atual e árvore de trabalho limpa.
- RF15: Instruir o agente a executar o comando de validação do passo ativo, ou do último concluído, antes de qualquer edição, e a corrigir o estado se a validação falhar.
- RF16: Funcionar sem git, omitindo as verificações de repositório e informando a omissão.

### Checkpoint e commit

- RF17: O protocolo instrui o agente, na zona vermelha, a atualizar plano e checkpoint e, se a validação passar, a comitar as mudanças de código com o prefixo `checkpoint:` seguido do título do passo; plano e checkpoint não entram no commit.
- RF18: Permitir desligar a instrução de commit pela configuração.

### Status da tarefa

- RF19: O comando `context-brake plan status` mostra passos e status, passo ativo, data e commit do último checkpoint, quantidade de restrições e decisões e a validade dos arquivos.
- RF20: Oferecer saída JSON com os mesmos dados.

## Critérios de aceitação

- CA-01 (US1, RF1, RF3): Dado um repositório com o ContextBrake instalado e sem plano, quando o usuário executa `context-brake plan init --task="refactor-auth"`, então plano e checkpoint válidos são criados com um passo de exemplo.
- CA-02 (RF2): Dado um plano existente, quando o usuário executa `plan init` sem confirmar, então os arquivos permanecem iguais.
- CA-03 (RF7): Dado um plano com dois passos `IN_PROGRESS`, quando o plano é validado, então a validação falha indicando a regra violada.
- CA-04 (RF7, RF11): Dado um checkpoint com JSON inválido, quando uma sessão começa em harness com injeção no início, então o agente recebe só a instrução apontando arquivo e erro, sem conteúdo do checkpoint.
- CA-05 (US2, US3, RF9): Dado um plano com o passo 3 em andamento e um checkpoint com duas restrições, quando o usuário inicia nova conversa, então cada harness com boot suportado entrega tarefa, passo 3, passo 4, as duas restrições e o comando de validação do passo 3. Após compactação, a mesma entrega ocorre em Claude Code, Codex CLI, Pi e Oh-My-Pi; Cursor e GitHub Copilot CLI conservam a rotina no arquivo de protocolo, sem garantia de reinjeção.
- CA-06 (RF10): Dado um plano com todos os passos concluídos, quando uma sessão começa, então nenhum boot é entregue.
- CA-07 (RF12, Objetivo de restrições): Dado um checkpoint cujo resumo excede o limite configurado, quando o boot é gerado, então todas as restrições aparecem integralmente e o conteúdo reduzido aponta para o checkpoint.
- CA-08 (Objetivo de tamanho): Dado um plano com 20 passos e um checkpoint com 20 restrições e decisões, quando o boot é gerado com a configuração padrão, então ele ocupa no máximo 1.000 tokens.
- CA-09 (RF14): Dado um checkpoint cujo commit não pertence ao histórico da branch atual, quando o boot é gerado, então a divergência aparece com o commit registrado e o atual.
- CA-10 (RF14): Dada uma árvore de trabalho com mudanças não comitadas, quando o boot é gerado, então o agente é avisado das mudanças pendentes.
- CA-11 (US4, RF15): Dado um boot entregue em uma sessão simulada, quando um agente simulado que usa apenas o conteúdo do boot inicia a sessão, então o comando de validação indicado é executado em até 3 chamadas de ferramenta, antes de qualquer edição.
- CA-12 (RF16): Dado um repositório sem git, quando o boot é gerado, então ele não traz verificações de repositório e informa que foram omitidas.
- CA-13 (US7, RF13): Dado um harness sem injeção no início da sessão, quando o agente segue a referência do arquivo de instrução, então encontra no arquivo de protocolo a rotina de boot completa.
- CA-14 (US5, RF17, RF18): Dada a configuração padrão, quando o arquivo de protocolo é gerado, então a rotina da zona vermelha instrui o commit com prefixo `checkpoint:`; com a instrução de commit desligada, a rotina não menciona commit.
- CA-15 (US6, RF19, RF20): Dado um plano com 5 passos e 2 concluídos, quando o usuário executa `plan status --json`, então a saída é JSON válido com os 5 passos, o passo ativo e a validade dos arquivos.
- CA-16 (RF8): Dado um checkpoint gravado em versão anterior do schema, quando o boot é gerado, então o arquivo é aceito ou a saída indica a migração necessária.
- CA-17 (Objetivo de protocolo executável): Dadas 20 sessões simuladas em harness de nível completo, quando um agente simulado que segue o protocolo chega à zona vermelha, então todas deixam checkpoint válido e commit com prefixo `checkpoint:`, e a árvore de trabalho continua limpa com plano e checkpoint atualizados.

## Experiência do usuário

**Perfis**

- Desenvolvedor que conduz a tarefa: cria o plano, acompanha o progresso e reinicia a sessão quando o agente pede.
- Agente em sessão nova: precisa do estado mínimo para agir sem reler arquivos inteiros.
- Revisor: lê os commits com prefixo `checkpoint:` para entender o que foi feito entre sessões; plano e checkpoint ficam só na máquina de quem conduz a tarefa.

**Fluxo principal**

1. O usuário cria o plano com `plan init` e ajusta passos e comandos de validação.
2. O agente trabalha no passo ativo; ao chegar à zona vermelha, grava plano e checkpoint, comita e pede reinício.
3. O usuário executa `/clear` ou `/new` no harness.
4. A sessão nova recebe o boot, roda o comando de validação e continua o passo pendente.
5. A qualquer momento, `plan status` mostra o progresso e a validade dos arquivos.

**Diretrizes de UI/UX e acessibilidade**

- Boot em inglês, em Markdown simples, com seções fixas e restrições em lista, não em prosa.
- `plan status` usa rótulos textuais para status, respeita `NO_COLOR` e oferece JSON.
- Mensagens de erro de validação indicam arquivo, caminho do campo e regra violada.

## Restrições técnicas de alto nível

- **Injeção no início da sessão:** depende da matriz de capacidades do [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md). Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi e Oh-My-Pi oferecem esse ponto; somente Claude Code, Codex CLI, Pi e Oh-My-Pi têm canal documentado para reinjeção após compactação. O OpenCode oferece recurso experimental; o Antigravity CLI, um ponto indireto antes da chamada ao modelo.
- **Git:** as verificações de repositório exigem git instalado; sem git, o restante funciona.
- **Estado escrito pelo agente:** plano e checkpoint são tratados como proposta e validados antes de cada uso.
- **Formato:** arquivos locais em JSON, legíveis por pessoas e ignorados pelo git desde a instalação ([PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md), RF24); não são comitados nem compartilhados no repositório.
- **Verificação por simulação:** os critérios que dependem de sessões longas usam sessões simuladas que reproduzem os formatos documentados de cada harness; a adesão de modelos reais ao protocolo não é medida.
- **Privacidade:** o protocolo instrui a não registrar segredos no checkpoint, e a CLI não envia os arquivos para fora da máquina.
- **Plataformas:** Linux, macOS e Windows, em PowerShell e Git Bash.

## Fora do escopo

- Reinício automático de sessões e execução do comando de validação pela própria CLI, tratados no PRD do runner.
- Commits feitos pela própria CLI; quem comita é o agente, seguindo o protocolo.
- Geração automática do plano a partir de uma especificação.
- Bloqueio de concorrência entre duas sessões ou agentes usando o mesmo plano.
- Armazenamento remoto, versionamento no git ou sincronização de plano e checkpoint.
- Integração com gerenciadores de tarefas, como GitHub Issues ou Jira.
- Varredura de segredos no conteúdo do checkpoint.
- Medir a adesão de modelos reais ao protocolo em execuções repetidas.
