---
name: luisices-order-ledger-audit
description: >-
  Use this skill when auditing order data integrity, calculating discounts and subtotals,
  reconciling the sales ledger (salesLedger collection), repairing zero or negative unit prices,
  or running financial migration scripts in Luisices.
---

# Luisices Order Integrity & Sales Ledger Runbook

This skill outlines the procedures for auditing orders, maintaining financial consistency, and synchronizing the `salesLedger` collection in Firestore.

---

## 🏛️ Financial Architecture Overview

Luisices manages custom stationery and ateliê orders. Financial consistency depends on two core collections in Firestore:

1. **`orders`**: Authoritative record of customer orders, item breakdowns, custom tags, shipping, and payment status.
2. **`salesLedger`**: Financial projection used for revenue, payment, date, and order reporting. Keep it consistent with the order through the supported atomic backend flow; do not assume every field or payment-history value is immutable.

---

## 🔍 1. Running Order Audits (Read-Only)

Before modifying order normalization or ledger logic, run the integrity audit:

```bash
npm run audit:orders
```

### What this checks:
* Mismatches between item subtotals and the order's overall `totalAmount`.
* Orders with missing, `null`, or `0` unit prices that have a positive subtotal.
* Corrupted negative values in discounts or subtotals.
* Orphaned orders lacking corresponding sales ledger entries.

---

## 🛠️ 2. Synchronizing the Sales Ledger

If new orders were created or migrated without ledger entries:

```bash
npm run sync:ledger
```

*This script (`scripts/sync-sales-ledger.mjs`) reads orders from Firestore and batches writes into `salesLedger` using atomic Firestore batches.*

---

## 🩹 3. Repairing Legacy Corrupted Values

For historical orders with negative discounts or corrupted values:

```bash
npm run fix-negative-values
```

*Always test in development (`luisices-dev`) before executing against production data.*

---

## ⚠️ Order Calculation Invariants

When editing code in `functions/orders/` or `src/app/utils/orderCalculations.ts`:

1. **Unit Price Recovery:**
   Never infer or write a unit price using a generic fallback such as `subtotal / quantity`. Luisices has legacy item schemas and order-level totals; first identify the canonical item fields and verify the source data (including original import or operation records). Zero may be valid, and an inferred value can silently change financial meaning. Use the audit and an explicit, reviewed repair plan before modifying historical orders.
2. **String Quantity Normalization:**
   External forms or catalog submissions may pass quantities as strings (e.g. `"2"`). Always normalize with:
   ```javascript
   const quantity = Math.max(1, parseInt(String(item.quantity || 1), 10));
   ```
3. **No Mutating Finalized Orders:**
   Orders in `status: 'completed'` or `status: 'delivered'` must not have their financial totals recalculated retroactively.
