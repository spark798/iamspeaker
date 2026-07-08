# Contributing

**English** · [한국어](CONTRIBUTING.ko.md)

Thanks for your interest in iamspeaker. Small fixes, issues, and language-pack contributions are all welcome.

## Development setup
- **Node 22 LTS** + **pnpm 11** (corepack: `corepack enable`)
- Local models (optional): [Ollama](https://ollama.com) · [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) · [Piper](https://github.com/rhasspy/piper) — you can develop with stubs even if these aren't installed

```bash
pnpm install
cp .env.example .env
pnpm db:migrate         # SQLite migrations
pnpm dev                # http://localhost:3000
# (optional) pnpm setup:models  # download local models
# (optional) pnpm preflight     # check external binaries
```

To develop/test without models, set `USE_STUB_ADAPTERS=1` to force deterministic stub adapters.

## Verification (required before a PR)
Please pass the same gates locally that CI runs. **Don't truncate output with `| tail` — judge by the exit code.**

```bash
pnpm lint          # Biome (format + lint)
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # Vitest unit/integration
USE_STUB_ADAPTERS=1 pnpm e2e   # Playwright E2E
pnpm build
```

- Local-model contract checks (optional): `OLLAMA_LIVE=1 OLLAMA_MODEL=<tag> pnpm test`, `PIPER_LIVE=1 ... pnpm test`
- Script Generator quality regression: `pnpm eval` (details in [`docs/benchmark.md`](docs/benchmark.md))

## Design principles (please follow)
[`CLAUDE.md`](CLAUDE.md) is the single source of truth. Key points:
- **Adapter pattern** — every AI call (LLM/TTS/STT/translation) goes through the `lib/ai/` factory/interface. No hardcoded cloud calls; always fall back to local.
- **Local-first / no mandatory keys** — the whole loop must work without `.env`.
- **Boundary validation with Zod** — API inputs, LLM outputs, and env all.
- When changing the data model, **include a Drizzle migration** (`pnpm db:generate`), and make sure the generated snapshot also passes `pnpm lint`.
- When adding an environment variable, document it in `.env.example`.

## Commits / PRs
- Tag commit/PR titles with the **screen/module**: `feat(SCR-04): …`, `fix(jobs): …`, `docs(...)`.
- Keep one PR focused on one screen/module. Pass the verification gates above and add relevant tests.
- Add UI strings to **all five locales** in `messages/{ko,en,ja,zh,es}.json` (a key-set parity test enforces this).

## Language-pack contributions (an easy start)
Native-language (L1) pronunciation/phrasing packs extend by adding JSON: `lib/ai/l1-profiles/<lang>.json` (see ko/ja/zh). Just register it in the loader and add a `loadL1Profile` test.

## Bugs & suggestions
Please use the [issue templates](ISSUE_TEMPLATE). For security vulnerabilities, see [`SECURITY.md`](SECURITY.md) (no public issues).
