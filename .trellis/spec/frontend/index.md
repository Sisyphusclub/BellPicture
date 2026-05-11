# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Vue 3 + Vite layout, services/composables/components split | Planning version |
| [Component Guidelines](./component-guidelines.md) | `<script setup>` SFCs, Element Plus, props/emits | Planning version |
| [Hook Guidelines](./hook-guidelines.md) | Composable shape (`useThing`), shared-state pattern | Planning version |
| [State Management](./state-management.md) | Composables-only, IndexedDB blobs + localStorage meta | Planning version |
| [Quality Guidelines](./quality-guidelines.md) | ESLint+Prettier, Vitest+jsdom, pre-commit, a11y baseline | Planning version |
| [Type Safety](./type-safety.md) | TS strict, shared `types/`, narrowing at the boundary | Planning version |

> **Status note**: All guides are "planning version" — written before any
> frontend code exists. They describe the agreed conventions the first
> implementation must follow. Re-verify against `frontend/src/` once code
> lands; update if reality diverges.

**Stack snapshot**: Vue 3.4+ · Vite 5+ · TypeScript (strict) · Element Plus ·
composables only (no Pinia for MVP) · IndexedDB (image blobs) +
localStorage (metadata).

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
