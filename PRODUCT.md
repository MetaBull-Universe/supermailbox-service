# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Metabull Universe operators and technical admins who manage outbound delivery for products such as Getaipilot, FlowPilot, CRMPilot, and related services. They work under operational pressure: checking queues, tracing recipients, launching broadcasts, editing templates, and protecting sender reputation.

## Product Purpose

SupermailBox is a CPaaS delivery control plane for outbound email operations. It centralizes queue health, dispatch logs, templates, campaign audiences, provider configuration, and suppression decisions so product databases do not carry messaging workload.

## Positioning

SupermailBox is not a marketing CRM. It is an operations desk for delivery reliability: route visibility, campaign execution, compliance guardrails, and evidence trails across multiple products.

## Operating Context

Admins use a React dashboard connected to Fastify APIs, BullMQ queues, Redis, Postgres/Supabase data, mail providers, and product user lists. The interface is a repeated-use work surface, so scanability, dense tables, obvious current state, and fast recovery matter more than promotional storytelling.

## Capabilities and Constraints

Confirmed by repository code: queue metrics, recent activity logs, project-grouped logs, responsive email template editing, simple/AI/code template modes, desktop/mobile email preview, campaign segmentation, custom test recipients, SMTP/provider configuration, campaign launch, and suppression management.

Keep existing business logic and API behavior intact. Do not invent customer logos, commercial metrics, provider claims, or unsupported delivery capabilities.

## Brand Commitments

Confirmed names: SupermailBox, Metabull Universe, Getaipilot. The visual register is product surface, not brand/marketing surface: polished, disciplined, infrastructure-grade, and calm under operational pressure.

## Evidence on Hand

Repository docs and implementation files: `README.md`, `client/src/App.tsx`, `client/src/pages/*`, `client/src/services/api.ts`, and `server/src/*`. No verified customer proof, pricing, benchmarks, or brand asset library is present.

## Product Principles

- Make delivery state legible before decoration.
- Keep operational actions close to the data they affect.
- Separate risk, success, waiting, and neutral states consistently.
- Preserve density without letting everything compete visually.
- Make repeated admin work feel controlled, fast, and recoverable.

## Accessibility & Inclusion

Use WCAG AA contrast, visible keyboard focus, semantic controls, readable table density, 44px touch targets where possible, responsive layouts for 320px through desktop, and reduced-motion alternatives for all nonessential motion.
