# Pusher Configuration for Real-Time Chat

## Setup Instructions

### 1. Create Pusher Account
1. Go to [https://pusher.com](https://pusher.com)
2. Sign up for a free account
3. Create a new app
4. Select "US East (Ohio)" as the cluster

### 2. Get Your Credentials
In your Pusher dashboard, find these values:
- **App ID** (e.g., "1234567")
- **Key** (e.g., "abc123def456")
- **Secret** (e.g., "xyz789abc123")
- **Cluster** (e.g., "us2")

### 3. Configure Environment Variables in Vercel

Add these environment variables in your Vercel project settings:

```
PUSHER_APP_ID=your_app_id_here
PUSHER_KEY=your_key_here
PUSHER_SECRET=your_secret_here
PUSHER_CLUSTER=us2
NEXT_PUBLIC_PUSHER_KEY=your_key_here
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

**Important:**
- `PUSHER_SECRET` and `PUSHER_APP_ID` are **server-side only** (keep them secret)
- `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are **client-side** (prefixed with NEXT_PUBLIC)

### 4. Redeploy Your App
After adding the environment variables, redeploy your app:
- In Vercel dashboard, go to Deployments
- Click "Redeploy" on the latest deployment

### 5. Test the Chat
1. Go to any community
2. Click on the "Chat" tab
3. Open the community in two different browsers/incognito windows
4. Send messages and see them appear in real-time!

## Features

✅ **Real-time messaging** - Messages appear instantly
✅ **Private channels** - Only community members can access
✅ **Connection status** - Shows when you're connected
✅ **Message grouping** - Groups consecutive messages from same sender
✅ **Typing indicators** - Shows when someone is typing (optional)
✅ **Scales automatically** - Pusher handles all the infrastructure

## Free Tier Limits

Pusher's free tier includes:
- 200k messages per day
- 100 concurrent connections
- Unlimited channels

This is plenty for testing and small communities!

## Troubleshooting

### "Not connected to Pusher"
- Check that environment variables are set correctly
- Verify NEXT_PUBLIC_PUSHER_KEY matches your Pusher dashboard
- Check browser console for errors

### Messages not appearing
- Check that both users are in the same community
- Verify the community ID is being passed correctly
- Check Pusher dashboard for connection logs

### 401 Unauthorized errors
- Make sure user is authenticated
- Check that the /api/pusher endpoint is accessible

## Next Steps

After confirming the chat works, you can:
1. Add typing indicators
2. Add message reactions (emoji)
3. Add file attachments
4. Add message threading/replies
5. Add message search
6. Add message history/pagination

## Need Help?

- Pusher Docs: https://pusher.com/docs
- Pusher Support: support@pusher.com
- Community Discord: https://discord.gg/pusher
