# 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

# 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

# 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

# 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

# 5. Electron Project-Specific Guidelines

## Scope
- Main process: `main`, `electron`, or the project's equivalent bootstrap entrypoints.
- Renderer process: UI application code running in BrowserWindow renderers.
- Preload scripts: secure bridge code exposed through `contextBridge`.
- Shared desktop infrastructure: IPC contracts, window lifecycle, menus, tray, updater, packaging, and distribution config.
- Cross-platform concerns: Windows, macOS, and Linux behavior differences.

## Stack expectations
- Build Electron desktop applications with Electron 27+ patterns and current security best practices.
- Prefer a strict separation between main, preload, and renderer responsibilities.
- Treat native OS integration, security hardening, and distribution as first-class concerns rather than post-build cleanup.
- Keep the desktop experience native-feeling across supported platforms while minimizing platform-specific divergence.

## Security defaults
- Enable context isolation everywhere.
- Disable Node integration in renderer processes.
- Keep `webSecurity` enabled.
- Use preload scripts for all privileged renderer access.
- Expose a minimal, explicit API through preload rather than broad capability surfaces.
- Validate every IPC channel name, payload shape, and caller expectation.
- Handle permission requests explicitly.
- Use strict Content Security Policy.
- Disable deprecated or unsafe patterns such as the remote module.
- Use secure data storage for sensitive local information.
- Apply certificate pinning only when the product and infrastructure genuinely require it.

## Process architecture rules
- Main process owns application lifecycle, privileged OS integrations, menus, tray, updater, and window orchestration.
- Renderer processes own UI rendering and user interaction only.
- Preload scripts are the only bridge between renderer code and privileged Electron or Node capabilities.
- Use IPC for cross-process communication; keep contracts narrow and explicit.
- Avoid leaking business logic into preload or window bootstrap code.
- Use worker threads only when background CPU work is real and measured.
- Manage process lifecycle deliberately to prevent orphaned windows, zombie processes, or hidden background churn.
- Prevent memory leaks by cleaning listeners, timers, and window references.

## Window management
- Keep multi-window coordination explicit.
- Persist window state only when it improves the actual user workflow.
- Handle display changes, full-screen behavior, focus rules, and modal dialogs intentionally.
- Position windows predictably across multi-monitor setups.
- Use frameless windows only when product requirements justify the extra complexity.

## Native OS integration
- Integrate system menu bar behavior appropriately for each platform.
- Support context menus where they improve desktop ergonomics.
- Use file associations and protocol handlers only when they are part of the product contract.
- Implement system tray behavior intentionally; avoid background presence that surprises users.
- Support native notifications, dock/taskbar integration, and OS-specific shortcuts in platform-appropriate ways.
- Respect platform conventions for dialogs, theme detection, accessibility APIs, and keybindings.

## File system and local resource handling
- Use sandboxed or least-privilege file access patterns where feasible.
- Prompt for permissions clearly when file or directory access is required.
- Support drag and drop, save dialogs, and directory selection through native flows.
- Clean up temporary files and watchers when they are no longer needed.
- Track recent files only when it is a deliberate product feature.

## Auto-update and distribution
- Design the update strategy early: server, channels, signatures, rollback expectations, and user messaging.
- Support differential updates when the chosen updater stack supports them cleanly.
- Verify update signatures.
- Decide explicitly whether updates are silent, prompt-driven, or user-controlled.
- Test download progress, failure handling, rollback behavior, and version checks.
- Treat code signing and notarization as release requirements, not optional polish.

## Performance targets and practices
- Target startup time under 3 seconds.
- Target idle memory usage below 200MB unless the product has a justified higher baseline.
- Maintain smooth animations at 60 FPS where animation exists.
- Keep IPC messages efficient; do not shuttle large payloads without need.
- Prefer lazy loading for non-critical features.
- Clean up background work, hidden windows, and long-lived resources.
- Use background throttling and GPU acceleration deliberately, based on measured behavior.

## Build and packaging rules
- Keep multi-platform builds reproducible.
- Handle native dependencies explicitly across Windows, macOS, and Linux.
- Optimize assets and installer size; target installers under 100MB when realistic for the app.
- Customize installers, icons, entitlements, desktop files, and platform metadata as part of the release surface.
- Use build caching and CI/CD integration where the project already supports them.

## Platform-specific handling
- Windows: registry integration, installer behavior, file associations, protocol handlers.
- macOS: entitlements, notarization, dock behavior, native menu conventions.
- Linux: desktop files, packaging compatibility, tray/menu differences across desktop environments.
- Keep platform-specific code isolated and justified.

## Debugging and diagnostics
- Use DevTools integration for renderer debugging.
- Support remote debugging only when needed and secure it appropriately.
- Capture crash reporting, console logging, and error tracking intentionally.
- Profile performance and memory when diagnosing sluggishness or leaks.
- Inspect network behavior rather than guessing about API or updater failures.

## Native module management
- Prefer avoiding native modules when built-in Electron or platform APIs are sufficient.
- When native modules are necessary, manage compilation, rebuilds, binary distribution, and platform compatibility explicitly.
- Validate the security and performance impact of every native module.
- Plan fallback behavior when a native capability is unavailable on one platform.

## Collaboration rules
- Coordinate with frontend-focused agents on renderer UI concerns.
- Coordinate with backend-focused agents on API integration and local/remote data boundaries.
- Involve security review for IPC, preload APIs, updater flows, and local storage decisions.
- Involve DevOps/release workflows for signing, notarization, packaging, and CI/CD.
- Align QA work with desktop-specific test coverage: installation, upgrade, multi-window behavior, tray flows, and platform differences.

## Completion checklist
- Context isolation enabled.
- Node integration disabled in renderers.
- CSP configured.
- IPC validated.
- Native menus/tray behavior reviewed.
- Auto-update path tested.
- Code signing/notarization plan defined.
- Cross-platform packaging reviewed.
- Startup, memory, and background behavior validated.

Always prioritize security, ensure native OS integration quality, and deliver performant desktop experiences across all platforms.
