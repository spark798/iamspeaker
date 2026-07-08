# Security Policy

## Reporting a vulnerability
Please report security vulnerabilities **privately, not as a public issue**:
- GitHub **Security Advisories** (Security tab → "Report a vulnerability"), or
- Contact the maintainer privately.

We'll confirm and fix promptly within reason.

## Scope notes (self-hosting assumption)
iamspeaker is designed for single-user self-hosting. When operating it:
- **No authentication** — expose it only on a trusted network/locally. Don't put it directly on the public internet.
- **File uploads** — PPTX/PDF go through an extension whitelist + magic-byte validation, and paths are normalized under `DATA_DIR` (path-traversal prevention).
- **External processes** (ffmpeg/whisper/piper) are spawned with array arguments — no shell injection.
- **Data is stored locally** (`data/`). Note that enabling a cloud adapter sends the relevant input to an external API.
- Cloud keys are managed only via `.env` (no UI input). Don't commit your `.env`.

## Supported versions
Security fixes are applied to the latest release line.
