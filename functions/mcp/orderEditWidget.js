const ORDER_EDIT_WIDGET_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Editar pedido</title>
  <style>
    :root { color-scheme: light dark; font: 14px system-ui, sans-serif; }
    body { margin: 0; padding: 16px; color: CanvasText; background: Canvas; }
    h2 { margin: 0 0 4px; font-size: 18px; }
    p { margin: 4px 0 14px; color: color-mix(in srgb, CanvasText 70%, transparent); }
    form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    label { display: grid; gap: 5px; font-weight: 600; }
    input, textarea, select { box-sizing: border-box; width: 100%; padding: 9px; border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); border-radius: 8px; background: Canvas; color: CanvasText; font: inherit; }
    textarea { min-height: 72px; resize: vertical; }
    .wide, .actions, #message, #preview { grid-column: 1 / -1; }
    .mode { display: flex; gap: 16px; align-items: center; font-weight: 400; }
    .mode label { display: flex; align-items: center; gap: 6px; }
    .mode input { width: auto; }
    .total { padding: 10px; border-radius: 8px; background: color-mix(in srgb, CanvasText 8%, Canvas); }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    button { padding: 9px 14px; border: 0; border-radius: 8px; color: white; background: #2563eb; font: inherit; font-weight: 650; cursor: pointer; }
    button.secondary { color: CanvasText; background: color-mix(in srgb, CanvasText 12%, Canvas); }
    button:disabled { opacity: .55; cursor: wait; }
    #message { min-height: 18px; color: #b42318; }
    #preview { padding: 12px; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); border-radius: 8px; }
    @media (max-width: 520px) { form { grid-template-columns: 1fr; } .wide, .actions, #message, #preview { grid-column: 1; } }
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
      const clean = String(val ?? '').trim();
      if (!/^\d+(?:[,.]\d{1,2})?$/.test(clean)) return null;
      const num = Number(clean.replace(',', '.'));
      return Number.isFinite(num) ? num : null;
    }
    function formatPrice(val) {
      return Number(val || 0).toFixed(2).replace('.', ',');
    }
    function renderForm(order) {
      currentOrder = order;
      pendingUpdate = null;
      pendingToolName = 'update_order';
      document.getElementById('title').textContent = 'Editar pedido ' + order.orderNumber;
      subtitle.textContent = order.customerName ? 'Cliente: ' + order.customerName : 'Revise os dados do pedido.';
      const unitPrice = Number(order.quantity) > 0 ? Number(order.totalPrice) / Number(order.quantity) : Number(order.totalPrice);
      app.innerHTML = '<form id="edit-form">' +
        '<label>Cliente<input name="customerName" maxlength="200" value="' + escapeHtml(order.customerName) + '"></label>' +
        '<label>Telefone / WhatsApp<input name="customerPhone" maxlength="50" value="' + escapeHtml(order.customerPhone) + '"></label>' +
        '<label>Produto<input name="productName" maxlength="300" value="' + escapeHtml(order.productName) + '"></label>' +
        '<label>Quantidade<input name="quantity" type="number" min="1" max="10000" step="1" required value="' + escapeHtml(order.quantity) + '"></label>' +
        '<label class="wide">Valor a informar<div class="mode"><label><input type="radio" name="priceMode" value="total" checked> Total do pedido</label><label><input type="radio" name="priceMode" value="unit"> Por unidade</label></div></label>' +
        '<label id="price-label" class="wide">Novo valor total (R$)<input name="price" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + escapeHtml(formatPrice(order.totalPrice)) + '"></label>' +
        '<div id="calculated" class="wide total">Valor total: ' + money(order.totalPrice) + '</div>' +
        '<label>Prazo de entrega<input name="deliveryDate" type="date" value="' + escapeHtml(String(order.deliveryDate || '').slice(0, 10)) + '"></label>' +
        '<label>Tema<input name="theme" maxlength="200" value="' + escapeHtml(order.theme) + '"></label>' +
        '<section class="wide"><label>Etapa da produção</label><p>Atualize a etapa separadamente; o servidor só aceita avançar no fluxo.</p><div class="actions"><select id="next-status"></select><button id="status-preview" type="button">Revisar etapa</button></div></section>' +
        '<label class="wide">Observações<textarea name="notes" maxlength="1000">' + escapeHtml(order.notes) + '</textarea></label>' +
        '<div id="message" role="alert"></div><div class="actions"><button id="preview-button" type="submit">Revisar alterações</button></div>' +
        '</form>';
      const form = document.getElementById('edit-form');
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
      const priceInput = form.elements.price;
      const quantityInput = form.elements.quantity;
      const updateCalculated = () => {
        const mode = form.elements.priceMode.value;
        document.getElementById('price-label').firstChild.textContent = mode === 'unit' ? 'Novo valor por unidade (R$)' : 'Novo valor total (R$)';
        const parsed = parsePrice(priceInput.value);
        const safeParsed = parsed ?? 0;
        const amount = Math.round(safeParsed * (mode === 'unit' ? Number(quantityInput.value) || 0 : 1) * 100) / 100;
        document.getElementById('calculated').textContent = parsed === null
          ? 'Informe um valor válido com até duas casas decimais.'
          : 'Valor total: ' + money(amount) + (mode === 'unit' ? ' (' + money(safeParsed) + ' × ' + (Number(quantityInput.value) || 0) + ')' : '');
      };
      form.addEventListener('input', updateCalculated);
      form.elements.priceMode.forEach((radio) => radio.addEventListener('change', () => {
        const quantity = Number(quantityInput.value) || 1;
        const currentValue = parsePrice(priceInput.value);
        const nextVal = Math.round((radio.value === 'unit' ? currentValue / quantity : currentValue * quantity) * 100) / 100;
        priceInput.value = formatPrice(nextVal);
        updateCalculated();
      }));
      quantityInput.addEventListener('change', updateCalculated);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(form);
        const quantity = Number(data.get('quantity'));
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) return showError(new Error('A quantidade deve ser entre 1 e 10000.'));
        const mode = String(data.get('priceMode'));
        const rawPrice = String(data.get('price') || '').trim();
        const amount = parsePrice(rawPrice);
        if (!rawPrice || amount === null || !Number.isFinite(amount) || amount < 0) return showError(new Error('Informe um valor válido, com até duas casas decimais (ex: 25,50).'));
        const args = { orderNumber: order.orderNumber, expectedVersion: order.version, idempotencyKey: 'mcp-order-edit-' + crypto.randomUUID(), confirmed: false };
        const value = (name) => String(data.get(name) || '').trim();
        const productName = value('productName');
        if (productName !== order.productName) args.productName = productName;
        const customerName = value('customerName');
        if (customerName !== order.customerName) args.customerName = customerName;
        const customerPhone = value('customerPhone');
        if (customerPhone !== order.customerPhone) args.customerPhone = customerPhone;
        if (quantity !== Number(order.quantity)) args.quantity = quantity;
        const deliveryDate = value('deliveryDate');
        if (deliveryDate && deliveryDate !== String(order.deliveryDate || '').slice(0, 10)) args.deliveryDate = deliveryDate;
        const theme = value('theme');
        if (theme !== String(order.theme || '')) args.theme = theme;
        const notes = value('notes');
        if (notes !== String(order.notes || '')) args.notes = notes;
        const oldAmount = Number(order.totalPrice) || 0;
        if (mode === 'total' && Math.round(amount * 100) !== Math.round(oldAmount * 100)) args.totalPrice = amount;
        if (mode === 'unit' && Math.round(amount * quantity * 100) !== Math.round(oldAmount * 100)) args.unitPrice = amount;
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
      app.innerHTML = '<section id="preview"><h3>Confirme as alterações</h3><p>Pedido ' + escapeHtml(preview.orderNumber) + ' — ' + escapeHtml(preview.customerName) + '</p><pre></pre><div class="actions"><button id="back" class="secondary" type="button">Voltar ao formulário</button><button id="confirm" type="button">Confirmar e salvar</button></div><div id="message" role="alert"></div></section>';
      const changes = { ...(preview.changes || {}) };
      delete changes.price;
      document.querySelector('#preview pre').textContent = preview.fromStatus
        ? ('Etapa atual: ' + preview.fromStatus + '\nNova etapa: ' + preview.toStatus)
        : JSON.stringify(changes, null, 2) + (pricing ? '\n\n' + (pricing.mode === 'unit' ? 'Valor unitário: ' + money(pricing.unitPrice) + '\n' : '') + 'Novo total: ' + money(pricing.totalPrice) : '');
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
      appInfo: { name: 'luisices-order-edit', version: '1.0.0' },
      appCapabilities: {},
      protocolVersion: '2026-01-26',
    }).then(() => {
      window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} }, '*');
    }).catch(showError);
  </script>
</body>
</html>`;

module.exports = { ORDER_EDIT_WIDGET_HTML };
