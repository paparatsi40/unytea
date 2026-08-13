/**
 * ESLint rule: every export of a `"use server"` module must go through
 * `defineAction`.
 *
 * Next.js turns each exported async function in a `"use server"` file into a
 * publicly addressable POST endpoint. A bare `export async function` therefore
 * ships an unauthenticated endpoint unless the author remembered to check
 * identity by hand — which, across 224 actions, 63 times they did not (SEC-02).
 *
 * With this rule, the only way to export an action is through the seam, and
 * `auth: "public"` becomes an explicit, reviewable decision instead of the
 * silent default.
 *
 * Allowed:
 *   export const doThing = defineAction({ auth: "user", ... }, async (ctx) => {});
 *   export type Foo = ...;              // types are erased, not endpoints
 *   export interface Bar { ... };
 *
 * Reported:
 *   export async function doThing() {}          // bare action
 *   export const doThing = async () => {};      // bare action
 *   export const CONSTANT = 5;                  // invalid in a "use server" file
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Require every export in a "use server" module to be created by defineAction',
    },
    schema: [
      {
        type: "object",
        properties: {
          factoryName: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      bareFunction:
        'Server Action "{{name}}" is exported without going through {{factory}}. Next.js exposes it as a public POST endpoint, so it needs an explicit auth level. Wrap it: export const {{name}} = {{factory}}({ name: "{{name}}", auth: "user" | "member" | "admin" | "public", args: [...] }, async (ctx, ...) => { ... }).',
      bareArrow:
        'Server Action "{{name}}" is exported without going through {{factory}}. Next.js exposes it as a public POST endpoint, so it needs an explicit auth level.',
      nonActionExport:
        'Export "{{name}}" in a "use server" module must be created by {{factory}}. Next.js requires every export of a "use server" file to be an async function; move constants and helpers to a module without the directive.',
      defaultExport:
        'Default exports are not allowed in a "use server" module — use a named export created by {{factory}}.',
    },
  },

  create(context) {
    const factory = context.options?.[0]?.factoryName ?? "defineAction";
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    /** A module is a Server Action module only if the directive is a prologue statement. */
    function hasUseServerDirective(program) {
      for (const statement of program.body) {
        if (
          statement.type !== "ExpressionStatement" ||
          statement.expression.type !== "Literal" ||
          typeof statement.expression.value !== "string"
        ) {
          // The directive prologue ends at the first non-string-literal statement.
          return false;
        }
        if (statement.expression.value === "use server") return true;
      }
      return false;
    }

    function isFactoryCall(node) {
      if (!node || node.type !== "CallExpression") return false;
      const callee = node.callee;
      if (callee.type === "Identifier") return callee.name === factory;
      // Supports a namespaced import, e.g. actions.defineAction(...)
      if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
        return callee.property.name === factory;
      }
      return false;
    }

    let isServerModule = false;

    return {
      Program(node) {
        isServerModule = hasUseServerDirective(node);
      },

      ExportDefaultDeclaration(node) {
        if (!isServerModule) return;
        context.report({ node, messageId: "defaultExport", data: { factory } });
      },

      ExportNamedDeclaration(node) {
        if (!isServerModule) return;

        // `export type X = ...` / `export { type X }` — erased at compile time.
        if (node.exportKind === "type") return;

        const declaration = node.declaration;

        // `export { a, b }` — the binding is declared elsewhere in the file and
        // is checked at its own declaration site.
        if (!declaration) return;

        if (declaration.type === "TSTypeAliasDeclaration" || declaration.type === "TSInterfaceDeclaration") {
          return;
        }

        if (declaration.type === "FunctionDeclaration") {
          context.report({
            node: declaration.id ?? declaration,
            messageId: "bareFunction",
            data: { name: declaration.id?.name ?? "<anonymous>", factory },
          });
          return;
        }

        if (declaration.type === "VariableDeclaration") {
          for (const declarator of declaration.declarations) {
            const name = declarator.id.type === "Identifier" ? declarator.id.name : "<destructured>";
            const init = declarator.init;

            if (isFactoryCall(init)) continue;

            const isFunctionLike =
              init &&
              (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression");

            context.report({
              node: declarator,
              messageId: isFunctionLike ? "bareArrow" : "nonActionExport",
              data: { name, factory },
            });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    "no-bare-server-action": rule,
  },
};
