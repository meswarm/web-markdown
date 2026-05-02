---
name: github-repo-setup
description: Use when preparing a repository for its first GitHub push, cleaning up a repo before publishing, improving README or .gitignore files, or checking for private local files, secrets, and machine-specific config that should not be exposed.
---

# GitHub Repo Setup

## Overview

Prepare a repository for GitHub publication with two priorities:

1. do not leak private local files, secrets, or machine-specific state
2. keep repository docs and ignore rules clean, intentional, and easy to maintain

## When to Use

Use this skill when:

- a project is about to be pushed to GitHub for the first time
- the user asks to set up or clean up a repository
- the user wants to improve `.gitignore`
- the user wants to create or update `README.md` and `README_EN.md`
- the repo may contain private local config, caches, logs, exports, or secrets

Do not use this skill for routine code-only changes that do not affect repository
publishing, documentation, or ignore rules.

## Workflow

Copy this checklist and track progress:

```text
Task Progress:
- [ ] Step 1: Detect stack and repository shape
- [ ] Step 2: Audit .gitignore with privacy-first filtering
- [ ] Step 3: Create or sync README.md and README_EN.md
- [ ] Step 4: Verify publish safety and bilingual consistency
```

## Step 1: Detect stack and repository shape

Inspect the project root and identify:

- languages and frameworks from files such as `package.json`, `pyproject.toml`,
  `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, or `mix.exs`
- package managers and build tools
- deployment or infrastructure files such as Docker, Terraform, or workflow files
- whether the repo already has `README.md`, `README_EN.md`, or `.gitignore`
- whether the repo contains directories or files that look private, local-only, or
  machine-specific

Use the detected stack to choose rules from
`references/GITIGNORE-RULES.md`.

## Step 2: Audit `.gitignore` with privacy-first filtering

### Mandatory safety rule

Treat privacy filtering as a blocking safety check. This applies even if the user
only asked for README cleanup or generic GitHub setup help.

Before suggesting a push or repository publication:

- check for secrets such as `.env`, `.env.*`, private keys, credentials, tokens,
  service-account files, or secret dumps
- check for local-only config, machine-specific state, caches, logs, exports,
  temporary files, editor metadata, and runtime output
- check for private notes, local datasets, SQLite files, backups, and ad-hoc
  folders that do not belong in a public repo
- preserve safe tracked templates such as `.env.example`
- warn the user if a private or secret-bearing file is already tracked

Prefer adding precise ignore rules over broad patterns that might hide legitimate
project files.

### `.gitignore` rules

If `.gitignore` exists:

1. read it
2. compare it against the stack-specific rules in
   `references/GITIGNORE-RULES.md`
3. add missing critical patterns
4. remove clearly outdated or irrelevant rules
5. organize the file into labeled sections

If `.gitignore` does not exist:

1. create it from the rules in `references/GITIGNORE-RULES.md`
2. include universal rules plus the stack-specific sections that apply

### Guardrails

- never ignore lockfiles unless the stack rules explicitly allow it
- keep `!.env.example` when env templates are used
- for monorepos, consider nested build output such as `**/dist/` and `**/build/`
- do not blindly ignore `.cursor/`, `.vscode/`, or similar directories if the
  repository intentionally shares project config; ignore only private or local-only
  subcontent when needed

## Step 3: Create or sync bilingual README files

Maintain two files in the project root:

- `README.md` as the default Chinese version
- `README_EN.md` as the English version

Use these files as baselines:

- `assets/README-TEMPLATE.md` for `README.md`
- `assets/README_EN-TEMPLATE.md` for `README_EN.md`

### Required rules

- create or update both files in the same step
- keep technical content aligned across both files
- keep commands, code blocks, directory structures, and table values equivalent
- only natural-language prose should differ by language
- do not inject secrets, private URLs, personal paths, tokens, or machine-local
  values into either README

### Badges and placeholders

- include project badges only when the backing service actually exists
- include language-switch badges in both files
- if the GitHub owner or repo name is unknown, use `OWNER/REPO` placeholders and
  tell the user to replace them later

### Existing content

If a repo already has a monolingual README, preserve that content as the basis for
the matching language file and generate the missing counterpart. Do not overwrite
useful existing documentation unnecessarily.

## Step 4: Verify publish safety and bilingual consistency

Before saying the repo is ready:

1. confirm privacy-sensitive files are ignored, removed from the publish plan, or
   explicitly called out to the user
2. confirm lockfiles and other important tracked project files are not ignored by
   mistake
3. confirm `README.md` and `README_EN.md` both exist when bilingual docs are
   requested
4. confirm both README files have matching sections and equivalent technical
   content
5. confirm badge links and language links are correct

If a suspicious tracked file is found, stop and tell the user exactly what looks
unsafe and what should happen before pushing.

## Supporting Files

- For stack-aware ignore rules, see [references/GITIGNORE-RULES.md](references/GITIGNORE-RULES.md)
- For the Chinese README baseline, see [assets/README-TEMPLATE.md](assets/README-TEMPLATE.md)
- For the English README baseline, see [assets/README_EN-TEMPLATE.md](assets/README_EN-TEMPLATE.md)

## Common Mistakes

- treating privacy filtering as optional
- ignoring every local config directory without checking whether the repo shares
  project-level config intentionally
- updating only one README file and leaving the other out of sync
- adding badges for services that are not configured
- overwriting useful existing README content instead of adapting it
