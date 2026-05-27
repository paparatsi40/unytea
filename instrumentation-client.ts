// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://955d8954175ad220c70a0b123906eb25@o4511311397060608.ingest.us.sentry.io/4511463169982465",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  ignoreErrors: [
    // Chrome extensions
    "Extension context invalidated",
    "A listener indicated an asynchronous response",
    "chrome-extension://",
    "moz-extension://",
    // Common harmless DOM warnings
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network blips that aren't actionable
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "Load failed",
  ],
  denyUrls: [
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-extension:\/\//i,
    /^extensions\//i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
