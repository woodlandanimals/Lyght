# CLAUDE.md — Lyght Build Instructions

You are building **Lyght**, an agentic project management system. Read `LYGHT-PRD.md` for the full specification. This file tells you HOW to build it.

## PROJECT STRUCTURE

```
lyght/
├── apps/web/                  # Next.js 14 App Router (TypeScript)
├── prisma/schema.prisma       # SQLite database schema
├── .env.local                 # API keys (NEVER commit)
├── .env.example               # Template (safe to commit)
├── .gitignore                 # Must include .env.local, dev.db
├── LYGHT-PRD.md               # Full specification
└── CLAUDE.md                  # This file
```

## BUILD ORDER

Complete each phase fully before moving to the next. Commit after each phase.

### PHASE 1: Foundation
```
git commit -m "feat: Phase 1 — project scaffold, database, auth, layout"
```
1. `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
2. `cd apps/web && npm install prisma @prisma/client @anthropic-ai/sdk swr`
3. `npx prisma init --datasource-provider sqlite`
4. Copy the FULL Prisma schema from PRD Section 3 into `prisma/schema.prisma`
5. `npx prisma db push`
6. Create `.env.local` with `ANTHROPIC_API_KEY` from environment, `DATABASE_URL="file:./dev.db"`
7. Create `.env.example` with placeholder values
8. Verify `.gitignore` includes: `.env.local`, `prisma/dev.db`, `*.db`, `*.db-journal`
9. Configure Tailwind with Lyght design tokens (see PRD Section 1.5):
   - Custom colors: lyght-black, lyght-white, lyght-grey-*, lyght-orange, lyght-green, lyght-red, lyght-blue, lyght-yellow
   - Font families: mono (JetBrains Mono) and sans (Inter)
   - Import JetBrains Mono from Google Fonts in layout.tsx
10. Build layout.tsx: sidebar nav (Issues, Board, Swarms, AG-DASH, Config) + top bar (LYGHT logo, project selector)
11. Simple auth: hardcoded demo user, cookie-based session, middleware redirect
12. Seed script: create demo user, demo project "Lyght" (key: "LYG"), 5 sample issues in various statuses
13. Onboarding flow at `/onboarding`: 3-step wizard (name → project → redirect to dashboard)

### PHASE 2: Issues & Board
```
git commit -m "feat: Phase 2 — issues CRUD, AI creation, board view"
```
1. Issues List page at `/projects/[projectId]/issues`
   - Server component fetching issues with Prisma
   - Filter bar: status, priority, type dropdowns
   - Issue rows with status LED dots (see PRD 5.2)
2. Issue Detail page at `/projects/[projectId]/issues/[issueId]`
   - Header: title, status LED, priority badge, type badge
   - Description (markdown rendered)
   - Activity timeline: comments, status changes, agent activity
   - Status transition buttons
3. Board view at `/projects/[projectId]/board`
   - Kanban columns: TRIAGE, PLANNING, READY, SWARMING, REVIEW, DONE
   - Issue cards with status LEDs
   - Drag-and-drop (use @dnd-kit/core or simple state-based approach)
4. AI Issue Creation at `/api/ai/create-issue`
   - POST endpoint, receives `{ text: string, projectId: string }`
   - Calls Claude with the issue creation prompt from PRD 4.3
   - Returns structured issue JSON
   - Wire to Quick Create modal (open with `c` keyboard shortcut)
5. "Enhance with AI" button on structured create form
   - Calls `/api/ai/enhance-issue` with current draft
   - Returns enriched description with acceptance criteria

### PHASE 3: AI Planning
```
git commit -m "feat: Phase 3 — AI planning, plan review workflow"
```
1. `/api/ai/generate-plan` endpoint
   - Takes issueId, fetches issue + project context
   - Calls Claude with the planning system prompt from PRD 4.4
   - Stores result in issue.aiPlan, issue.aiPrompt
   - Sets issue.planStatus to "ready"
2. Plan Review view at `/projects/[projectId]/issues/[issueId]/review`
   - Split pane: left = issue description, right = AI plan
   - Plan rendered as structured sections: Objective, Approach, Tasks (numbered), Files, Verification
   - Approve button → status = "ready", planStatus = "approved"
   - Reject button → opens feedback textarea → calls `/api/ai/revise-plan`
   - Edit button → plan becomes editable textarea
3. Auto-trigger: when issue status changes to "planning", call generatePlan
4. Plan status indicators on issue cards (badge showing plan state)

### PHASE 4: Agent Execution
```
git commit -m "feat: Phase 4 — swarm formation, agent execution, blockers"
```
1. Swarm CRUD at `/api/swarms`
   - Create swarm: name, objective, select issues
   - Swarm status tracking: forming → active → paused → completed
2. Swarm UI at `/projects/[projectId]/swarms`
   - List of swarms with progress bars
   - Swarm detail: list of issues, aggregate metrics
3. Agent execution at `/api/ai/execute-task`
   - Takes issueId + approved plan prompt
   - Creates AgentRun record (status: "running")
   - Calls Claude with execution system prompt from PRD 4.6
   - Parses response: if questions → status "waiting_review" + create ReviewItem
   - If complete → status "completed" + store output
4. Agent run management:
   - `/api/agents/[runId]/respond` — send human answer, re-run agent with context
   - `/api/agents/[runId]/approve` — mark as approved
   - `/api/agents/[runId]/cancel` — cancel execution
5. Token/cost tracking: count tokens from Claude response, estimate cost

### PHASE 5: Agent Dashboard (AG-DASH)
```
git commit -m "feat: Phase 5 — AG-DASH mission control"
```
1. AG-DASH page at `/projects/[projectId]/agents`
2. Three sections (see PRD 5.4 for exact layout):
   - **Active Agents**: cards showing each running AgentRun with progress, iterations, cost, streaming status
   - **Review Queue**: items needing human input (questions, approvals, errors) with inline response forms
   - **Completed Today**: recent completions with metrics
3. Real-time updates: use SWR with 2-second polling interval (revalidateOnFocus + refreshInterval)
4. Inline actions on review queue items:
   - Text input + Send for questions
   - Approve / Reject buttons for completed outputs
   - Re-prompt button for errors
5. Agent card animations: pulsing orange dot for active agents (CSS animation)
6. Aggregate stats in header: "3 active · 2 review · $0.45 total"

### PHASE 6: Security Audit & Polish
```
git commit -m "feat: Phase 6 — security audit, polish, final cleanup"
```
1. **SECURITY AUDIT** (MANDATORY — do all of these):
   ```bash
   # Must return ZERO results:
   grep -rn "sk-ant" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" | grep -v "node_modules" | grep -v ".env.example" | grep -v "CLAUDE.md" | grep -v "LYGHT-PRD.md"
   
   # Verify these files exist and contain the right entries:
   cat .gitignore | grep -E "env.local|dev.db"
   
   # Verify API key is only accessed server-side:
   grep -rn "ANTHROPIC_API_KEY" . --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".env"
   # All results should be in api/ routes or lib/ server files, NEVER in components/
   ```
2. Add loading skeletons for async data
3. Add empty states ("No issues yet", "No active agents")
4. Add error boundaries
5. Add toast notifications (simple div overlay, no library needed)
6. Rate limiting: simple in-memory counter on AI endpoints (30/min)
7. Write README.md with setup instructions

## DESIGN RULES (NON-NEGOTIABLE)

- **Font:** JetBrains Mono everywhere. Inter only for long-form body text.
- **Colors:** Black (#0A0A0A), white (#FAFAFA), orange (#FF6B00) accent. No other accent colors.
- **Cards:** No border-radius. 1px solid #C0C0C0 border. White background.
- **Buttons:** Uppercase, letter-spacing: 0.05em, monospace font.
- **Status LEDs:** 8px circles. Colors per PRD 5.2. Pulse animation for "active" states.
- **Spacing:** Dense. 8px base unit. No hero sections. No decorative elements.
- **Labels:** Uppercase, text-xs, letter-spaced, grey-500 color.

## WHEN STUCK

1. Default to simpler. This is a prototype.
2. Use placeholder data over complex integrations.
3. Fake real-time with polling (2s) if SSE is complex.
4. Skip animations if blocking — static layout matters more.
5. Use `console.log` for debugging, remove before commit.

## COMPLETION CRITERIA

The prototype is DONE when:
- [ ] User can onboard and create a project
- [ ] User can create issues via natural language (AI)
- [ ] Issues display in list and board views with TE-styled LEDs
- [ ] AI generates coding plans from issues
- [ ] Plans can be reviewed, approved, or rejected in split-pane view
- [ ] Agent execution runs against approved plans (via Claude API)
- [ ] Blocked agents surface in review queue
- [ ] Humans can respond to agent questions from AG-DASH
- [ ] AG-DASH shows active agents, review queue, completed work
- [ ] Swarms group issues with aggregate progress
- [ ] ZERO secrets in committed code
- [ ] App runs with `npm run dev` on first try

When complete, output: <promise>LYGHT_COMPLETE</promise>
