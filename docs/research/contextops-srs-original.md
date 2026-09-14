# Especificação de Requisitos de Software (SRS): ContextOps CLI / Tooling

> Cópia congelada de *Especificação de Requisitos de Software (SRS): ContextOps CLI / Tooling* (LLMwiki, `raw/contextops_srs_spec.md`), feita em 13 de setembro de 2026. Os requisitos vigentes estão nos PRDs em `tasks/`.
>
> Substituída pelos PRDs; mantida pelos esquemas, pelo pseudocódigo do hook e pelo roteiro. As inconsistências conhecidas estão em [contextops-spec-review.md](./contextops-spec-review.md).

**Nome do Projeto (Sugerido):** `contextops` (ou `@contextops/core`)  
**Paradigma de Desenvolvimento:** Spec-Driven Development (SDD)  
**Versão da Especificação:** 1.0.0  
**Data:** 12 de Setembro de 2026  
**Status:** Pronto para Implementação (RFC / Ready for Dev)

---

## 1. Visão Geral e Propósito

### 1.1. Contexto do Problema
O desenvolvimento assistido por agentes autônomos em tarefas de longa duração (*long-horizon tasks*) sofre com **Context Bloat**, degradação de atenção (*Lost-in-the-Middle*) e custos cumulativos de tokens. A solução canônica é a execução efêmera guiada por checkpoints (*Checkpoint-Driven Ephemeral Execution / Reset Loop* com `/new`). No entanto, modelos de linguagem não possuem consciência intrínseca de telemetria de runtime (consumo de tokens da janela e contagem de turnos) e continuam executando até o esgotamento abrupto do contexto ou alucinação cumulativa.

### 1.2. Propósito do Sistema
O `contextops` é uma ferramenta CLI multiplataforma (Node.js / Bun / TypeScript) projetada para:
1. Detectar automaticamente os *harnesses* / agentes de terminal instalados no ambiente (ex.: Claude Code, Aider, OpenHands/SWE-agent, Cursor CLI, Copilot CLI).
2. Configurar e instalar de forma determinística e não intrusiva os *hooks* / middlewares necessários para interceptar e injetar telemetria nos retornos de ferramentas (*Tool Outputs*).
3. Atualizar/injetar nos arquivos de instrução do projeto (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc.) as diretrizes operacionais de auto-parada (*Self-Paced Checkpointing*), gerenciamento de zonas (Verde, Amarela, Vermelha) e manutenção dos arquivos em disco (`task_plan.json` e `state_checkpoint.json`).
4. Oferecer um arquivo de configuração central (`.contextopsrc.json` / `contextops.config.json`) para calibrar limiares de alerta e guilhotina determinística (*Host Intercept*).

---

## 2. Requisitos Funcionais (FR)

### Módulo 1: CLI e Descoberta de Ambiente (Discovery Engine)
* **FR-01 (Detecção Automática de Harnesses):**
  * O comando `contextops init` deve escanear o workspace e o ambiente global (`PATH`, diretórios de configuração do usuário) para identificar os harnesses ativos:
    * **Claude Code:** Detectado via presença de `.claude/`, `CLAUDE.md` ou binário `claude` no `PATH`.
    * **Aider:** Detectado via `.aider.conf.yml`, `.aider.chat.history.md` ou binário `aider` no `PATH`.
    * **Cursor / Windsurf:** Detectado via `.cursorrules`, diretório `.cursor/` ou `.windsurfrules`.
    * **OpenHands / SWE-agent:** Detectado via diretórios de configuração locais ou variáveis de ambiente dedicadas.
    * **Generic / Custom CLI:** Permite modo explícito `--harness=<nome>`.
* **FR-02 (Relatório de Diagnóstico):**
  * O comando `contextops doctor` deve exibir a lista de harnesses detectados, o status de instalação dos hooks em cada um, os limites de contexto configurados e a integridade dos arquivos de instrução.

---

### Módulo 2: Gerenciamento de Hooks e Interceptação (Hook Injector)
* **FR-03 (Instalação Não-Intrusiva de Hooks):**
  * O sistema deve registrar scripts de hooks específicos conforme a API permitida por cada harness:
    * *Claude Code:* Registrar script de hook em `.claude/hooks/` (ex: hook `post_tool_execution` ou wrapper de comando bash).
    * *Aider:* Configurar wrapper de entrada/execução via `--env-file` ou comando pré-prompt / git hook de checkpoint.
    * *Harnesses baseados em Node/TS:* Injetar middleware via export de wrapper em TypeScript.
* **FR-04 (Injeção de Telemetria Dinâmica):**
  * O hook interceptor deve prefixar ou sufixar todo retorno bruto de execução de ferramenta com o bloco padronizado:
    ```text
    --- [CONTEXTOPS TELEMETRY] ---
    Session Turns: {current_turn} / {max_turns}
    Estimated Context Usage: {tokens_used} / {context_limit} ({percentage}%)
    Status Zone: {GREEN | YELLOW | RED}
    Threshold Action: {NORMAL | PREPARE_CHECKPOINT | HARD_STOP_NOW}
    ------------------------------
    ```
* **FR-05 (Gatilho Configurável de Injeção):**
  * A injeção pode ser ativada permanentemente ou apenas a partir de uma faixa configurada (ex: somente após atingir a Zona Amarela, economizando tokens durante a fase inicial).
* **FR-06 (Host Intercept / Guilhotina Determinística):**
  * Caso o harness permita bloqueio pré-execução (`pre_tool_execution`), o hook deve validar se o consumo ultrapassou o teto crítico (ex.: > 70% ou > limite de turnos).
  * Se ultrapassado, a ferramenta analítica chamada pelo modelo é cancelada e o runner devolve um `EMERGENCY_FLUSH_PROMPT`, forçando o salvamento de `state_checkpoint.json` e encerramento imediato.

---

### Módulo 3: Gerenciamento de Instruções do Agente (Doc & Skill Injector)
* **FR-07 (Atualização de `AGENTS.md` e `CLAUDE.md`):**
  * O `contextops init` deve verificar a presença de `AGENTS.md` e `CLAUDE.md`. Se não existirem, criá-los; se existirem, realizar a fusão idempotente (*upsert*) usando marcadores HTML/comentários delimitadores:
    ```markdown
    <!-- CONTEXTOPS:START -->
    ... instruções gerenciadas pela CLI ...
    <!-- CONTEXTOPS:END -->
    ```
* **FR-08 (Referência a Skill / Instrução Canônica):**
  * Deve injetar a referência ao arquivo de protocolo: `docs/contextops-protocol.md` (ou embutir o bloco direto, configurável).
  * As instruções devem ditar com precisão:
    1. A interpretação do semáforo de zonas (Verde, Amarela, Vermelha).
    2. Como ler e atualizar o `task_plan.json` em cada ciclo.
    3. Como estruturar a memória de trabalho no `state_checkpoint.json`.
    4. O comando de encerramento cooperativo para que o usuário ou o runner dê `/new` (ex.: emitir o token textual `[REQUEST_SESSION_RESET]`).

---

### Módulo 4: Gerador de Scaffolding de Arquivos de Estado
* **FR-09 (Criação do Modelo de Estado Inicial):**
  * O comando `contextops plan init --task="<nome_da_tarefa>"` deve gerar a estrutura de diretórios e arquivos em `.contextops/` ou na raiz do projeto:
    * `task_plan.json`: Esqueleto inicial com etapas enumeradas e comandos de validação.
    * `state_checkpoint.json`: Memória de trabalho zerada com metadados de Git.

---

## 3. Requisitos Não Funcionais (NFR)

* **NFR-01 (Desempenho e Latência de Overhead):** O hook de interceptação de ferramentas não pode adicionar mais de 15ms de latência à execução do comando.
* **NFR-02 (Idempotência):** Executar `contextops init` múltiplas vezes não deve duplicar seções em `CLAUDE.md`, corromper arquivos existentes ou gerar hooks redundantes.
* **NFR-03 (Independência de Provedor de LLM):** O sistema deve operar como agnóstico de modelo (Claude, OpenAI, DeepSeek, Qwen), padronizando a telemetria em formato textual compreensível por qualquer LLM de ponta.
* **NFR-04 (Multiplataforma):** Suporte integral a Linux, macOS e Windows (PowerShell e Git Bash).
* **NFR-05 (Zero Dependências Pesadas):** O runtime do hook deve ser ultra-leve (TS nativo compilado para CJS/ESM ou shell leve que invoca o binário local do `contextops`).

---

## 4. Arquitetura de Dados e Esquemas de Configuração

### 4.1. Arquivo de Configuração do Projeto: `contextops.config.json`
Localizado na raiz do repositório:
```json
{
  "$schema": "https://contextops.dev/schema/v1.json",
  "version": "1.0.0",
  "active_harnesses": ["claude-code", "aider"],
  "telemetry": {
    "injection_mode": "threshold_only",
    "activation_threshold_percentage": 50,
    "context_window_ceiling": 128000,
    "turn_ceiling": 12,
    "zones": {
      "green_max_percentage": 50,
      "yellow_max_percentage": 65,
      "red_critical_percentage": 75
    }
  },
  "state_storage": {
    "plan_file": "./task_plan.json",
    "checkpoint_file": "./state_checkpoint.json",
    "auto_git_commit": true
  },
  "instruction_files": {
    "targets": ["CLAUDE.md", "AGENTS.md"],
    "strategy": "inject_block"
  }
}
```

### 4.2. Esquema do `task_plan.json`
```json
{
  "$schema": "https://contextops.dev/schemas/task_plan.v1.json",
  "task_id": "STRING",
  "title": "STRING",
  "current_step_id": 1,
  "steps": [
    {
      "id": 1,
      "title": "STRING",
      "description": "STRING",
      "status": "PENDING | IN_PROGRESS | COMPLETED | FAILED",
      "validation_command": "STRING",
      "artifacts_produced": ["STRING"]
    }
  ]
}
```

### 4.3. Esquema do `state_checkpoint.json`
```json
{
  "$schema": "https://contextops.dev/schemas/checkpoint.v1.json",
  "task_id": "STRING",
  "active_step_id": 1,
  "git_state": {
    "branch": "STRING",
    "last_commit_hash": "STRING",
    "clean_working_tree": false
  },
  "working_memory": {
    "discovered_constraints": ["STRING"],
    "decisions_made": ["STRING"],
    "blocked_items": ["STRING"]
  },
  "modified_files": ["STRING"],
  "timestamp": "ISO8601_TIMESTAMP"
}
```

---

## 5. Instrução Injetada em `AGENTS.md` / `CLAUDE.md` (Template)

Este bloco textual é injetado e gerenciado automaticamente pelo `contextops`:

```markdown
<!-- CONTEXTOPS:START -->
## [PROTOCOL] Gestão Autônoma de Contexto & Checkpoints (Reset Loop)

Este projeto utiliza o padrão **Checkpoint-Driven Ephemeral Execution**.
Em cada retorno de ferramenta, um bloco de telemetria `[CONTEXTOPS TELEMETRY]` pode ser injetado informando:
- Turnos na sessão ativa
- Ocupação estimada de contexto
- Zona atual: **VERDE**, **AMARELA** ou **VERMELHA**

### Regras Obrigatórias de Execução:
1. **ZONA VERDE (< 50% de contexto e < 7 turnos):**
   - Execute tarefas normais de planejamento, leitura, edição e testes.
2. **ZONA AMARELA (50% a 65% de contexto OU 8 a 10 turnos):**
   - **Mantenha o foco:** Conclua imediatamente a edição atual. NÃO inicie novas tarefas do `task_plan.json`.
   - Valide o estado atual rodando o comando de teste/compilação do passo.
3. **ZONA VERMELHA (> 65% de contexto OU >= 11 turnos):**
   - **Parada Imediata:** Não execute mais edições.
   - Atualize `task_plan.json` marcando a etapa como `COMPLETED` ou mantendo `IN_PROGRESS` com notas.
   - Escreva o resumo de estado em `state_checkpoint.json`.
   - Se os testes estiverem passando, crie um commit no Git com mensagem prefixada por `checkpoint:`.
   - Finalize sua resposta com a tag explícita: `[REQUEST_SESSION_RESET]` para instruir o reinício limpo (`/new`).

### Protocolo de Boot em Nova Sessão (`/new`):
1. Leia `task_plan.json` e identifique a tarefa ativa.
2. Leia `state_checkpoint.json` para restaurar o estado mental e restrições aprendidas.
3. Verifique o Git (`git status`, `git log -1`).
4. Valide a integridade do código anterior e continue a partir da etapa pendente.
<!-- CONTEXTOPS:END -->
```

---

## 6. Arquitetura do Componente Hook (Exemplo de Implementação)

### 6.1. Pseudo-código do Hook Interceptor (TypeScript/Node)
```typescript
import fs from 'node:fs';
import { loadConfig } from './config';
import { estimateContextTokens } from './token-estimator';

export async function onPostToolExecution(toolName: string, rawOutput: string, sessionState: any): Promise<string> {
  const config = loadConfig();
  sessionState.currentTurn += 1;
  
  const estimatedTokens = estimateContextTokens(sessionState);
  const percentage = Math.round((estimatedTokens / config.telemetry.context_window_ceiling) * 100);

  // Verifica se já deve ativar a telemetria
  if (config.telemetry.injection_mode === 'threshold_only' && percentage < config.telemetry.activation_threshold_percentage) {
    return rawOutput; // Retorno puro sem gastar tokens extras
  }

  let zone = 'GREEN';
  let action = 'NORMAL';

  if (percentage >= config.telemetry.zones.red_critical_percentage || sessionState.currentTurn >= config.telemetry.turn_ceiling) {
    zone = 'RED';
    action = 'HARD_STOP_NOW: Salve state_checkpoint.json e solicite [REQUEST_SESSION_RESET]';
  } else if (percentage >= config.telemetry.zones.yellow_max_percentage) {
    zone = 'YELLOW';
    action = 'PREPARE_CHECKPOINT: Finalize a tarefa atual e não abra novas frentes';
  }

  const telemetryHeader = `
--- [CONTEXTOPS TELEMETRY] ---
Session Turn: ${sessionState.currentTurn} / ${config.telemetry.turn_ceiling}
Context Usage: ~${estimatedTokens.toLocaleString()} / ${config.telemetry.context_window_ceiling.toLocaleString()} tokens (${percentage}%)
Status Zone: ${zone}
Recommended Action: ${action}
------------------------------
`;

  return `${telemetryHeader}\n${rawOutput}`;
}
```

---

## 7. Roteiro de Implementação (SDD Work Breakdown Structure)

1. **Sprint 1: Core Engine & Configuração**
   - Setup do repositório TypeScript (`bun` / `npm`, ESLint, Prettier, Jest/Vitest).
   - Definição dos Schemas Zod para `contextops.config.json`, `task_plan.json` e `state_checkpoint.json`.
   - Implementação do parser e validador de configurações.

2. **Sprint 2: Discovery & File Modifiers**
   - Implementação do módulo `detector.ts` (Claude Code, Aider, Cursor).
   - Implementação do `instruction-manager.ts` para injeção idempotente em `CLAUDE.md` e `AGENTS.md` com marcações HTML.

3. **Sprint 3: Hook Runtime & Telemetria**
   - Implementação do estimador leve de tokens (via `tiktoken` ou modelo heurístico ultrarrápido).
   - Criação dos scripts geradores de hooks para o Claude Code (`.claude/hooks/`) e Aider.
   - Implementação da lógica de zonas (Verde/Amarela/Vermelha).

4. **Sprint 4: CLI Interface & Testes de Integração**
   - Criação dos comandos CLI via `commander` ou `citty`:
     - `contextops init`
     - `contextops doctor`
     - `contextops plan init`
     - `contextops hook wrap -- <command>`
   - Testes unitários de injeção e cenários de idempotência.
   - Documentação de distribuição via `npm install -g contextops` ou `npx contextops init`.