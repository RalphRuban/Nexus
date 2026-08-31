# NEXUS — Frontend

Next.js 16 command center UI for the NEXUS crisis decision support
system. Interactive Leaflet map, agent analysis panels, scenario builder
and Gemini vision intake.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point at the backend
(defaults to `http://localhost:8000`).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

See the [root README](../README.md) for full project docs, architecture
and deployment instructions.
