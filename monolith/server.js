'use strict';

require('dotenv').config();

const app = require('./src/app');
const { testConnection } = require('./src/config/db');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    // Verify database connectivity before accepting traffic
    await testConnection();
    console.log('✅ Database connection verified.');
  } catch (err) {
    console.error('❌ Cannot connect to PostgreSQL:', err.message);
    console.error('   Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Workshop Registration Service`);
    console.log(`   Running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start();
