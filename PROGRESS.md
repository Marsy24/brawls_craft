# Progress

## 2026-10-16 — implementation checkpoint

- Stages 1–3: design and five-class combat foundations were published in PR #1 and merged by the owner. Current main also contains the owner's GitHub Pages deployment workflow.
- Continued on `feat/complete-first-release` from current main (`c5ccb02`). The earlier local UI/rewards/save changes had not been included in PR #1.
- Stages 4–5 implemented: five missions, two bosses, progression 1–15, 30 talents, three equipment slots, cosmetic collection, relics, validated saves and import/export.
- Stage 6 implemented for browser acceptance: Russian camp screens, character creation, HUD, inventory, talents, collection, settings and results; original SVG artwork and synthesized audio.
- Verification repeated: `npm test` 33/33 passed; `npm run balance` completed; `npm run simulate` 25/25 normal scenarios won; `npm run build` passed. Phaser vendor size warning is known (~340 KB gzip).
- Real browser checks remain pending. Playwright is present but Chromium is missing; its download returned an invalid/truncated ZIP. No browser rendering or FPS evidence was obtained.

## Integration fixes and repeatable browser checks

- Escaped imported character/item IDs in HTML attributes; regression verifies no injected markup/event attributes and working equipment actions.
- Made battle background inert while menus are open; blocked hotbar actions during pause and added dialog semantics.
- Initial HUD no longer reports an unmeasured 60 FPS; it waits for frame samples.
- Added six Playwright smoke scenarios and GitHub Actions verification against a `/brawls_craft/` production build. These are pending execution on GitHub; local browser installation failed.
- Node 24.19 local checks: 33/33 unit/integration/DOM tests, balance script, production build. Existing 25/25 campaign results remain valid; combat rules were not changed in this integration pass.

## Remaining release work

- Implementation and local integration review complete. The user explicitly approved publishing to `Marsy24/brawls_craft`, branch `feat/complete-first-release`, and opening a PR into `main`.
- Terminal push has no GitHub credentials. Publication uses the connected GitHub integration, preserving the exact Git tree contents of the verified local commits. GitHub Actions results are pending until the PR is opened.
- Production HTTP check passed: index and all four generated assets load under `/brawls_craft/` with exact build contents. This validates hosting paths, not WebGL rendering.
- Execute `docs/MANUAL_QA.md`: browser controls, rendering, viewport layouts, human balance and long-session performance. The current implementation is a release candidate, not a fully accepted release.

## Browser CI run 38919295910

- Chromium installed successfully on GitHub Actions; unit checks, balance, campaign, build and camp layout checks passed.
- All five battle smoke cases found a real startup failure: Phaser treats all data URLs as base64, while our SVG helper returned percent-encoded URLs. Its loader threw InvalidCharacterError in atob before scene creation.
- Fixed the SVG helper to produce base64 ASCII XML; Unicode characters use numeric XML entities. Added a regression test for all class art and Unicode. Browser rerun is pending.
