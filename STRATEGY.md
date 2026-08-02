# Connect AI Marketplace - Strategic Plan

## Overview
This document outlines the forward-looking strategic initiatives for the Connect AI Marketplace. It serves as a roadmap for the newly expanded core team, particularly guiding the **Data Scientist** and **Security Expert** in their immediate priorities.

## 1. Security & Compliance Initiatives (Security Expert)
**Objective:** Fortify the platform against emerging threats, enforce strict data protection policies, and maintain trust.

### Immediate Action Items
- **Soft Delete Enforcement:** The `firestore.rules` have been audited. `allow delete: if false;` is successfully enforced on `users`, `requests`, `offers`, and `marketplace` collections. The only allowed deletions are for temporary sub-collections (e.g., passkeys).
- **Rate Limiting & Abuse Prevention:** Implement Firebase App Check and reCAPTCHA Enterprise for critical endpoints (registration, request creation, offer submission) to prevent automated bot activity.
- **Data Minimization:** Ensure PII (Personally Identifiable Information) is strictly separated from public profiles. Currently, the `users` collection is protected, but we need to implement a cloud function to strip PII before creating a `users_public` mirror for the marketplace.
- **Audit Logging:** Enhance the current `audit_logs` collection to track all administrative actions (approvals, bans, system configuration changes) with immutable timestamps.

## 2. Advanced Analytics & Machine Learning (Data Scientist)
**Objective:** Transform raw platform activity into predictive insights, optimize matchmaking, and drive growth.

### Immediate Action Items
- **Predictive Matchmaking Engine v2:** The current `marketService.ts` learns from keyword demand. We need to implement a collaborative filtering model that suggests suppliers based on similar customer profiles and historical request acceptance rates.
- **Neural Pulse Sentiment Analysis:** Upgrade the `NeuralPulseIndicator` to aggregate chat sentiment in real-time. Use Gemini to analyze anonymized chat snippets (if opted-in) to detect "friction points" in negotiations and suggest resolutions.
- **Dynamic Pricing & Intelligence:** Analyze `price_insights` and `offers` data to provide real-time "Fair Price" indicators to customers when they create a request, preventing low-balling and ensuring supplier satisfaction.
- **BigQuery Export Integration:** The `analytics_events` collection is growing rapidly. Implement the Firebase Extension "Stream Collections to BigQuery" to move analytical workloads off Firestore, enabling complex SQL queries and BI dashboarding.

## 3. Performance & Stability Enhancements (Full-Stack / DevOps)
**Objective:** Ensure the platform remains lightning-fast and highly available under scale.

### Immediate Action Items
- **Lazy Loading Implementation:** Completed. `App.tsx` now utilizes React `lazy` and `Suspense` for all major module routes, significantly reducing the initial JavaScript bundle size.
- **Global Error Boundary Enhancement:** The application currently suppresses benign errors (e.g., `ResizeObserver`, expected websocket disconnects) from polluting the analytics stream. We will add a Sentry or DataDog integration for advanced stack trace resolution.
- **Cloud Run Cold Start Optimization:** Switch the backend Express server (when fully migrated) to use esbuild bundling, as per our framework guidelines, to reduce cold start times from 3s to <500ms.

## 4. Growth & Engagement (Product Manager / Growth Hacker)
**Objective:** Increase marketplace liquidity (both supplier density and customer requests).

### Immediate Action Items
- **Supplier "Moment of Need" Onboarding:** Identify visitors searching for unfulfilled categories and dynamically present them with a "Become the first supplier in this category" CTA.
- **Gamified Rewards System:** Expand the `ConnectRewards` module to offer platform fee discounts for suppliers who respond to requests within 10 minutes.
