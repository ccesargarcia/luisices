const ORDER_EDIT_WIDGET_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Editar pedido</title>
  <style>
    :root { color-scheme: light dark; font: 14px/1.45 system-ui, sans-serif; --accent: #704849; --accent-text: #704849; --surface: color-mix(in srgb, CanvasText 4%, Canvas); --border: color-mix(in srgb, CanvasText 15%, transparent); --muted: color-mix(in srgb, CanvasText 65%, transparent); }
    @media (prefers-color-scheme: dark) { :root { --accent-text: #e5c4c2; } }
    body { margin: 0; padding: 18px; color: CanvasText; background: Canvas; }
    main { max-width: 820px; margin: 0 auto; }
    h2 { margin: 0; font-size: 20px; letter-spacing: -.02em; }
    h3 { margin: 0; font-size: 16px; }
    p { margin: 5px 0 14px; color: var(--muted); }
    form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    label { display: grid; gap: 6px; font-weight: 600; }
    input, textarea, select { box-sizing: border-box; width: 100%; padding: 10px 11px; border: 1px solid var(--border); border-radius: 10px; background: Canvas; color: CanvasText; font: inherit; transition: border-color .15s, box-shadow .15s; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent); }
    textarea { min-height: 82px; resize: vertical; }
    .wide, .actions, #message, #preview { grid-column: 1 / -1; }
    .section { padding: 15px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .section-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
    .section-heading p { margin: 3px 0 0; font-size: 12px; }
    #items-list { display: grid; gap: 10px; }
    .item-row { padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: Canvas; }
    .item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .item-fields { display: grid; grid-template-columns: minmax(0, 1fr) 120px 155px; gap: 10px; align-items: end; }
    .item-fields label { font-size: 12px; color: var(--muted); }
    .item-subtotal { margin-top: 9px; text-align: right; font-weight: 700; }
    .summary { display: grid; grid-template-columns: 1fr auto; gap: 7px 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
    .summary span { color: var(--muted); }
    .summary strong { text-align: right; }
    .summary .grand-total { color: var(--accent-text); font-size: 19px; }
    .hint { padding: 9px 11px; border-radius: 9px; background: color-mix(in srgb, #e6b65c 15%, Canvas); color: CanvasText; font-size: 12px; }
    .hint:empty { display: none; }
    .actions { display: flex; gap: 9px; justify-content: flex-end; align-items: center; }
    .actions select { width: auto; flex: 1; }
    button { padding: 10px 15px; border: 0; border-radius: 10px; color: white; background: var(--accent); font: inherit; font-weight: 650; cursor: pointer; transition: transform .12s, opacity .12s; }
    button:hover:not(:disabled) { transform: translateY(-1px); }
    button.secondary { color: CanvasText; background: color-mix(in srgb, CanvasText 10%, Canvas); }
    button.ghost { padding: 5px 8px; color: #a33d3d; background: transparent; font-size: 12px; }
    button.add { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, Canvas); }
    button:disabled { opacity: .55; cursor: wait; }
    #message { min-height: 18px; color: #b42318; }
    #preview { padding: 17px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .preview-list { display: grid; gap: 8px; margin: 14px 0; }
    .preview-item { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 10px; border: 1px solid var(--border); border-radius: 10px; background: Canvas; }
    .preview-item small { color: var(--muted); }
    .delta-up { color: #b42318; } .delta-down { color: #18794e; }
    @media (max-width: 600px) { body { padding: 12px; } form { grid-template-columns: 1fr; } .wide, .actions, #message, #preview { grid-column: 1; } .item-fields { grid-template-columns: 1fr 1fr; } .item-fields label:first-child { grid-column: 1 / -1; } .section { padding: 12px; } }
  </style>
</head>
<body>
  <main>
    <h2 id="title">Editar pedido</h2>
    <p id="subtitle">Carregando os dados autorizados do pedido…</p>
    <div id="app"></div>
  </main>
  <script>
    const app = document.getElementById('app');
    const subtitle = document.getElementById('subtitle');
    const pending = new Map();
    let requestId = 0;
    let currentOrder = null;
    let pendingUpdate = null;
    let pendingToolName = 'update_order';
    let busy = false;

    function rpc(method, params) {
      const id = ++requestId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      });
    }
    function callTool(name, args) {
      return rpc('tools/call', { name, arguments: args });
    }
    function resultData(response) {
      if (response?.isError) throw new Error(response.content?.[0]?.text || 'Não foi possível executar a operação.');
      if (response?.structuredContent) return response.structuredContent;
      const text = response?.content?.find((item) => item.type === 'text')?.text;
      if (text) { try { return JSON.parse(text); } catch (_) {} }
      throw new Error('O servidor retornou uma resposta inválida.');
    }
    function money(value) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    }
    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
    function showError(error) {
      const node = document.getElementById('message');
      if (node) node.textContent = error?.message || 'Não foi possível completar a operação.';
    }
    function parsePrice(val) {
      if (typeof val === 'number') return Number.isFinite(val) && val >= 0 ? val : null;
      const clean = String(val ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
      let normalized;
      if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(clean)) normalized = clean.replace(/\./g, '').replace(',', '.');
      else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(clean)) normalized = clean.replace(/,/g, '');
      else if (/^\d+(?:,\d{1,2})?$/.test(clean)) normalized = clean.replace(',', '.');
      else if (/^\d+(?:\.\d{1,2})?$/.test(clean)) normalized = clean;
      else if (/^\d{1,3}(?:\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '');
      else return null;
      const num = Number(normalized);
      return Number.isFinite(num) ? num : null;
    }
    function formatPrice(val) {
      return Number(val || 0).toFixed(2).replace('.', ',');
    }
    function readItemRows() {
      return Array.from(document.querySelectorAll('.item-row')).map((row) => {
        const existingIndex = row.dataset.existingIndex === '' ? undefined : Number(row.dataset.existingIndex);
        const get = (field) => row.querySelector('[data-field="' + field + '"]').value;
        return { existingIndex, name: get('name').trim(), quantity: Number(get('quantity')), unitPrice: parsePrice(get('unitPrice')) };
      });
    }
    function sameItems(left, right) {
      return left.length === right.length && left.every((item, index) => {
        const other = right[index];
        return item.existingIndex === other.existingIndex && item.name.trim() === other.name.trim() &&
          Number(item.quantity) === Number(other.quantity) &&
          item.unitPrice !== null && other.unitPrice !== null &&
          Math.round(Number(item.unitPrice) * 100) === Math.round(Number(other.unitPrice) * 100);
      });
    }
    function renderItems(items) {
      const list = document.getElementById('items-list');
      list.innerHTML = items.map((item, index) => '<article class="item-row" data-existing-index="' + (item.existingIndex === undefined ? '' : escapeHtml(item.existingIndex)) + '">' +
        '<div class="item-head"><strong>Item ' + (index + 1) + '</strong><button class="ghost remove-item" type="button" aria-label="Remover item ' + (index + 1) + '">Remover</button></div>' +
        '<div class="item-fields"><label>Produto<input data-field="name" maxlength="200" required value="' + escapeHtml(item.name) + '" placeholder="Ex.: Caixa personalizada"></label>' +
        '<label>Quantidade<input data-field="quantity" type="number" min="1" max="10000" step="1" required value="' + escapeHtml(item.quantity) + '"></label>' +
        '<label>Preço unitário<input data-field="unitPrice" inputmode="decimal" autocomplete="off" required value="' + escapeHtml(formatPrice(item.unitPrice)) + '" placeholder="0,00"></label></div>' +
        '<div class="item-subtotal">Subtotal: <span data-subtotal>' + money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)) + '</span></div></article>').join('');
      list.querySelectorAll('.remove-item').forEach((button) => button.addEventListener('click', () => {
        const rows = readItemRows();
        rows.splice(Array.from(list.children).indexOf(button.closest('.item-row')), 1);
        renderItems(rows);
        updateItemSummary();
      }));
      list.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateItemSummary));
      updateItemSummary();
    }
    function updateItemSummary() {
      const rows = readItemRows();
      let totalCents = 0;
      let quantity = 0;
      let valid = true;
      rows.forEach((item, index) => {
        const row = document.querySelectorAll('.item-row')[index];
        const lineValid = item.name.length > 0 && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 10000 && item.unitPrice !== null && item.unitPrice <= 1000000;
        if (!lineValid) valid = false;
        const subtotalCents = lineValid ? Math.round(item.unitPrice * 100) * item.quantity : 0;
        totalCents += subtotalCents;
        quantity += lineValid ? item.quantity : 0;
        row.querySelector('[data-subtotal]').textContent = money(subtotalCents / 100);
        row.querySelector('.remove-item').disabled = rows.length <= 1;
      });
      const total = totalCents / 100;
      document.getElementById('items-count').textContent = rows.length + (rows.length === 1 ? ' produto' : ' produtos');
      document.getElementById('items-quantity').textContent = quantity + (quantity === 1 ? ' unidade' : ' unidades');
      document.getElementById('items-total').textContent = money(total);
      const change = Math.round((total - Number(currentOrder?.totalPrice || 0)) * 100) / 100;
      const delta = document.getElementById('items-delta');
      delta.textContent = change === 0 ? 'Sem alteração no total atual' : (change > 0 ? 'Aumento de ' : 'Redução de ') + money(Math.abs(change));
      delta.className = change > 0 ? 'delta-up' : change < 0 ? 'delta-down' : '';
      document.getElementById('item-validation').textContent = rows.length > 10
        ? 'O pedido aceita no máximo 10 produtos.'
        : quantity > 100000 ? 'A soma das quantidades não pode passar de 100.000.'
          : !Number.isSafeInteger(totalCents) || totalCents > 1000000000 ? 'O total do pedido não pode ultrapassar R$ 10.000.000,00.'
          : !valid ? 'Revise nome, quantidade e preço unitário de cada item.' : '';
      return { rows, total, quantity, valid: valid && Number.isSafeInteger(totalCents) && totalCents <= 1000000000 && rows.length > 0 && rows.length <= 10 && quantity <= 100000 };
    }
    function renderForm(order) {
      currentOrder = order;
      pendingUpdate = null;
      pendingToolName = 'update_order';
      document.getElementById('title').textContent = 'Editar pedido ' + order.orderNumber;
      subtitle.textContent = order.customerName ? 'Cliente: ' + order.customerName : 'Revise os dados do pedido.';
      const hasStructuredItems = Array.isArray(order.items) && order.items.length > 0;
      const initialItems = hasStructuredItems ? order.items.map((item) => ({
        existingIndex: item.existingIndex, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice,
      })) : [{
        name: order.productName || '', quantity: Number(order.quantity) || 1,
        unitPrice: Math.round((Number(order.totalPrice || 0) / (Number(order.quantity) || 1)) * 100) / 100,
      }];
      const baselineItems = initialItems.map((item) => ({ ...item }));
      app.innerHTML = '<form id="edit-form">' +
        '<label>Cliente<input name="customerName" maxlength="200" value="' + escapeHtml(order.customerName) + '"></label>' +
        '<label>Telefone / WhatsApp<input name="customerPhone" maxlength="50" value="' + escapeHtml(order.customerPhone) + '"></label>' +
        '<section class="wide section"><div class="section-heading"><div><h3>Itens do pedido</h3><p>Edite quantidades e preços. Os subtotais e o total são atualizados na hora.</p></div><button class="add" id="add-item" type="button">＋ Adicionar item</button></div>' +
        (!hasStructuredItems ? '<div class="hint">Este pedido ainda não tem itens detalhados. O produto e o preço abaixo são uma sugestão baseada no pedido atual; ao salvar os itens, o total será recalculado.</div>' : '') +
        '<div id="items-list"></div><div id="item-validation" role="alert" class="hint" style="margin-top:10px"></div>' +
        '<div class="summary"><span>Produtos</span><strong id="items-count"></strong><span>Quantidade total</span><strong id="items-quantity"></strong><span>Novo total</span><strong id="items-total" class="grand-total"></strong><span>Variação</span><strong id="items-delta"></strong></div></section>' +
        '<label>Prazo de entrega<input name="deliveryDate" type="date" value="' + escapeHtml(String(order.deliveryDate || '').slice(0, 10)) + '"></label>' +
        '<label>Tema<input name="theme" maxlength="200" value="' + escapeHtml(order.theme) + '"></label>' +
        '<section class="wide section"><h3>Etapa da produção</h3><p>As etapas avançam na ordem do fluxo.</p><div class="actions"><select id="next-status"></select><button id="status-preview" type="button">Revisar etapa</button></div></section>' +
        '<label class="wide">Observações<textarea name="notes" maxlength="1000">' + escapeHtml(order.notes) + '</textarea></label>' +
        '<div id="message" role="alert"></div><div class="actions"><button id="preview-button" type="submit">Revisar alterações</button></div>' +
        '</form>';
      const form = document.getElementById('edit-form');
      renderItems(initialItems);
      document.getElementById('add-item').onclick = () => {
        const rows = readItemRows();
        if (rows.length >= 10) return showError(new Error('O pedido aceita no máximo 10 produtos.'));
        rows.push({ name: '', quantity: 1, unitPrice: 0 });
        renderItems(rows);
        document.querySelector('.item-row:last-child [data-field="name"]').focus();
      };
      const statusSelect = document.getElementById('next-status');
      const nextStatuses = { pending: [{ value: 'in-progress', label: 'Em produção' }], 'in-progress': [{ value: 'completed', label: 'Concluído' }], completed: [], cancelled: [] };
      const statusLabels = { pending: 'Pendente', 'in-progress': 'Em produção', completed: 'Concluído', cancelled: 'Cancelado' };
      const statusOptions = nextStatuses[order.status] || [];
      statusSelect.innerHTML = '<option value="">Etapa atual: ' + escapeHtml(statusLabels[order.status] || order.status) + '</option>' + statusOptions.map((item) => '<option value="' + item.value + '">' + item.label + '</option>').join('');
      const statusButton = document.getElementById('status-preview');
      statusButton.disabled = statusOptions.length === 0;
      statusButton.onclick = async () => {
        const targetStatus = statusSelect.value;
        if (!targetStatus || busy) return;
        const args = { orderNumber: order.orderNumber, status: targetStatus, expectedVersion: order.version, idempotencyKey: 'mcp-order-status-' + crypto.randomUUID(), confirmed: false };
        await submitPreview(args, 'update_order_status');
      };
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(form);
        const args = { orderNumber: order.orderNumber, expectedVersion: order.version, idempotencyKey: 'mcp-order-edit-' + crypto.randomUUID(), confirmed: false };
        const value = (name) => String(data.get(name) || '').trim();
        const itemSummary = updateItemSummary();
        const itemRowsChanged = !sameItems(itemSummary.rows, baselineItems);
        if (itemRowsChanged) {
          if (!itemSummary.valid) return showError(new Error('Corrija os itens destacados antes de continuar.'));
          args.items = itemSummary.rows.map((item) => ({
            name: item.name, quantity: item.quantity, unitPrice: item.unitPrice,
            ...(item.existingIndex !== undefined ? { existingIndex: item.existingIndex } : {}),
          }));
        }
        const customerName = value('customerName');
        if (customerName !== order.customerName) args.customerName = customerName;
        const customerPhone = value('customerPhone');
        if (customerPhone !== order.customerPhone) args.customerPhone = customerPhone;
        const deliveryDate = value('deliveryDate');
        if (deliveryDate && deliveryDate !== String(order.deliveryDate || '').slice(0, 10)) args.deliveryDate = deliveryDate;
        const theme = value('theme');
        if (theme !== String(order.theme || '')) args.theme = theme;
        const notes = value('notes');
        if (notes !== String(order.notes || '')) args.notes = notes;
        if (Object.keys(args).every((key) => ['orderNumber', 'expectedVersion', 'idempotencyKey', 'confirmed'].includes(key))) return showError(new Error('Nenhuma alteração foi feita.'));
        await submitPreview(args);
      });
    }
    async function submitPreview(args, toolName = 'update_order') {
      busy = true;
      try {
        const response = await callTool(toolName, args);
        const result = resultData(response);
        if (!result.requiresConfirmation) throw new Error(result.message || 'A prévia não foi retornada.');
        pendingUpdate = args;
        pendingToolName = toolName;
        renderPreview(result.preview);
      } catch (error) { showError(error); }
      finally { busy = false; }
    }
    function renderPreview(preview) {
      const pricing = preview.pricing;
      app.innerHTML = '<section id="preview"><h3>Confira antes de salvar</h3><p>Pedido ' + escapeHtml(preview.orderNumber) + ' — ' + escapeHtml(preview.customerName) + '</p><div id="preview-content"></div><div class="actions"><button id="back" class="secondary" type="button">Voltar e ajustar</button><button id="confirm" type="button">Confirmar e salvar</button></div><div id="message" role="alert"></div></section>';
      const content = document.getElementById('preview-content');
      if (preview.fromStatus) {
        content.innerHTML = '<div class="preview-item"><span>Etapa atual</span><strong>' + escapeHtml(preview.fromStatus) + '</strong><span>Nova etapa</span><strong>' + escapeHtml(preview.toStatus) + '</strong></div>';
      } else if (preview.itemChanges) {
        const labels = { updated: 'Alterado', added: 'Adicionado', unchanged: 'Sem alteração' };
        const cards = preview.itemChanges.changed.map((entry) => {
          const before = entry.before;
          const after = entry.after;
          const status = labels[entry.action] || 'Alterado';
          return '<article class="preview-item"><strong>' + escapeHtml(after.name) + '</strong><span>' + status + '</span>' +
            '<small>Antes: ' + (before ? escapeHtml(before.quantity + ' un. × ' + money(before.unitPrice) + ' = ' + money(before.subtotal)) : 'Novo item') + '</small>' +
            '<small>Depois: ' + escapeHtml(after.quantity + ' un. × ' + money(after.unitPrice) + ' = ' + money(after.subtotal)) + '</small>' +
            (entry.metadataPreserved ? '<small>Dados adicionais do item serão preservados.</small>' : '') + '</article>';
        }).join('');
        const removed = preview.itemChanges.removed.map((item) => '<article class="preview-item"><strong>' + escapeHtml(item.name) + '</strong><span>Removido</span><small>' + escapeHtml(item.quantity + ' un. × ' + money(item.unitPrice) + ' = ' + money(item.subtotal)) + '</small></article>').join('');
        const oldTotal = Number(currentOrder?.totalPrice) || 0;
        const newTotal = Number(pricing?.totalPrice ?? preview.changes?.price) || 0;
        const delta = Math.round((newTotal - oldTotal) * 100) / 100;
        const difference = delta === 0 ? 'O total permanece igual.' : (delta > 0 ? 'Aumento de ' : 'Redução de ') + money(Math.abs(delta)) + '.';
        content.innerHTML = '<h3>Itens atualizados</h3><div class="preview-list">' + cards + removed + '</div>' +
          '<div class="summary"><span>Total atual</span><strong>' + money(oldTotal) + '</strong><span>Novo total</span><strong class="grand-total">' + money(newTotal) + '</strong><span>Variação</span><strong class="' + (delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : '') + '">' + escapeHtml(difference) + '</strong></div>';
      } else {
        const labels = { customerName: 'Cliente', customerPhone: 'Telefone', productName: 'Produto', quantity: 'Quantidade', deliveryDate: 'Prazo de entrega', theme: 'Tema', notes: 'Observações' };
        const rows = Object.entries(preview.changes || {}).filter(([key]) => key !== 'price' && key !== 'items').map(([key, value]) =>
          '<div class="preview-item"><strong>' + escapeHtml(labels[key] || key) + '</strong><span>' + escapeHtml(value == null ? '—' : String(value)) + '</span></div>').join('');
        content.innerHTML = '<div class="preview-list">' + rows + '</div>' + (pricing ? '<div class="summary"><span>Novo total</span><strong class="grand-total">' + money(pricing.totalPrice) + '</strong>' + (pricing.unitPrice !== undefined ? '<span>Preço por unidade</span><strong>' + money(pricing.unitPrice) + '</strong>' : '') + '</div>' : '');
      }
      document.getElementById('back').onclick = () => renderForm(currentOrder);
      document.getElementById('confirm').onclick = async () => {
        if (!pendingUpdate || busy) return;
        busy = true;
        const button = document.getElementById('confirm');
        button.disabled = true;
        try {
          const response = await callTool(pendingToolName, { ...pendingUpdate, confirmed: true });
          const result = resultData(response);
          if (!result.success) throw new Error(result.message || 'O pedido não foi salvo.');
          app.innerHTML = '<section id="preview"><h3>Pedido atualizado</h3><p>' + escapeHtml(result.orderNumber) + ' — nova versão ' + escapeHtml(result.version) + '.</p></section>';
          subtitle.textContent = 'As alterações foram salvas no Luisices.';
        } catch (error) { showError(error); button.disabled = false; }
        finally { busy = false; }
      };
    }
    function renderOutput(output) {
      const data = output?.structuredContent || output;
      if (data?.order) renderForm(data.order);
      else if (data?.state === 'editing' && data.order) renderForm(data.order);
      else if (data?.preview) renderPreview(data.preview);
      else if (data?.success) { app.textContent = 'Pedido atualizado: ' + (data.orderNumber || ''); }
    }
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== '2.0') return;
      if (message.id !== undefined && pending.has(message.id)) {
        const item = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message || 'Falha na chamada MCP.'));
        else item.resolve(message.result);
      } else if (message.method === 'ui/notifications/tool-result') {
        renderOutput(message.params || {});
      }
    });
    rpc('ui/initialize', {
      appInfo: { name: 'luisices-order-edit', version: '2.0.0' },
      appCapabilities: {},
      protocolVersion: '2026-01-26',
    }).then(() => {
      window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} }, '*');
    }).catch(showError);
  </script>
</body>
</html>`;

module.exports = { ORDER_EDIT_WIDGET_HTML };
