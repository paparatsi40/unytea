import Pusher from "pusher";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
});

// POST /api/pusher/auth - Authenticate private channels
export async function POST(req: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.formData();
  const socketId = body.get("socket_id") as string;
  const channel = body.get("channel_name") as string;

  // Extract channelId from channel name (format: private-channel-{id})
  const match = channel.match(/^private-channel-(\w+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const _channelId = match[1];
  void _channelId; // Intentionally unused - channel ID validated

  // Authorize the user for this channel
  const authResponse = pusher.authorizeChannel(socketId, channel, {
    user_id: session.user.id,
    user_info: {
      name: session.user.name,
      email: session.user.email,
    },
  });

  return NextResponse.json(authResponse);
}

// POST /api/pusher/trigger - Trigger events (server-side)
export async function PUT(req: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { channel, event, data } = body;

  try {
    await pusher.trigger(channel, event, {
      ...data,
      senderId: session.user.id,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 }
    );
  }
}
