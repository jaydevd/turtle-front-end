# Habit Tracker Frontend

Next.js App Router frontend for the Habit Tracker project. The Django backend currently lives in `../habit_tracker`.

## Requirements

- Node.js 20.9 or newer
- npm

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API base URL is configured with `NEXT_PUBLIC_API_BASE_URL` when API integration is added.

## Commands

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run lint` — lint the project

## Structure

- `src/app/` — routes, root layout, and global styles
- `src/components/ThemeRegistry.tsx` — MUI theme provider and theme tokens

MUI is configured with its Next.js App Router cache provider to support server-rendered styles.
