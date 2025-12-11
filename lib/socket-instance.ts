import { Server as SocketIOServer } from "socket.io";

declare global {
  var io: SocketIOServer | undefined;
}

export function getSocketInstance(): SocketIOServer | null {
  return global.io || null;
}

export function setSocketInstance(io: SocketIOServer) {
  global.io = io;
}
