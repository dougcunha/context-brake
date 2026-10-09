#!/usr/bin/env python3
"""Inventory of TypeScript/JavaScript test suites.

Usage: python inventory.py <repo-root> [--min 1]

For each package (folder with a package.json that has vitest or jest), prints
the runner, the count of it()/test() per test folder, and the source folder
the tests most likely cover. Markdown output, ready for the plan's module table.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

IGNORE = {"node_modules", "dist", "build", "coverage", ".git", ".next", ".turbo", "out"}
TEST_FILE_RE = re.compile(r"\.(test|spec)\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$")
TEST_CALL_RE = re.compile(r"^\s*(?:it|test)(?:\.(?:each|only|skip|todo|concurrent|fails))?\s*[\(`]", re.MULTILINE)
EACH_TABLE_RE = re.compile(r"(?:it|test)\.each\s*\(\s*\[", re.MULTILINE)


def packages(root: Path):
    for pj in root.rglob("package.json"):
        if IGNORE & set(pj.parts):
            continue
        try:
            data = json.loads(pj.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        if "vitest" in deps:
            runner = "Vitest"
        elif "jest" in deps:
            runner = "Jest"
        else:
            continue
        esm = data.get("type") == "module"
        yield pj.parent, f"{runner} ({'ESM' if esm else 'CJS'})"


def count_tests(pkg: Path):
    per_folder: dict[Path, int] = defaultdict(int)
    per_folder_skipped: dict[Path, int] = defaultdict(int)
    for f in pkg.rglob("*"):
        if not f.is_file() or not TEST_FILE_RE.search(f.name):
            continue
        rel = f.relative_to(pkg)
        if IGNORE & set(rel.parts):
            continue
        txt = f.read_text(encoding="utf-8", errors="ignore")
        n = len(TEST_CALL_RE.findall(txt))
        if n == 0:
            continue
        folder = rel.parent
        per_folder[folder] += n
        per_folder_skipped[folder] += len(re.findall(r"\b(?:it|test|describe)\.skip\s*\(", txt))
    return per_folder, per_folder_skipped


def source_for(pkg: Path, folder: Path) -> str:
    parts = list(folder.parts)
    # __tests__/ or tests/ or test/ nested next to source → parent folder
    if parts and parts[-1] in ("__tests__", "tests", "test", "spec"):
        cand = pkg.joinpath(*parts[:-1]) if len(parts) > 1 else pkg / "src"
        if cand.is_dir():
            return cand.relative_to(pkg).as_posix() or "."
    # top-level tests/ mirroring src/ → src/<rest>
    if parts and parts[0] in ("tests", "test", "__tests__", "spec"):
        cand = pkg / "src" / Path(*parts[1:]) if len(parts) > 1 else pkg / "src"
        if cand.is_dir():
            return cand.relative_to(pkg).as_posix()
        return "?"
    # co-located *.test.ts → same folder
    if (pkg / folder).is_dir():
        return folder.as_posix() or "."
    return "?"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    root = Path(sys.argv[1]).resolve()
    minimum = int(sys.argv[sys.argv.index("--min") + 1]) if "--min" in sys.argv else 1

    pkgs = list(packages(root))
    if not pkgs:
        print("No package with vitest or jest found.")
        return

    print(f"# Test inventory — `{root.name}`\n")
    print(f"Packages with a test runner: {len(pkgs)}\n")
    print("| Package | Runner | Test folder | Source folder | Tests | Skipped |")
    print("|---|---|---|---|---|---|")
    total = 0
    for pkg, runner in sorted(pkgs):
        per_folder, skipped = count_tests(pkg)
        name = pkg.relative_to(root).as_posix() or "."
        for folder, n in sorted(per_folder.items(), key=lambda kv: -kv[1]):
            if n < minimum:
                continue
            total += n
            src = source_for(pkg, folder)
            print(f"| {name} | {runner} | {folder.as_posix() or '.'} | {src} | {n} | {skipped[folder]} |")
    print(f"\nTotal tests: {total}")
    print("\nFolders with `?` as source need manual mapping. `it.each` counts as one test here; "
          "the runner will report each row separately.")


if __name__ == "__main__":
    main()
