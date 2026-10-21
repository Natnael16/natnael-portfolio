# Sources (architecture)

Job boards are not the product. Matching, question concepts, and drafting are. A source is an adapter that turns a board into the same shapes every other source must emit.

Adding Greenhouse or Lever later should mean **one new adapter file** plus a company `source` id. Skills, draft routing, and the dashboard must not be rewritten.

## Three layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — Question concepts (skills, ATS-agnostic)     │
│  "tell us about a time", "why this company", work auth  │
│  agent/skills/classify-questions                        │
└──────────────────────────▲──────────────────────────────┘
                           │  { label, concept, required, options }
┌──────────────────────────┴──────────────────────────────┐
│  Layer 2 — Widgets (how to emit a value)                │
│  text / textarea / select / file / date / checkbox …    │
│  agent/skills/fill-widgets + ApplyField.inputKind       │
└──────────────────────────▲──────────────────────────────┘
                           │  { path, label, inputKind, options }
┌──────────────────────────┴──────────────────────────────┐
│  Layer 3 — Source adapter (code)                        │
│  listJobs → extractApplyForm → submitApplication        │
│  src/sources/{ashby,greenhouse,…}.ts                    │
└─────────────────────────────────────────────────────────┘
```

### Layer 1 — concepts (playbooks, not replacement questions)

Skills are written against **kinds** of questions (behavioral story, why-company, years-of-skill) so we do not hardcode Ashby vs Greenhouse.

**Fill time is different:** the adapter extracts every field with the **verbatim prompt**. Classify only adds a `concept` tag. The draft agent is given the full form and must answer `prompt` (“Why do you want to work at Discord?”), not the tag (`why_company`).

Concepts live in `agent/skills/classify-questions/`. The catalog is harvested from real boards, then de-duplicated to the *kind* of ask so we know which playbook to load.

### Layer 2 — widgets

The same concept (“why this company”) can be a textarea on one board and a short text box on another. `fill-widgets` says how to serialize the answer: exact select option, `YYYY-MM-DD`, `{{resume}}`, checkbox true/false. Adapters own DOM quirks; this layer owns value shape.

### Layer 3 — adapter

Each source implements `JobSource`:

```ts
interface JobSource {
  id: string; // "ashby" | "greenhouse" | …
  listJobs(board: BoardRef): Promise<NormalizedJob[]>;
  extractApplyForm(job: NormalizedJob): Promise<ApplyForm>;
  submitApplication(job: NormalizedJob, payload: ApplyPayload): Promise<SubmitResult>;
}
```

`ApplyForm.fields` must already be normalized (`path`, `label`, `required`, `inputKind`, `options`). The adapter may use GraphQL, an embed iframe, or Playwright — **downstream never cares**.

Register the adapter in `src/sources/registry.ts`. Companies store `source` + `slug`. Ingest and submit call `getSource(company.source)`.

## What you change to add a source

1. `src/sources/{id}.ts` — list, extract, submit.
2. Register it in `src/sources/registry.ts`.
3. Optional: a short PRD under `docs/prd/sources-{id}.md` for listing URLs and DOM traps.
4. Dashboard: accept that source’s board URL when adding a company.

Do **not** add `{id}` branches to classify, wording, or cover-letter skills.

## Implemented

- `ashby`: list, extract and submit. The only source the agent submits to.
- `greenhouse`, `lever`: list only (their apply APIs need the employer's key). `JobSource.extractApplyForm` and `submitApplication` are optional; without them a match is stored as `apply_manual` and listed under **Apply yourself** with the posting link.

## Feeds

Cross-company listings implement `JobFeed` (`src/sources/feeds/`): Remotive, We Work Remotely, Himalayas, Jobicy, RemoteOK, LinkedIn (logged-out public search). Each feed emits the same `NormalizedJob` and carries a `trust` level (`ats` / `curated` / `open`) that the scam screen starts from.

When a feed posting's apply link points at Ashby, Greenhouse or Lever, `registerBoard` adds that company board, so the next ingest reads it at the source. Processing runs boards before feeds and drops later copies of the same opening (`src/lib/dedupe.ts`).

Adding a feed: one file under `src/sources/feeds/`, add it to `allFeeds`, and name it in `FEEDS`.
