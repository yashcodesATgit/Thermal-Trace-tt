import app from './app';
import { env } from './config/env';
import { db } from './db/postgres';
import { connectRedis, closeRedis } from './redis/redis';

import { firmsSyncManager } from './services/firms/firms.scheduler';

async function startServer() {
  try {
    // Attempt connecting to Redis
    await connectRedis();

    // Initialize FIRMS Sync Manager
    await firmsSyncManager.initializeFromDb();
    firmsSyncManager.startSchedulerTask();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Node.js server running on port ${env.PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down server...');
      firmsSyncManager.stopSchedulerTask();
      server.close();
      await db.close();
      await closeRedis();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
