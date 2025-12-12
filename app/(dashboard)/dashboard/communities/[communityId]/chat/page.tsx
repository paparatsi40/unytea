import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default async function CommunityChatPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", params.communityId)
    .single();

  if (!community) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Chat
        </h1>
        <p className="mt-2 text-muted-foreground">
          Real-time chat for your community
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-border bg-muted/20">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <MessageSquare className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Chat Coming Soon
        </h3>
        <p className="text-muted-foreground max-w-md">
          Real-time chat with WebSockets. Chat with community members instantly.
        </p>
      </div>
    </div>
  );
}
