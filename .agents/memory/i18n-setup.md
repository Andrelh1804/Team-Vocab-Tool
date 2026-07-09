---
name: i18n setup
description: Internationalization (EN/PT) setup details for NexSupport AI frontend
---

## Setup
- Library: `react-i18next` + `i18next`
- Config: `artifacts/nexsupport/src/lib/i18n.ts`
- Translation files: `artifacts/nexsupport/src/locales/en.ts` and `pt.ts`
- Imported in `App.tsx` as a side-effect import (`import "@/lib/i18n"`)

## Language persistence
- Language saved/read from `localStorage` key `"nexsupport-lang"`
- Defaults to `"en"` if not set

## Date localization
- `date-fns/locale/ptBR` imported in every page that uses `formatDistanceToNow`
- Pattern: `const dateLocale = i18n.language === "pt" ? ptBR : undefined;`

## Language switcher locations
- `Header.tsx` — dropdown in top-right corner
- `Settings.tsx` → Security tab — language dropdown in settings panel

**Why:** All strings were previously hardcoded in English with no i18n system. Full translation added covering all pages/components.
