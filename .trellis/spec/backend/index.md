# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory contains guidelines for backend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide                                             | Description                                                    | Status                |
| ------------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| [Directory Structure](./directory-structure.md)   | Express + TS layout, env vars, folder rules                    | Verified (task 05-11) |
| [Database Guidelines](./database-guidelines.md)   | SQLite, migrations, ownership, and file-record consistency     | Verified (task 09-01) |
| [Error Handling](./error-handling.md)             | `AppError`, output authorization, rate and provider mapping    | Verified (task 09-01) |
| [Deployment Readiness](./deployment-readiness.md) | Health probes, proxy trust, Compose exposure, and CI contracts | Verified (task 09-01) |
| [Quality Guidelines](./quality-guidelines.md)     | TS strict, ESLint, Vitest, pre-commit, review checklist        | Verified (task 05-09) |
| [Logging Guidelines](./logging-guidelines.md)     | pino singleton, log levels, redact rules                       | Verified (task 05-09) |

> **Status note**: "Verified" guides have been reconciled against
> `backend/src/` after the named task — code and spec match. "Planning
> version" guides still describe agreed conventions but haven't been
> re-checked since the first implementation; revisit when the next task
> exercises that area.

**Stack snapshot**: Node.js 21.5+ · TypeScript (strict) · Express 4 · pino ·
Vitest · SQLite WAL + drizzle-orm. Authentication, quota, reference ownership,
and image history are server-backed. AI provider: 2API reverse proxy via
`TwoApiImageProvider`, called server-side only.

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
