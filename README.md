# AgriTrace

Blockchain-based agricultural supply-chain traceability and mass-balance verification.

Focus: batch lineage, quantity conservation (integer grams), evidence integrity (SHA-256), public QR verification, and food-safety recalls.

> **Status: scaffold only (Phase 0).** No application code, dependencies, or tests exist yet. See `docs/implementation-status.md` for exactly what is done.

## Layout
```
apps/web          React frontend (planned)
services/api      Express REST API (planned)
packages/shared   Shared types and Zod schemas (planned)
blockchain        Solidity contracts + Hardhat tests (planned)
prisma            Schema and seed (planned)
docs              Architecture, workflow, status
scripts           Helper scripts (doctor.mjs)
```

## Prerequisites
- Node.js >= 20 (see `.nvmrc`), npm >= 10
- Git
- Docker Desktop (for PostgreSQL) — or a local PostgreSQL 16

## Getting started
```bash
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run doctor            # checks installed tools
npm install               # installs workspace dependencies (none declared yet)
npm run db:up             # starts PostgreSQL via Docker Compose
```

## API
See `docs/api.md` for conventions, endpoints and commands.

## Database
See `docs/database.md` for migrations, seeding, verification and the (explicit, local-only) reset procedure.

## Open in VS Code
```bash
cd agritrace
code .
```
If `code` is not found: VS Code → Command Palette → "Shell Command: Install 'code' command in PATH", or use File → Open Folder and select `agritrace`. Accept the recommended-extensions prompt.

## Notes
- Never commit `.env`. Only `.env.example` (placeholders) is tracked.
- Blockchain mode defaults to `disabled`; the app must report that honestly.
- A blockchain record does not prove physical produce matches the digital record; evidence hashes prove integrity, not truthfulness.

License: MIT (see `LICENSE`).
