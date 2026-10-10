export const QUICK_TEMPLATES = [
  {
    id: 'ready',
    label: '📦 Pronto p/ Retirada',
    title: 'Pedido Pronto para Retirada',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nÓtima notícia: seu pedido personalizado está finalizado com todo carinho e já está disponível para retirada no ateliê! ✨📦\n\nQualquer dúvida sobre horários de retirada, estamos à disposição!`,
  },
  {
    id: 'production',
    label: '🔄 Em Produção',
    title: 'Pedido em Produção',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nPassando para avisar que seu pedido já entrou na nossa esteira de produção e impressão! 👕✂️\n\nAssim que finalizarmos e embalarmos, avisamos você imediatamente!`,
  },
  {
    id: 'payment',
    label: '💰 Cobrança Amigável',
    title: 'Lembrete Amigável de Pagamento',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! Tudo bem? 😊\n\nPassando apenas para enviar o lembrete referente ao pagamento/sinal do seu pedido na Luisices.\n\nAceitamos PIX e Cartão de Crédito. Se precisar da chave ou link atualizado, só nos avisar! Obrigado pela parceria! 🙏`,
  },
  {
    id: 'confirm',
    label: '🧾 Confirmação',
    title: 'Confirmação do Pedido',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nSeu pedido foi registrado com sucesso em nosso sistema! 🧾\n\nJá estamos preparando os detalhes. Obrigado pela confiança na Luisices!`,
  },
  {
    id: 'catalog',
    label: '🛍️ Catálogo Lojinha',
    title: 'Link da Vitrine Online',
    getText: (name: string) =>
      `Olá, ${name || 'cliente'}! 👋\n\nConfira os produtos e lançamentos exclusivos na nossa vitrine online:\nhttps://luisices.com.br/loja\n\nQualquer item que desejar personalizar, é só falar com a gente por aqui! 👕✨`,
  },
];
