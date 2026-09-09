#!/usr/bin/env python3
"""Compatibility hook for sessions that loaded the removed Trellis hook.

The project no longer ships Trellis workflow state. Keep the old command
path executable so a long-lived Codex session does not fail user prompts
after the integration is removed.
"""

from __future__ import annotations


def main() -> int:
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
