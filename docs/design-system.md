# AI App Factory — Modern Design System

## Product direction

A premium, modern, AI-first SaaS experience suitable for a commercial product. The interface must feel advanced without becoming visually noisy.

## Experience principles

- AI-first: the primary action is always obvious.
- Premium simplicity: generous spacing, clear hierarchy, restrained effects.
- Fast feedback: every long-running action has visible progress and status.
- Trust: licensing, YouTube authorization, privacy and AI-disclosure status are easy to understand.
- Responsive: desktop, tablet and Android layouts share the same visual language.
- Accessible: readable typography, keyboard navigation on web, clear focus states and sufficient contrast.

## Core screens

1. Landing / product introduction
2. Sign in / sign up
3. Onboarding
4. Main AI Dashboard
5. Create Project
6. Project Pipeline / live progress
7. Video Studio
8. YouTube Channels
9. Content Library
10. Analytics
11. License & Account
12. Help Center / Quick Guide
13. Settings
14. Admin Console

## Visual language

Use a clean dark-first interface with an optional light theme. Use subtle gradients, glass-like surfaces only where useful, rounded cards, compact data visualizations and restrained micro-interactions. Avoid excessive glow, oversized decoration, cluttered dashboards and gimmicky animations.

## Dashboard layout

- Left navigation on desktop; compact navigation on mobile.
- Top bar: workspace, notifications, account and global action.
- Main area: AI command/create-project area followed by project status, recent videos, channel health and usage.
- Persistent status indicators for license, YouTube connection and active jobs.

## AI interaction

The central AI workspace should support natural-language project creation while exposing structured controls for advanced users. Long-running jobs show stage, progress, estimated remaining work when available, logs/errors and safe retry.

## Licensing UI

Show a clear badge such as `LIFETIME ACTIVE`. Provide license key status, activated account, device/channel limits, activation history and support actions. Never display sensitive server-side license hashes.

## Motion

Animations should be short, purposeful and interrupt-free. Use transitions for navigation, status changes, progress and success/error feedback. Respect reduced-motion preferences.

## Responsive behavior

Mobile is a first-class experience, not a shrunken desktop. Primary actions remain reachable with one hand, cards stack cleanly, tables become mobile-friendly lists, and video/project controls remain usable on small screens.

## Product quality bar

Every screen must pass visual QA for spacing, typography, responsive behavior, empty/loading/error/success states, accessibility and consistency with this design system before release.
