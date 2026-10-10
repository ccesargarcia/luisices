/** A mensagem e seu contador são confirmados no mesmo commit. */
async function persistIncomingMessage({ db, messageRef, chatRef, message, increment, serverTimestamp }) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (snapshot.exists) return false;
    transaction.set(messageRef, { ...message, createdAt: serverTimestamp() });
    const chat = {
      id: message.chatId,
      phone: message.phone,
      customerName: message.customerName,
      customerId: message.customerId,
      lastMessageText: message.text,
      lastMessageTimestamp: message.timestamp,
      lastMessageSender: message.sender,
      updatedAt: serverTimestamp(),
    };
    // Enviar uma mensagem não significa que as recebidas foram lidas.
    if (message.sender === 'customer') chat.unreadCount = increment(1);
    transaction.set(chatRef, chat, { merge: true });
    return true;
  });
}

module.exports = { persistIncomingMessage };
