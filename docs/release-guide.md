# Guia Operacional de Release e Publicação no npm

Este guia documenta o procedimento completo para configuração de credenciais, execução de releases e manutenção do pipeline de entrega contínua do ContextBrake (`context-brake`).

---

## 1. Visão Geral da Arquitetura de Release

O ContextBrake adota um fluxo de release 100% automatizado via GitHub Actions (`.github/workflows/release.yml`), incorporando as seguintes garantias de segurança e integridade:

- **Automação por Tags Git**: Disparado automaticamente ao enviar uma tag Git no padrão `vX.Y.Z` (ou manualmente via `workflow_dispatch`).
- **Validação Pré-Publicação Estrita**: Execução sequencial de todos os gates (`schemas:check`, `dependencies:check`, `build`, `typecheck`, `lint`, `test`, `coverage`, `package:smoke`). Se qualquer verificação falhar, o pipeline aborta imediatamente sem publicar nenhum artefato.
- **Sincronia Estrita de Versão**: O script `scripts/check-release-tag.ts` valida que a versão da tag Git (sem prefixo `v`) coincide com o campo `"version"` do `package.json`.
- **npm Provenance com OIDC**: Publicação com atestação criptográfica de procedência (*SLSA / Sigstore*) utilizando a permissão `id-token: write` do GitHub Actions, comprovando publicamente no registro do npm que o pacote foi construído a partir do commit exato do repositório oficial.
- **GitHub Releases Automáticas**: Geração automática de release no GitHub com notas e changelog estruturados a partir dos commits.

---

## 2. Configuração de Credenciais e Segredos (Passo Único Inicial)

Antes do primeiro release pelo GitHub Actions, o mantenedor deve provisionar o token de autenticação no registro npm e adicioná-lo como segredo protegido no GitHub.

### 2.1. Criação do Token no npmjs.com

1. Acesse sua conta com privilégios de mantenedor em [npmjs.com](https://www.npmjs.com/).
2. No menu superior direito do usuário, clique em **Access Tokens**.
3. Clique em **Generate New Token**:
   - **Opção Recomendada (Granular Access Token)**:
     - **Token name**: `context-brake-github-release`
     - **Expiration**: Selecione a validade desejada (ex: 90 dias ou 1 ano).
     - **Permissions**: Selecione **Read and write** exclusivamente para o pacote ou escopo do pacote `context-brake`.
     - **IP allowlist**: Opcional (não preencher caso utilize runners públicos do GitHub Actions).
   - **Opção Alternativa (Classic Automation Token)**:
     - Caso utilize token clássico, selecione o tipo **Automation**. Esse tipo é projetado para CI/CD e não exige código 2FA interativo no momento do `npm publish`.
4. Copie o valor do token gerado imediatamente (ele não será exibido novamente).

### 2.2. Requisitos de Autenticação em Duas Etapas (2FA)

- Contas de mantenedores no npm devem ter autenticação em duas etapas (2FA) habilitada.
- Ao usar tokens do tipo *Granular Access Token* ou *Automation*, o npm autoriza publicações não-interativas originadas de pipelines de CI/CD sem bloquear por prompt de OTP no terminal.

### 2.3. Adição do Segredo no Repositório GitHub

1. No repositório do ContextBrake no GitHub, navegue até:
   **Settings** → **Secrets and variables** → **Actions**.
2. Clique no botão **New repository secret**.
3. Preencha os campos:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Cole o token gerado no npmjs.com.
4. Clique em **Add secret** para salvar.

> [!IMPORTANT]
> O GitHub Actions mascara automaticamente o valor do secret `NPM_TOKEN` nos logs da esteira. O pipeline acessa o token estritamente via variável de ambiente `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` na etapa de publicação.

---

## 3. Procedimento Passo a Passo para Realizar um Release

### Passo 1: Executar Verificação Pré-Release Local

Antes de criar qualquer tag ou commit, certifique-se de que todas as validações passam localmente na sua máquina:

```bash
npm run release:check
```

Esse comando executa localmente o mesmo conjunto estrito de gates que o GitHub Actions executará na nuvem.

### Passo 2: Atualizar a Versão no `package.json`

Atualize o campo `"version"` no `package.json` de acordo com os princípios de Versionamento Semântico (SemVer):

- **Patch** (`1.0.1`): Correções de bugs retrocompatíveis.
- **Minor** (`1.1.0`): Novas funcionalidades retrocompatíveis.
- **Major** (`2.0.0`): Modificações incompatíveis com versões anteriores.

Exemplo:
```json
{
  "name": "context-brake",
  "version": "1.1.0"
}
```

Faça o commit da alteração de versão:
```bash
git add package.json
git commit -m "chore(release): bump version to 1.1.0"
git push origin main
```

### Passo 3: Criar e Enviar a Tag Git

Crie a tag anotada com o prefixo `v` seguido da versão exata configurada no `package.json`:

```bash
git tag v1.1.0
git push origin v1.1.0
```

> [!WARNING]
> A tag deve coincidir estritamente com a versão do `package.json` (ex: tag `v1.1.0` exige versão `"1.1.0"`). Se houver discrepância, o pipeline abortará com erro antes de qualquer publicação.

### Passo 4: Acompanhar a Execução do Workflow

1. No GitHub, abra a aba **Actions** e selecione o workflow **Release**.
2. Observe o job **Release and Publish**. As seguintes etapas serão executadas em sequência:
   - Checkout do código e Setup do Node 20 com cache npm;
   - `npm ci --ignore-scripts`;
   - Checagem de integridade de schemas e scripts de instalação;
   - Build TypeScript e compilação de assets de runtime;
   - Typecheck e Lint;
   - Testes unitários e de integração com medição de cobertura;
   - Teste de fumaça de empacotamento (`package:smoke`);
   - Validação da tag via `scripts/check-release-tag.ts`;
   - Publicação autenticada com provenance no npm;
   - Criação da GitHub Release associada à tag.

---

## 4. Disparo Manual do Release (`workflow_dispatch`)

Caso seja necessário disparar o release manualmente sob demanda (por exemplo, após um re-execução de pipeline ou em manutenção programada):

1. Vá para a aba **Actions** no repositório GitHub.
2. Na lista lateral esquerda, clique em **Release**.
3. No painel superior direito, clique em **Run workflow**.
4. No campo **Git tag to release (e.g. v1.0.0)**, informe a tag desejada.
5. Clique no botão verde **Run workflow**.

---

## 5. Verificação Pós-Publicação

Após a conclusão bem-sucedida do workflow:

1. **Página do Pacote no npmjs.com**:
   - Acesse `https://www.npmjs.com/package/context-brake`.
   - Confirme que a versão mais recente está listada como `latest`.
   - Verifique o selo verde **Provenance** ao lado da versão, confirmando o atestado público de procedência do GitHub Actions.
2. **Releases no GitHub**:
   - Acesse a aba **Releases** do repositório (`https://github.com/dougcunha/context-brake/releases`).
   - Verifique que a release correspondente à tag foi criada com as notas de release geradas automaticamente.
3. **Instalação Limpa**:
   - Teste a execução do binário via npm/npx em um terminal limpo:
     ```bash
     npx context-brake@latest doctor
     ```

---

## 6. Diagnóstico e Resolução de Problemas (Troubleshooting)

| Sintoma | Causa Provável | Solução |
| --- | --- | --- |
| Erro `Tag version "X.Y.Z" does not match package.json version` | A tag Git criada diverge do campo `"version"` no `package.json`. | Corrija o `package.json` ou exclua a tag local e remota (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`) e crie a tag correspondente correta. |
| Erro `403 Forbidden` ou `401 Unauthorized` no step de publicação | Secret `NPM_TOKEN` ausente, expirado ou com permissões insuficientes no npmjs.com. | Verifique se o segredo `NPM_TOKEN` está configurado em *Settings* → *Secrets and variables* → *Actions* e gere um novo token Granular/Automation no npmjs.com com escopo Read/Write. |
| Erro `Cannot publish over existing version` (409 Conflict) | A versão já foi publicada anteriormente no npm. | O registro npm é imutável: versões publicadas não podem ser sobrescritas. Incremente a versão (`patch`, `minor` ou `major`) no `package.json` e crie uma nova tag. |
| Falha no step `Package smoke test` | Arquivos TypeScript não compilados, diretórios proibidos (`tests/`, `tasks/`, `.agents/`) ou arquivos ausentes na lista `files` do `package.json`. | Execute `npm run package:smoke` localmente para identificar o arquivo divergente e ajuste o `package.json` ou scripts de build. |
| Falha nos testes de cobertura | Cobertura de código ficou abaixo do piso mínimo de 80% configurado no `vitest.config.ts`. | Adicione testes unitários para cobrir os novos branches ou arquivos antes de gerar a tag. |
