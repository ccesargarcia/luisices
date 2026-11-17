type AiActionHandler = (request: unknown) => Promise<unknown>;

export async function dispatchAiAction(
  action: string,
  request: unknown,
  handlers: Record<string, AiActionHandler>,
): Promise<unknown> {
  if (!Object.prototype.hasOwnProperty.call(handlers, action)) {
    throw Object.assign(new Error(`Ação de IA desconhecida: ${action}`), { code: 'invalid-argument' });
  }
  return handlers[action](request);
}
