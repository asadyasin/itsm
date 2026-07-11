const Notification = require('../models/Notification');

let ioInstance = null;

function attachIO(io) {
  ioInstance = io;
}

// Creates a persisted notification and pushes it in real time to the
// recipient's private Socket.IO room (joined as `user:<id>` on connection).
async function notifyUser({ recipient, title, message, type = 'system', link = '' }) {
  const notification = await Notification.create({ recipient, title, message, type, link });
  if (ioInstance) {
    ioInstance.to(`user:${recipient}`).emit('notification', notification);
  }
  return notification;
}

async function notifyRole(role, payload) {
  if (ioInstance) {
    ioInstance.to(`role:${role}`).emit('notification', payload);
  }
}

module.exports = { attachIO, notifyUser, notifyRole };
