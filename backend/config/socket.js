const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../utils/logger');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);
    logger.debug(`Socket connected: user ${socket.userId} (${socket.userRole})`);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user ${socket.userId}`);
    });
  });

  return io;
}

module.exports = initSocket;
