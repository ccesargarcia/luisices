import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailService } from '../../src/services/emailService';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mocking firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collectionName, id) => ({
    path: `${collectionName}/${id}`,
    id,
  })),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mocking firebase/functions
const mockSendCustomEmail = vi.fn();
const mockGetEmailUsage = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions, functionName) => {
    if (functionName === 'sendCustomEmail') {
      return mockSendCustomEmail;
    }
    if (functionName === 'getEmailUsage') {
      return mockGetEmailUsage;
    }
    return vi.fn();
  }),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  functions: {},
}));

describe('Funcionalidade: Comunicação e Mensageria por E-mail (emailService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Envio de E-mails via Cloud Function (sendEmail)', () => {
    it('deve chamar a Cloud Function sendCustomEmail com o payload correto e retornar os dados de sucesso', async () => {
      const mockPayload = {
        to: ['cliente@exemplo.com'],
        subject: 'Atualização do seu Pedido #1234',
        html: '<p>Seu pedido está em produção!</p>',
        replyTo: 'contato@luisices.com.br',
      };

      mockSendCustomEmail.mockResolvedValueOnce({
        data: { success: true, emailId: 'resend-msg-abc123' },
      });

      const result = await emailService.sendEmail(mockPayload);

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'sendCustomEmail');
      expect(mockSendCustomEmail).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual({ success: true, emailId: 'resend-msg-abc123' });
    });

    it('deve propagar erro quando a Cloud Function falhar no envio', async () => {
      mockSendCustomEmail.mockRejectedValueOnce(new Error('Quota diária de e-mail excedida'));

      await expect(
        emailService.sendEmail({
          to: ['cliente@exemplo.com'],
          subject: 'Teste',
          html: '<p>Teste</p>',
        })
      ).rejects.toThrow('Quota diária de e-mail excedida');
    });
  });

  describe('2. Monitoramento de Cotas (getEmailUsage)', () => {
    it('deve consultar a função getEmailUsage e formatar os dados de consumo diário e mensal', async () => {
      mockGetEmailUsage.mockResolvedValueOnce({
        data: {
          success: true,
          daily: { sent: 15, limit: 100, remaining: 85 },
          monthly: { sent: 320, limit: 3000, remaining: 2680 },
          source: 'resend',
        },
      });

      const usage = await emailService.getEmailUsage();

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getEmailUsage');
      expect(usage).toEqual({
        daily: { sent: 15, limit: 100, remaining: 85 },
        monthly: { sent: 320, limit: 3000, remaining: 2680 },
        source: 'resend',
      });
    });
  });

  describe('3. Gestão e Triagem de E-mails Recebidos', () => {
    it('markAsRead deve atualizar o campo read no Firestore', async () => {
      await emailService.markAsRead('email-xyz', true);

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'receivedEmails', 'email-xyz');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' }),
        { read: true }
      );
    });

    it('toggleStar deve atualizar o campo starred (favorito) no Firestore', async () => {
      await emailService.toggleStar('email-xyz', true);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' }),
        { starred: true }
      );
    });

    it('setArchived deve atualizar o campo archived no Firestore', async () => {
      await emailService.setArchived('email-xyz', true);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' }),
        { archived: true }
      );
    });

    it('deleteReceivedEmail deve excluir o documento de receivedEmails', async () => {
      await emailService.deleteReceivedEmail('email-xyz');

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' })
      );
    });

    it('deleteSentEmail deve excluir o documento de sentEmails', async () => {
      await emailService.deleteSentEmail('email-sent-999');

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'sentEmails/email-sent-999' })
      );
    });

    it('moveToTrash deve marcar e-mail recebido com trashed: true e trashedAt em receivedEmails', async () => {
      await emailService.moveToTrash('email-xyz', 'received');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'receivedEmails', 'email-xyz');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' }),
        expect.objectContaining({
          trashed: true,
          trashedAt: expect.any(Date),
        })
      );
    });

    it('moveToTrash deve marcar e-mail enviado com trashed: true e trashedAt em sentEmails', async () => {
      await emailService.moveToTrash('email-sent-123', 'sent');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'sentEmails', 'email-sent-123');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'sentEmails/email-sent-123' }),
        expect.objectContaining({
          trashed: true,
          trashedAt: expect.any(Date),
        })
      );
    });

    it('restoreFromTrash deve restaurar e-mail recebido com trashed: false e trashedAt: null', async () => {
      await emailService.restoreFromTrash('email-xyz', 'received');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'receivedEmails', 'email-xyz');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'receivedEmails/email-xyz' }),
        {
          trashed: false,
          trashedAt: null,
        }
      );
    });

    it('restoreFromTrash deve restaurar e-mail enviado com trashed: false e trashedAt: null', async () => {
      await emailService.restoreFromTrash('email-sent-123', 'sent');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'sentEmails', 'email-sent-123');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'sentEmails/email-sent-123' }),
        {
          trashed: false,
          trashedAt: null,
        }
      );
    });
  });

  describe('4. Sanitização e Segurança Anti-XSS do Visualizador de E-mails', () => {
    it('deve neutralizar scripts maliciosos, iframes e atributos de evento inline', async () => {
      const DOMPurify = (await import('isomorphic-dompurify')).default;
      const maliciousHtml = '<p>Olá</p><script>alert("XSS")</script><img src="x" onerror="alert(1)" /><iframe src="https://evil.com"></iframe>';

      const cleaned = DOMPurify.sanitize(maliciousHtml, {
        ADD_ATTR: ['target', 'rel'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      });

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('onerror');
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).toContain('<p>Olá</p>');
    });

    it('deve transformar links para abrir com segurança em nova aba (target="_blank" e rel="noopener noreferrer")', async () => {
      const DOMPurify = (await import('isomorphic-dompurify')).default;
      const rawHtml = '<p>Acesse nosso site <a href="https://luisices.com.br">clicando aqui</a></p>';

      const cleaned = DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      });

      const withSafeLinks = cleaned.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi, (match, href, rest) => {
        if (!match.includes('target=')) {
          return `<a href="${href}" target="_blank" rel="noopener noreferrer"${rest}>`;
        }
        return match;
      });

      expect(withSafeLinks).toContain('target="_blank"');
      expect(withSafeLinks).toContain('rel="noopener noreferrer"');
    });
  });
});
