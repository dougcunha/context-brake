export type TriggerSetting = { readonly triggerZone: string; readonly triggerPercentage?: number | null | undefined };

export function describeTrigger(setting: TriggerSetting): string {
  const percentage = setting.triggerPercentage ?? null;
  return percentage === null ? setting.triggerZone : `${percentage}% of the context window`;
}
