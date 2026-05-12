# Contributing to Kynda Coffee

Thank you for helping build the next-generation Kynda Coffee e-commerce platform!

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run build` + type check locally
4. Commit using conventional commits (we use commitlint)
5. Open a Pull Request
6. CI must pass (GitHub Actions)
7. Merge after approval

## Commit Convention

We follow Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling, config, dependencies
- `docs:`, `refactor:`, `test:`, etc.

## Agentic Development

The repository is set up to be friendly to AI coding agents:
- Strong CI (TypeScript, lint, build)
- Husky + lint-staged for quality gates
- Health check endpoint available at `/api/health`
- All secrets live in Coolify (never in repo)

Thank you for contributing!