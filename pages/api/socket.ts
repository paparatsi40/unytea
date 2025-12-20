import { NextApiRequest } from "next";
import { NextApiResponseWithSocket, initSocket } from "@/lib/socket";
import { setSocketInstance } from "@/lib/socket-instance";

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log("Socket.io already running");
    setSocketInstance(res.socket.server.io);
  } else {
    console.log("Starting Socket.io server");
    const io = initSocket(res.socket.server);
    res.socket.server.io = io;
    setSocketInstance(io);
  }
  res.end();
}
