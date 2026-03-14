---
inclusion: manual
---

# Concurrency & Conflict Guide

## Module Dependency Graph (arrows = imports from)

```
constants.js ←── taxBrackets.js
     ↑
  state.js ←── appState.js ←─┬── renderer.js ←── eventHandlers.js
     ↑                        ├── chart.js
prettyPrinter.js              ├── timeline.js
     ↑                        ├── modalController.js
calculator.js                 └── chatbot.js
     ↑
uiConstants.js
     ↑
serializer.js (uses XLSX global)
```

## Safe Parallel Edit Zones

These groups can be edited simultaneously by different agents without conflicts:

| Zone | Files | Touches |
|------|-------|---------|
| Calculations | `calculator.js`, `taxBrackets.js`, `tests/calc*.test.js` | No DOM, no shared files |
| Chatbot | `chatbot.js` | Self-contained, only reads state |
| Serializer | `serializer.js`, `tests/serializer.test.js` | Only uses XLSX + item schema |
| Chart | `chart.js` | Only reads state + calls timeline crosshair |
| Timeline | `timeline.js` | Only reads state, owns crosshair state |
| Item list UI | `renderer.js` | Orchestrates render, calls chart + timeline |
| Modals | `modalController.js` | Form logic, calls render() on save |

## Conflict-Prone Shared Resources

These files are touched by many features — coordinate edits:

| File | Why it conflicts | Who touches it |
|------|-----------------|----------------|
| `styles.css` | Single stylesheet, any UI change adds rules | All UI features |
| `index.html` | Single HTML file, structural changes | New UI sections, modals |
| `build.js` | Module list + window globals | Any new module or onclick function |
| `script.js` | Barrel re-exports | Any new/renamed export |
| `js/main.js` | Window global exposure | Any new onclick function |
| `js/constants.js` | Shared types/defaults | Schema changes, new item types |
| `js/appState.js` | Shared mutable state | New state properties |

## Change Impact Map

If you change... you must also update:

| Changed | Also update |
|---------|-------------|
| Item schema (new field) | `modalController.js` (form), `serializer.js` (Excel), `chatbot.js` (context), `renderer.js` (display), `constants.js` (if new type) |
| New module file | `build.js` (file list + order), `script.js` (re-exports) |
| New onclick function | `js/main.js` (window.*), `build.js` (window.*) |
| Calculator function signature | All callers in `renderer.js`, `chart.js`, `timeline.js`, `chatbot.js` |
| Tax brackets/logic | `taxBrackets.js`, `calculator.js` (calcTax), tests |
| Settings schema | `constants.js` (DEFAULT_SETTINGS), `state.js` (merge logic), `eventHandlers.js` (settings panel) |
| CSS class names | `renderer.js`, `timeline.js`, `modalController.js`, `index.html` |

## Rules for Multi-Agent Work
- Never have two agents edit the same file simultaneously
- `styles.css` and `index.html` are the most common merge conflict sources — assign one agent as owner
- Calculator changes are the safest to parallelize (pure functions, isolated tests)
- Always run `node build.js && npm test` after merging parallel changes
