'use client';
import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

/** Force a fresh handshake (after login/logout the cookie changed). */
export function reconnectSocket() {
  if (socket) { socket.disconnect(); socket.connect(); }
}
