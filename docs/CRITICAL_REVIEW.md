# Critical Review: Landing & Data-Fetching Solution

This document supports a collaborative review. It (1) states an initial assessment for you to confirm or correct, (2) lists potential weaknesses, (3) spells out assumptions (environment, input data, error handling, performance), (4) discusses maintainability under change, scale, and new developers, and (5) suggests improvements for the biggest concerns.

---

## 1. Initial Assessment (Confirm or Correct)

**Summary of what the current solution does well**

- **Cancellation:** `useAsyncEffect` centralizes “don’t set state after unmount” and is used consistently for map, insights, and featured fetches. This avoids React warnings and stale updates.
- **Defensive shaping:** Adapters use `??` and `||` for missing fields (e.g. `listing.title ?? 'Property'`, `res?.items || []`), and invalid coordinates are filtered out before map display.
- **Deduplication:** `dedupeById` prevents duplicate listings from the API or pagination from appearing in the UI.
- **Env usage:** Contact and social config are read from `import.meta.env` at module load with fallbacks (e.g. default contact email). Runtime uses a shared `apiUrl()` built from `VITE_API_BASE_URL`.
- **Build and loading:** Vite code-splits heavy chunks (GSAP, Leaflet, etc.); the landing page is lazy-loaded, so the critical path stays smaller.

**Where the solution is brittle or underspecified**

- **API contract:** The code assumes `searchListings` and `fetchInsights` return shapes like `{ items: ListingCard[], total?: number }` and `{ items?: InsightItem[] }`. There is no runtime validation (e.g. Zod); a backend change or malformed response can cause silent misuse (e.g. `item.id` or `item.price` undefined).
- **Error visibility:** In `useAsyncEffect`, the runner’s promise rejection is swallowed (`.catch(() => {})`). If a caller forgets try/catch, errors never surface in the UI and are hard to see in dev.
- **Global DOM:** Scroll-spy and cursor override assume `document.getElementById(id)` and `document.body` exist and that section IDs are present after mount; the hero status cycle assumes a ref-attached node exists. In an SSR or testing environment where the DOM is different, these can fail or no-op without explanation.
- **Single large component:** ZeniLanding remains a 1100+ line component; all behavior and sections live in one file, so “where do I change X?” is harder for a new developer.

If your initial assessment matches the above, we can treat it as the baseline. If not, note what you’d add or correct (e.g. “we do validate API responses in layer X” or “we’re not concerned about SSR”) and we can adjust.

---

## 2. Potential Weaknesses You Might Have Missed

| Area | Risk | Why it’s easy to miss |
|------|------|------------------------|
| **Listing without `id`** | `dedupeById` and keys use `item.id`. If the API ever returns an item without `id` (or with a number), you get runtime errors (e.g. `seen.has(undefined)`) or duplicate keys. TypeScript only checks at compile time. | Types say `ListingCard` has `id: string`; backend might not. |
| **Price not a number** | `formatKesPrice(item.price, isRental)` assumes `item.price` is a number. If the API sends a string or `null`, you get `"KES NaN"` or similar. | Defensive defaults are on strings/titles, not on numeric fields. |
| **Featured effect: partial failure** | `Promise.all` with `.catch(() => null)` means one failed request yields `null` for that slot. You set `setFeaturedListingsError(!featuredListingsResult)` but never set a message. User sees “error” state with no explanation or retry. | Logic is correct for “any failure = error,” but UX for retry or message is missing. |
| **Insights: no loading reset on error** | In the insights effect, on catch you set `setInsightsStatus('error')` but never set back to idle. If someone later adds a “retry” button that re-runs the effect, you may need to ensure loading is cleared. | Small; only matters when you add retry. |
| **Scroll-spy: sections missing** | If a section ID is removed from the DOM or renamed, the observer still runs but that ID never gets a ratio. “Active” can stick to the last valid section or the fallback reduce. No warning. | Fails quietly; no dev-only guard. |
| **Env at module load** | `CONTACT_EMAIL`, `SOCIAL_*` are read once when the module loads. In Vite this is fine; in a build that inlines different env per deployment, ensure env is available at load. If you ever load config asynchronously, these would stay stale. | Usually fine; matters for dynamic or multi-tenant config. |
| **Lenis / GSAP optional** | Code branches on `lenis` and `gsap` being truthy. If the motion hook returns null (e.g. reduced motion or load failure), scroll and animations no-op. No fallback message. | Intentional graceful degradation; worth documenting. |

---

## 3. Assumptions the Code Makes

### 3.1 Environment

- **Runtime:** Browser (window, document, localStorage for API client token). Not assumed to run in Node or SSR.
- **Build:** Vite; `import.meta.env` with `VITE_*` variables. `vite.config` proxies `/api` and `/uploads` to a target (e.g. `VITE_DEV_API_TARGET`).
- **API origin:** Same-origin or CORS-configured; `credentials: 'include'` is used. Landing fetches are unauthenticated (no token required).
- **Features:** IntersectionObserver, MutationObserver, setInterval, fetch, AbortController exist. No explicit feature detection; old browsers may break.

### 3.2 Input data

- **searchListings response:** `{ items: Array<{ id: string, title?, location?: { lat?, lng?, neighborhood?, city? }, ... }>, total?: number }`. Items without `id` or with non-string `id` can break dedupe/keying. `items` may be null/undefined; code uses `res.items ?? []`.
- **fetchInsights response:** `{ items?: T[] }`; code uses `res?.items || []`. Item shape (e.g. `InsightItem`) is not validated at runtime.
- **subscribeNewsletter response:** `{ status: 'created' | 'exists' | 'reactivated' }`; any other status is treated as success with a generic message.
- **Listing purpose/rental:** Inferred from `(item as { purpose?: string }).purpose === 'rent'` or category/type containing "rent". Assumes backend or adapter provides one of these.

### 3.3 Error handling expectations

- **Network/API errors:** Handled in each effect’s catch: set error state and/or empty data. No global toast or logging in the landing effects; the API client may throw `ApiError` with message/code.
- **useAsyncEffect:** Rejections from the runner are swallowed. Caller is expected to use try/catch inside the runner and set error state; otherwise the error is invisible.
- **No retry:** Landing fetches do not retry on failure. User must refresh or navigate away and back.
- **Partial success:** For featured data, if one of the three requests fails, the whole block is treated as error (no “partial stats” or “stale featured list”).

### 3.4 Performance requirements

- **No explicit SLA:** No target for “time to first listing” or “time to interactive.” Loading states are shown until the first successful response.
- **Heavy bundles:** GSAP/Lenis are code-split and loaded with the landing route; acceptable as long as landing is lazy-loaded. No assumption about slow 3G or low-end devices beyond “loading” UX.
- **Re-renders:** Many useState slices (insights, mapListings, featuredProjects, etc.) can cause multiple re-renders when multiple effects resolve; no batching beyond React’s own. No assumption that the page must render in a single paint after data loads.

---

## 4. Maintainability: Change, Scale, New Developer

### 4.1 If requirements change slightly

- **New section on the landing page:** Today you add JSX and possibly a new fetch; state and effect sit in the same large file. With section components and a dedicated hook (as in ARCHITECTURE.md), you’d add a component and optionally a hook, and wire them in the page. The current structure makes “add a section” touch the same file in many places.
- **API returns a new field (e.g. `listing.badges`):** You’d extend the adapter and possibly the type. Without runtime validation, it’s easy to assume the field exists and miss that the backend sometimes omits it. A shared adapter layer plus optional Zod (or similar) would make this safer.
- **Newsletter: new status (e.g. `pending_confirmation`):** You’d extend `getNewsletterSuccessResult` and the status type. Centralized in one function, so maintainability is good; the only gap is documenting expected API statuses.

### 4.2 If the codebase scales significantly

- **More pages with similar “fetch on mount + cancel on unmount”:** `useAsyncEffect` is reusable. Good.
- **More listing views (e.g. search results, saved list):** Each place currently duplicates “filter Zeni Support, dedupeById, map to view model.” Moving adapters and a small “normalize listing response” helper into a shared module would reduce duplication and keep behavior consistent.
- **Many more sections or A/B variants:** A single 1100-line component does not scale. Section components and a composition-only page (as in ARCHITECTURE.md) would scale better.
- **Multiple environments (e.g. white-label):** Env read at module load is one config snapshot. A context or async config loader would be needed for per-tenant or runtime config.

### 4.3 If another developer modifies it without context

- **Where to add a new fetch:** Not obvious without reading the whole file. A short comment at the top of the page (“Data: useAsyncEffect for fetch; pass result as props”) or an ARCHITECTURE.md link in the file header would help.
- **Why we swallow errors in useAsyncEffect:** Documented in the hook; a new dev might still add a fetch without try/catch and wonder why errors don’t show. A single “best practice” note in the hook (e.g. “always use try/catch and set error state”) or a small example in a comment reduces that risk.
- **What the API is supposed to return:** Types exist but no runtime checks. A new dev might trust the type and not handle missing or malformed data. A short “API contract” note (in code or in docs) and optional validation would help.
- **Scroll-spy and section IDs:** A new dev might rename a section and forget to update `NAV_SECTION_IDS` or the element’s `id`. A dev-only warning (“section X not found”) or a test that checks section presence would mitigate.

---

## 5. Suggested Improvements (Biggest Concerns First)

### 5.1 High impact, reasonable effort

1. **Don’t swallow errors silently in useAsyncEffect**  
   In development, log rejected errors so that “forgot try/catch” is visible:
   - In the hook: `.catch((err) => { if (import.meta.env.DEV) console.error('[useAsyncEffect]', err); })`.
   - Optionally, call an optional `onError` callback passed into the hook so the app can report to an error service.

2. **Defend against bad listing shape**  
   - Before `dedupeById`, filter to items that have a non-empty string `id`: e.g. `raw.filter((item): item is ListingCard => typeof item?.id === 'string' && item.id.length > 0)` (or a small `hasValidId(item)` helper). Prevents runtime errors and duplicate keys.
   - In `formatKesPrice`, guard at the start: e.g. `const p = Number(price); if (!Number.isFinite(p) || p < 0) return 'KES —';` then use `p`. Avoids “KES NaN” or negative display.

3. **Improve featured error UX**  
   - Keep “error” state but add a simple message (e.g. “Couldn’t load listings. Try again.”) and a “Try again” button that re-runs the featured effect (e.g. by toggling a `fetchKey` in deps). Improves perceived reliability without changing the architecture.

4. **Document assumptions in one place**  
   - Add a short “Assumptions” or “Contract” section at the top of ZeniLanding (or in a dedicated LANDING.md) that states: “Expects browser; API returns { items, total? }; section IDs must exist for scroll-spy; errors are handled per-section with no global toast.” Reduces surprises for the next developer.

### 5.2 Medium impact, medium effort

5. **Extract section components**  
   - As in ARCHITECTURE.md Phase 2: move Hero, Marquee, Map, Projects, Insights, etc., into their own components and have the page only compose them and pass props. This directly addresses “single large component” and “where do I change X?”.

6. **Optional: validate API responses**  
   - For landing, you could add Zod schemas for `SearchListingsResponse` and `FetchInsightsResponse`, parse in the effect after await, and on failure set error state and log in dev. Prevents silent misuse of malformed data; effort is schema authoring and wiring.

7. **Scroll-spy: dev-only guard**  
   - After observing, if `NAV_SECTION_IDS.some(id => !document.getElementById(id))`, in dev log a warning: “Scroll-spy: section(s) … not found.” Helps when someone renames or removes a section.

### 5.3 Lower priority

8. **Config via context**  
   - If you later need multiple configs (e.g. white-label) or easier testing, provide contact/social config through a small React context instead of reading env at module load. Not required for current single-tenant setup.

9. **Retry or backoff for landing fetches**  
   - Optional: retry once or twice with a short delay on network failure before showing error. Improves resilience on flaky networks; can be added inside the existing useAsyncEffect runners.

---

## 6. How to Use This Review

- **Confirm or correct (1):** Reply with “assessment matches” or list what you’d change (e.g. “we do have validation in X” or “we’re not targeting old browsers”).
- **Weaknesses (2):** Mark which ones you want to address first; we can turn them into small tasks or tickets.
- **Assumptions (3):** If any assumption is wrong (e.g. you do run in SSR or need offline), we can call out the code paths that depend on it and suggest changes.
- **Maintainability (4):** If “requirements change” or “new developer” scenarios don’t match your reality, describe your scenario and we can refine.
- **Improvements (5):** Pick 1–2 items to implement first (e.g. “log errors in dev + defend price/id”); then we can do the next batch.

This gives you a single place to track the critical review and iterate with the team or with further refactors.
