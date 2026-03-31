# Guia do Usuário do GSD

Referência detalhada de workflows, troubleshooting e configuração. Para setup rápido, veja o [README](../../README.pt-BR.md).

---

## Sumário

- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Contrato de UI](#contrato-de-ui)
- [Backlog e Threads](#backlog-e-threads)
- [Workstreams](#workstreams)
- [Segurança](#segurança)
- [Referência de comandos](#referência-de-comandos)
- [Configuração](#configuração)
- [Exemplos de uso](#exemplos-de-uso)
- [Troubleshooting](#troubleshooting)
- [Recuperação rápida](#recuperação-rápida)

---

## Fluxo de trabalho

Fluxo recomendado por fase:

1. `/gsd-discuss-phase [N]` — trava preferências de implementação
2. `/gsd-ui-phase [N]` — contrato visual para fases frontend
3. `/gsd-plan-phase [N]` — pesquisa + plano + validação
4. `/gsd-execute-phase [N]` — execução em ondas paralelas
5. `/gsd-verify-work [N]` — UAT manual com diagnóstico
6. `/gsd-ship [N]` — cria PR (opcional)

Para iniciar projeto novo:

```bash
/gsd-new-project
```

Para seguir automaticamente o próximo passo:

```bash
/gsd-next
```

### Nyquist Validation

Durante `plan-phase`, o GSD pode mapear requisitos para comandos de teste automáticos antes da implementação. Isso gera `{phase}-VALIDATION.md` e aumenta a confiabilidade de verificação pós-execução.

Desativar:

```json
{
  "workflow": {
    "nyquist_validation": false
  }
}
```

### Modo de discussão por suposições

Com `workflow.discuss_mode: "assumptions"`, o GSD analisa o código antes de perguntar, apresenta suposições estruturadas e pede apenas correções.

---

## Contrato de UI

### Comandos

| Comando | Descrição |
|---------|-----------|
| `/gsd-ui-phase [N]` | Gera contrato de design `UI-SPEC.md` para a fase |
| `/gsd-ui-review [N]` | Auditoria visual retroativa em 6 pilares |

### Quando usar

- Rode `/gsd-ui-phase` depois de `/gsd-discuss-phase` e antes de `/gsd-plan-phase`.
- Rode `/gsd-ui-review` após execução/validação para avaliar qualidade visual e consistência.

### Configurações relacionadas

| Setting | Padrão | O que controla |
|---------|--------|----------------|
| `workflow.ui_phase` | `true` | Gera contratos de UI para fases frontend |
| `workflow.ui_safety_gate` | `true` | Ativa gate de segurança para componentes de registry |

---

## Backlog e Threads

### Backlog (999.x)

Ideias fora da sequência ativa vão para backlog:

```bash
/gsd-add-backlog "Camada GraphQL"
/gsd-add-backlog "Responsividade mobile"
```

Promover/revisar:

```bash
/gsd-review-backlog
```

### Seeds

Seeds guardam ideias futuras com condição de gatilho:

```bash
/gsd-plant-seed "Adicionar colaboração real-time quando infra de WebSocket estiver pronta"
```

### Threads persistentes

Threads são contexto leve entre sessões:

```bash
/gsd-thread
/gsd-thread fix-deploy-key-auth
/gsd-thread "Investigar timeout TCP"
```

---

## Workstreams

Workstreams permitem trabalho paralelo sem colisão de estado de planejamento.

| Comando | Função |
|---------|--------|
| `/gsd-workstreams create <name>` | Cria workstream isolado |
| `/gsd-workstreams switch <name>` | Troca workstream ativo |
| `/gsd-workstreams list` | Lista workstreams |
| `/gsd-workstreams complete <name>` | Finaliza e arquiva workstream |

`workstreams` compartilham o mesmo código/git, mas isolam artefatos de `.planning/`.

---

## Segurança

O GSD aplica defesa em profundidade:

- prevenção de path traversal em entradas de arquivo
- detecção de prompt injection em texto do usuário
- hooks de proteção para escrita em `.planning/`
- scanner CI para padrões de injeção em agentes/workflows/comandos

Para arquivos sensíveis, use deny list no OpenCode.

---

## Referência de comandos

### Fluxo principal

| Comando | Quando usar |
|---------|-------------|
| `/gsd-new-project` | Início de projeto |
| `/gsd-discuss-phase [N]` | Definir preferências antes do plano |
| `/gsd-plan-phase [N]` | Criar e validar planos |
| `/gsd-execute-phase [N]` | Executar planos em ondas |
| `/gsd-verify-work [N]` | UAT manual |
| `/gsd-ship [N]` | Gerar PR da fase |
| `/gsd-next` | Próximo passo automático |

### Gestão e utilidades

| Comando | Quando usar |
|---------|-------------|
| `/gsd-progress` | Ver status atual |
| `/gsd-resume-work` | Retomar sessão |
| `/gsd-pause-work` | Pausar com handoff |
| `/gsd-session-report` | Resumo da sessão |
| `/gsd-quick` | Tarefa ad-hoc com garantias GSD |
| `/gsd-debug [desc]` | Debug sistemático |
| `/gsd-forensics` | Diagnóstico de workflow quebrado |
| `/gsd-settings` | Ajustar workflow/modelos |
| `/gsd-set-profile <profile>` | Troca rápida de perfil |

Para lista completa e flags avançadas, consulte [Command Reference](../COMMANDS.md).

---

## Configuração

Arquivo de configuração: `.planning/config.json`

### Núcleo

| Setting | Opções | Padrão |
|---------|--------|--------|
| `mode` | `interactive`, `yolo` | `interactive` |
| `granularity` | `coarse`, `standard`, `fine` | `standard` |
| `model_profile` | `quality`, `balanced`, `budget`, `inherit` | `balanced` |

### Workflow

| Setting | Padrão |
|---------|--------|
| `workflow.research` | `true` |
| `workflow.plan_check` | `true` |
| `workflow.verifier` | `true` |
| `workflow.nyquist_validation` | `true` |
| `workflow.ui_phase` | `true` |
| `workflow.ui_safety_gate` | `true` |

### Perfis de modelo

| Perfil | Uso recomendado |
|--------|------------------|
| `quality` | trabalho crítico, maior qualidade |
| `balanced` | padrão recomendado |
| `budget` | reduzir custo de tokens |
| `inherit` | seguir modelo da sessão/runtime |

Detalhes completos: [Configuration Reference](../CONFIGURATION.md).

---

## Exemplos de uso

### Projeto novo

```bash
OpenCode --dangerously-skip-permissions
/gsd-new-project
/gsd-discuss-phase 1
/gsd-ui-phase 1
/gsd-plan-phase 1
/gsd-execute-phase 1
/gsd-verify-work 1
/gsd-ship 1
```

### Código já existente

```bash
/gsd-map-codebase
/gsd-new-project
```

### Correção rápida

```bash
/gsd-quick
> "Corrigir botão de login no mobile Safari"
```

### Preparação para release

```bash
/gsd-audit-milestone
/gsd-plan-milestone-gaps
/gsd-complete-milestone
```

---

## Troubleshooting

### "Project already initialized"

`.planning/PROJECT.md` já existe. Apague `.planning/` se quiser reiniciar do zero.

### Sessão longa degradando contexto

Use `/new` entre etapas grandes e retome com `/gsd-resume-work` ou `/gsd-progress`.

### Plano desalinhado

Rode `/gsd-discuss-phase [N]` antes do plano e valide suposições com `/gsd-list-phase-assumptions [N]`.

### Execução falhou ou saiu com stubs

Replaneje com escopo menor (tarefas menores por plano).

### Custo alto

Use perfil budget:

```bash
/gsd-set-profile budget
```

### Runtime não-OpenCode (Codex/OpenCode/Gemini)

Use `resolve_model_ids: "omit"` para deixar o runtime resolver modelos padrão.

---

## Recuperação rápida

| Problema | Solução |
|---------|---------|
| Perdeu contexto | `/gsd-resume-work` ou `/gsd-progress` |
| Fase deu errado | `git revert` + replanejar |
| Precisa alterar escopo | `/gsd-add-phase`, `/gsd-insert-phase`, `/gsd-remove-phase` |
| Bug em workflow | `/gsd-forensics` |
| Correção pontual | `/gsd-quick` |
| Custo alto | `/gsd-set-profile budget` |
| Não sabe próximo passo | `/gsd-next` |

---

## Estrutura de arquivos do projeto

```text
.planning/
  PROJECT.md
  REQUIREMENTS.md
  ROADMAP.md
  STATE.md
  config.json
  MILESTONES.md
  HANDOFF.json
  research/
  reports/
  todos/
  debug/
  codebase/
  phases/
    XX-phase-name/
      XX-YY-PLAN.md
      XX-YY-SUMMARY.md
      CONTEXT.md
      RESEARCH.md
      VERIFICATION.md
      XX-UI-SPEC.md
      XX-UI-REVIEW.md
  ui-reviews/
```

> [!NOTE]
> Esta é a versão pt-BR do guia para uso diário. Para detalhes técnicos exatos e cobertura completa de parâmetros avançados, consulte também o [guia original em inglês](../USER-GUIDE.md).
