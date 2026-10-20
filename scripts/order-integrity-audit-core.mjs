const MAX_ORDER_PRICE = 1_000_000;
const MAX_ORDER_QUANTITY = 10_000;
const MAX_STRUCTURED_ITEMS = 10;
const VALID_PAYMENT_METHODS = new Set(['pix', 'cash', 'credit', 'debit', 'transfer']);
const VALID_PAYMENT_STATUSES = new Set(['pending', 'partial', 'paid']);

function isValidMoney(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_ORDER_PRICE;
}

function hasSubcentPrecision(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value - Math.round(value * 100) / 100) > 0.00000001;
}

function sameMoney(left, right) {
  return typeof left === 'number'
    && typeof right === 'number'
    && Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) < 0.005;
}

/** Pure audit for the order fields protected by firestore.rules. No data is changed. */
export function auditOrderData(order = {}) {
  const issues = [];
  const add = (code, severity, detail) => issues.push({ code, severity, detail });
  const priceValid = isValidMoney(order.price);
  const quantityValid = Number.isSafeInteger(order.quantity)
    && order.quantity >= 1
    && order.quantity <= MAX_ORDER_QUANTITY;

  if (!priceValid) {
    add('invalid_order_price', 'error', 'O total do pedido não é um valor válido em reais.');
  } else if (hasSubcentPrecision(order.price)) {
    add('order_price_has_subcent_precision', 'warning', 'O total contém precisão menor que um centavo.');
  }

  if (!quantityValid) {
    add('invalid_order_quantity', 'error', 'A quantidade não é um inteiro entre 1 e 10000.');
  }

  if (order.version === undefined) {
    add('legacy_order_without_version', 'info', 'Pedido legado sem versão; a primeira edição deve iniciar na versão 2.');
  } else if (!Number.isSafeInteger(order.version) || order.version < 1) {
    add('invalid_order_version', 'error', 'A versão precisa ser um inteiro positivo seguro.');
  }

  if (order.pricingMode != null && !['items', 'unit', 'total'].includes(order.pricingMode)) {
    add('invalid_pricing_mode', 'error', 'pricingMode não pertence aos modos aceitos.');
  }

  if (order.unitPrice != null) {
    if (!isValidMoney(order.unitPrice)) {
      add('invalid_unit_price', 'error', 'O valor unitário não é um valor válido em reais.');
    } else if (hasSubcentPrecision(order.unitPrice)) {
      add('unit_price_has_subcent_precision', 'warning', 'O valor unitário contém frações de centavo.');
    }
  }

  const structuredItems = Array.isArray(order.items) ? order.items : null;
  if (order.items != null && !structuredItems) {
    add('invalid_items_shape', 'error', 'items existe, mas não é uma lista.');
  }

  if (structuredItems) {
    if (structuredItems.length < 1 || structuredItems.length > MAX_STRUCTURED_ITEMS) {
      add('invalid_items_count', 'error', 'A lista estruturada deve conter de 1 a 10 produtos.');
    }

    let allItemsValid = structuredItems.length > 0 && structuredItems.length <= MAX_STRUCTURED_ITEMS;
    let itemsQuantity = 0;
    let itemsTotal = 0;
    structuredItems.forEach((item, index) => {
      const itemIsValid = item
        && typeof item === 'object'
        && typeof item.name === 'string'
        && item.name.trim().length > 0
        && item.name.length <= 300
        && Number.isSafeInteger(item.quantity)
        && item.quantity >= 1
        && item.quantity <= MAX_ORDER_QUANTITY
        && isValidMoney(item.unitPrice)
        && (item.price === undefined || isValidMoney(item.price));
      if (!itemIsValid) {
        allItemsValid = false;
        add('invalid_order_item', 'error', `O produto estruturado ${index + 1} contém campos inválidos.`);
        return;
      }

      const subtotal = item.price === undefined ? item.quantity * item.unitPrice : item.price;
      if (item.price !== undefined && !sameMoney(item.price, item.quantity * item.unitPrice)) {
        allItemsValid = false;
        add('item_subtotal_mismatch', 'error', `O subtotal do produto estruturado ${index + 1} difere de quantidade × valor unitário.`);
      }
      itemsQuantity += item.quantity;
      itemsTotal += subtotal;
    });

    if (allItemsValid) {
      if (quantityValid && itemsQuantity !== order.quantity) {
        add('order_item_quantity_mismatch', 'error', 'A soma das quantidades dos produtos difere da quantidade do pedido.');
      }
      if (priceValid && !sameMoney(itemsTotal, order.price)) {
        add('order_item_total_mismatch', 'error', 'A soma dos subtotais dos produtos difere do total do pedido.');
      }
      if (structuredItems.length > 1 && order.unitPrice != null) {
        add('ambiguous_multi_item_unit_price', 'warning', 'Pedido com vários produtos mantém um valor unitário global.');
      } else if (structuredItems.length === 1 && order.unitPrice != null
        && !sameMoney(order.unitPrice, structuredItems[0]?.unitPrice)) {
        add('order_unit_price_mismatch', 'error', 'O valor unitário do pedido difere do produto estruturado.');
      }
    }
    for (const [index, item] of structuredItems.entries()) {
      if (item && hasSubcentPrecision(item.unitPrice)) {
        add('item_unit_price_has_subcent_precision', 'warning', `O valor unitário do produto ${index + 1} contém frações de centavo.`);
      }
      if (item && hasSubcentPrecision(item.price)) {
        add('item_subtotal_has_subcent_precision', 'warning', `O subtotal do produto ${index + 1} contém frações de centavo.`);
      }
    }
  } else if (priceValid && quantityValid && order.quantity > 1 && order.unitPrice != null
    && order.pricingMode !== 'unit'
    && hasSubcentPrecision(order.unitPrice)
    && Math.abs(order.price - order.quantity * order.unitPrice) < 0.05) {
    add(
      'unit_price_may_be_derived_from_total',
      'warning',
      'O valor unitário tem frações de centavo e reproduz o total; confirme a origem antes de tratá-lo como preço real do produto.'
    );
  }

  if (!structuredItems && order.pricingMode === 'unit') {
    if (!isValidMoney(order.unitPrice)) {
      add('missing_unit_price_in_unit_mode', 'error', 'pricingMode é unit, mas não há um valor unitário válido.');
    } else if (priceValid && quantityValid && !sameMoney(order.price, order.quantity * order.unitPrice)) {
      add('unit_mode_total_mismatch', 'error', 'O total do pedido difere de quantidade × valor unitário informado.');
    }
  }

  if (order.payment != null) {
    const payment = order.payment;
    if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
      add('invalid_payment_shape', 'error', 'payment não é um objeto válido.');
    } else {
      const paidValid = isValidMoney(payment.paidAmount);
      const remainingValid = isValidMoney(payment.remainingAmount);
      if (!priceValid || !isValidMoney(payment.totalAmount) || !sameMoney(payment.totalAmount, order.price)) {
        add('payment_total_mismatch', 'error', 'O total do pagamento difere do total do pedido ou é inválido.');
      }
      if (!paidValid || (priceValid && payment.paidAmount > order.price)) {
        add('invalid_paid_amount', 'error', 'O valor recebido é inválido ou supera o total do pedido.');
      } else if (hasSubcentPrecision(payment.paidAmount)) {
        add('paid_amount_has_subcent_precision', 'warning', 'O valor recebido contém precisão menor que um centavo.');
      }
      if (!remainingValid || !priceValid || !paidValid
        || !sameMoney(payment.remainingAmount, order.price - payment.paidAmount)) {
        add('invalid_remaining_amount', 'error', 'O saldo restante não corresponde ao total menos o valor recebido.');
      }
      if (payment.status != null && !VALID_PAYMENT_STATUSES.has(payment.status)) {
        add('invalid_payment_status', 'error', 'O status financeiro não é aceito.');
      } else if (paidValid && priceValid) {
        const statusMatches = payment.status === 'paid'
          ? payment.paidAmount === order.price
          : payment.status === 'partial'
            ? payment.paidAmount > 0 && payment.paidAmount < order.price
            : payment.status === 'pending' && payment.paidAmount === 0;
        if (!statusMatches) {
          add('payment_status_mismatch', 'error', 'O status financeiro não corresponde ao valor recebido.');
        }
      }
      if (payment.method != null && !VALID_PAYMENT_METHODS.has(payment.method)) {
        add('invalid_payment_method', 'error', 'A forma de pagamento não é aceita.');
      }
      for (const field of ['totalAmount', 'remainingAmount']) {
        if (payment[field] != null && isValidMoney(payment[field]) && hasSubcentPrecision(payment[field])) {
          add(`${field}_has_subcent_precision`, 'warning', `${field} contém precisão menor que um centavo.`);
        }
      }
    }
  }

  return issues;
}
