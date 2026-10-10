import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const GATE_STEPS: readonly string[] = [
  'npm ci --ignore-scripts',
  'npm run schemas:check',
  'npm run dependencies:check',
  'npm run build',
  'npm run typecheck',
  'npm run lint',
  'npm run coverage',
  'npm run package:smoke',
  'scripts/check-release-tag.ts',
  'npm stage publish',
];

async function loadWorkflow(): Promise<string> {
  return readFile(path.resolve('.github/workflows/release.yml'), 'utf8');
}

describe('release workflow (prd-05 TC-05, DEC-07)', () => {
  it('runs on a version tag or a manual dispatch of the requested tag with minimal permissions (FR-01, NFR-01, DEC-01)', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toMatch(/tags:\s*\n\s*-\s*'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+\*'/);
    expect(yaml).toContain('workflow_dispatch:');
    expect(yaml).toContain('ref: ${{ github.event.inputs.tag || github.ref }}');
    expect(yaml).toContain('contents: write');
    expect(yaml).toContain('id-token: write');
  });

  it('runs every pre-release gate in order on ubuntu-latest with Node 20 before publishing (FR-02, FR-03, NFR-04)', async () => {
    const yaml = await loadWorkflow();
    const positions = GATE_STEPS.map((step) => yaml.indexOf(step));
    expect(yaml).toContain('runs-on: ubuntu-latest');
    expect(yaml).toContain('node-version: 20');
    expect(positions.every((position, index) => position > (positions[index - 1] ?? -1))).toBe(true);
  });

  it('stages the npm release with provenance and a masked token, then creates the GitHub release with notes (FR-04, FR-05, NFR-03, DEC-03, DEC-04)', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toContain('node-version: 24');
    expect(yaml).toContain("registry-url: 'https://registry.npmjs.org'");
    expect(yaml).toContain('npm install --global npm@11.20.0');
    expect(yaml).toContain('npm stage publish --access public --provenance');
    expect(yaml).not.toMatch(/run: npm publish/);
    expect(yaml).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
    expect(yaml).toContain('npm stage approve');
    expect(yaml).toContain('gh release create');
    expect(yaml).toContain('--generate-notes');
    expect(yaml).toContain('GH_TOKEN: ${{ github.token }}');
  });
});
