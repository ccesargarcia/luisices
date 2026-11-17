import { describe, expect, it, vi } from 'vitest';
import { dispatchAiAction } from '../../api/_aiActionDispatcher';

describe('AI API action dispatcher', () => {
  it.each(['chat', 'enrichGalleryItem', 'enrichStoreProduct', 'getUsage'])(
    'dispatches %s to its handler with the authenticated request', async (action) => {
      const request = { auth: { uid: 'user-1' }, data: { action } };
      const handler = vi.fn().mockResolvedValue({ success: true });

      const result = await dispatchAiAction(action, request, { [action]: handler });

      expect(result).toEqual({ success: true });
      expect(handler).toHaveBeenCalledWith(request);
    },
  );

  it.each(['unknown', 'constructor', '__proto__'])('rejects unknown action %s as invalid-argument', async (action) => {
    await expect(dispatchAiAction(action, {}, {})).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
