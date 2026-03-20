# GEMINI.md - AKINE Frontend

## Purpose

This file defines the frontend-specific operating rules for Gemini inside:

`akine-web/akine-web/`

It complements the root-level project instructions.

If there is any conflict:
1. security and privacy rules from the root file always win
2. this file wins over the root file for frontend-local decisions

---

## Scope

These instructions apply only to the frontend project located at:

`akine-web/akine-web/`

They govern:
- Angular application structure
- feature organization
- components and templates
- state management
- services and HTTP access
- forms and validation
- UI/UX behavior
- frontend security
- frontend testing
- frontend change verification

---

## Stack

Frontend stack:
- Angular 20 standalone
- TypeScript strict mode
- feature-based architecture
- Signals for simple and medium local state
- RxJS when reactive orchestration is truly needed
- Reactive Forms
- HTTP interceptors for auth and global error handling

General frontend principles:
- clarity over cleverness
- consistency over improvisation
- small cohesive components
- explicit typing over loose objects
- reusable patterns over one-off solutions
- operational UX over decorative UI

---

## Expected structure

Expected frontend structure:

`src/app/`
- `core/`
- `shared/`
- `features/`

Each feature should keep clear separation between:
- `pages/`
- `components/`
- `services/`
- `models/`
- `state/` or local state logic when applicable

Preferred responsibility by folder:
- `core/` -> auth, guards, interceptors, app-wide services
- `shared/` -> reusable UI, directives, pipes, utilities
- `features/` -> domain-driven screens and components

Do not blur these boundaries without a clear reason.

---

## Working mode before changing frontend code

Before making changes:
1. Restate the frontend goal briefly.
2. Identify assumptions, UX risks, blockers, and cross-feature impact.
3. Propose a short implementation plan.
4. Mention the likely modules/files to touch.
5. Only then implement.

If key information is missing and it affects security, permissions, validation, workflow clarity, or critical user flows, stop and ask for clarification.

---

## Safe change policy

Default mode is **safe edit**, not speculative redesign.

Always prefer:
- minimal, targeted changes
- preserving working structure
- keeping diff scope small
- respecting shared components and existing patterns
- updating only what the change really requires

Do not:
- redesign a full screen unless explicitly requested
- create new services, utilities, or abstractions without clear need
- leave broken imports, missing dependencies, or dead references
- silently change unrelated flows
- rewrite working UI just because a “cleaner” version is possible

If the screen is important or fragile:
- preserve layout unless redesign is explicitly requested
- isolate the change
- keep the implementation incremental
- state what was intentionally left untouched

---

## Component rules

Components must:
- prefer standalone components
- stay small, cohesive, and easy to reason about
- separate container/page responsibilities from presentational responsibilities when useful
- use `ChangeDetectionStrategy.OnPush` for presentational components where appropriate
- keep templates readable
- keep visual responsibilities separate from business rules

Components must not:
- become giant screens with too many responsibilities
- contain hidden business rules that belong elsewhere
- call APIs directly
- duplicate forms, validations, or shared UI patterns without reason
- move heavy processing into templates

Avoid:
- deeply nested template logic
- excessive inline conditions
- giant HTML files with mixed concerns
- duplicated local UI primitives when a shared version should exist

---

## State and reactivity rules

Use the simplest correct state approach.

Rules:
- prefer Signals for simple and medium local state
- use RxJS when the flow truly requires streams, async composition, or cancellation behavior
- do not mix patterns without a reason
- avoid unnecessary manual subscriptions
- keep state ownership clear
- avoid scattering state logic across unrelated components

Do not:
- introduce a more complex state model just because it is fashionable
- create reactive indirection without value
- duplicate server state and local state unnecessarily
- bury flow logic in templates

---

## Typing rules

Strict typing is mandatory.

Rules:
- avoid `any`
- only use `any` in exceptional and justified cases
- define interfaces or types for:
  - DTOs
  - HTTP responses
  - request payloads
  - view models
  - state objects when needed
- keep contracts explicit
- avoid pushing raw untyped objects across the application

Do not:
- pass backend payloads around without a clear frontend contract
- rely on implicit shapes
- tolerate loose typing in critical flows

If backend contracts change:
- update types
- update adapters/mappers if they exist
- update affected screens and services
- update validation and tests

---

## HTTP and service rules

HTTP access must be centralized.

Rules:
- use services per feature or coherent domain
- do not call APIs directly from components
- keep HTTP logic out of templates
- handle errors consistently
- map transport concerns cleanly to the UI
- review all affected consumers when backend contracts change

Services must not:
- become dumping grounds for unrelated logic
- hide contract changes
- return weakly typed data when strong typing is possible

Prefer:
- typed responses
- clear error handling
- predictable transformation points
- thin components consuming well-shaped data

Before creating a new service:
- verify that an existing one is not the correct place
- justify why a new service is needed
- ensure imports and dependencies are correctly wired

---

## Frontend security rules

The frontend must not weaken security or leak sensitive information.

Mandatory:
- never expose tokens, claims, or sensitive data in browser logs
- never persist clinical or sensitive data without a clear functional reason
- treat frontend permission checks as UX only, never as real authorization
- assume backend is the source of truth for security

Never:
- use `[innerHTML]` without explicit sanitization
- store sensitive clinical content carelessly in local storage/session storage
- leak auth information for debugging convenience
- assume hidden UI equals secured data

Be careful with:
- cached responses
- browser storage
- debug logging
- copied payloads in console
- rendering user-provided HTML/content

---

## Forms and validation rules

Reactive Forms are the default.

Rules:
- prefer Reactive Forms
- keep validation aligned with backend rules
- use clear and actionable error messages
- group fields logically
- avoid overly long forms when the workflow can be split
- preload edit forms correctly
- keep payloads clean and intentional

Do not:
- submit garbage fields
- send inconsistent payloads
- hide validation rules from the user
- overload the same screen with too many inputs if tabs, steps, or progressive disclosure would improve usability

Validation must:
- guide the user clearly
- avoid leaking sensitive backend details
- match actual business rules as closely as possible

---

## UI/UX rules

This is an operational healthcare SaaS frontend.

Priorities are:
- clarity
- low cognitive load
- high readability
- predictable behavior
- consistency
- safe workflows

Mandatory:
- maintain visual consistency across modules
- prefer reusable shared UI over ad hoc variants
- define loading, empty, error, and success/feedback states for every relevant view
- keep one primary action per decision block
- separate destructive actions clearly
- include tooltip and `aria-label` for icon-only actions
- preserve a clean information hierarchy
- reduce visible complexity before adding more UI elements
- prefer tabs, stepper, modals, or progressive disclosure when a screen becomes too heavy

Do not:
- introduce new UI libraries without explicit request
- add Bootstrap-like one-off styling if the app has its own design direction
- crowd screens with too many cards, buttons, filters, or simultaneous actions
- optimize one screen visually while breaking overall consistency

Responsive behavior is mandatory for:
- desktop
- tablet
- mobile

But responsiveness must preserve usability, not just visual shrinkage.

### Global table standard

All current and future tables must inherit a reusable system standard instead of ad hoc per-screen layout decisions.

Required reusable column types at minimum:
- `text`
- `textShort`
- `numeric`
- `status`
- `actions`

Each type must define by default:
- alignment
- expected width behavior
- responsive behavior
- padding
- visual hierarchy

Mandatory alignment rules:
- descriptive text and names -> left
- numeric values, percentages, and amounts -> right
- dates -> consistent by pattern, preferably left for descriptive values or centered for short data cells
- status -> consistent and visually contained
- actions -> compact and stable inside a constrained column

Mandatory layout rules:
- descriptive columns should remain flexible and consume the remaining space
- short text columns should remain content-based or constrained
- numeric columns should stay narrow and right-aligned
- status columns should be fixed or semi-fixed and should not steal space from primary content
- action columns should use the minimum stable width and must not deform the table
- headers must follow the same alignment logic as their cells
- visual states inside tables must be bold
- applies to `Activo`, `Inactivo`, `Pendiente`, `Suspendido`, `Cancelado`, and equivalent statuses
- bold should improve hierarchy without changing the overall component size
- keep this rule for current and future tables

Implementation rule:
- solve this through shared infrastructure such as global utility classes, shared column config, base table abstractions, or equivalent reusable system behavior
- avoid screen-by-screen manual table tuning when the rule belongs to the global standard

---

## Mandatory compliance gate: AKINE_UI_RULES

Any modification in this frontend project that affects UI, UX, styles, visual structure, layout, spacing, components, forms, tables, modals, headers, tabs, steppers, filters, or visual behavior must comply with `AKINE_UI_RULES.md` without exception.

`AKINE_UI_RULES.md` is the visual source of truth for the product. It is located at the workspace root and at `akine-web/akine-web/AKINE_UI_RULES.md`.

### Mandatory protocol

- Read `AKINE_UI_RULES.md` before touching any visual part of the product.
- Treat `AKINE_UI_RULES.md` as the definitive and non-negotiable visual source of truth.
- Do not close or consider a frontend task done without explicitly validating compliance with those rules.
- If the proposed change conflicts with `AKINE_UI_RULES.md`, stop, correct, and align before delivering.
- Do not improvise redesigns.
- Do not create new patterns if an approved one already exists.
- Do not enlarge components to "improve clarity".
- Do not turn tabs, steppers, or subtle selectors into large or visually heavier elements.
- Do not break visual consistency between equivalent screens.
- Advanced filters must remain hidden behind a filter button unless there is a clear and justified operational need.
- Maintain visual consistency, hierarchy, density, spacing, and behavior aligned with the patterns already defined in AKINE.

### Required Gemini output for visual tasks

Before implementing any visual change, Gemini must explicitly state:
1. which existing pattern will be reused
2. what will be simplified
3. what will be removed or reduced to lower visual weight
4. how consistency with equivalent screens will be preserved
5. which global spacing rules, tokens, or shared utilities will be applied
6. how compliance with `AKINE_UI_RULES.md` was verified

### Acceptance rule

If Gemini does not provide this explicit validation, the frontend task is considered incomplete. A visual change cannot be marked as done without verifying compliance with `AKINE_UI_RULES.md`.

---

## Accessibility baseline

Minimum accessibility rules:
- visible focus states
- sufficient contrast
- labels for controls
- keyboard-reachable primary flows
- `aria-label` for icon-only actions
- avoid inaccessible click-only patterns for critical actions

Accessibility is not optional polish.
It is part of functional quality.

---

## Performance and implementation discipline

Frontend changes must consider rendering cost and usability.

Rules:
- prefer the smallest correct implementation
- avoid unnecessary abstractions
- avoid oversized components
- avoid excessive re-renders
- be careful with large tables, dashboards, patient views, schedules, and history-heavy screens
- defer secondary information when the main workflow is already dense
- favor composition over giant monolithic pages

If a screen is too heavy:
- simplify the information architecture
- split the workflow
- reduce simultaneous decisions
- avoid piling more UI onto the same page

Do not solve poor UX by only adding more cards, tabs, or controls without rethinking the flow.

---

## Testing rules

Relevant frontend changes should include appropriate verification.

When applicable, cover:
- component tests
- service tests
- form validation tests
- basic critical flow tests
- contract-related checks when transport types change

Minimum expectation by type of change:
- UI interaction change -> component/manual flow verification
- form change -> validation and payload verification
- service/contract change -> typed model + integration path verification
- shared component change -> broader regression awareness
- routing/navigation change -> navigation and guard verification

If tests do not exist:
- do not pretend full confidence
- provide manual verification steps
- mention residual UX or compatibility risk explicitly

---

## Frontend verification commands

Run from:

`akine-web/akine-web/`

Use the commands that match the scope of the change:

```bash
npm ci
npm run lint
npm run test
npm run test:ci
npm run build
```

Verification must be honest:
- do not claim lint passed if it was not run
- do not claim build passed if it was not run
- do not claim a screen is validated without describing the manual check
- do not claim backend compatibility if contract changes were not reviewed

---

## Frontend definition of done

A frontend task is done only if all applicable conditions are met:

- requested behavior is implemented
- structure and component boundaries were respected
- visual consistency was preserved or improved
- validation remains coherent
- relevant tests pass
- lint passes
- build passes
- affected flows were manually verified when needed
- no sensitive data leaked in logs or browser storage
- risks, assumptions, and UX edge cases are clearly stated
- **for visual changes**: compliance with `AKINE_UI_RULES.md` has been explicitly validated and stated in the response; if not present, the task is not done

---

## Forbidden without explicit request

Do not do any of the following unless explicitly requested:
- migrate state strategy by preference alone
- introduce heavy libraries for simple problems
- change global project structure
- redesign auth flow without impact review
- replace shared UI patterns with local ad hoc solutions
- weaken typing for convenience
- bypass validation just to make UI “work”
- silently change visual behavior in unrelated modules
- add noisy styling that breaks the product tone
- overload screens instead of improving the workflow

---

## Required response format for frontend tasks

When reporting a frontend change, always state:

- goal understood
- module/feature affected
- files changed
- visual and functional impact
- contract/type impact
- validation impact
- manual verification steps
- commands used for verification
- remaining UX, compatibility, or edge-case risks

Be explicit.
Do not present frontend work as complete if validation is partial.

---

## Final operating rule

When in doubt, Gemini must:
- reduce scope
- preserve consistency
- protect security boundaries
- keep contracts explicit
- avoid speculative redesigns
- prefer safe incremental progress over flashy rewrites
