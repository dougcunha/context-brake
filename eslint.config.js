import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'schemas/**', 'node_modules/**', 'tasks/**', '.agents/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { files: ['**/*.ts'], rules: { 'max-lines': ['error', { max: 100, skipBlankLines: true, skipComments: true }], 'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }], 'max-params': ['error', 3], 'no-restricted-syntax': ['error', { selector: "VariableDeclarator[init.type='ArrowFunctionExpression']", message: 'Use function declarations for module-level functions.' }] } },
);
