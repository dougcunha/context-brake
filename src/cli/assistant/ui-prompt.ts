export type UiOption = { readonly value: string; readonly label: string; readonly hint?: string };

type UiBase = { readonly message: string; readonly context?: readonly string[] };

export type UiPrompt =
  | (UiBase & { readonly kind: 'multiselect'; readonly options: readonly UiOption[]; readonly initial: readonly string[] })
  | (UiBase & { readonly kind: 'select'; readonly options: readonly UiOption[]; readonly initial: string })
  | (UiBase & { readonly kind: 'confirm'; readonly initial: boolean })
  | (UiBase & { readonly kind: 'text'; readonly placeholder: string });

export type PromptSpec = { readonly line: string; readonly ui?: UiPrompt };
