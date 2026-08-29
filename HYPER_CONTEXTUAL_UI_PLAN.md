# AccessiBooks Adaptive Experience Platform (AAX)

## Purpose

AAX defines the shared accessibility, contextual-learning, and adaptive-experience architecture for AccessiBooks across web and future React Native clients.

The platform must preserve user agency. Adaptation is user-governed, reversible, explainable, and based on explicit preferences and current task context rather than diagnosis or inferred disability.

## Product principle

**One canonical book and knowledge model; many interchangeable ways to perceive, understand, navigate and interact with it.**

AAX separates four concerns:

1. **Canonical content and provenance** — book, edition, author, chapter, passage, format, rights, sources and accessibility metadata.
2. **Experience preferences** — visual, interaction, reading and learning preferences owned by the reader.
3. **Context** — current screen, task, device, input method, media state and selected content.
4. **Presentation** — web or native renderers that implement the same semantic intent using platform-appropriate components.

## Non-negotiable autonomy rules

Preference precedence:

1. explicit user command;
2. saved user preference;
3. temporary per-book or per-session preference;
4. current task/context;
5. system suggestion;
6. AI inference.

The lower the source in this list, the less authority it has.

- AI may **propose** an interface change; it must not silently persist one.
- Persistent changes require an explicit user action.
- Every adaptive change must support **Preview**, **Keep**, **Undo**, **Reset**, and where useful **Why did this change?**
- Supporter suggestions must remain distinguishable from reader-owned preferences.
- Accessibility preferences must not be repurposed for advertising, eligibility, risk scoring or diagnosis inference.

## Experience modes

Experience modes are composable rather than mutually exclusive.

- Listen
- Read
- Read Along
- Transcript First
- Focus
- Simplified Navigation
- Study
- Historical Context
- Author Context
- Research
- High Visibility
- Reduced Motion
- Alternative Input
- AAC / supported communication

A user may combine modes, for example: **Read Along + Large Controls + Voice Input + Historical Context**.

## Experience profile

```ts
export interface ExperienceProfile {
  schemaVersion: 1;

  visual: {
    textScale: number;
    contrast: "system" | "enhanced";
    theme: "system" | "light" | "dark" | "sepia";
    motion: "system" | "reduced";
    density: "standard" | "reduced";
    typography: "standard" | "reading-support";
  };

  interaction: {
    preferredInput:
      | "touch"
      | "keyboard"
      | "switch"
      | "voice"
      | "pointer"
      | "system";
    targetSize: "standard" | "enhanced";
    confirmations: "standard" | "extra";
  };

  reading: {
    mode: "listen" | "read" | "read-along" | "transcript-first";
    highlightMode: "off" | "sentence" | "phrase";
    playbackRate: number;
  };

  didactic: {
    explanationDepth: 0 | 1 | 2 | 3;
    vocabularySupport: boolean;
    historicalContext: boolean;
    authorContext: boolean;
    pronunciationSupport: boolean;
    knowledgeChecks: boolean;
  };

  autonomy: {
    allowSuggestions: boolean;
    allowAutomaticChanges: false;
    explainAdaptations: true;
  };
}
```

The existing high-contrast, dyslexia/reading-support typography, dark-mode and reduced-motion settings should migrate into this model without breaking existing stored preferences.

## Shared architecture

```text
                         ACCESSIBOOKS PLATFORM
                                  │
                    Canonical REST/API services
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
     Book/Edition            Identity/Consent      AccessiBooks AI
       Graph                    & Support              Orchestrator
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                         AAX EXPERIENCE CORE
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
   Preference Engine       Context Engine         Didactic Engine
          │                       │                       │
     explicit choices      task/device/input      explanations
     saved recipes         current reading        definitions
     temporary state       media state            context/scaffolds
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                        Experience Manifest
                                  │
                  ┌───────────────┴───────────────┐
                  │                               │
             WEB RENDERER                  NATIVE RENDERER
          React/Vite existing                React Native
```

Share domain logic, schemas, policy, state and API clients. Do not force DOM-specific UI components into React Native or native-only components into the web client.

## Proposed repository layout

```text
apps/
  web/
  mobile/
packages/
  accessibooks-domain/
  api-client/
  adaptive-experience/
  accessibility-policy/
  guardian-permissions/
  knowledge-graph/
server/
```

Migration should be incremental. The current web app remains functional while shared packages are extracted.

## AccessiBooks AI integration

The assistant receives only the context needed to answer the current request.

```ts
interface AssistantContext {
  book?: BookContext;
  screen: ScreenContext;
  experience: ExperienceProfile;

  accessibility: {
    activeInteractionMethod?: string;
    temporaryNeeds?: string[];
  };

  supportSession?: {
    active: boolean;
    supporterRole: string;
    permissions: SupportPermission[];
    expiresAt?: string;
  };

  uiCapabilities: string[];
}
```

AI output that affects UI must use a constrained action contract:

```ts
type ExperienceAction =
  | { type: "PROPOSE_PROFILE_CHANGE"; patch: Partial<ExperienceProfile> }
  | { type: "OPEN_CONTEXT"; contextType: "author" | "history" | "vocabulary" }
  | { type: "START_READ_ALONG" }
  | { type: "RESTORE_PROFILE"; profileId: string }
  | { type: "NO_UI_CHANGE" };
```

The application validates and executes actions. The model does not directly mutate application state.

## Didactic accessibility

The original work must remain distinguishable from generated assistance.

A user may request:

- Explain simply
- Define words
- Give historical context
- Explain the author
- Identify a person/place/event
- Explain what happened before this passage
- Show a timeline
- Compare editions
- Explain a literary reference
- Read this aloud
- Show visually
- Ask me questions
- Give me a deeper academic explanation

Generated explanations must carry provenance where factual claims depend on external research.

## Supporter / guardian permissions

Do not use a single `guardian: true` flag.

```ts
type SupportCapability =
  | "accessibility.preferences.suggest"
  | "playback.control"
  | "library.organise"
  | "purchase.request"
  | "account.recovery.assist"
  | "progress.view";

interface SupportGrant {
  id: string;
  readerId: string;
  supporterId: string;
  capabilities: SupportCapability[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}
```

The following must not be implied by a support relationship:

- reading history access;
- search history access;
- private note access;
- accessibility profile export;
- full account control.

Support access must be granular, visible, revocable, auditable and privacy-preserving.

## First vertical slice

Implement one complete journey before broad platform migration:

```text
Search
  ↓
Book
  ↓
Choose format
  ├─ Listen
  ├─ Read
  └─ Read Along
       ↓
Select passage or chapter
       ↓
Learn
  ├─ Define words
  ├─ Historical context
  ├─ Author context
  └─ Deep dive
       ↓
Provenance / source card
```

The adaptive controls must remain available throughout this journey.

## First implementation milestones

### M0 — Baseline and contracts

- inventory existing accessibility preferences and storage format;
- define `ExperienceProfile` and migration logic;
- define `ExperienceAction` schema;
- define support-permission schema;
- document privacy boundaries and data retention;
- create acceptance criteria for the first vertical slice.

### M1 — Web AAX foundation

- replace direct CSS-toggle ownership with an experience-store adapter;
- preserve current high-contrast, typography, dark and reduced-motion behaviour;
- add preview/keep/undo/reset behaviour;
- add temporary per-book overrides;
- add an accessible Adaptive Experience panel.

### M2 — Didactic layer

- add Learn action to the book/player context;
- add vocabulary, author and historical-context surfaces;
- keep source text visually and programmatically distinct from generated explanation;
- add provenance and unavailable/error states.

### M3 — Support permissions

- implement scoped grants;
- visible active-support state;
- revoke and expiry flows;
- audit material changes;
- keep private history off by default.

### M4 — React Native client foundation

- create a sibling React Native app;
- use shared domain/API/AAX packages;
- implement Discover, Library, Player, Learn and Profile navigation;
- implement native accessibility semantics rather than mirroring DOM ARIA mechanically.

## Testing and release evidence

Accessibility is a release property of complete journeys, not a component checklist.

Minimum automated checks:

- role/name/state for all controls;
- keyboard or hardware-keyboard operability where supported;
- profile preview/accept/reject/undo/reset;
- persisted and temporary preference behaviour;
- generated explanation remains distinct from source text;
- prohibited supporter actions fail safely;
- expired/revoked grants cannot be reused.

For React Native Testing Library, prefer semantic queries in this order:

1. role;
2. accessible label;
3. placeholder;
4. visible text;
5. test ID only as a last resort.

Manual release evidence must cover representative complete journeys and applicable platform checks, including screen reader, zoom/large text, reflow or responsive layout, focus, contrast, reduced motion, touch target size, alternative input, errors and recovery.

Do not claim WCAG AA or AAA conformance solely because accessibility controls exist.

## Guardian improvement cycle

Run the following loop for every priority journey:

1. **Discover and frame** — journey map, risk register, baseline measures, accessibility applicability and consent plan.
2. **Co-design and prototype** — disabled-reader and supporter testing, permission model and measurable acceptance criteria.
3. **Validate** — automated checks plus human assistive-technology testing and issue evidence.
4. **Build, verify and learn** — feature flag, regression suite, production-like verification, decision log and next hypothesis.

Advance only when applicable AA criteria for the whole journey are evidenced, no blocker/high defect remains, privacy/support boundaries pass, and representative users can complete the critical task without takeover.

## Performance rules

Use **Measure → Optimise → Re-measure → Validate**.

Do not introduce memoisation, state fragmentation, list replacement or native modules without an observed problem or requirement. Profile adaptive panels, transcript/read-along views and large catalogue lists before optimisation.

## Definition of done for the first AAX slice

- existing web accessibility settings migrate without data loss;
- explicit preferences override contextual suggestions;
- no persistent automatic AI UI changes;
- user can preview, keep, undo and reset adaptations;
- Search → Book → Listen/Read/Read Along → Learn works end-to-end;
- original text and generated didactic content are clearly differentiated;
- provenance is shown for factual contextual material;
- support grants are scoped and revocable;
- reading/search history remains private by default;
- automated semantic tests pass;
- production-like human accessibility testing produces no unresolved AA blocker/high defect;
- release notes distinguish verified behaviour from planned or untested capability.
