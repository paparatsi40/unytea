export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTER"
  | "USER_UPDATE"
  | "COMMUNITY_CREATE"
  | "COMMUNITY_UPDATE"
  | "COMMUNITY_DELETE"
  | "POST_CREATE"
  | "POST_UPDATE"
  | "POST_DELETE"
  | "COMMENT_CREATE"
  | "COMMENT_DELETE"
  | "MESSAGE_SEND"
  | "MEMBER_ADD"
  | "MEMBER_REMOVE"
  | "MEMBER_BAN"
  | "ROLE_CHANGE"
  | "BUDDY_MATCH"
  | "BUDDY_UNMATCH"
  | "ACHIEVEMENT_UNLOCK";

export interface AuditLogData {
  action: AuditAction;
  userId: string;
  resourceType?: string;
  resourceId?: string;
  communityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    // In production, you might want to send this to a dedicated logging service
    // For now, we'll log to console and could extend to database
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("📝 AUDIT LOG:", logEntry);
    }

    // You could also store in database:
    // await prisma.auditLog.create({ data: logEntry });

    return logEntry;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error - audit logging should not break application flow
    return null;
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  _userId: string,
  _options?: {
    limit?: number;
    actions?: AuditAction[];
    communityId?: string;
  }
) {
  // This would query from database if audit logs were stored
  // For now, return empty array
  return [];
}

/**
 * Get audit logs for a community
 */
export async function getCommunityAuditLogs(
  _communityId: string,
  _options?: {
    limit?: number;
    actions?: AuditAction[];
  }
) {
  // This would query from database if audit logs were stored
  return [];
}

/**
 * Helper functions for common audit log scenarios
 */
export const AuditLog = {
  userLogin: (userId: string, metadata?: Record<string, any>) =>
    createAuditLog({ action: "USER_LOGIN", userId, metadata }),

  userLogout: (userId: string) =>
    createAuditLog({ action: "USER_LOGOUT", userId }),

  userRegister: (userId: string, metadata?: Record<string, any>) =>
    createAuditLog({ action: "USER_REGISTER", userId, metadata }),

  userUpdate: (userId: string, changes: string[]) =>
    createAuditLog({
      action: "USER_UPDATE",
      userId,
      metadata: { changes },
    }),

  communityCreate: (userId: string, communityId: string) =>
    createAuditLog({
      action: "COMMUNITY_CREATE",
      userId,
      resourceType: "community",
      resourceId: communityId,
      communityId,
    }),

  communityUpdate: (userId: string, communityId: string, changes: string[]) =>
    createAuditLog({
      action: "COMMUNITY_UPDATE",
      userId,
      resourceType: "community",
      resourceId: communityId,
      communityId,
      metadata: { changes },
    }),

  communityDelete: (userId: string, communityId: string) =>
    createAuditLog({
      action: "COMMUNITY_DELETE",
      userId,
      resourceType: "community",
      resourceId: communityId,
      communityId,
    }),

  postCreate: (userId: string, postId: string, communityId: string) =>
    createAuditLog({
      action: "POST_CREATE",
      userId,
      resourceType: "post",
      resourceId: postId,
      communityId,
    }),

  postDelete: (userId: string, postId: string, communityId: string) =>
    createAuditLog({
      action: "POST_DELETE",
      userId,
      resourceType: "post",
      resourceId: postId,
      communityId,
    }),

  memberBan: (
    adminId: string,
    userId: string,
    communityId: string,
    reason?: string
  ) =>
    createAuditLog({
      action: "MEMBER_BAN",
      userId: adminId,
      resourceType: "member",
      resourceId: userId,
      communityId,
      metadata: { bannedUserId: userId, reason },
    }),

  roleChange: (
    adminId: string,
    userId: string,
    communityId: string,
    oldRole: string,
    newRole: string
  ) =>
    createAuditLog({
      action: "ROLE_CHANGE",
      userId: adminId,
      resourceType: "member",
      resourceId: userId,
      communityId,
      metadata: { targetUserId: userId, oldRole, newRole },
    }),

  achievementUnlock: (userId: string, achievementId: string) =>
    createAuditLog({
      action: "ACHIEVEMENT_UNLOCK",
      userId,
      resourceType: "achievement",
      resourceId: achievementId,
    }),
};