/** A mensagem e seu contador são confirmados no mesmo commit. */
async function persistIncomingMessage({ db, messageRef, chatRef, message, increment, serverTimestamp }) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (snapshot.exists) return false;
    const chatSnapshot = await transaction.get(chatRef);
    const existingChat = chatSnapshot.exists ? chatSnapshot.data() : {};
    const owner = existingChat.userId || message.userId || null;
    transaction.set(messageRef, { ...message, userId: owner, createdAt: serverTimestamp() });
    const chat = {
      userId: owner,
      id: message.chatId,
      phone: message.phone,
      customerName: existingChat.customerName || message.customerName,
      customerId: existingChat.customerId || message.customerId,
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
