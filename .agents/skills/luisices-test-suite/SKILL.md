---
name: luisices-test-suite
description: >-
  Use this skill to execute, diagnose, and validate the Luisices test suite,
  including TypeScript typechecking, Vitest unit/integration tests, Firestore
  security rules testing, and Playwright E2E suites.
---

# Luisices Test Suite Runbook

This skill outlines the strict workflow for testing, verifying, and debugging the Luisices codebase.

## 1. Quick Quality Check (Always Run First)

Before submitting or reviewing code, always run the static type checker:

```bash
npm run typecheck
```

If TypeScript errors occur, resolve them first before running tests.

---

## 2. Unit and Integration Tests (Vitest)

Luisices uses **Vitest** for fast unit and backend testing.

### Running all unit tests:
```bash
npm run test:unit
```

### Running specific test files:
```bash
npx vitest run tests/unit/users-and-invites.test.ts
npx vitest run tests/unit/cdn-and-image-optimizer.test.ts
```

### Watch mode (during active development):
```bash
npm run test:unit:watch
```

### Cloud Functions refactors

When changing a callable, HTTP function, scheduled function, or its module boundaries, validate both behavior and loading/deploy isolation:

```bash
npm run typecheck
npm --prefix functions run lint
node --test tests/scripts/functions-deploy-selection.test.mjs
npx vitest run tests/unit/<focused-test>.test.ts tests/unit/functions-startup.test.ts
```

- Prefer unit tests around extracted logic with injected Firestore, network, clock, and authorization dependencies. Cover success, invalid input, denied access, provider/database failures, and side effects that must not happen on rejected requests.
- Startup tests should verify the public export still points to the expected handler, callable secrets/configuration and telemetry remain attached, and unrelated domains are not loaded.
- The deploy-selection test protects the static dependency graph. Update its fixture when an endpoint moves modules, and assert that edits to the new entry module select the intended endpoint set.
- Run Firestore Emulator integration tests when security rules, transactions, or Firestore-specific behavior changes. Run Playwright E2E when a user-facing flow or frontend/backend contract changes; do not treat a backend unit test as a substitute for an E2E test when the UI behavior changed.
- Do not claim a test passed if the runner failed before executing it. Record the exact environment/dependency error and use CI or a supported Node environment to complete the check. Do not delete lockfiles or `node_modules` to work around an optional native dependency error without first confirming the intended platform and package setup.

---

## 3. Firestore Rules Testing

Security rules in `firestore.rules` must stay within Firestore's per-request expression-evaluation budget and validate user/admin permissions. Use the emulator integration suite; there is no `test:firestore` npm script:

```bash
npm run test:integration
```

Order, quote, and Firebase regression tests live in `tests/integration/` and run with `vitest.integration.config.ts` and the Firestore Emulator. Do not invoke those files with the default Vitest configuration and assume the emulator is present. Tag validation has separate creation and update paths; preserve the currently tested paths and 20-tag regression coverage. Do not describe batching as a guarantee against expression or depth limits without testing the changed rules in the emulator.

---

## 4. End-to-End Tests (Playwright)

For E2E tests, the Firebase Emulator should be running or mocked:

### Run customer or product tests:
```bash
npm run test:customers
npm run test:products
```

### Run against the Firebase Emulator:
```bash
npm run test:e2e:emulator
```

---

## 5. Known Gotchas & Troubleshooting

1. **`ReferenceError: Image is not defined`**:
   - Node.js/Vitest does not have browser DOM `Image`. Ensure `src/app/utils/imageOptimizer.ts` checks `typeof window !== 'undefined'` before accessing Canvas/Image APIs.

2. **Functions Emulator Secrets Missing**:
   - Workflows look for `functions/.secret.local`. If running emulators locally, copy `functions/.secret.local.example` to `functions/.secret.local`.

3. **SuperFrete in Production**:
   - `SUPERFRETE_SANDBOX_TOKEN` and its endpoints are strictly scoped to development and emulators (`luisices-dev`). Never import or require them in production paths.
4. **Termux/Linux optional native packages**:
   - Vitest may fail during startup if npm omitted the platform-specific Rollup package (for example, `@rollup/rollup-linux-arm64-gnu`). This is an environment/dependency installation failure, not a passing or failing assertion. `CI=true` does not supply a missing native package. Preserve the lockfile and existing `node_modules`; complete the tests in project CI or another supported environment and report the limitation accurately.
