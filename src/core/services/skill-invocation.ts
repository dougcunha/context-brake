export function slashInvocation(skill: string): string {
  return `/${skill}`;
}

export function dollarInvocation(skill: string): string {
  return `$${skill}`;
}

export function skillSlashInvocation(skill: string): string {
  return `/skill:${skill}`;
}

export function sentenceInvocation(skill: string): string {
  return `use the ${skill} skill`;
}
