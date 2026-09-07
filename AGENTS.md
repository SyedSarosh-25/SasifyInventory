# Codex instructions

Read [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) before working on this repository.

- Preserve the existing static-export architecture and the separation between public UI and server-only commerce code.
- Never expose, commit, or write secret values; environment files and credentials remain server-side.
- Treat the current uncommitted commerce work as user-owned. Inspect the diff before changing overlapping files.
- Qamify is wired locally but may not be active in production; verify `QAMIFY_API_KEY`, migration, deployment, and provider sync before relying on live availability.
- Equivalent supplier offers require explicit canonical mapping; preserve cheapest-in-stock selection and out-of-stock-only fallback semantics.
- Do not auto-fulfil supplier-funded freebies until the claim mode and abuse controls are explicitly approved.
- Keep DODI supplier fulfilment, payment verification, encryption, inventory reservation, and audit behavior fail-closed.
- Run the relevant Node tests after changes; the full suite is `node --test tests/*.test.mjs`.
