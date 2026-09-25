---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
  - "*.ts"
---

# Coding Standards

These rules apply to all ContextBrake TypeScript code, including harness adapters and tests, unless a documented technical constraint says otherwise.

## Do Not Add Comments

Do not add comments to code. Names express intent, and small functions explain the flow. A comment is allowed only when the code cannot express the reason, such as a complex regular expression or a workaround for a documented harness limitation.

## Limit Classes and Files to 100 Lines

Classes and `.ts` files have at most 100 lines. When a file reaches the limit, extract a cohesive responsibility into its own file, such as moving a harness payload schema out of the adapter that uses it.

## Limit Methods and Functions to 30 Lines

Methods and functions have at most 30 lines. Split larger behavior into private methods or helper functions, each with a single responsibility.

```ts
async function installIntegration(adapter: HarnessAdapter, project: Project): Promise<InstallResult> {
  const config = await adapter.readConfig(project);
  const changes = adapter.planIntegration(config);
  await project.applyChanges(changes);
  return { harness: adapter.id, supportLevel: adapter.supportLevel(config) };
}
```

## Prefer Guard Clauses

Do not nest more than three levels of `if`/`else`. Handle invalid or exceptional cases first with guard clauses and early returns, and keep the success path at the lowest indentation level.

Avoid:

```ts
function findActiveStep(plan?: TaskPlan): PlanStep | undefined {
  if (plan) {
    if (!isPlanComplete(plan)) {
      if (plan.steps.length > 0) {
        return plan.steps.find((step: PlanStep) => step.status === 'IN_PROGRESS');
      }
    }
  }
  return undefined;
}
```

Prefer:

```ts
function findActiveStep(plan?: TaskPlan): PlanStep | undefined {
  if (!plan || isPlanComplete(plan)) {
    return undefined;
  }
  return plan.steps.find((step: PlanStep) => step.status === 'IN_PROGRESS');
}
```

## Limit Parameters to Three

Avoid functions with more than three parameters. Group values that belong to one context into a named parameter object that represents a domain concept, not a bag of unrelated values.

Avoid:

```ts
function formatTelemetry(turn: number, redStartTurn: number, usagePercentage: number, zone: Zone): string {
  return renderTelemetryBlock({ turn, redStartTurn, usagePercentage, zone });
}
```

Prefer:

```ts
type TelemetrySnapshot = {
  turn: number;
  redStartTurn: number;
  usagePercentage: number;
  zone: Zone;
};

function formatTelemetry(snapshot: TelemetrySnapshot): string {
  return renderTelemetryBlock(snapshot);
}
```

## Avoid Blank Lines Inside Functions

Do not leave blank lines inside methods and functions; extract functions instead. Blank lines are allowed between class members and between top-level declarations.

## Name Magic Numbers and Strings

Give business values a name. Zone and turn limits come from configuration defaults defined once; exit codes, marker strings, file names, and schema versions are named constants.

Avoid:

```ts
if (usage.percentage >= 75) {
  return 'CRITICAL';
}
```

Prefer:

```ts
if (usage.percentage >= zones.criticalPercentage) {
  return 'CRITICAL';
}
```

## Declare Variables Close to Their Use

Declare each variable right before the code that uses it, not at the top of a long function.

## Keep Sensitive Data Out of Code and Logs

ContextBrake needs no credentials. Never put API keys, tokens, passwords, or credentials in code, test fixtures, or documentation examples.

Never write prompt content, model responses, or tool output to logs, error messages, or local files; record only metadata such as session, harness, tool, zone, and reason.
