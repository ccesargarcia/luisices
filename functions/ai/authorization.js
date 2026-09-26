/**
 * Subsistema de Autorização e Isolamento de Escopo para IA - Luisices
 * 
 * Garante que nenhum usuário (comum, funcionário ou admin) acesse metadados,
 * relatórios, pedidos ou clientes fora do escopo estritamente permitido.
 */

/**
 * Monta o escopo de autorização do solicitante a partir do ID e perfil
 */
function getCallerScope(callerUid, callerProfile) {
  const profile = callerProfile || {};
  const uid = String(callerUid || '');
  const role = profile.role || 'user';
  const active = profile.active !== false;
  const permissions = profile.permissions || {};
  const isAdmin = role === 'admin' && active;
  const isEmployee = role === 'funcionario' && active;
  const isUser = role === 'user' && active;

  // Permissão expressa para recursos de IA:
  // Admin: sempre tem acesso ativo
  // Funcionário: requer permissions.aiCopilot === true
  // Usuário: tem acesso a não ser que permissions.aiCopilot === false
  let canAiCopilot = false;
  if (isAdmin) {
    canAiCopilot = true;
  } else if (isEmployee) {
    canAiCopilot = permissions.aiCopilot === true;
  } else if (isUser) {
    canAiCopilot = permissions.aiCopilot !== false;
  }

  return {
    uid,
    role,
    active,
    isAdmin,
    isEmployee,
    isUser,
    canAiCopilot,
    permissions,
    email: profile.email || '',
    displayName: profile.displayName || '',
  };
}

/**
 * Valida se o usuário tem permissão para usar o Copiloto de IA
 * @throws {Error} com mensagem descritiva caso o acesso seja negado
 */
function validateAiAccess(scope) {
  if (!scope || !scope.uid) {
    const err = new Error('Usuário não autenticado.');
    err.code = 'unauthenticated';
    throw err;
  }

  if (!scope.active) {
    const err = new Error('Conta de usuário desativada.');
    err.code = 'permission-denied';
    throw err;
  }

  if (scope.isAdmin) {
    return true;
  }

  if (scope.isEmployee && !scope.canAiCopilot) {
    const err = new Error('Seu perfil de funcionário não possui permissão para utilizar recursos de IA.');
    err.code = 'permission-denied';
    throw err;
  }

  if (scope.isUser && !scope.canAiCopilot) {
    const err = new Error('Seu perfil de usuário não possui permissão para utilizar recursos de IA.');
    err.code = 'permission-denied';
    throw err;
  }

  if (!scope.isAdmin && !scope.isEmployee && !scope.isUser) {
    const err = new Error('Acesso restrito a membros autorizados da equipe.');
    err.code = 'permission-denied';
    throw err;
  }

  return true;
}

/**
 * Valida acesso à visão computacional de itens da Galeria
 */
function validateGalleryAccess(scope, itemData) {
  validateAiAccess(scope);
  if (!itemData) {
    const err = new Error('Item da galeria não encontrado.');
    err.code = 'not-found';
    throw err;
  }

  if (itemData.deletedAt || itemData.isDeleted) {
    const err = new Error('Este item da galeria foi excluído.');
    err.code = 'failed-precondition';
    throw err;
  }

  if (scope.isAdmin) {
    return true;
  }

  const isOwner = String(itemData.userId || '') === scope.uid || String(itemData.createdBy || '') === scope.uid || String(itemData.ownerUid || '') === scope.uid;
  if (!isOwner) {
    const err = new Error('Você não tem permissão para analisar ou acessar esta arte da galeria.');
    err.code = 'permission-denied';
    throw err;
  }

  return true;
}

/**
 * Valida se o solicitante pode auditar/consultar métricas de outro colaborador
 */
function canAccessUserData(scope, targetUid) {
  if (!scope.active) return false;
  if (scope.isAdmin) return true;
  return scope.uid === String(targetUid);
}

/**
 * Filtra pedidos respeitando o escopo do usuário e excluindo itens apagados
 */
function filterOrdersByScope(orders = [], scope) {
  if (!Array.isArray(orders)) return [];
  const uid = String(scope.uid);

  return orders.filter((o) => {
    if (!o) return false;
    // Exclui pedidos deletados a menos que explicitamente solicitado por admin
    if (o.deletedAt || o.isDeleted) return false;

    if (scope.isAdmin) return true;

    // Não-admin: isolamento estrito
    const orderUserId = String(o.userId || '');
    const orderCreatedBy = String(o.createdBy || '');
    const orderAssignedTo = String(o.assignedTo || '');

    return orderUserId === uid || orderCreatedBy === uid || orderAssignedTo === uid;
  });
}

/**
 * Filtra clientes respeitando o escopo do usuário
 */
function filterCustomersByScope(customers = [], scope) {
  if (!Array.isArray(customers)) return [];
  const uid = String(scope.uid);

  return customers.filter((c) => {
    if (!c) return false;
    if (c.deletedAt || c.isDeleted) return false;
    if (scope.isAdmin) return true;

    const customerUserId = String(c.userId || '');
    const customerCreatedBy = String(c.createdBy || '');
    const customerAssignedTo = String(c.assignedTo || '');

    return customerUserId === uid || customerCreatedBy === uid || customerAssignedTo === uid;
  });
}

/**
 * Filtra itens da galeria respeitando o escopo do usuário
 */
function filterGalleryByScope(items = [], scope) {
  if (!Array.isArray(items)) return [];
  const uid = String(scope.uid);

  return items.filter((item) => {
    if (!item) return false;
    if (item.deletedAt || item.isDeleted) return false;
    if (scope.isAdmin) return true;

    const itemUserId = String(item.userId || '');
    const itemCreatedBy = String(item.createdBy || '');
    const itemOwnerUid = String(item.ownerUid || '');
    return itemUserId === uid || itemCreatedBy === uid || itemOwnerUid === uid;
  });
}

module.exports = {
  getCallerScope,
  validateAiAccess,
  validateGalleryAccess,
  canAccessUserData,
  filterOrdersByScope,
  filterCustomersByScope,
  filterGalleryByScope,
};
