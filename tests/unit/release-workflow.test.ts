import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function loadWorkflow(): Promise<string> {
  const workflowPath = path.resolve('.github/workflows/release.yml');
  return readFile(workflowPath, 'utf8');
}

describe('release workflow triggers and permissions', () => {
  it('contains tag push and workflow_dispatch triggers', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toMatch(/tags:\s*\n\s*-\s*'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+\*'/);
    expect(yaml).toContain('workflow_dispatch:');
    expect(yaml).toContain('contents: write');
    expect(yaml).toContain('id-token: write');
  });

  it('runs on ubuntu-latest and configures node 20 with npm registry', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toContain('runs-on: ubuntu-latest');
    expect(yaml).toContain('node-version: 20');
    expect(yaml).toContain("registry-url: 'https://registry.npmjs.org'");
  });
});

describe('release workflow step sequencing', () => {
  it('enforces pre-release gates in strict sequential order', async () => {
    const yaml = await loadWorkflow();
    const steps = [
      'npm ci --ignore-scripts',
      'npm run schemas:check',
      'npm run dependencies:check',
      'npm run build',
      'npm run typecheck',
      'npm run lint',
      'npm run coverage',
      'npm run package:smoke',
      'scripts/check-release-tag.ts',
    ];
    let lastIndex = -1;
    for (const step of steps) {
      const idx = yaml.indexOf(step);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });
});

describe('release workflow publication and github release', () => {
  it('stages the npm release with provenance and a masked token for 2FA approval', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toContain('node-version: 24');
    expect(yaml).toContain('npm install --global npm@11.20.0');
    expect(yaml).toContain('npm stage publish --access public --provenance');
    expect(yaml).not.toMatch(/run: npm publish/);
    expect(yaml).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
    expect(yaml).toContain('npm stage approve');
  });

  it('builds the requested tag on a manual dispatch', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toContain('ref: ${{ github.event.inputs.tag || github.ref }}');
  });

  it('configures github release creation with auto notes', async () => {
    const yaml = await loadWorkflow();
    expect(yaml).toContain('gh release create');
    expect(yaml).toContain('--generate-notes');
    expect(yaml).toContain('GH_TOKEN: ${{ github.token }}');
  });
});
