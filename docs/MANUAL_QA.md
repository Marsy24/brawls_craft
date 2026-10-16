# Browser acceptance checklist — NOT EXECUTED in this environment

The managed environment did not provide the supported browser-control capability. DOM tests use happy-dom and do **not** render CSS, execute WebGL/Phaser or establish real browser performance. No screenshot or real FPS claim is made.

Use `npm ci && npm run dev`, then test Chrome/Firefox and Safari if available. Record browser/version, OS, CPU/GPU and display size.

1. At 1440×900, 1920×1080 and 1024×768 create each of the five classes. Inspect artwork, class previews, text wrapping, tooltips and keyboard focus.
2. Launch the forest. Verify map textures load, no console errors, aim matches the cursor, WASD/arrows work, LMB hold repeats attacks, 1–4 skills have visible effects, Space/E obey cooldowns.
3. Walk/dash into rocks and trees from different angles. Confirm no tunneling or permanently stuck enemies; minimap shows the actual remaining targets.
4. Pause with Esc, I, C and K. Check Escape resumes once. Switch browser tab and return: combat must stay paused until resumed. Do not lose or repeat a pending skill input at high refresh rates.
5. Verify Warden safe center/ring attack and Oracle projectiles/targeted blasts. Both should enter phase II once and summon three adds once.
6. Complete each mission with each class. Defense enemies should redirect after damage; beacon repairs between waves. Optional-objective result must match the actual condition.
7. Check defeat, immediate retreat (no free gold), repeated victory (no repeated first-clear bonus), results and level-up. Return to camp, equip gear and allocate/reset talents.
8. Open a relic, reload during its animation: reward/charge must already be saved, without duplicate granting. Equip skins and verify weapon color AND outline change in the next battle.
9. Export, reload, import into a fresh origin. Invalid JSON, wrong schema and forged/malformed items must be rejected without replacing the active save.
10. Play repeated missions for 20 minutes. Observe HUD FPS and browser memory. Target about 60 FPS; measure p50/p95 frame time and look for growing texture/listener/entity counts. Do not infer FPS from Node simulation timing.
11. Verify volume/mute and reduced-motion controls; inspect popup layering, narrow-window scrolling and disabled actions.

Release gate: all gameplay/browser issues fixed, actual results recorded here and in PROGRESS.md. Human balance pass should include novice aiming and veterans using optimal rotations, not only the supplied automation.
