import * as Sentry from "@sentry/react";

export const initSentry = () => {
  Sentry.init({
    dsn: "https://your-dsn-here@sentry.io/your-project-id", // User should replace this
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, 
    // Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};
