type BetaOrderHandler = (request: unknown, firestore: unknown) => Promise<unknown>;

export async function dispatchBetaOrderAction(
  action: string,
  request: unknown,
  firestore: unknown,
  handlers: Record<string, BetaOrderHandler>,
): Promise<{ handled: boolean; result?: unknown }> {
  if (!Object.prototype.hasOwnProperty.call(handlers, action)) return { handled: false };
  return { handled: true, result: await handlers[action](request, firestore) };
}
