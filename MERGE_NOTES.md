# CalHacks Merged Repo

This repository uses the backend logic and API routes from **CalHacks-2025-Tutorialize-Anything-main**,
while replacing visual components, styles, and assets with those from **CalHacksUI**.

## What changed
- Copied `components/` and `lib/{audio,timeline,state}.ts` from UI.
- Replaced Tailwind config with UI's `tailwind.config.js` for fonts/animation tokens.
- Replaced `styles/globals.css` with UI's `app/globals.css` (converted to pages router).
- Copied `public/` assets (images, audio) from UI.
- Replaced `pages/index.tsx` with UI's `app/page.tsx` (works in pages router with `'use client'`).
- Updated `pages/_app.tsx` to include Rajdhani and Share Tech Mono via `next/font/google` and body wrapper classes.

## What stayed (backend logic intact)
- All API routes under `pages/api/`.
- Auth provider and context (`lib/AuthContext.tsx`) and pages `login.tsx`, `saved.tsx`.
- Next config with S3 image domains.
- Existing server-side logic, middleware, and data access.

## Dev
- Install and run as before (`npm install && npm run dev`).
- Ensure your environment variables are set as you normally do (managed in Vercel per your note).

