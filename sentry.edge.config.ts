// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://955d8954175ad220c70a0b123906eb25@o4511311397060608.ingest.us.sentry.io/4511463169982465",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  // false, deliberately. Sentry's default attaches IP addresses, cookies and
  // request headers to every event, which contradicts the privacy posture the
  // rest of the codebase keeps — lib/jobs/session-jobs.ts logs a userId and
  // explicitly refuses to log the email beside it. An error report is not a
  // reason to ship user identifiers to a third party.
  sendDefaultPii: false,
});
