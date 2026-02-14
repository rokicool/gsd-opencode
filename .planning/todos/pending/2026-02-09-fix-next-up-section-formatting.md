---
created: 2026-02-09T20:11
title: Fix Next Up section formatting in command output
area: general
files:
  - gsd-opencode/command/gsd/new-project.md
---

## Problem

The "Next Up" section at the end of project initialization has formatting issues with:
- Extra spaces before the arrow symbols (▶)
- Inconsistent box drawing character alignment
- General visual presentation problems in the terminal output

This affects the first impression when users complete project initialization.

## Solution

Review and fix the formatting in the command template/output generation to ensure:
1. Proper alignment of box drawing characters
2. Consistent spacing around arrow symbols
3. Clean visual presentation across different terminal widths
4. Follow the UI patterns defined in ui-brand.md

Reference: ~/.config/opencode/get-shit-done/references/ui-brand.md for correct formatting patterns.
