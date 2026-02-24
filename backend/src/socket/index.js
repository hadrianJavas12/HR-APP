import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/** @type {Server} */
let io;

/**
 * Initialize Socket.IO server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, tenantId, role } = socket.user;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Join tenant room
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${tenantId}:${role}`);

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO instance.
 * @returns {Server}
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

/**
 * Emit event to a specific tenant.
 * @param {string} tenantId
 * @param {string} event
 * @param {Object} data
 */
export function emitToTenant(tenantId, event, data) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

/**
 * Emit event to a specific user.
 * @param {string} userId
 * @param {string} event
 * @param {Object} data
 */
export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
