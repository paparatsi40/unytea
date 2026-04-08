import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  sendWelcomeEmail,
  sendCommunityInviteEmail,
  sendSessionRecapEmail,
} from "@/lib/email";

/**
 * POST /api/email/send
 *
 * Internal API for sending transactional emails.
 * Requires authentication. Only admins/hosts can send invite/recap emails.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: "Missing required fields: type, to" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail(to, {
          userName: data?.userName || "there",
          dashboardLink: data?.dashboardLink,
        });
        break;

      case "community-invite":
        if (!data?.inviterName || !data?.communityName || !data?.joinLink) {
          return NextResponse.json(
            { error: "Missing invite data: inviterName, communityName, joinLink" },
            { status: 400 }
          );
        }
        result = await sendCommunityInviteEmail(to, {
          userName: data.userName || "there",
          inviterName: data.inviterName,
          communityName: data.communityName,
          communityDescription: data.communityDescription,
          joinLink: data.joinLink,
        });
        break;

      case "session-recap":
        if (!data?.sessionTitle || !data?.sessionDate || !data?.communityLink) {
          return NextResponse.json(
            { error: "Missing recap data: sessionTitle, sessionDate, communityLink" },
            { status: 400 }
          );
        }
        result = await sendSessionRecapEmail(to, {
          userName: data.userName || "there",
          sessionTitle: data.sessionTitle,
          sessionDate: data.sessionDate,
          summary: data.summary,
          keyInsights: data.keyInsights,
          recordingLink: data.recordingLink,
          communityLink: data.communityLink,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("[/api/email/send] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
