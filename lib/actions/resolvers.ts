import { prisma } from "@/lib/prisma";

/**
 * Community resolvers for `defineAction`'s `community` option.
 *
 * Most actions are handed a resource id (postId, channelId, sessionId…) rather
 * than a communityId, so the seam needs a way to walk from the resource to the
 * tenant that owns it. Centralising those lookups here keeps the authorization
 * decision consistent — and means a wrong join is fixed once, not in 40 places.
 *
 * Every resolver returns `null` when the resource does not exist; the seam turns
 * that into NOT_FOUND, so a non-member cannot distinguish "missing" from
 * "exists but you may not touch it".
 */

export async function communityOfPost(postId: string): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { communityId: true },
  });
  return post?.communityId ?? null;
}

export async function communityOfComment(commentId: string): Promise<string | null> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { post: { select: { communityId: true } } },
  });
  return comment?.post.communityId ?? null;
}

export async function communityOfChannel(channelId: string): Promise<string | null> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { communityId: true },
  });
  return channel?.communityId ?? null;
}

export async function communityOfChannelMessage(messageId: string): Promise<string | null> {
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: { channel: { select: { communityId: true } } },
  });
  return message?.channel?.communityId ?? null;
}

export async function communityOfSession(sessionId: string): Promise<string | null> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { communityId: true },
  });
  return session?.communityId ?? null;
}

export async function communityOfSessionSlug(slug: string): Promise<string | null> {
  const session = await prisma.mentorSession.findFirst({
    where: { slug },
    select: { communityId: true },
  });
  return session?.communityId ?? null;
}

export async function communityOfSeries(seriesId: string): Promise<string | null> {
  const series = await prisma.sessionSeries.findUnique({
    where: { id: seriesId },
    select: { communityId: true },
  });
  return series?.communityId ?? null;
}

export async function communityOfCourse(courseId: string): Promise<string | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { communityId: true },
  });
  return course?.communityId ?? null;
}

export async function communityOfModule(moduleId: string): Promise<string | null> {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { course: { select: { communityId: true } } },
  });
  return mod?.course.communityId ?? null;
}

export async function communityOfLesson(lessonId: string): Promise<string | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { course: { select: { communityId: true } } } } },
  });
  return lesson?.module.course.communityId ?? null;
}

export async function communityOfQuiz(quizId: string): Promise<string | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { lesson: { select: { module: { select: { course: { select: { communityId: true } } } } } } },
  });
  return quiz?.lesson?.module.course.communityId ?? null;
}

export async function communityOfResource(resourceId: string): Promise<string | null> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { communityId: true },
  });
  return resource?.communityId ?? null;
}

export async function communityOfResourceCategory(categoryId: string): Promise<string | null> {
  const category = await prisma.resourceCategory.findUnique({
    where: { id: categoryId },
    select: { communityId: true },
  });
  return category?.communityId ?? null;
}

export async function communityOfRecording(recordingId: string): Promise<string | null> {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    select: { session: { select: { communityId: true } } },
  });
  return recording?.session?.communityId ?? null;
}

export async function communityOfSection(sectionId: string): Promise<string | null> {
  const section = await prisma.communitySection.findUnique({
    where: { id: sectionId },
    select: { communityId: true },
  });
  return section?.communityId ?? null;
}

export async function communityOfPartnership(partnershipId: string): Promise<string | null> {
  const partnership = await prisma.buddyPartnership.findUnique({
    where: { id: partnershipId },
    select: { communityId: true },
  });
  return partnership?.communityId ?? null;
}

export async function communityOfBuddyGoal(goalId: string): Promise<string | null> {
  const goal = await prisma.buddyGoal.findUnique({
    where: { id: goalId },
    select: { partnership: { select: { communityId: true } } },
  });
  return goal?.partnership?.communityId ?? null;
}

/**
 * Reports are not directly community-scoped: the model stores a `targetType`
 * plus loose `postId`/`commentId`/`userId`/`messageId` columns and no
 * `communityId`. Walk to the community through the reported artefact.
 *
 * USER and MESSAGE reports have no community, so they resolve to `null` and can
 * only be handled by a platform admin (`allowPlatformAdmin` on the action).
 */
export async function communityOfReport(reportId: string): Promise<string | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { targetType: true, postId: true, commentId: true },
  });
  if (!report) return null;

  if (report.targetType === "POST" && report.postId) {
    return communityOfPost(report.postId);
  }
  if (report.targetType === "COMMENT" && report.commentId) {
    return communityOfComment(report.commentId);
  }
  return null;
}

export async function communityBySlug(slug: string): Promise<string | null> {
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });
  return community?.id ?? null;
}

/**
 * Confirms a communityId actually exists before the seam authorizes against it.
 * Without this, a membership lookup for a non-existent community simply fails
 * the role check and reports FORBIDDEN, which is misleading in logs.
 */
export async function communityById(communityId: string): Promise<string | null> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  return community?.id ?? null;
}
