# Contributing

Thanks for helping improve openspec-hud.

## Setup

```
git clone git@github.com:Dash-AI-Tools/openspec-hud.git
cd openspec-hud
claude --plugin-dir .
```

## Before you open a pull request

```
claude plugin validate .
claude plugin test .
```

Both must pass. Add or update a test in `tests/hud.test.tsx` for any behavior you change.

## How changes are planned

This project plans its own changes with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Current behavior is specified under `openspec/specs/`. For anything beyond a small fix, describe the change first (`/opsx:propose <idea>`) so the proposal, spec delta and tasks can be reviewed in the pull request.

## Guidelines

- Keep the HUD compact: the layout rules in `openspec/specs/hud-layout/spec.md` (8 to 10 rows, 14 at most) are part of the contract.
- Update the README when you add a command or change what the HUD shows.
- Keep commit messages short and in the imperative (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

By contributing you agree that your work is released under the [MIT License](LICENSE).
