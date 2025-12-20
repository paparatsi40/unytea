import { prisma } from "@/lib/prisma";

/**
 * Supabase-like API wrapper around Prisma
 * This allows us to use Supabase-style queries with Prisma backend
 */

type QueryBuilder<T> = {
  select: (fields: string) => QueryBuilder<T>;
  eq: (field: string, value: any) => QueryBuilder<T>;
  neq: (field: string, value: any) => QueryBuilder<T>;
  gte: (field: string, value: any) => QueryBuilder<T>;
  lt: (field: string, value: any) => QueryBuilder<T>;
  order: (field: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  single: () => Promise<{ data: T | null; error: any }>;
  then: (resolve: (value: { data: T[] | null; error: any }) => void, reject?: (reason?: any) => void) => Promise<any>;
};

class PrismaQueryBuilder<T> implements QueryBuilder<T> {
  private tableName: string;
  private selectFields: string | null = null;
  private whereConditions: any = {};
  private orderBy: any = {};
  private limitCount: number | null = null;
  private isSingleQuery: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string): QueryBuilder<T> {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any): QueryBuilder<T> {
    this.whereConditions[field] = value;
    return this;
  }

  neq(field: string, value: any): QueryBuilder<T> {
    this.whereConditions[field] = { not: value };
    return this;
  }

  gte(field: string, value: any): QueryBuilder<T> {
    this.whereConditions[field] = { gte: value };
    return this;
  }

  lt(field: string, value: any): QueryBuilder<T> {
    this.whereConditions[field] = { lt: value };
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.orderBy[field] = options?.ascending === false ? "desc" : "asc";
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  single(): Promise<{ data: T | null; error: any }> {
    this.isSingleQuery = true;
    return this.execute();
  }

  then(
    resolve: (value: { data: T[] | null; error: any }) => void,
    reject?: (reason?: any) => void
  ): Promise<any> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      // @ts-ignore - Dynamic Prisma access
      const model = prisma[this.tableName];

      if (!model) {
        throw new Error(`Table ${this.tableName} not found`);
      }

      const query: any = {
        where: this.whereConditions,
      };

      if (Object.keys(this.orderBy).length > 0) {
        query.orderBy = this.orderBy;
      }

      if (this.limitCount) {
        query.take = this.limitCount;
      }

      // Handle select with relations
      if (this.selectFields && this.selectFields !== "*") {
        query.include = this.parseSelectFields(this.selectFields);
      }

      let data;
      if (this.isSingleQuery) {
        data = await model.findFirst(query);
      } else {
        data = await model.findMany(query);
      }

      return { data, error: null };
    } catch (error) {
      console.error("Prisma query error:", error);
      return { data: null, error };
    }
  }

  private parseSelectFields(_fields: string): any {
    // Simple parser for relations like "*, owner:users(id, name)"
    // For now, return empty object (select all)
    // TODO: Implement proper parsing if needed
    return {};
  }
}

export function createClient() {
  return {
    from: <T = any>(tableName: string): QueryBuilder<T> => {
      // Convert table names to Prisma model names
      const modelMap: Record<string, string> = {
        communities: "community",
        community_members: "member",
        members: "member",
        users: "user",
        mentor_sessions: "mentorSession",
      };

      const prismaModel = modelMap[tableName] || tableName;
      return new PrismaQueryBuilder<T>(prismaModel);
    },
  };
}
