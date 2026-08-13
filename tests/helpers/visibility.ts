/**
 * Evaluates the community-visibility predicate that the action layer builds.
 *
 * Deliberately narrow: it understands exactly the one clause shape our actions
 * emit — `{ community: { OR: [{ isPrivate: false }, { members: { some: { userId, status } } }] } }`
 * — and throws on anything else. That way a test using it cannot silently keep
 * passing after someone rewrites the clause into a different shape; it fails
 * loudly instead, and the test author has to re-confirm the semantics.
 *
 * This is not a general Prisma emulator and must not grow into one.
 */

export interface CommunityFixture {
  id: string;
  isPrivate: boolean;
  /** userIds with the given membership status. */
  members: { userId: string; status: string }[];
}

interface VisibilityClause {
  community: {
    OR: [{ isPrivate: boolean }, { members: { some: { userId: string; status: string } } }];
  };
}

function assertShape(clause: unknown): asserts clause is VisibilityClause {
  const c = clause as VisibilityClause;
  const or = c?.community?.OR;
  if (
    !Array.isArray(or) ||
    or.length !== 2 ||
    typeof or[0]?.isPrivate !== "boolean" ||
    typeof or[1]?.members?.some?.userId !== "string" ||
    typeof or[1]?.members?.some?.status !== "string"
  ) {
    throw new Error(
      "Unrecognised visibility clause shape — update tests/helpers/visibility.ts " +
        "and re-verify the semantics it asserts. Received: " +
        JSON.stringify(clause)
    );
  }
}

/** Would this clause admit rows belonging to `community` for the given caller? */
export function admits(clause: unknown, community: CommunityFixture): boolean {
  assertShape(clause);
  const [publicBranch, memberBranch] = clause.community.OR;

  if (community.isPrivate === publicBranch.isPrivate) return true;

  const { userId, status } = memberBranch.members.some;
  return community.members.some((m) => m.userId === userId && m.status === status);
}

/** Pulls the visibility clause out of a Prisma `where` built as `{ AND: [...] }`. */
export function visibilityClauseFrom(where: unknown): unknown {
  const and = (where as { AND?: unknown[] })?.AND;
  if (!Array.isArray(and)) {
    throw new Error("Expected a where clause of the form { AND: [...] }");
  }
  const found = and.find((c) => c && typeof c === "object" && "community" in c);
  if (!found) {
    throw new Error(
      "No community-visibility clause in the where. The query is unscoped — " +
        "results from communities the caller cannot see would be returned."
    );
  }
  return found;
}
