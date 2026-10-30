---
name: luisices-firestore-rules
description: >-
  Use this skill whenever reading, writing, optimizing, or debugging Firebase
  Firestore Security Rules (firestore.rules) in Luisices. Enforces strategies to
  prevent the 1,000 CEL expression limit, AST depth violations, and tests rules
  via integration suites.
---

# Luisices Firestore Security Rules Runbook

This skill outlines the strict rules, architectural constraints, and optimization patterns required when modifying `firestore.rules` in Luisices.

---

## ⚡ The 1,000 CEL Expression Limit

Firestore evaluates security rules using CEL. A request has a finite expression-evaluation budget (the documented ceiling is 1,000 evaluations); this is distinct from AST depth/size limits and document access-call limits. Do not describe this budget as “1,000 AST nodes.” A multi-document transaction can evaluate rules for each write, so review the complete operation rather than only one document's rule.

If a request exhausts the evaluation budget, the write is rejected. Client SDKs may surface a generic `PERMISSION_DENIED`; inspect emulator or server diagnostics before concluding that the user lacks a role. A 20-tag order is a regression scenario to test, not by itself proof that the budget is exhausted.

---

## 🛡️ Core Rules & Anti-Patterns

### 1. Tag & Array Validation: Batching with Delimiters (`\u0000`)
❌ **NEVER DO THIS (Blows the 1,000 limit):**
```cel
// Bad: 20 separate function calls and property accesses create hundreds of AST nodes
isValidTag(tags[0]) && isValidTag(tags[1]) && ... && isValidTag(tags[19])
```

✅ **Existing tested pattern for validating a full 20-tag list:**
Concatenate elements with a null byte delimiter (`\u0000`) and newline (`\n`), then validate with a single `matches()` regex call:
```cel
function are5TagsValid(t0, t1, t2, t3, t4) {
  return (t0.size() + t1.size() + t2.size() + t3.size() + t4.size()) == 10
    && (t0.name + '\u0000' + t0.color + '\n'
      + t1.name + '\u0000' + t1.color + '\n'
      + t2.name + '\u0000' + t2.color + '\n'
      + t3.name + '\u0000' + t3.color + '\n'
      + t4.name + '\u0000' + t4.color)
      .matches('^([^\\s\u0000\n]([^\u0000\n]{0,78}[^\\s\u0000\n])?\u0000#[a-fA-F0-9]{6}([a-fA-F0-9]{2})?\n){4}[^\\s\u0000\n]([^\u0000\n]{0,78}[^\\s\u0000\n])?\u0000#[a-fA-F0-9]{6}([a-fA-F0-9]{2})?$');
}

function are20TagsValid(tags) {
  return are5TagsValid(tags[0], tags[1], tags[2], tags[3], tags[4])
    && are5TagsValid(tags[5], tags[6], tags[7], tags[8], tags[9])
    && are5TagsValid(tags[10], tags[11], tags[12], tags[13], tags[14])
    && are5TagsValid(tags[15], tags[16], tags[17], tags[18], tags[19]);
}
```

---

### 2. Differential Checking on Updates
During `update` operations, do not re-validate complex arrays if they have not changed:
```cel
// If tags were not touched, skip expensive deep validation:
let tagsUnchanged = request.resource.data.tags == resource.data.tags;
return tagsUnchanged || isValidOrderTags(request.resource.data.tags);
```

---

### 3. Aggressive Short-Circuiting Order
Place the cheapest and most likely-to-fail conditions first:
```cel
// Good order:
// 1. Auth check (almost free)
// 2. Role check (custom claim or simple comparison)
// 3. Array size check (single integer comparison)
// 4. Expensive deep field / regex validation (last)
allow update: if request.auth != null
  && (isAdmin() || (isOwner() && request.resource.data.tags.size() <= 20 && isValidOrderTags(...)));
```

---

### 4. Limit `get()` and `exists()` Calls
- Firestore allows a maximum of **10 `get()`/`exists()` calls** across the entire rule evaluation.
- Cache results inside functions using `let`:
```cel
let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
return userDoc.data.role == 'admin' && userDoc.data.active == true;
```

---

## 🧪 5. Testing & Verification

Every change to `firestore.rules` **must** be validated against the Firestore Emulator integration suite before merging. These test files must run with the integration config and emulators, not standalone under the default Vitest configuration:

```bash
# Test order and quote validations:
npm run test:integration
```

All tests must pass with 0 failures before deploying rules to Firebase.
