type UsersActionHandler = (request: unknown) => Promise<unknown>;

export const PUBLIC_USER_ACTIONS = new Set([
  'validateUserInvitation',
  'completeUserInvitation',
  'sendPasswordResetEmail',
]);

export async function dispatchUsersAction(
  action: string,
  request: unknown,
  handlers: Record<string, UsersActionHandler>,
): Promise<unknown> {
  if (!Object.prototype.hasOwnProperty.call(handlers, action)) {
    throw Object.assign(new Error(`Ação de usuário inválida: ${action}`), { code: 'invalid-argument' });
  }
  return handlers[action](request);
}
