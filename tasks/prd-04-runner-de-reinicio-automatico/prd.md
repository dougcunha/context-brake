# Documento de Requisitos do Produto (PRD)

## Visão geral

No MVP, o reinício é cooperativo: o agente grava o checkpoint e pede nova sessão, e uma pessoa precisa executar `/clear` ou `/new`. Isso impede trabalho longo sem supervisão contínua. Este PRD, previsto para a fase seguinte ao MVP, define o runner do ContextBrake: um comando que percorre o plano abrindo sessões novas do harness em sequência, reinicia a cada checkpoint, valida o estado entre sessões por conta própria e para com segurança quando algo sai do esperado.

O público são desenvolvedores que querem deixar uma tarefa longa em execução com limites claros de sessões, tempo e tokens. O valor é autonomia com parada previsível: o runner não aceita a palavra do agente sobre o progresso, confere cada passo com o comando de validação e devolve o controle à pessoa quando a validação falha repetidamente. Depende dos PRDs de [instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md), [telemetria e freio](../prd-02-telemetria-zonas-e-freio/prd.md) e [plano, checkpoint e boot](../prd-03-plano-checkpoint-e-boot/prd.md).

## Objetivos

- **Autonomia:** com um harness simulado que reproduz o modo não interativo documentado, um plano de 10 passos que exige várias sessões é concluído sem intervenção humana em todas as execuções simuladas sem falha injetada.
- **Validação independente:** 100% dos avanços de passo são precedidos pela execução bem-sucedida do comando de validação pelo próprio runner.
- **Parada segura:** 100% das execuções interrompidas por sinal do usuário, falha do harness ou condição de parada terminam com plano e checkpoint válidos e sem processo do harness em execução.
- **Limites respeitados:** nenhuma execução ultrapassa os tetos configurados de sessões, duração e tokens.
- **Anti-loop:** quando o mesmo passo falha na validação em sessões consecutivas até o limite configurado, padrão 2, o runner para e pede decisão humana em 100% dos casos.
- **Calibração:** 100% das sessões têm registro local de duração, motivo do encerramento, passo, resultado da validação e tokens de boot e de sessão, medidos ou estimados.

## Histórias de usuário

- US1: Como desenvolvedor, quero iniciar a execução de um plano e deixá-la avançar sozinha pelas sessões necessárias.
- US2: Como desenvolvedor, quero definir tetos de sessões, duração e tokens para a execução.
- US3: Como desenvolvedor, quero que o runner confira cada passo com o comando de validação antes de avançar, sem confiar no status escrito pelo agente.
- US4: Como desenvolvedor, quero que o runner pare e me chame quando o mesmo passo falhar repetidamente.
- US5: Como desenvolvedor que quer checkpoints humanos, quero poder aprovar cada passo antes de o runner seguir.
- US6: Como desenvolvedor, quero interromper a execução e retomá-la depois do ponto em que parou.
- US7: Como desenvolvedor, quero um relatório por sessão para calibrar limites de zona e frequência de reinício.
- US8: Como agente em sessão iniciada pelo runner, quero executar comandos com telemetria anexada mesmo quando o harness não oferece contexto após a ferramenta.
- Casos de borda: autenticação do harness expirada; harness encerrado por erro; agente que marca passos como concluídos no plano; comando de validação que não termina; rede indisponível; plano alterado pela pessoa durante a execução; sessão que termina sem sinal de reinício nem checkpoint.

## Principais funcionalidades

### Execução de sessões

Automatiza o reinício que o MVP deixa para a pessoa.

- RF1: O comando `context-brake run` executa o plano ativo em um harness escolhido, abrindo cada sessão pelo modo não interativo documentado do harness ou pela criação programática de sessão quando a integração a oferecer.
- RF2: Cada sessão começa com o boot definido no PRD de plano, checkpoint e boot.
- RF3: Encerrar a sessão quando o agente emitir o sinal de reinício, quando a sessão atingir o teto crítico ou quando o harness terminar.

### Avanço de passos

- RF4: Após cada sessão, executar o comando de validação do passo ativo e só avançar quando a validação passar.
- RF5: Corrigir no plano o status de passos marcados como concluídos pelo agente sem validação aprovada e registrar a divergência.
- RF6: Encerrar com sucesso quando todos os passos estiverem concluídos e validados.

### Limites e condições de parada

- RF7: Aplicar tetos configuráveis de número de sessões, duração total, duração por sessão e tokens totais, medidos ou estimados.
- RF8: Parar e pedir decisão humana quando o mesmo passo falhar na validação em sessões consecutivas até o limite configurado.
- RF9: Parar quando uma sessão terminar sem checkpoint válido e sem sinal de reinício, preservando o estado para diagnóstico.
- RF10: Aplicar timeout ao comando de validação.

### Aprovação e retomada

- RF11: Oferecer modo com aprovação humana ao fim de cada passo validado.
- RF12: Ao receber sinal de interrupção, encerrar a sessão ativa, garantir plano e checkpoint válidos e sair sem deixar processos do harness.
- RF13: Retomar uma execução interrompida a partir do passo pendente.

### Segurança da execução

- RF14: Na primeira execução de um plano, e sempre que um comando de validação mudar, mostrar os comandos que serão executados e exigir confirmação.
- RF15: Não desativar os modos de permissão do harness por padrão; qualquer modo que dispense aprovações exige opção explícita.

### Telemetria por comando e relatório

- RF16: O comando `context-brake wrap -- <comando>` executa um comando em sessão iniciada pelo runner e anexa à saída a telemetria daquela sessão.
- RF17: Registrar localmente, por sessão, início e fim, motivo do encerramento, passo, resultado da validação, tokens de boot e da sessão com origem da medição, e duração.
- RF18: Ao fim da execução, mostrar resumo com passos concluídos, sessões, duração, tokens e motivo da parada, também em JSON.

## Critérios de aceitação

- CA-01 (US1, RF1, RF2, RF6): Dado um plano válido de 3 passos em harness com modo não interativo, quando o usuário executa `context-brake run`, então o runner abre sessões com boot, conclui os 3 passos validados e termina com código de sucesso.
- CA-02 (US3, RF4): Dada uma sessão encerrada cujo comando de validação do passo ativo falha, quando o runner avalia a sessão, então o passo não avança e a sessão seguinte recebe o mesmo passo com o resultado da validação.
- CA-03 (RF5): Dado um plano em que o agente marcou um passo como concluído e a validação falha, quando o runner avalia a sessão, então o status volta para em andamento e a divergência aparece no registro.
- CA-04 (US4, RF8): Dado limite de falhas igual a 2, quando o mesmo passo falha na validação em duas sessões seguidas, então o runner para, informa o passo e a saída da validação e termina com código de parada para decisão humana.
- CA-05 (US2, RF7): Dado teto de 5 sessões, quando a quinta sessão termina com passos pendentes, então nenhuma sexta sessão é aberta e o resumo informa o teto atingido.
- CA-06 (RF9): Dada uma sessão que termina sem checkpoint válido e sem sinal de reinício, quando o runner avalia a sessão, então a execução para e o estado anterior permanece no disco.
- CA-07 (RF10): Dado um comando de validação que excede o timeout, quando o runner o executa, então o comando é interrompido e a validação conta como falha.
- CA-08 (US5, RF11): Dado o modo de aprovação, quando um passo é validado, então o runner espera confirmação antes de abrir a sessão do passo seguinte.
- CA-09 (US6, RF12, RF13): Dada uma execução em andamento, quando o usuário envia Ctrl+C e depois executa `run` novamente, então nenhum processo do harness permanece da primeira execução e a segunda começa no passo pendente.
- CA-10 (RF14): Dado um plano nunca executado, quando o usuário executa `run` sem confirmar, então nenhum comando de validação é executado e a saída lista os comandos a aprovar.
- CA-11 (RF15): Dada a configuração padrão, quando o runner abre uma sessão, então o modo de permissão do harness é o padrão do próprio harness.
- CA-12 (US8, RF16): Dada uma sessão iniciada pelo runner, quando o agente executa `context-brake wrap -- npm test`, então a saída do comando vem acompanhada do bloco de telemetria daquela sessão.
- CA-13 (US7, RF17, RF18): Dada uma execução concluída, quando o usuário consulta o registro e o resumo JSON, então cada sessão tem duração, motivo do encerramento, passo, resultado da validação e tokens com origem da medição.
- CA-14 (Objetivo de autonomia): Dado um plano simulado de 10 passos executado 20 vezes com o harness simulado, sem falhas injetadas, quando as execuções terminam, então todas concluem o plano sem intervenção humana.

## Experiência do usuário

**Perfis**

- Desenvolvedor que delega uma tarefa longa e acompanha só os pontos de decisão.
- Mantenedor que calibra limites a partir dos registros de sessão.
- Agente em sessão iniciada pelo runner, que recebe boot e telemetria.

**Fluxo principal**

1. O usuário revisa o plano e executa `context-brake run --harness <nome>`.
2. O runner mostra os comandos de validação e pede confirmação na primeira execução.
3. O runner abre a sessão com boot, acompanha até o sinal de reinício ou o teto crítico e valida o passo.
4. O runner avança ou repete o passo e abre a sessão seguinte, mostrando uma linha de progresso por sessão.
5. Ao concluir, parar por limite ou pedir decisão, o runner mostra o resumo e o motivo.

**Diretrizes de UI/UX e acessibilidade**

- Uma linha de progresso por sessão com passo, zona final, resultado da validação e duração, em texto com rótulos, sem depender de cor.
- Pedidos de decisão humana dizem o que aconteceu, a saída relevante da validação e as opções disponíveis.
- Respeitar `NO_COLOR`, funcionar sem TTY e oferecer resumo em JSON.

## Restrições técnicas de alto nível

- **Dependências:** exige os PRDs de instalação, de telemetria e freio e de plano, checkpoint e boot implementados.
- **Harnesses:** só harnesses com modo não interativo documentado ou criação programática de sessão pela integração. Pi e Oh-My-Pi documentam criação de sessão pela extensão; os modos não interativos dos demais harnesses da matriz do [PRD de instalação](../prd-01-instalacao-deteccao-diagnostico/prd.md) devem ser confirmados na TechSpec.
- **Execução de comandos:** o runner executa comandos definidos no plano; a confirmação prévia é obrigatória e não pode ser desligada por arquivo versionado no repositório.
- **Permissões:** respeitar os modos de permissão e de sandbox de cada harness.
- **Privacidade:** registros locais sem conteúdo de prompts, respostas ou saídas completas de ferramentas; nenhum dado sai da máquina além do que o próprio harness já envia ao provedor do modelo.
- **Plataformas:** Linux, macOS e Windows, em PowerShell e Git Bash.
- **Verificação por simulação:** os critérios de execução longa usam um harness simulado que reproduz o modo não interativo documentado; a adesão de modelos reais ao protocolo não é medida.

## Fora do escopo

- Execução paralela de passos ou de vários agentes sobre o mesmo plano.
- Execução em nuvem, agendamento e disparo por CI.
- Geração ou replanejamento automático do plano pelo runner.
- Abertura de pull requests e merge.
- Troca automática de harness ou de modelo durante a execução.
