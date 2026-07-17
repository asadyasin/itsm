require('dotenv').config();
const http = require('http');
const os = require('os');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');
const { attachIO } = require('./services/notificationService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // listen on all network interfaces, not just localhost

function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

async function start() {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);
  attachIO(io);

  server.listen(PORT, HOST, () => {
    logger.info(`ITSM API server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`  Local:   http://localhost:${PORT}`);
    const lanAddress = getLanAddress();
    if (lanAddress) logger.info(`  Network: http://${lanAddress}:${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

start();
