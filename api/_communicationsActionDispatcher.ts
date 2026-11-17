type CommunicationsActionHandler = (request: unknown) => Promise<unknown>;

export async function dispatchCommunicationsAction(
  action: string,
  request: unknown,
  handlers: Record<string, CommunicationsActionHandler>,
): Promise<unknown> {
  if (!Object.prototype.hasOwnProperty.call(handlers, action)) {
    throw Object.assign(new Error(`Ação de comunicação inválida: ${action}`), { code: 'invalid-argument' });
  }
  return handlers[action](request);
}
