# How we work

One task is one branch and one pull request. The integrator reviews PRs and merges them into `main`.

## Step by step

1. **Pick an item** from the list in `docs/tasks/README.md`, or ask the integrator to assign one.
2. **Run the project** following `README.md` and check that the tests pass.
3. **Create a branch** from the current `main`:

   ```bash
   git switch main && git pull
   git switch -c feat/<nr>-<name>
   ```

4. **Commit often** and push regularly so the work is not lost.
5. **Open a PR to `main`** and fill in the template. Let the integrator know it is waiting.

## Rules

- Nobody pushes directly to `main`.
- Change only your own module. If you need a change in someone else's, tell its owner or the integrator.
- A contract change (API, data format, database schema) goes in a separate PR, together with the change in `docs/ARCHITECTURE.md`, and is merged before the code that depends on it.
- When `main` has moved on, bring it into your branch with `git merge main` (not rebase after the PR is open).

## Naming

| What | Pattern | Example |
| --- | --- | --- |
| Branch | `feat/<nr>-<name>` or `fix/<nr>-<name>` | `feat/026-data-export` |
| PR title | `[<nr>] <what it does>` | `[026] Data export` |
