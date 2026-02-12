# LYGHT — Product Requirements Document & Build Specification

**Version:** 1.0  
**Date:** February 11, 2026  
**Status:** Ready for Implementation  
**Target:** Single-shot Claude Code prototype via Ralph Loop / GSD workflow

---

## 1. PRODUCT VISION

### 1.1 One-Liner

Lyght is a native agentic project management system where AI plans the work, humans approve the intent, and agent swarms execute until done.

### 1.2 The Problem

The software development lifecycle has fractured. Planning tools (Linear, Jira) exist in one world. AI coding agents (Claude Code, Cursor, Copilot) exist in another. Teams are now spending more time writing prompts and translating intent between these worlds than they spend actually building. CodeRabbit's Issue Planner (launched February 10, 2026) validates this gap — they generate "Coding Plans" from tickets but still rely on external tools for execution. The handoff remains manual. The loop isn't closed.

Meanwhile, the rise of Ralph Loops, GSD frameworks, and Claude Code's native Agent Teams (TeammateTool, launched February 5, 2026) has proven that autonomous multi-agent development is no longer theoretical. Teams are shipping 6+ repositories overnight for $297 in API costs. The orchestration layer is ready. What's missing is the **control plane** — a single interface where humans define intent, AI decomposes it into executable plans, agent swarms pick up the work, and humans review results before they merge.

### 1.3 The Thesis

Post-agile, the unit of work is not a "story" or a "ticket." It is a **swarm** — a coordinated burst of parallel agent activity focused on a well-defined outcome, supervised by a human who approves intent and resolves blockers. Lyght is the operating system for this new way of working.

### 1.4 Key Differentiators from Linear/Jira

| Dimension | Linear / Jira | CodeRabbit | Lyght |
|-----------|--------------|------------|-------|
| Issue creation | Manual | AI-assisted from PRs | AI-native from natural language |
| Planning | Human decomposes work | AI generates coding plans | AI decomposes → human reviews → agents receive executable prompts |
| Execution | External (dev does the work) | External (copy prompt to agent) | Native (agents execute within Lyght) |
| Review | PR review | AI code review | Integrated: agent output → human review → re-prompt or approve |
| Coordination | Kanban / Sprint boards | N/A | Swarm dashboard with real-time agent activity |
| Feedback loop | Async (days) | Faster PR cycles | Tight loop: plan → execute → review → resolve (minutes to hours) |

### 1.5 Design Philosophy — Inspired by teenage engineering

The visual and interaction language draws from **teenage.engineering's** design ethos:

- **Monospace-first typography** — System mono (`JetBrains Mono`, `SF Mono`, or `IBM Plex Mono`) for all UI text. Data is the product; treat it with respect.
- **Industrial minimalism** — Black (`#0A0A0A`), white (`#FAFAFA`), and a single accent color: electric orange (`#FF6B00`) — the same warm signal color TE uses across their hardware.
- **Hardware metaphors** — Buttons feel like physical toggles. Status indicators use LED-style dots. The agent dashboard evokes a mixing console with parallel channel strips.
- **Product naming convention** — Views and features use TE-style nomenclature: `SW–01` (Swarm View), `AG–DASH` (Agent Dashboard), `PL–REVIEW` (Plan Review).
- **Dense information, not decoration** — Every pixel communicates state. No empty hero sections, no gradient blobs, no illustration padding.
- **Brutalist interaction** — Click targets are generous but visually restrained. Hover states are subtle shifts in background luminance, not animated transitions.

**Color System:**

```
--lyght-black:    #0A0A0A    (backgrounds, primary text)
--lyght-white:    #FAFAFA    (cards, panels)  
--lyght-grey-100: #F0F0F0    (subtle backgrounds)
--lyght-grey-300: #C0C0C0    (borders, dividers)
--lyght-grey-500: #808080    (secondary text)
--lyght-grey-700: #404040    (muted text)
--lyght-orange:   #FF6B00    (primary accent, active states, agent activity)
--lyght-green:    #00CC66    (success, completed, approved)
--lyght-red:      #FF3333    (errors, blocked, rejected)
--lyght-blue:     #3366FF    (links, informational)
--lyght-yellow:   #FFB800    (warnings, needs review)
```

**Typography:**

```
--font-mono: 'JetBrains Mono', 'SF Mono', 'IBM Plex Mono', monospace;
--font-sans: 'Inter', -apple-system, sans-serif;  /* Only for long-form body text */

--text-xs:  11px / 1.4;
--text-sm:  13px / 1.5;
--text-base: 14px / 1.6;
--text-lg:  16px / 1.5;
--text-xl:  20px / 1.4;
--text-2xl: 28px / 1.2;
```

---

## 2. TECH STACK

### 2.1 Architecture

```
lyght/
├── apps/
│   └── web/                    # Next.js 14 App Router
│       ├── app/
│       │   ├── (auth)/         # Auth routes
│       │   ├── (dashboard)/    # Main app
│       │   │   ├── projects/
│       │   │   ├── issues/
│       │   │   ├── swarms/
│       │   │   ├── agents/     # AG-DASH agent dashboard
│       │   │   └── settings/
│       │   ├── api/
│       │   │   ├── ai/         # LLM endpoints (planning, decomposition)
│       │   │   ├── agents/     # Agent execution management
│       │   │   ├── issues/     # CRUD
│       │   │   └── webhooks/   # GitHub integration
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/             # Primitive components (TE-styled)
│       │   ├── issues/         # Issue-related components
│       │   ├── planning/       # Plan review components
│       │   ├── agents/         # Agent dashboard components
│       │   └── swarm/          # Swarm visualization
│       ├── lib/
│       │   ├── ai/             # Claude API integration
│       │   ├── db/             # Database client & schemas
│       │   ├── agents/         # Agent orchestration logic
│       │   └── utils/
│       └── styles/
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.local                  # Environment variables (NEVER commit)
└── package.json
```

### 2.2 Stack Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack React with server components, API routes |
| Language | TypeScript (strict) | Type safety for complex agent state |
| Database | SQLite via Prisma | Zero-config for prototype, file-based, no external DB needed |
| LLM | Anthropic Claude API (claude-sonnet-4-20250514) | Planning, decomposition, code generation |
| Auth | Simple cookie-based session | Prototype-appropriate, no OAuth complexity |
| Styling | Tailwind CSS + CSS custom properties | Rapid development with TE design tokens |
| State | React Server Components + SWR for client | Minimal client state, server-driven UI |
| Real-time | Server-Sent Events (SSE) | Agent activity streaming without WebSocket complexity |

### 2.3 Security Requirements

**CRITICAL — Complete before any deployment or demo:**

1. **API Key Management:**
   - The Claude API key MUST be stored ONLY in `.env.local` as `ANTHROPIC_API_KEY`
   - `.env.local` MUST be in `.gitignore` (verify this exists before first commit)
   - API calls to Claude MUST only happen server-side (API routes / server components)
   - NEVER expose the API key in client-side code, browser network requests, or error messages
   - Create `.env.example` with placeholder values for documentation

2. **Database Security:**
   - SQLite file (`prisma/dev.db`) MUST be in `.gitignore`
   - No sensitive data in seed files
   - All user inputs sanitized through Prisma's parameterized queries

3. **General:**
   - No hardcoded secrets anywhere in source code
   - Run `grep -r "sk-ant" . --include="*.ts" --include="*.tsx" --include="*.js"` as a verification step
   - Run `grep -r "password" . --include="*.ts" --include="*.tsx" --include="*.env"` to check for exposed passwords
   - All API routes validate request shape before processing
   - Rate limiting on AI endpoints (simple in-memory counter: 30 requests/minute)

---

## 3. DATA MODEL

### 3.1 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  avatar    String?
  role      String   @default("member")  // "admin" | "member"
  createdAt DateTime @default(now())
  
  projects       ProjectMember[]
  assignedIssues Issue[]         @relation("AssignedTo")
  createdIssues  Issue[]         @relation("CreatedBy")
  reviewItems    ReviewItem[]
  comments       Comment[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  key         String   @unique   // e.g., "LYG" — used as issue prefix
  description String?
  repoUrl     String?            // GitHub repo for agent commits
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  members  ProjectMember[]
  issues   Issue[]
  swarms   Swarm[]
}

model ProjectMember {
  id        String  @id @default(cuid())
  userId    String
  projectId String
  role      String  @default("member")  // "owner" | "lead" | "member"
  
  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])
  
  @@unique([userId, projectId])
}

model Issue {
  id          String   @id @default(cuid())
  number      Int                        // Auto-incrementing per project
  title       String
  description String                     // Markdown — the human intent
  status      String   @default("triage") 
  // "triage" → "planning" → "planned" → "ready" → "in_progress" → "in_review" → "done" → "closed"
  priority    String   @default("medium") // "urgent" | "high" | "medium" | "low" | "none"
  type        String   @default("task")   // "task" | "bug" | "feature" | "epic"
  
  projectId   String
  assigneeId  String?
  createdById String
  parentId    String?                     // For sub-issues / epic children
  swarmId     String?                     // Which swarm is executing this
  
  // AI-generated content
  aiPlan        String?                   // The decomposed plan (markdown)
  aiPrompt      String?                   // The executable prompt for the coding agent
  aiContext      String?                   // Gathered codebase context
  planStatus    String   @default("none") // "none" | "generating" | "ready" | "approved" | "rejected"
  
  // Execution tracking
  agentSessionId String?                  // Active agent session
  agentModel     String?                  // Which model is executing
  agentOutput    String?                  // Agent's work output / logs
  
  // Metadata
  estimate      Int?                      // In minutes (AI-estimated)
  tags          String?                   // Comma-separated
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  project     Project    @relation(fields: [projectId], references: [id])
  assignee    User?      @relation("AssignedTo", fields: [assigneeId], references: [id])
  createdBy   User       @relation("CreatedBy", fields: [createdById], references: [id])
  parent      Issue?     @relation("SubIssues", fields: [parentId], references: [id])
  children    Issue[]    @relation("SubIssues")
  swarm       Swarm?     @relation(fields: [swarmId], references: [id])
  
  comments    Comment[]
  reviewItems ReviewItem[]
  agentRuns   AgentRun[]
  
  @@unique([projectId, number])
}

model Swarm {
  id          String   @id @default(cuid())
  name        String                      // e.g., "Auth System Build"
  status      String   @default("forming") 
  // "forming" | "active" | "paused" | "converging" | "completed"
  objective   String                      // What this swarm is trying to achieve
  strategy    String?                     // AI-generated execution strategy
  
  projectId   String
  
  // Swarm metrics
  totalTasks    Int      @default(0)
  completedTasks Int     @default(0)
  blockedTasks  Int      @default(0)
  activeAgents  Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  project     Project    @relation(fields: [projectId], references: [id])
  issues      Issue[]
  agentRuns   AgentRun[]
}

model AgentRun {
  id          String   @id @default(cuid())
  status      String   @default("queued")
  // "queued" | "running" | "waiting_review" | "blocked" | "completed" | "failed" | "cancelled"
  
  issueId     String
  swarmId     String?
  
  // Agent configuration
  model       String   @default("claude-sonnet-4-20250514")
  prompt      String                      // The prompt sent to the agent
  systemPrompt String?                    // System context
  
  // Execution state
  output      String?                     // Agent's response / work product
  tokensUsed  Int      @default(0)
  cost        Float    @default(0)        // Estimated cost in USD
  iterations  Int      @default(0)        // Ralph-loop iteration count
  
  // Blocking / review
  blockerType    String?                  // "question" | "approval" | "error" | "conflict"
  blockerMessage String?                  // What the agent needs
  humanResponse  String?                  // Human's answer to blocker
  
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  
  issue   Issue  @relation(fields: [issueId], references: [id])
  swarm   Swarm? @relation(fields: [swarmId], references: [id])
}

model ReviewItem {
  id          String   @id @default(cuid())
  type        String                      // "plan" | "code" | "output" | "question"
  status      String   @default("pending")// "pending" | "approved" | "rejected" | "responded"
  
  issueId     String
  reviewerId  String?
  
  content     String                      // What needs review (markdown)
  feedback    String?                     // Reviewer's feedback
  
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
  
  issue    Issue @relation(fields: [issueId], references: [id])
  reviewer User? @relation(fields: [reviewerId], references: [id])
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  author    String   @default("human")    // "human" | "agent" | "system"
  
  issueId   String
  userId    String?
  
  createdAt DateTime @default(now())
  
  issue Issue @relation(fields: [issueId], references: [id])
  user  User? @relation(fields: [userId], references: [id])
}
```

---

## 4. CORE WORKFLOWS

### 4.1 Workflow Overview — The Lyght Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                        THE LYGHT LOOP                            │
│                                                                  │
│   ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐ │
│   │  TRIAGE  │───▶│ PLANNING │───▶│  REVIEW  │───▶│   READY   │ │
│   │ (Human)  │    │  (AI)    │    │ (Human)  │    │           │ │
│   └─────────┘    └──────────┘    └──────────┘    └─────┬─────┘ │
│                                       │  ▲              │       │
│                                       │  │ re-plan      │       │
│                                       ▼  │              ▼       │
│                                  ┌──────────┐    ┌───────────┐ │
│                                  │ REJECTED  │    │  EXECUTE   │ │
│                                  └──────────┘    │  (Agents)  │ │
│                                                  └─────┬─────┘ │
│                                                        │       │
│                                        ┌───────────────┤       │
│                                        ▼               ▼       │
│                                  ┌──────────┐    ┌───────────┐ │
│                                  │  BLOCKED  │    │ IN REVIEW  │ │
│                                  │(Question) │    │  (Human)   │ │
│                                  └─────┬────┘    └─────┬─────┘ │
│                                        │               │       │
│                                        │ answer         │       │
│                                        ▼               ▼       │
│                                  ┌──────────┐    ┌───────────┐ │
│                                  │ CONTINUE  │    │   DONE     │ │
│                                  │ (Agent)   │    │  (Merge)   │ │
│                                  └──────────┘    └───────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Step 1: Onboarding & Project Setup

**Route:** `/onboarding`

**Flow:**
1. User enters their name and email → creates User record
2. User creates first project: name, key (e.g., "LYG"), optional GitHub repo URL
3. System creates sample issues to demonstrate the workflow
4. Redirect to project dashboard

**UI:** Full-screen, step-by-step wizard. Black background, white monospace text, orange progress indicator. Three steps max. No fluff.

### 4.3 Step 2: Issue Creation (AI-Native)

**Route:** `/projects/[projectId]/issues/new`

**Two modes:**

**A) Quick Create** — Single text input  
User types natural language: *"Add user authentication with email/password and OAuth via Google. Include password reset flow."*

The system calls Claude to:
1. Parse intent into a structured issue
2. Suggest title, type, priority, tags
3. If the scope is large, suggest decomposition into sub-issues

**AI Prompt Template for Issue Creation:**
```
You are an expert product manager. Given the following user request, create a structured issue.

User Request: {userInput}
Project Context: {projectName} - {projectDescription}
Existing Issues: {recentIssuesTitlesAndStatuses}

Respond in JSON:
{
  "title": "concise issue title",
  "description": "detailed markdown description with acceptance criteria",
  "type": "task|bug|feature|epic",
  "priority": "urgent|high|medium|low",
  "tags": ["tag1", "tag2"],
  "estimateMinutes": number,
  "suggestedSubIssues": [
    { "title": "...", "description": "...", "type": "...", "estimateMinutes": number }
  ]
}
```

**B) Structured Create** — Form with AI assist  
Traditional form fields (title, description, type, priority) with an "Enhance with AI" button that enriches the description with acceptance criteria, edge cases, and technical considerations.

### 4.4 Step 3: AI Planning

**Triggered:** When issue moves to `planning` status (manual or automatic for new issues)

**What the AI does:**
1. Reads the issue description and any parent/sibling context
2. Analyzes the project structure (if repo connected)
3. Generates a **Coding Plan** with:
   - **Objective** — What this achieves
   - **Approach** — High-level strategy
   - **Tasks** — Ordered, atomic steps (each fits in ~50% of a context window)
   - **Files to create/modify** — Specific paths
   - **Dependencies** — What must exist first
   - **Verification** — How to confirm success (tests, manual checks)
   - **Agent Prompt** — The exact prompt to hand to Claude Code / agent

**AI Prompt Template for Planning:**
```
You are a senior software architect creating an execution plan for an AI coding agent.

Issue: {issueTitle}
Description: {issueDescription}
Project: {projectName}
Tech Stack: {detectedOrConfiguredStack}
Related Issues: {relatedIssuesContext}

Create a Coding Plan that an AI agent can execute autonomously. The plan should be:
1. Atomic — each task is small enough to complete in one agent session
2. Ordered — dependencies are explicit
3. Verifiable — each task has a concrete "done" condition
4. Context-aware — references specific files and patterns in the codebase

Respond in JSON:
{
  "objective": "...",
  "approach": "...",
  "tasks": [
    {
      "id": "T1",
      "title": "...",
      "description": "...",
      "filesToModify": ["path/to/file.ts"],
      "filesToCreate": ["path/to/new.ts"],
      "dependsOn": [],
      "verification": "...",
      "estimateMinutes": number
    }
  ],
  "agentPrompt": "Complete executable prompt for the coding agent...",
  "risks": ["..."],
  "totalEstimateMinutes": number
}
```

**Plan Status:** `generating` → `ready` → (human reviews) → `approved` or `rejected`

### 4.5 Step 4: Team Review (PL–REVIEW)

**Route:** `/projects/[projectId]/issues/[issueId]/review`

**UI:** Split-pane view:
- **Left:** The issue description (human intent)
- **Right:** The AI-generated plan (agent instructions)

**Review actions:**
- **Approve** → Issue moves to `ready`, plan is locked
- **Reject with feedback** → Issue moves back to `planning`, AI re-generates incorporating feedback
- **Edit plan** → Human can directly modify the plan text before approving
- **Comment** → Add questions or notes for the team

**This is the critical human-in-the-loop checkpoint.** No agent executes without an approved plan.

### 4.6 Step 5: Agent Execution (Swarm Mode)

**Triggered:** When approved issues are assigned to a swarm, or when a human clicks "Start Agent"

**Swarm Formation:**
1. Issues with `ready` status can be grouped into a **Swarm**
2. A swarm has an objective (e.g., "Build the authentication system") and pulls in related issues
3. The system creates `AgentRun` records for each issue's tasks
4. Tasks without dependencies start executing in parallel

**Agent Execution (simulated for prototype):**
- Each `AgentRun` calls the Claude API with the issue's `aiPrompt`
- The agent's response is stored as `output`
- If the agent has questions or hits a blocker, it creates a `ReviewItem` with type `question`
- The agent run status changes to `waiting_review`

**For the prototype, agent execution is simulated:**
- Call Claude API with the plan prompt
- Claude returns a structured response (code, explanation, questions)
- Display the response as the agent's "work product"
- No actual file system changes or git commits (simulated via output text)

**Ralph Loop Integration (conceptual):**
- Each task has an iteration counter
- If the agent's output doesn't meet verification criteria, the system can re-prompt with the failure context
- Max iterations configurable per task (default: 5)

### 4.7 Step 6: Human Review of Agent Output

**Route:** `/projects/[projectId]/issues/[issueId]` (activity tab)

**UI:** The issue detail view shows a timeline of:
- Original issue creation
- AI planning generation
- Plan approval
- Agent execution logs
- Agent output (code diffs, explanations)
- Blocker questions (highlighted in orange)

**Review actions:**
- **Approve output** → Issue moves to `done`
- **Request changes** → Agent re-runs with feedback context
- **Answer question** → Unblocks the agent, which continues
- **Cancel** → Stops agent execution

### 4.8 Step 7: Completion & Close

**When all tasks in an issue are approved:**
1. Issue status → `done`
2. If part of a swarm, swarm progress updates
3. Summary comment auto-generated by AI
4. Issue can be manually moved to `closed`

---

## 5. VIEWS & NAVIGATION

### 5.1 Navigation Structure

```
┌─────────────────────────────────────────┐
│ LYGHT                    [project ▼] ⚡ │  ← Top bar: logo, project selector, quick-create
├──────────┬──────────────────────────────┤
│          │                              │
│ ⊞ Issues │  [Main Content Area]        │  
│ ◎ Board  │                              │
│ ⊕ Swarms │                              │
│ ◈ AG-DASH│                              │  ← Agent Dashboard
│ ⚙ Config │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 5.2 Issues List View

**Route:** `/projects/[projectId]/issues`

- Filterable by status, priority, type, assignee, tags
- Sortable by created date, priority, updated date
- Status shown as colored LED dots (TE-style):
  - Grey = triage
  - Blue = planning/planned
  - Orange = in progress / agent active (pulsing)
  - Yellow = needs review
  - Green = done
  - Red = blocked
- Inline status transition: click the status LED to advance
- Keyboard shortcuts: `c` = create, `p` = plan, `enter` = open

### 5.3 Board View (SW–01 Swarm Board)

**Route:** `/projects/[projectId]/board`

Kanban-style columns:

```
┌──────────┬───────────┬──────────┬──────────┬───────────┬────────┐
│  TRIAGE  │ PLANNING  │  READY   │ SWARMING │  REVIEW   │  DONE  │
│          │           │          │          │           │        │
│ [issue]  │ [issue]●  │ [issue]  │ [issue]◉ │ [issue]!  │[issue] │
│ [issue]  │           │ [issue]  │ [issue]◉ │           │[issue] │
│          │           │          │ [issue]◉ │           │        │
└──────────┴───────────┴──────────┴──────────┴───────────┴────────┘
                                       ▲
                                  ◉ = agent active
```

- Drag-and-drop between columns
- "SWARMING" column shows pulsing orange indicators for active agents
- Click a swarming card to see real-time agent output

### 5.4 Agent Dashboard (AG–DASH) ★ Key Differentiator

**Route:** `/projects/[projectId]/agents`

This is the **mission control** for agent activity. Inspired by a mixing console / channel strip layout.

```
┌──────────────────────────────────────────────────────────────────────┐
│ AG–DASH                                          3 active · 2 review │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ ACTIVE AGENTS ──────────────────────────────────────────────────┐ │
│ │                                                                   │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │ │
│ │ │ ◉ Agent-001      │ │ ◉ Agent-002      │ │ ◉ Agent-003      │     │ │
│ │ │ LYG-12: Auth API │ │ LYG-14: UI Forms │ │ LYG-15: Tests    │     │ │
│ │ │ ██████████░░ 75% │ │ ████░░░░░░ 35%  │ │ ████████░░ 80%  │     │ │
│ │ │ Iter: 3/5        │ │ Iter: 1/5        │ │ Iter: 4/5        │     │ │
│ │ │ Tokens: 12.4k    │ │ Tokens: 5.2k     │ │ Tokens: 18.1k    │     │ │
│ │ │ Cost: $0.12      │ │ Cost: $0.05      │ │ Cost: $0.18      │     │ │
│ │ │                   │ │                   │ │                   │     │ │
│ │ │ > Writing auth    │ │ > Generating      │ │ > Running test    │     │ │
│ │ │   middleware...   │ │   form schema...  │ │   suite pass 3..  │     │ │
│ │ │ [View] [Pause]   │ │ [View] [Pause]   │ │ [View] [Pause]   │     │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘     │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ REVIEW QUEUE ───────────────────────────────────────────────────┐ │
│ │                                                                   │ │
│ │  ⚠ LYG-12  Agent needs decision: "Should auth use JWT or        │ │
│ │            session cookies?" [Respond] [View Issue]               │ │
│ │                                                                   │ │
│ │  ⚠ LYG-09  Agent completed. Output ready for review.            │ │
│ │            Plan: "Add password reset flow" [Review] [Approve]    │ │
│ │                                                                   │ │
│ │  ⚠ LYG-15  Agent hit error: "Test framework not configured."    │ │
│ │            [Respond] [Re-prompt] [Cancel]                        │ │
│ │                                                                   │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ COMPLETED TODAY ────────────────────────────────────────────────┐ │
│ │  ✓ LYG-07 Database schema · 2 iterations · $0.08 · 4m ago       │ │
│ │  ✓ LYG-08 API routes      · 3 iterations · $0.15 · 12m ago      │ │
│ │  ✓ LYG-06 Project setup   · 1 iteration  · $0.03 · 1h ago       │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key features of AG-DASH:**
1. **Real-time agent activity cards** — Each active agent shows: issue reference, progress bar, iteration count, token usage, cost, and streaming status message
2. **Review queue** — Sorted by urgency. Blockers and questions surface at the top with direct action buttons
3. **One-click responses** — Respond to agent questions directly from the dashboard without navigating to the issue
4. **Cost tracking** — Running total of API spend per swarm and per agent
5. **Completed log** — Recent completions with metrics

### 5.5 Swarm Detail View

**Route:** `/projects/[projectId]/swarms/[swarmId]`

Shows:
- Swarm objective and status
- Dependency graph of tasks (which tasks are blocked by which)
- List of issues in the swarm with their agent status
- Aggregate metrics (total tokens, cost, completion %)
- "Start Swarm" / "Pause Swarm" / "Cancel Swarm" actions

---

## 6. AI INTEGRATION DETAILS

### 6.1 Claude API Configuration

```typescript
// lib/ai/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // NEVER hardcode
});

export async function callClaude(params: {
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature || 0.3,
    system: params.system,
    messages: params.messages,
  });

  return response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';
}
```

### 6.2 AI Functions

| Function | Trigger | Input | Output |
|----------|---------|-------|--------|
| `createIssueFromNL` | User submits natural language | User text + project context | Structured issue JSON |
| `enrichIssue` | User clicks "Enhance with AI" | Issue draft | Enhanced description with AC |
| `generatePlan` | Issue enters `planning` status | Issue + project context | Coding Plan JSON |
| `revisePlan` | Plan rejected with feedback | Plan + feedback + issue | Revised Coding Plan JSON |
| `executeTask` | Agent run starts | Task prompt + system context | Code output + status |
| `answerBlocker` | Agent encounters uncertainty | Context + question | Structured question for human |
| `summarizeCompletion` | Issue completed | All agent outputs + plan | Summary comment |

### 6.3 System Prompts

**Planning Agent System Prompt:**
```
You are Lyght's planning agent. You decompose software issues into executable 
task plans for AI coding agents.

Your plans must be:
- ATOMIC: Each task fits in ~50% of a 200k token context window
- ORDERED: Dependencies are explicit (task IDs)
- VERIFIABLE: Each task has a machine-checkable "done" condition
- SPECIFIC: Reference actual file paths, function names, patterns

When you encounter ambiguity:
- Flag it as a "decision_needed" item
- Provide 2-3 options with tradeoffs
- DO NOT make architectural decisions — escalate to the human

Output format: JSON matching the CodingPlan schema.
```

**Execution Agent System Prompt:**
```
You are a Lyght execution agent implementing a specific task from an approved plan.

RULES:
1. Only implement what the task specifies. Do not scope-creep.
2. Follow the project's existing patterns and conventions.
3. If you encounter a blocker, STOP and report it. Do not guess.
4. Include inline comments explaining non-obvious decisions.
5. Write tests for any new functions.
6. After completion, verify against the task's success criteria.

Report your output as:
{
  "status": "completed" | "blocked" | "needs_review",
  "filesChanged": [...],
  "output": "... code or explanation ...",
  "verification": "... how to verify this works ...",
  "blockerQuestion": "... if blocked, what do you need? ..."
}
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Foundation (Build Order: 1st)

**Goal:** App shell, auth, database, basic CRUD

Tasks:
1. Initialize Next.js 14 project with TypeScript and Tailwind
2. Configure Tailwind with Lyght design tokens (TE-inspired color system, monospace typography)
3. Set up Prisma with SQLite and the full schema from Section 3
4. Create `.env.local` with `ANTHROPIC_API_KEY` and `.env.example` with placeholders
5. Verify `.gitignore` includes `.env.local`, `prisma/dev.db`, `node_modules`
6. Build layout shell: sidebar navigation, top bar with project selector
7. Implement simple cookie-based auth (hardcoded demo user for prototype)
8. Create onboarding flow (3-step wizard: name → project → done)
9. Seed database with demo project and 5 sample issues in various states

**Verification:** App runs, user can log in, see sidebar nav, create a project.

### Phase 2: Issues & Board (Build Order: 2nd)

**Goal:** Full issue CRUD with AI creation

Tasks:
1. Build Issues List view with filtering and sorting
2. Build Issue Detail view with status transitions and activity timeline
3. Build Board (Kanban) view with drag-and-drop columns
4. Implement "Quick Create" — natural language issue creation via Claude API
5. Implement "Structured Create" — form with "Enhance with AI" button
6. Build issue status LED indicators (TE-style colored dots with pulse animation for active)
7. Add keyboard shortcuts (c = create, p = plan, / = search)
8. Wire up issue comments (human + agent + system types)

**Verification:** User can create issues via natural language, see them on the board, transition statuses.

### Phase 3: AI Planning (Build Order: 3rd)

**Goal:** AI generates plans, humans review and approve

Tasks:
1. Build the `generatePlan` AI function with the planning agent system prompt
2. Create the Plan Review view (PL–REVIEW): split-pane with issue description left, plan right
3. Implement plan approval workflow: approve, reject with feedback, edit
4. Build the `revisePlan` function that incorporates rejection feedback
5. Add plan status indicators to issue cards
6. Create the plan detail component showing tasks, dependencies, file paths
7. Auto-advance issue from `planning` → `planned` when plan is generated, `planned` → `ready` when approved

**Verification:** Issue can go through triage → planning → review → approved lifecycle.

### Phase 4: Swarm & Agent Execution (Build Order: 4th)

**Goal:** Swarm formation, simulated agent execution

Tasks:
1. Build Swarm creation UI — select issues, name the swarm, set objective
2. Implement swarm status tracking and progress aggregation
3. Build the agent execution engine: calls Claude API with task prompts
4. Implement `AgentRun` creation and status management
5. Add blocker detection: when agent output contains questions, create ReviewItem
6. Build SSE endpoint for streaming agent activity
7. Implement the review-and-respond flow for blocked agents
8. Add re-prompt capability: send feedback back to agent with context
9. Track token usage and cost per agent run

**Verification:** User can create a swarm, start agent execution, see output, respond to blockers.

### Phase 5: Agent Dashboard — AG-DASH (Build Order: 5th)

**Goal:** Mission control for all agent activity

Tasks:
1. Build the AG-DASH layout with three sections: Active Agents, Review Queue, Completed
2. Implement real-time agent activity cards with progress, iterations, cost
3. Build the Review Queue with inline response capability
4. Add SSE integration for live updates without page refresh
5. Implement one-click actions: approve, reject, respond, cancel
6. Add aggregate metrics: total agents, total cost, completion rate
7. Build the Swarm Detail view with task dependency visualization
8. Add pulsing orange LED animation for active agents (TE-inspired)

**Verification:** AG-DASH shows all agent activity, user can respond to blockers and approve outputs.

### Phase 6: Polish & Security Audit (Build Order: 6th — FINAL)

**Goal:** Production-ready prototype

Tasks:
1. **SECURITY AUDIT:**
   - Run `grep -rn "sk-ant" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"` — must return zero results
   - Run `grep -rn "password\|secret\|token" . --include="*.env"` — must only be in `.env.local` (which is gitignored)
   - Verify `.env.local` is in `.gitignore`
   - Verify `prisma/dev.db` is in `.gitignore`
   - Verify no API keys in any committed file
   - Verify all Claude API calls are server-side only
   - Test that client-side code cannot access `process.env.ANTHROPIC_API_KEY`
2. Add loading states and error boundaries
3. Add empty states for all views
4. Implement rate limiting on AI endpoints
5. Add toast notifications for async operations
6. Final responsive layout pass
7. Write README with setup instructions

**Verification:** Security grep returns clean. App is polished and functional end-to-end.

---

## 8. COMPONENT SPECIFICATIONS

### 8.1 Shared UI Components (TE-Styled)

```typescript
// components/ui/button.tsx
// Variants: primary (orange bg), secondary (grey border), ghost (no border)
// All use monospace font, uppercase tracking-wider text
// Active state: slight inset shadow (physical button press feel)

// components/ui/status-led.tsx  
// Colored circle (8px) with optional pulse animation
// Colors map to issue status enum

// components/ui/card.tsx
// White background, 1px grey-300 border, no border-radius (brutalist)
// Hover: background shifts to grey-100

// components/ui/input.tsx
// Monospace, bottom-border-only style (like a terminal input)
// Focus: orange bottom border

// components/ui/badge.tsx
// Tiny monospace label, uppercase, letter-spaced
// Color variants matching status system

// components/ui/progress-bar.tsx
// 2px height, orange fill on dark background
// Used in agent activity cards

// components/ui/modal.tsx
// Centered, black border, no border-radius
// Backdrop: semi-transparent black
```

### 8.2 Key Page Components

**IssueCard** — Used in list and board views
```
┌─────────────────────────────────┐
│ ● LYG-12  [feature]  ▲ high    │
│ Add user authentication         │
│ ○ @andy · 🤖 Agent active      │
│ 15m est · 3 tasks · Auth,API   │
└─────────────────────────────────┘
```

**AgentCard** — Used in AG-DASH
```
┌─────────────────────────────┐
│ ◉ Agent-001                 │
│ LYG-12: Auth API            │
│ ██████████░░░░ 72%          │
│ Iter: 3/5 · $0.12 · 12.4k  │
│                             │
│ > Writing middleware...     │
│ [View] [Pause] [Cancel]    │
└─────────────────────────────┘
```

**ReviewQueueItem** — Used in AG-DASH review section
```
┌──────────────────────────────────────────────────┐
│ ⚠ LYG-12  "Should auth use JWT or sessions?"    │
│ Context: Building auth middleware, need to decide │
│ on token strategy before proceeding.              │
│ [Type response...          ] [Send] [View Issue] │
└──────────────────────────────────────────────────┘
```

---

## 9. API ROUTES

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]/issues` | List issues (with filters) |
| POST | `/api/projects/[id]/issues` | Create issue |
| GET | `/api/issues/[id]` | Get issue detail |
| PATCH | `/api/issues/[id]` | Update issue (status, fields) |
| POST | `/api/ai/create-issue` | AI: parse natural language → issue |
| POST | `/api/ai/enhance-issue` | AI: enrich issue description |
| POST | `/api/ai/generate-plan` | AI: create coding plan |
| POST | `/api/ai/revise-plan` | AI: revise plan with feedback |
| POST | `/api/ai/execute-task` | AI: run agent on task |
| POST | `/api/issues/[id]/comments` | Add comment |
| GET | `/api/swarms` | List swarms |
| POST | `/api/swarms` | Create swarm |
| PATCH | `/api/swarms/[id]` | Update swarm |
| POST | `/api/swarms/[id]/start` | Start swarm execution |
| GET | `/api/agents/active` | Get all active agent runs |
| GET | `/api/agents/review-queue` | Get items needing human review |
| POST | `/api/agents/[runId]/respond` | Respond to agent blocker |
| POST | `/api/agents/[runId]/approve` | Approve agent output |
| POST | `/api/agents/[runId]/cancel` | Cancel agent run |
| GET | `/api/agents/stream` | SSE: real-time agent updates |

---

## 10. ENVIRONMENT SETUP

### 10.1 .env.example (commit this)

```bash
# Anthropic Claude API Key — get yours at console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Database (SQLite, no config needed)
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_NAME="Lyght"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 10.2 .env.local (NEVER commit)

```bash
ANTHROPIC_API_KEY=<actual-key-here>
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Lyght"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 10.3 .gitignore (verify before first commit)

```
node_modules/
.next/
.env.local
.env*.local
prisma/dev.db
prisma/dev.db-journal
*.db
*.db-journal
.DS_Store
```

---

## 11. ACCEPTANCE CRITERIA — PROTOTYPE COMPLETE

The prototype is "done" when a user can:

1. **Onboard:** Enter name, create a project, see the dashboard
2. **Create issues via AI:** Type natural language, get a structured issue with AI-suggested title, type, priority, and acceptance criteria
3. **View issues:** See issues in a list view and board (kanban) view with TE-styled status indicators
4. **Plan with AI:** Trigger AI planning on an issue and receive a Coding Plan with atomic tasks, file paths, dependencies, and an executable agent prompt
5. **Review a plan:** View the plan in split-pane review mode, approve or reject with feedback, see the plan regenerate
6. **Execute agents:** Start agent execution on an approved plan, see the agent's output in real-time (simulated via Claude API)
7. **Handle blockers:** See when an agent has a question, respond directly from AG-DASH, see the agent continue
8. **Review output:** Approve or reject agent output, provide feedback for re-prompting
9. **Track swarms:** Create a swarm grouping multiple issues, see aggregate progress and parallel agent activity
10. **Monitor on AG-DASH:** See all active agents, review queue, and completed work in the Agent Dashboard with real-time updates

**And critically:**
11. **Security:** Zero API keys, passwords, or secrets in committed code. All AI calls server-side. Database file not committed.

---

## 12. NOTES FOR THE BUILDING AGENT

### 12.1 Build Strategy

This spec is designed for a single-shot Ralph Loop or GSD workflow. Build in the phase order specified (1→6). Each phase builds on the previous. Commit after each phase with a descriptive message.

### 12.2 When You're Stuck

If you encounter ambiguity:
1. **Default to simpler.** This is a prototype.
2. **Use placeholder data** rather than building complex integrations.
3. **Fake the real-time** with polling (2s interval) if SSE proves complex.
4. **Skip animations** if they're blocking progress — the static layout matters more.

### 12.3 What Not to Build

- No real GitHub integration (just store the repo URL)
- No real git commits from agents (simulate via output text)
- No real authentication (hardcoded demo user is fine)
- No real file system access for agents
- No WebSocket (SSE or polling is sufficient)
- No mobile responsiveness (desktop prototype only)

### 12.4 Design Non-Negotiables

Even for a prototype, these TE-inspired design elements MUST be present:
1. Monospace typography throughout
2. Black/white/orange color scheme
3. Status LED dots (not badges)
4. No border-radius on cards or containers (brutalist)
5. Dense information layout (no wasted whitespace)
6. Uppercase, letter-spaced labels

---

*End of specification. Build it.*
