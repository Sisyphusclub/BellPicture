# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Vue 3 + Vite layout, services/composables/components split | Verified by frontend app |
| [Component Guidelines](./component-guidelines.md) | `<script setup>` SFCs, Hybrid Claude UI + Element Plus utilities, props/emits | Verified by frontend app |
| [Hook Guidelines](./hook-guidelines.md) | Composable shape (`useThing`), shared-state pattern | Verified by frontend app |
| [State Management](./state-management.md) | Composables-only, IndexedDB blobs + localStorage meta | Verified by frontend app |
| [Quality Guidelines](./quality-guidelines.md) | ESLint+Prettier, Vitest+jsdom, pre-commit, a11y baseline | Verified by frontend app |
| [Type Safety](./type-safety.md) | TS strict, shared `types/`, narrowing at the boundary | Verified by frontend app |

> **Status note**: The first frontend implementation now exists under
> `frontend/`. These guides describe the implemented conventions and should be
> updated whenever the app changes a cross-layer contract, state strategy, or
> UI-system boundary.

**Stack snapshot**: Vue 3.5 · Vite 5 · TypeScript strict · Hybrid Claude UI
(custom product surfaces + Element Plus utilities) · composables only (no Pinia
for MVP) · IndexedDB image blobs + localStorage metadata.

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
