export function getTestCredentials() {
  return {
    email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
    password: process.env.TEST_USER_PASSWORD || 'senha123',
  };
}
