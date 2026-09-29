export const ZONES = ['GREEN', 'YELLOW', 'RED', 'CRITICAL'] as const;
export const USAGE_SOURCES = ['measured', 'estimated'] as const;
export const SNAPSHOT_TRIGGER_ZONES = ['YELLOW', 'RED'] as const;
export const WINDOW_ORIGINS = ['harness', 'declared', 'config'] as const;

export type Zone = (typeof ZONES)[number];
export type UsageSource = (typeof USAGE_SOURCES)[number];
export type WindowOrigin = (typeof WINDOW_ORIGINS)[number];

export type UsageReading = {
  readonly source: UsageSource;
  readonly usedTokens: number | null;
  readonly windowTokens: number;
  readonly measuredTokens: number | null;
  readonly windowOrigin: WindowOrigin;
};

export type ZoneInput = {
  readonly usagePercentage: number;
  readonly turns: number;
};
