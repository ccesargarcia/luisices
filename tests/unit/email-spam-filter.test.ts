import { describe, it, expect } from 'vitest';
import { evaluateSpam, extractEmailAddress, extractEmailDomain } from '../../src/app/utils/emailSpamFilter';

describe('Filtro Antispam de E-mails', () => {
  it('identifica e-mails limpos e legítimos como não-spam', () => {
    const result = evaluateSpam({
      from: 'mariana.silva@gmail.com',
      subject: 'Orçamento para lembrancinhas de casamento',
      text: 'Olá, gostaria de saber o valor para 50 canecas personalizadas para casamento.',
    });

    expect(result.isSpam).toBe(false);
    expect(result.score).toBeLessThan(50);
    expect(result.reasons).toHaveLength(0);
  });

  it('detecta palavras-chave de alto risco e gatilhos de urgência financeira', () => {
    const result = evaluateSpam({
      from: 'promocoes@ganhedinheiro.xyz',
      subject: 'URGENTE: VOCÊ GANHOU NOVO PRÊMIO BITCOIN INVESTIMENTO',
      text: 'CLIQUE AQUI AGORA PARA RESGATAR SEU DINHEIRO FÁCIL E CRIPTOMOEDAS GARANTIDAS!',
    });

    expect(result.isSpam).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('aplica pontuação alta para TLDs e domínios comumente abusados', () => {
    const result = evaluateSpam({
      from: 'contato@promo-sorteio.top',
      subject: 'Parabéns, você foi selecionado',
      text: 'Acesse o link para conferir sua pontuação e reivindicar o prêmio.',
    });

    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.reasons.some((r) => r.includes('.top'))).toBe(true);
  });

  it('respeita lista de remetentes explicitamente bloqueados pelo operador', () => {
    const result = evaluateSpam(
      {
        from: 'vendas@parceiro.com.br',
        subject: 'Reunião comercial ordinária',
        text: 'Olá equipe, marcamos uma reunião para amanhã?',
      },
      {
        blockedSenders: ['parceiro.com.br'],
        allowedSenders: [],
      }
    );

    expect(result.isSpam).toBe(true);
    expect(result.score).toBe(100);
    expect(result.reasons.some((r) => r.includes('bloqueado'))).toBe(true);
  });

  it('respeita lista de permissão (whitelist) e isenta o e-mail mesmo com gatilhos', () => {
    const result = evaluateSpam(
      {
        from: 'cliente-especial@empresa.com',
        subject: 'URGENTE: Pagamento urgente de fatura e transferência',
        text: 'Segue comprovante de pagamento da fatura com urgência para liberação do pedido.',
      },
      {
        blockedSenders: [],
        allowedSenders: ['cliente-especial@empresa.com'],
      }
    );

    expect(result.isSpam).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toContain('Remetente ou domínio presente na lista de confiança (whitelist).');
  });

  it('extrai corretamente o endereço e domínio de cabeçalhos RFC 5322', () => {
    expect(extractEmailAddress('Maria Joana <maria@teste.com.br>')).toBe('maria@teste.com.br');
    expect(extractEmailAddress('simples@teste.com')).toBe('simples@teste.com');
    expect(extractEmailDomain('Maria Joana <maria@teste.com.br>')).toBe('teste.com.br');
  });

  it('normaliza identificadores de remetente ou domínio com precisão', async () => {
    const { normalizeSenderIdentifier, matchesSenderOrDomain } = await import('../../src/app/utils/emailSpamFilter');

    expect(normalizeSenderIdentifier('Fulano <fulano@dominio.com>')).toBe('fulano@dominio.com');
    expect(normalizeSenderIdentifier(' @dominio.com ')).toBe('@dominio.com');
    expect(normalizeSenderIdentifier('empresa.com.br')).toBe('empresa.com.br');

    expect(matchesSenderOrDomain('contato@empresa.com.br', ['empresa.com.br'])).toBe(true);
    expect(matchesSenderOrDomain('contato@empresa.com.br', ['@empresa.com.br'])).toBe(true);
    expect(matchesSenderOrDomain('contato@outro.com', ['empresa.com.br'])).toBe(false);
  });
});
