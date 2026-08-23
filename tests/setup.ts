import "@testing-library/jest-dom";
import { vi } from "vitest";

/**
 * Generic Prisma mock.
 *
 * Previously this file enumerated a hand-picked subset of models and methods,
 * which meant any test touching an unlisted model crashed on `undefined`. The
 * authorization enumeration harness (tests/unit/action-authz.test.ts) imports
 * every action module in the codebase, so it needs all 49 models available.
 *
 * A Proxy creates each model lazily and memoises it, so
 * `vi.mocked(prisma.user.findUnique).mockResolvedValue(...)` keeps working
 * exactly as before — the same object is returned on every access.
 */
const MODEL_METHODS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

type MockedModel = Record<(typeof MODEL_METHODS)[number], ReturnType<typeof vi.fn>>;

function createModelMock(): MockedModel {
  const model = {} as MockedModel;
  for (const method of MODEL_METHODS) {
    model[method] = vi.fn();
  }
  return model;
}

const models = new Map<string, MockedModel>();

// Mirrors Prisma's two call shapes: an interactive callback, or an array of
// promises. Neither actually opens a transaction here.
const transactionMock = vi.fn(async (arg: unknown) => {
  if (typeof arg === "function") {
    return (arg as (tx: unknown) => unknown)(prismaMock);
  }
  if (Array.isArray(arg)) {
    return Promise.all(arg);
  }
  return undefined;
});

const prismaMock: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
  get(_target, property: string | symbol) {
    if (typeof property !== "string") return undefined;
    // Guard against the object being mistaken for a thenable when awaited.
    if (property === "then") return undefined;
    if (property === "$transaction") return transactionMock;
    if (
      property === "$queryRaw" ||
      property === "$queryRawUnsafe" ||
      property === "$executeRaw" ||
      property === "$executeRawUnsafe"
    ) {
      return vi.fn().mockResolvedValue([]);
    }
    if (property === "$connect" || property === "$disconnect") {
      return vi.fn().mockResolvedValue(undefined);
    }
    if (property.startsWith("$")) return vi.fn();

    let model = models.get(property);
    if (!model) {
      model = createModelMock();
      models.set(property, model);
    }
    return model;
  },
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));
vi.mock("@/lib/auth-utils", () => ({
  getCurrentUserId: vi.fn(),
  requireAuth: vi.fn(),
  getCurrentUser: vi.fn(),
  canCreateCommunity: vi.fn(),
  hasActiveSubscription: vi.fn(),
  getUserSubscription: vi.fn(),
}));
/**
 * The password senders resolve `{ success: true }` rather than `undefined`
 * because that is what `sendEmail` really returns, and callers now read it:
 * `/api/auth/forgot-password` answers 500 on `success === false` instead of
 * reporting "check your inbox" over a delivery that never happened. A mock that
 * resolved `undefined` would make every caller crash on the property access,
 * which is a fake failure hiding a real contract.
 */
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendSetPasswordEmail: vi.fn().mockResolvedValue({ success: true }),
  sendCommunityInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionRecapEmail: vi.fn().mockResolvedValue(undefined),
}));
