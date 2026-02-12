# LYGHT

Agentic project management. AI plans the work. Humans approve. Agents execute.

## Setup

```bash
cd apps/web
npm install
```

### Environment

Copy `.env.example` to `.env.local` and add your Anthropic API key:

```bash
cp .env.example .env.local
# Edit .env.local with your actual ANTHROPIC_API_KEY
```

### Database

```bash
npx prisma db push
npx prisma generate
```

### Seed (optional)

```bash
npm run seed
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Prisma + SQLite
- Anthropic Claude API
- Tailwind CSS v4
- SWR for real-time polling
- teenage engineering-inspired design

## Features

- AI-native issue creation from natural language
- AI planning with coding plan decomposition
- Plan review with approve/reject workflow
- Simulated agent execution via Claude API
- Swarm formation for parallel agent activity
- AG-DASH mission control for agent monitoring
- Inline blocker resolution from dashboard
