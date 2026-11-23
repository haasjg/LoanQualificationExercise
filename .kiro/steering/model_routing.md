# Credit-Saving Execution & Model Switching Playbook (Free Tier: 50 Credits)

Follow this exact model-switching sequence in Kiro IDE to stay well under the 50-credit monthly budget:

## Phase 1: Specs & Edge-Case Architecture (~5-8 credits)
- **Active Model:** `Claude Sonnet 4.5` (`1.3x`)
- **Action:** Generate `.kiro/specs/path-to-yes/requirements.md` and `design.md`. Challenge edge cases once, then approve both specs.
- **Rule:** Switch models immediately after `design.md` is finalized. Do not generate boilerplate code on Sonnet.

## Phase 2: Scaffolding, Tasks & Pure Engine (~2-4 credits)
- **Active Model:** `Qwen3 Coder Next` (`0.05x`) or `DeepSeek v3.2` (`0.25x`)
- **Action:** Generate `tasks.md`, initialize Vite + Tailwind + Vitest, implement `src/engine/underwriting.ts` and `src/services/fredApi.ts`, and run `npm test`.

## Phase 3: Interactive UI & Polish (~3-5 credits)
- **Active Model:** `MiniMax 2.1` (`0.15x`) or `Qwen3 Coder Next` (`0.05x`)
- **Action:** Build the interactive simulator sliders, decision banner, "Apply This Fix" checklist cards, and plain-English Adverse Action summary view.

## Phase 4: Final Audit & README (~1-2 credits)
- **Active Model:** `DeepSeek v3.2` (`0.25x`)
- **Action:** Review `README.md` against all submission requirements, verify `npm run build` passes with zero TypeScript errors, and confirm `docs/collaboration-log.md` tells a complete story.