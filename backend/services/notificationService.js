const Notification = require('../models/Notification');
const User = require('../models/User');

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

// Persists one notification per active user in the given role (not just a fire-and-forget
// socket broadcast) so it correctly contributes to each recipient's unread count and can be
// cleared by their own "mark all as read" — same guarantees as notifyUser, just fanned out.
async function notifyRole(role, { title, message, type = 'system', link = '' }) {
  const users = await User.find({ role, isDeleted: false, isActive: true }).select('_id');
  if (users.length === 0) return [];

  const docs = await Notification.insertMany(
    users.map((u) => ({ recipient: u._id, title, message, type, link }))
  );

  if (ioInstance) {
    docs.forEach((doc) => {
      ioInstance.to(`user:${doc.recipient}`).emit('notification', doc);
    });
  }
  return docs;
}

module.exports = { attachIO, notifyUser, notifyRole };
