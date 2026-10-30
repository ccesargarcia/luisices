import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderTrackingService } from '../../src/services/orderTrackingService';

const mockCallable = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions, name) => {
    return (...args: any[]) => mockCallable(name, ...args);
  }),
}));

vi.mock('../../src/lib/firebase', () => ({
  functions: {},
}));

describe('orderTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteLinksBatch', () => {
    it('retorna contagem 0 se array estiver vazio', async () => {
      const result = await orderTrackingService.deleteLinksBatch([]);
      expect(result).toEqual({ success: true, deletedCount: 0, failedIds: [] });
      expect(mockCallable).not.toHaveBeenCalled();
    });

    it('chama deleteOrderTrackingLinksBatch com a lista de linkIds', async () => {
      mockCallable.mockResolvedValueOnce({
        data: { success: true, deletedCount: 3 },
      });

      const result = await orderTrackingService.deleteLinksBatch(['link-1', 'link-2', 'link-3']);
      expect(mockCallable).toHaveBeenCalledWith('deleteOrderTrackingLinksBatch', {
        linkIds: ['link-1', 'link-2', 'link-3'],
      });
      expect(result).toEqual({ success: true, deletedCount: 3, failedIds: [] });
    });

    it('faz fallback para deleteLink individual caso a Cloud Function batch não seja encontrada (not-found)', async () => {
      mockCallable.mockImplementation((name: string, payload: any) => {
        if (name === 'deleteOrderTrackingLinksBatch') {
          const err: any = new Error('Function not found');
          err.code = 'functions/not-found';
          return Promise.reject(err);
        }
        if (name === 'deleteOrderTrackingLink') {
          return Promise.resolve({ data: { success: true, deleted: true } });
        }
        return Promise.reject(new Error('Unknown callable'));
      });

      const result = await orderTrackingService.deleteLinksBatch(['link-a', 'link-b']);
      expect(result).toEqual({ success: true, deletedCount: 2, failedIds: [] });
      expect(mockCallable).toHaveBeenCalledWith('deleteOrderTrackingLink', { linkId: 'link-a' });
      expect(mockCallable).toHaveBeenCalledWith('deleteOrderTrackingLink', { linkId: 'link-b' });
    });

    it('mantém IDs selecionáveis se uma chamada falhar com erro inesperado', async () => {
      mockCallable.mockRejectedValueOnce(new Error('Internal permission error'));
      await expect(orderTrackingService.deleteLinksBatch(['link-err']))
        .resolves.toEqual({ success: false, deletedCount: 0, failedIds: ['link-err'] });
    });

    it('divide seleções maiores que o limite de 100 IDs em chamadas válidas', async () => {
      mockCallable.mockImplementation((name: string, payload: any) => Promise.resolve({
        data: { success: true, deletedCount: payload.linkIds.length },
      }));

      const ids = Array.from({ length: 101 }, (_, index) => `link-${index}`);
      const result = await orderTrackingService.deleteLinksBatch(ids);

      const batches = mockCallable.mock.calls.map(([, payload]) => payload.linkIds as string[]);
      expect(batches.map(batch => batch.length)).toEqual([100, 1]);
      expect(result).toEqual({ success: true, deletedCount: 101, failedIds: [] });
    });

    it('informa quais exclusões individuais do fallback falharam', async () => {
      mockCallable.mockImplementation((name: string, payload: any) => {
        if (name === 'deleteOrderTrackingLinksBatch') {
          const err: any = new Error('Function not found');
          err.code = 'functions/not-found';
          return Promise.reject(err);
        }
        if (name === 'deleteOrderTrackingLink' && payload.linkId === 'link-b') {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve({ data: { success: true, deleted: true } });
      });

      await expect(orderTrackingService.deleteLinksBatch(['link-a', 'link-b']))
        .resolves.toEqual({ success: false, deletedCount: 1, failedIds: ['link-b'] });
    });
  });
});
