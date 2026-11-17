import { describe, expect, it, vi } from 'vitest';
import { dispatchBetaOrderAction } from '../../api/_orderTrackingActionDispatcher';

describe('Beta order API action dispatcher', () => {
  it.each(['createOrder', 'updateComplexOrder', 'calculateSuperfreteShipping', 'createSuperfreteLabel'])(
    'dispatches %s with the callable request and Firestore instance', async (action) => {
      const request = { auth: { uid: 'user-1' }, data: { orderId: 'order-1' } };
      const firestore = { name: 'admin-firestore' };
      const handler = vi.fn().mockResolvedValue({ success: true });

      const result = await dispatchBetaOrderAction(action, request, firestore, { [action]: handler });

      expect(result).toEqual({ handled: true, result: { success: true } });
      expect(handler).toHaveBeenCalledWith(request, firestore);
    },
  );

  it('leaves existing tracking-link actions for the original dispatcher', async () => {
    const handler = vi.fn();

    const result = await dispatchBetaOrderAction('list', {}, {}, { createOrder: handler });

    expect(result).toEqual({ handled: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['constructor', '__proto__'])('does not dispatch inherited action key %s', async (action) => {
    const result = await dispatchBetaOrderAction(action, {}, {}, { createOrder: vi.fn() });
    expect(result).toEqual({ handled: false });
  });
});
