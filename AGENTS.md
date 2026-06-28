# AGENTS.md

## Project Overview

This is a static Japanese study wiki. It does not call an external AI API. Codex generates or regenerates study documents by directly editing `data.js`.

## Core Files

- `index.html`: page structure.
- `styles.css`: layout and visual design.
- `app.js`: UI behavior, document search/tree, inline links, request prompt generation.
- `data.js`: all study document data.

## Editing Rules

- Keep the project static and GitHub Pages friendly.
- Use plain HTML, CSS, and JavaScript only.
- Do not add React, Next.js, TypeScript, bundlers, package managers, or framework-specific structure.
- Avoid large architecture changes. Preserve the existing design, layout model, and user workflows as much as possible.
- Keep edits scoped to the minimum files needed for the requested change.
- Do not add external API calls, server dependencies, build tools, or `localStorage`.
- Netlify/private encrypted site support has been removed. Do not reintroduce `private_index.html`, `netlify.toml`, encryption scripts, or `private_site`.
- Treat `data.js` as public content. Do not add private notes, secrets, passwords, API keys, or personal confidential information.
- Preserve existing document IDs unless the user explicitly asks for a new document.
- When regenerating a document, keep its `id`, `createdAt`, `parentLinks`, and existing `linkedDocId` relationships. Update `updatedAt`.
- When adding a child document, update matching `elements` in existing documents with `linkedDocId`.

## Work Priorities

1. Fix visible layout or rendering problems first.
2. Do not break existing features.
3. Keep the code simple.
4. Keep explanations and generated request prompts concise to reduce token use.
5. After changes, briefly state which files changed.

## Document Writing Rules

- Write documents in Japanese.
- Explain concepts comprehensively but avoid unnecessary verbosity.
- Use equations where they help understanding.
- Inline math uses `$...$`; display math uses `$$` on separate lines.
- Use LaTeX-style notation such as `\frac{}{}`, `_{}`, and `^{}` so KaTeX can render it.
- Because `data.js` stores markdown inside JavaScript strings, escape LaTeX command
  backslashes in the source, such as `\\frac`, `\\mathrm`, and `\\quad`.
- For formula derivation documents, keep the selected formula as `parentLinks.elementLabel`, but use a short readable derivation title instead of the long formula itself.
- `elements` should usually contain 8 to 18 smaller prerequisite concepts.

## UI And Request Prompt Rules

- Current layout: left pane has document search/tree and current document metadata; main pane shows the document body.
- Concept link panel has been removed and should stay removed unless the user asks for it.
- Request prompts should be token efficient. Keep context excerpts short:
  - parent context around 600 characters
  - regeneration context around 800 characters
- Do not add visible explanatory text about Codex, storage, or implementation details inside the app unless requested.

## Verification

After code or data edits, run:

```powershell
& 'C:\Users\hiroki\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check app.js
& 'C:\Users\hiroki\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check data.js
```

For layout changes, verify in a browser at desktop and mobile widths when practical.

## Notes For Codex

- Use `apply_patch` for manual edits.
- Prefer `rg` for searching.
- PowerShell may display Japanese text as mojibake; use Node with UTF-8 file reads when inspecting Japanese content.
- Do not revert unrelated user changes.
