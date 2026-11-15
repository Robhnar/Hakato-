# Instructions for AI assistants

Every AI model working in this repo reads this file (Claude Code via `CLAUDE.md`, other tools directly). It applies to humans just the same.

Several people work on the project in parallel, each with their own assistant. The rules below exist so that this work can be merged without conflicts.

## Project

We are building a solution to the Lunar Landing Site Navigator challenge (NASA Space Apps 2026). The challenge text is in `lunar-landing-site-navigator-details.md`, the allowed data sources in `lunar-landing-site-navigator-resources.md`.

## Before you start

1. Read your task file in `docs/tasks/`. If the user did not name a task, ask instead of guessing.
2. Read `docs/ARCHITECTURE.md` – the split into modules and the contracts between them.
3. Run the project and the tests following `README.md`, so you know you are starting from a working state.
4. Fetch the current `main` and create a branch `feat/<task-nr>-<short-name>` (e.g. `feat/003-login`).

## Working rules

- **Stay within the task scope.** Change only files named in the task or located in your module's directory. Report a bug in someone else's module in the PR description; do not fix it in passing.
- **Do not change contracts silently.** A contract is anything another module relies on: API endpoints, data formats, database schema, shared types. A contract change needs a separate PR that also updates `docs/ARCHITECTURE.md`.
- **Do not push to `main`** and do not merge your own PRs. The integrator does the merging.
- **Do not rewrite the history** of shared branches (`push --force`, rebase after a PR is open).
- **No secrets in the repo.** Keep keys and passwords in `.env` (it is in `.gitignore`); add a new variable to `.env.example` without a value.
- **New dependency** (library, service) – list it in the PR description together with the reason.
- **No drive-by refactors.** Formatting and tidying other people's code causes conflicts for others.
- **Working autonomously (agent mode)?** Same rules: one branch, one task, no changes outside the scope, no merging. You finish at an open PR.
- **Do not leave fakes.** If something is a stub or does not work, say so plainly in the PR description.

## Handing in work

1. Run the tests and lint (commands in `README.md`) and make sure they pass.
2. Update the status in the task file.
3. Open a PR to `main` using the template. One task is one PR.
4. Describe how you checked that it works – and what you did not check.

## When something is unclear

The task contradicts the architecture, a contract is missing, or you need a change in someone else's module: stop and tell the user. Guessing in such places ends in work that cannot be merged.
