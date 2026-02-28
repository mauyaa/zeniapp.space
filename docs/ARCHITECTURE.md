# Zeni Frontend: Improved Architecture with Complementary Design Patterns

This document proposes an improved architecture for the Zeni frontend (with emphasis on the landing and data-heavy pages), how the patterns work together, a gradual refactoring plan, risks and mitigations, and the resulting maintainability and extensibility benefits.

---

## 1. Suggested Architecture: Complementary Patterns

The proposal layers **five complementary patterns** so that each handles one concern and they compose cleanly.

| Pattern | Role | Applies to |
|--------|------|------------|
| **Custom hooks (encapsulation)** | Own async lifecycle, cancellation, and optional local state per “resource” or behavior. | Data fetching (useAsyncEffect, useFeaturedLandingData), scroll-spy (useSectionScrollSpy), cursor override. |
| **Feature / section components** | One component per visible section or feature; receives data and callbacks via props. | Landing: Hero, Marquee, MapSection, Philosophy, Services, Projects, Insights, FAQ, CTA, Footer. |
| **Page as composition** | Page only composes sections and wires hooks to sections via props; no business logic in JSX. | ZeniLanding, Explore, Inventory. |
| **Adapter / mapper layer** | Pure functions that convert API shapes to view models; single place for “API → UI” rules. | listingToPropertyForMap, listingCardToProject, getNewsletterSuccessResult, formatKesPrice. |
| **Optional: reducer / FSM** | For cohesive UI state (e.g. one resource = loading \| error \| success + data), replace multiple booleans with one state machine. | Newsletter form, async resource state (featured listings, insights). |

### How they work together

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Page (e.g. ZeniLanding)                                                │
│  - Composes sections                                                    │
│  - Uses custom hooks for data and behavior                             │
│  - Passes hook results as props to sections                            │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  props (data, handlers, status)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Section components (LandingHero, LandingMapSection, LandingProjects…)  │
│  - Presentational or thin container                                     │
│  - No direct API calls; receive everything from parent                  │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  when building lists/cards
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Adapters (listingToPropertyForMap, listingCardToProject, …)            │
│  - Called by hooks or by section components with raw API data          │
│  - Pure; easy to test and reuse                                        │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  used by
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Custom hooks (useAsyncEffect, useFeaturedLandingData, useSectionScrollSpy) │
│  - Fetch data, manage cancellation, expose status + data                │
│  - Optionally use reducer/FSM internally for resource state              │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Hooks** own “when and how” data is loaded and when it’s safe to update state (cancellation). They may use **adapters** to turn API responses into view models.
- **Sections** are dumb or thin: they render what they’re given and call callbacks. They don’t know about fetch or scroll-spy logic.
- **Page** composes sections and hooks: it calls the hooks, gets `{ data, status, handlers }`, and passes them down. No duplicated async or scroll logic in the page.
- **Adapters** keep “API → UI” rules in one place; both hooks and (if needed) sections can call them.
- **Reducer/FSM** (optional) simplifies “loading / error / success / empty” so the page and sections don’t juggle multiple booleans.

---

## 2. How the Patterns Work Together

- **Single responsibility**
  - Hooks: data and side effects (fetch, scroll-spy, timers).
  - Sections: layout and presentation for one part of the page.
  - Adapters: shape conversion only.
  - Page: composition and wiring only.

- **Dependency direction**
  - Page depends on hooks and section components.
  - Hooks may depend on adapters and API clients.
  - Sections depend only on props (and shared UI components). They do not import API or hooks directly (except perhaps a generic useMotion for animation).

- **Testability**
  - Hooks: test with React Testing Library’s renderHook; mock API.
  - Sections: test with mocked props; no need to mock fetch.
  - Adapters: pure function unit tests.
  - Page: integration test with mocked hooks or API.

- **Reuse**
  - useAsyncEffect is already reused for map, insights, and featured data.
  - useSectionScrollSpy can be reused on any long page with section IDs.
  - Section components (e.g. LandingHero) could be reused on a different route or in a storybook.

---

## 3. Gradual Refactoring Approach

Refactor in **phases** so each step is shippable and low-risk.

### Phase 1: Consolidate async and scroll behavior (current + next steps)

- **Done:** Introduce `useAsyncEffect` and refactor the three landing data effects to use it.
- **Next:**
  - Extract **useSectionScrollSpy(sectionIds, options)** from the scroll-spy effect; ZeniLanding calls it and gets `activeSection`.
  - Optionally extract **useLandingCursorOverride()** for the cursor-hidden removal logic.

**Exit criteria:** No new features; same behavior; less duplicated “cancel + cleanup” and scroll-spy code in the page.

### Phase 2: Extract landing section components

- **Order:** Extract sections that have clear boundaries and minimal shared state first.
  - **2a.** **LandingMarquee** – props: `listingStats` (or null). No fetch inside.
  - **2b.** **LandingMapSection** – props: `mapListings`, `mapListingsLoading`, `navigate`. No fetch inside.
  - **2c.** **LandingPhilosophy**, **LandingServices** – static or from constants; no state.
  - **2d.** **LandingProjects** – props: `featuredProjects`, `featuredListingsLoading`, `featuredListingsError`, `onProjectHover`, `navigate`, maybe “explore map” handler. No fetch inside.
  - **2e.** **LandingInsights** – props: `insights`, `insightsStatus`, plus newsletter state and handler.
  - **2f.** **LandingFAQ**, **LandingCTA** – static or constants.
  - **2g.** **LandingFooter** – props: contact config, social links (or take from env/context).
  - **2h.** **LandingHero** – props: ring refs, ring images, featured projects (for alt text), handlers from useKineticRing, scrollToSection.

- **Page after Phase 2:** ZeniLanding renders a single scrollable layout: Hero, Marquee, MapSection, Philosophy, Services, Projects, (preview tooltip), Insights, FAQ, CTA, Footer. All data and handlers come from hooks and are passed as props.

**Exit criteria:** ZeniLanding.tsx is mostly composition; each section is in its own file and can be opened in isolation.

### Phase 3: Optional reducer / FSM for resources and forms

- **3a. Newsletter:** Replace `newsletterEmail`, `newsletterStatus`, `newsletterMessage` with a reducer (e.g. actions: SET_EMAIL, SUBMIT, SUCCESS, ERROR). The page (or a small NewsletterBlock component) dispatches and reads one state slice.
- **3b. Featured resource:** Optionally represent “featured listings” as a single state: `{ status: 'idle'|'loading'|'error'|'empty'|'success', projects?, ringImages?, listingStats? }`. The hook (e.g. useFeaturedLandingData) manages this; the page and LandingProjects only branch on `status` and data.

**Exit criteria:** No impossible states (e.g. loading and error true at once); simpler conditionals in the UI.

### Phase 4: Adapter and config boundaries

- **4a.** Move all listing adapters into one module (e.g. `src/adapters/listings.ts`): `listingToPropertyForMap`, `listingCardToProject`, and any future API→view mappers. Import from there in hooks or sections.
- **4b.** (Optional) Introduce a small **config context** for landing (contact email, social links, feature flags) so the page and Footer consume config instead of reading env at module scope. Enables easier testing and multi-tenant or A/B config later.

**Exit criteria:** One place for “how we turn API into UI”; optional single place for “what config this page uses.”

### Phase 5: Apply the same ideas to other heavy pages

- **Explore, Inventory, Home:** Consider section components + hooks (e.g. useExploreListings, useInventoryFilters) so each page is “composition + a few hooks” instead of one large component with many useEffects.

---

## 4. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Regression** (behavior or UI changes after refactor) | 1) Keep or add shallow/integration tests for landing (e.g. “renders hero”, “shows loading then map/listings”). 2) Manual smoke test of landing, map, insights, featured list, newsletter, scroll-spy. 3) One phase at a time; deploy and verify before the next. |
| **Scope creep** (refactoring too much in one PR) | One phase per PR (or 1–2 sections per PR in Phase 2). Document “done” and “not in scope” in the PR description. |
| **Prop drilling** (too many props through layers) | Keep the page as the only parent of sections; pass props one level. If props grow too large, group into a few objects (e.g. `landingData`, `landingHandlers`) or introduce a very narrow context (e.g. LandingPageContext with only what sections need). Prefer props over context for landing so sections stay obviously testable. |
| **Hooks depending on each other in awkward ways** | Keep hooks independent: e.g. useFeaturedLandingData and useMapListings don’t call each other; the page calls both and passes results to sections. Only share primitives (e.g. navigate, scrollToSection) via props. |
| **Breaking lazy load or code-split** | Landing is already lazy-loaded. When extracting sections, keep them in the same chunk as ZeniLanding (don’t lazy-load each section) so the initial landing load stays one chunk. Optional: lazy-load below-the-fold sections (e.g. FAQ, Footer) if metrics show benefit. |
| **Animation and refs** | Hero and scroll/magnetic effects depend on refs and GSAP. Keep refs and animation setup in the page or in a thin “LandingAnimations” hook that runs after sections mount; pass refs and callbacks into LandingHero. Document that Hero must be in the DOM for refs to be attached. |

---

## 5. How This Improves Maintainability and Extensibility

### Maintainability

- **Locality of change:** To change “how featured listings are loaded,” you touch the hook and maybe an adapter; the Projects section only cares about props. To change “how the projects table looks,” you touch only the section.
- **Readability:** The page file becomes a short list of hooks and section components with clear props; new developers can follow data flow top-down.
- **Testing:** Hooks can be tested with renderHook; sections with mocked props; adapters as pure functions. No need to mount the entire page to test one section.
- **Debugging:** React DevTools shows a clear tree (Page → Sections); hooks and state are isolated so “which part set this state?” is easier to answer.

### Extensibility

- **New sections:** Add a new section component and one block in the page; optionally add a hook if the section needs its own data. No need to edit existing sections.
- **New data sources:** Add a new hook (e.g. usePromoBanner) and pass result to a new or existing section. Adapters can be added for new API shapes.
- **A/B or variant layouts:** Swap or reorder section components per route or feature flag; the same hooks can feed different compositions.
- **Reuse:** useSectionScrollSpy and useAsyncEffect are already reusable; section components (e.g. Hero, Footer) can be reused on other routes or in email/preview tooling if needed.

---

## 6. Summary

- **Patterns:** Custom hooks (data + behavior), feature/section components (presentation), page as composition, adapters (API→view), and optional reducer/FSM (coherent UI state).
- **They work together:** Hooks and adapters own data and shape; sections own UI; page wires them with props.
- **Refactor gradually:** Phase 1 (hooks) → Phase 2 (sections) → Phase 3 (reducer/FSM) → Phase 4 (adapters/config) → Phase 5 (other pages).
- **Risks:** Regression, scope creep, prop drilling, refs/animations; mitigated by tests, small PRs, and keeping refs/animation in one place.
- **Outcome:** Clear boundaries, easier testing and debugging, and a structure that supports new sections and data sources without touching unrelated code.
