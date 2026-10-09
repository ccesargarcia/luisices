import type { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

type DesiredClaims = { role: string; active?: boolean };
type RepairResult = { synced: boolean; status?: string };
const pendingRepairs = new WeakMap<User, Promise<RepairResult>>();

/** Uma chamada por usuário em voo; usa sempre o domínio Functions configurado. */
export async function repairClaimsIfNeeded(user: User, profile: DesiredClaims): Promise<RepairResult> {
  const matches = (claims: Record<string, unknown>) =>
    claims.role === profile.role && claims.active === (profile.active !== false);
  const token = await user.getIdTokenResult();
  if (matches(token.claims)) return { synced: true, status: 'already-synced' };
  const pending = pendingRepairs.get(user);
  if (pending) {
    const result = await pending;
    // Outro snapshot pode ter mudado o perfil enquanto o reparo estava em voo.
    const latest = await user.getIdTokenResult();
    return { ...result, synced: result.synced && matches(latest.claims) };
  }

  const repair = (async () => {
    const callable = httpsCallable<{ uid: string }, RepairResult>(functions, 'repairUserClaims');
    const { data } = await callable({ uid: user.uid });
    if (data.synced !== true) return { synced: false, status: data.status || 'pending' };
    // Refresh só propaga claims já gravadas no servidor; não cria privilégios.
    const freshToken = await user.getIdTokenResult(true);
    return { synced: matches(freshToken.claims), status: data.status };
  })();
  pendingRepairs.set(user, repair);
  try {
    return await repair;
  } finally {
    if (pendingRepairs.get(user) === repair) pendingRepairs.delete(user);
  }
}
