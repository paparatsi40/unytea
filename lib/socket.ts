import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export function initSocket(server: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user to their personal room
    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined personal room`);
    });

    // Join channel room
    socket.on("join:channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
      console.log(`User joined channel ${channelId}`);
    });

    // Leave channel room
    socket.on("leave:channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      console.log(`User left channel ${channelId}`);
    });

    // Join community room
    socket.on("join:community", (communityId: string) => {
      socket.join(`community:${communityId}`);
      console.log(`User joined community ${communityId}`);
    });

    // Typing indicator
    socket.on("typing:start", ({ channelId, userId, userName }) => {
      socket.to(`channel:${channelId}`).emit("user:typing", { userId, userName });
    });

    socket.on("typing:stop", ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit("user:stopped-typing", { userId });
    });

    // Presence updates
    socket.on("presence:update", ({ userId, status }) => {
      io.emit("presence:changed", { userId, status });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

// Event emitters for server-side usage
export const socketEvents = {
  // Chat events
  newMessage: (io: SocketIOServer, channelId: string, message: any) => {
    io.to(`channel:${channelId}`).emit("message:new", message);
  },

  messageDeleted: (io: SocketIOServer, channelId: string, messageId: string) => {
    io.to(`channel:${channelId}`).emit("message:deleted", { messageId });
  },

  // Notification events
  newNotification: (io: SocketIOServer, userId: string, notification: any) => {
    io.to(`user:${userId}`).emit("notification:new", notification);
  },

  // Presence events
  userOnline: (io: SocketIOServer, communityId: string, userId: string) => {
    io.to(`community:${communityId}`).emit("user:online", { userId });
  },

  userOffline: (io: SocketIOServer, communityId: string, userId: string) => {
    io.to(`community:${communityId}`).emit("user:offline", { userId });
  },

  // Buddy events
  buddyGoalCompleted: (io: SocketIOServer, userId: string, goal: any) => {
    io.to(`user:${userId}`).emit("buddy:goal-completed", goal);
  },

  buddyCheckIn: (io: SocketIOServer, userId: string, checkIn: any) => {
    io.to(`user:${userId}`).emit("buddy:check-in", checkIn);
  },
};
