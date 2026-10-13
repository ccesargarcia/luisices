const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-rtdb',
    database: {
      rules: fs.readFileSync('database.rules.json', 'utf8'),
    },
  });

  const adminAuth = {
    uid: 'admin1',
    token: {
      role: 'admin',
      active: true,
      auth_time: Math.floor(Date.now() / 1000),
    }
  };

  const db = testEnv.authenticatedContext('admin1', adminAuth.token).database();

  try {
    await db.ref('status').get();
    console.log('Admin read status: SUCCESS');
  } catch (err) {
    console.error('Admin read status: FAILED', err.message);
  }

  try {
    await db.ref('status/admin1/connections/abc').set(true);
    console.log('Admin write presence: SUCCESS');
  } catch (err) {
    console.error('Admin write presence: FAILED', err.message);
  }

  await testEnv.cleanup();
}
run();
