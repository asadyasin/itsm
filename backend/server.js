require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');
const { attachIO } = require('./services/notificationService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);
  attachIO(io);

  server.listen(PORT, () => {
    logger.info(`ITSM API server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

start();
