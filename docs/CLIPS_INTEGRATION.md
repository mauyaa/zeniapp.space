# CLIPS Integration (Expert System / Rule Engine)

CLIPS is a classic **rule-based expert system** (forward-chaining). In a project like ZENI, it fits best where you want **transparent, auditable business rules** that are easy to change without rewriting application logic.

## High-Value Use Cases In ZENI

- Listing quality rules: auto-flag missing fields, suspicious prices, inconsistent location, missing images.
- Verification workflows: encode “verified” criteria as rules (documents present, agent verified, etc.).
- Matching / recommendations: rules to rank listings for a user profile (budget, commute, beds, safety, amenities).
- Lead scoring: assign lead stage hints from conversation content or user actions.
- Compliance & fraud checks: rate limits, abnormal request patterns, risky payment scenarios.

## Practical Integration Options

1. CLIPS as a microservice (recommended)
- Run CLIPS in a small container/process (e.g. Docker).
- The Node/Express server sends “facts” (JSON) and receives results (score, flags, actions).
- Pros: isolates runtime, easy to deploy, no native Node add-ons.
- Cons: extra service to run.

2. CLIPS via Python service (fast to prototype)
- Use Python bindings (e.g. `clipspy`) to evaluate rules.
- Pros: quick development; good tooling.
- Cons: adds a Python runtime/service.

3. Native embedding (advanced)
- Embed the CLIPS C runtime with a Node native addon.
- Pros: single process, low latency.
- Cons: highest complexity (build tooling, Windows/Linux compatibility).

## Demo Narrative You Can Use Today

- “We enforce critical business rules as a rule engine layer (CLIPS-style), so behavior is explainable and easy to adjust.”
- Example: the project already applies **rule criteria** for geo data:
  - If coordinates are missing, derive them from City/Area when possible.
  - If coordinates are swapped, correct them.
  - If coordinates are invalid/out of bounds, fall back safely (keeps the map usable).

## Example Rule Sketch (CLIPS)

```clips
(deftemplate listing
  (slot price)
  (slot hasImage)
  (slot city)
  (slot area)
  (slot hasCoordinates))

(defrule needs-location-hint
  (listing (hasCoordinates FALSE) (city "") (area ""))
  =>
  (assert (flag missing-location-hint)))

(defrule needs-image
  (listing (hasImage FALSE))
  =>
  (assert (flag missing-image)))
```

## Implementation Plan (Minimal Risk)

1. Define the “facts” we send to the rules engine (JSON schema).
2. Author rules in CLIPS (`.clp`) and a small adapter that returns:
- `flags`: reasons to show in UI (e.g. “missing-image”)
- `score`: quality score (0-100)
- `actions`: suggestions (e.g. “request-verification”)
3. Call the rules engine on listing create/update and store flags/score on the listing document.
4. Surface flags in agent/admin dashboards for faster cleanup and better demo impact.
