# EF-VITA Single-Tribe Frontend

A **minimal, ready-to-use frontend** for a single Tribe in the EF-VITA ecosystem.

This project exists for Tribes that **don't want to build their own UI**, don't need heavy customization, and just want something that works out of the box. It is intentionally light on features, easy to understand, and designed to stay out of the way.

If you *do* want to build your own frontend, EF-VITA fully supports that. This repo is the default option, not the mandatory one.

---

## What this project is

- A **simple web frontend module** for managing a single Tribe
- A **reference implementation** of the EF-VITA API
- A **safe default** for small to medium Tribes that want a single-tenant UI
- A way to use EF-VITA without writing frontend code
- Sui-native payments only (no off-chain cards)

This UI is meant to be “good enough” rather than “everything.”

---

## What this project is not

- Not a full governance dashboard
- Not optimized for very large Tribes (100+ members)
- Not highly customizable
- Not tightly coupled to any specific chain implementation
- Not multi-chain or multi-token billing

If you need advanced features, automation, or a bespoke experience, you should bring your own frontend instead.

---

## Design principles

- **Minimal by design**
- **API-first**
- **Readable code over clever abstractions**
- **Frontend is optional; API is not**

The goal is to keep the surface area small and predictable.

---

## Architecture overview

This repository contains **frontend code only**.

- **Frontend (this repo)**
  - Vite + React + TypeScript
  - Talks to the EF-VITA backend via HTTP API
  - Uses generated types from the OpenAPI contract

- **Backend (separate)**
  - Typically hosted on Replit
  - Implements the EF-VITA API
  - Handles chain interaction, persistence, and permissions

- **API contract**
  - Defined in `contracts/openapi.yaml`
  - Acts as the bridge between frontend and backend
  - Enables other teams to safely build their own frontends

The backend does not depend on this frontend.  
This frontend depends entirely on the API.

---

## When to use this frontend

This frontend is a good fit if:

- Your Tribe is small or medium-sized
- You want a usable UI immediately
- You don't need advanced governance tools
- You prefer stability over customization

You should build your own frontend if:

- You want a custom UX or branding
- You need complex workflows or dashboards
- You are integrating deeply with other systems
- You simply enjoy frontend development

Both approaches are first-class in EF-VITA.

This frontend is also a first-party module that tenants can fork and reskin.

---

## Configuration

The frontend connects to the backend using a single environment variable:

```bash
VITE_API_BASE_URL=http://your-backend-url
