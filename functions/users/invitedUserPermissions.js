const INVITED_USER_PERMISSIONS = {
  dashboard: true,
  orders: { view: true, create: true, edit: false, delete: false },
  archivedOrders: { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: false, delete: false },
  whatsapp: true,
  aiCopilot: true,
  products: { view: true, create: false, edit: false, delete: false },
  storeProducts: { view: true, create: false, edit: false, delete: false },
  store: false,
  quotes: { view: true, create: true, edit: true, delete: true },
  gallery: { view: true, create: true, edit: true, delete: true },
  exchanges: true,
  reports: false,
  settings: false,
  users: { view: false, create: false, edit: false, delete: false },
  emails: { view: false, create: false, edit: false, delete: false },
  pricing: { view: true, create: true, edit: true, delete: true },
};

module.exports = { INVITED_USER_PERMISSIONS };
