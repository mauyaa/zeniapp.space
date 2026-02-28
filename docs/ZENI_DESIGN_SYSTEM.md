# Zeni Design Language

Apply this system to **every page** (Settings, Payments, Property Details, etc.) so the whole app feels like the Landing and Dashboard.

---

## 1. The "Zeni" Signature

| Principle | Do | Avoid |
|-----------|----|--------|
| **High contrast** | `bg-black` / `bg-white`, zinc/slate grays | Colorful accents; use **signal colors** only (green = Live, red = Unread) |
| **Typography** | **Serif** (Playfair Display) for headings; **Sans** (Inter) for UI; **Mono** (JetBrains Mono) for numbers, dates, prices | Mixing decorative fonts; rounded "friendly" type |
| **Density** | Bento grids, split screens, busy-but-organized (Bloomberg terminal feel) | Big whitespace; center-aligned empty layouts |
| **Alive UI** | Tickers, pulsing dots, hover states, Framer Motion with physics | Static pages; instant show/hide |
| **Sharp geometry** | `rounded-sm` / `rounded-md` (max 0.5rem for cards); thin crisp borders `border border-gray-200` | Pills; heavy rounded corners |

---

## 2. Tailwind Configuration (Rule #1)

Brand is hardcoded in `tailwind.config.js`:

- **Colors:** `zeni-background` (#F8F9FA), `zeni-foreground` (#09090B), `zeni-muted`, `zeni-border`, `zeni-border-strong`, `zeni-signal-live`, `zeni-signal-unread`
- **Fonts:** `font-serif` (Playfair Display), `font-sans` (Inter), `font-mono` (JetBrains Mono)
- **Radius:** Prefer `rounded-sm` / `rounded-md`; cards use `rounded-lg` (0.5rem) max
- **Letter-spacing:** `tracking-widest` (0.15em) for **all** caps labels

Use these tokens instead of raw hex or default Tailwind colors.

---

## 3. Micro-Interactions (Rule #2)

- **Buttons:** On hover, invert (e.g. white → black). Use `.zeni-btn-primary` / `.zeni-btn-secondary` or equivalent.
- **Cards:** On hover, lift slightly (`-translate-y-1`) and sharpen shadow. Use `.zeni-card` where possible.
- **Inputs:** Prefer underline / floating-label style (e.g. `.zeni-input`). Avoid chunky boxed inputs.

---

## 4. Spec Sheet Layout (Rule #3)

For any page with **data** (Property Details, Payment History, Settings):

- **Avoid:** Big whitespace; center alignment for content.
- **Do:** Divide with lines and grids (`border-r`, `border-b`). Use **uppercase + tracking-widest** for labels: `text-[10px] uppercase tracking-widest text-zeni-muted` or class `.zeni-spec-label`.
- **Typography:** Serif for main titles/data; **mono for numbers, dates, prices** (e.g. `font-mono` or `.zeni-mono`).

---

## 5. Always Be "Live" (Rule #4)

Even on static pages, add a sense of activity:

- Settings: "Last synced: 2m ago"
- Payments: Small sparkline or "Live" indicator next to total
- Profile: "Live" dot (`.zeni-dot-live`) next to avatar

---

## 6. Navigation Shell (Rule #5)

- **Sidebar:** Always the "anchor" — white or black, high contrast. Active state = solid black background (or `bg-zeni-foreground`).
- **Top bar:** Always "context" — breadcrumbs: **Workspace > [Current Page]**. Use `.zeni-spec-label` for the breadcrumb text.

---

## Quick Reference

| Element | Class / Token |
|--------|----------------|
| Page background | `bg-zeni-background` |
| Cards / surfaces | `bg-zeni-surface` |
| Text | `text-zeni-foreground`, `text-zeni-muted` |
| Borders | `border-zeni-border-strong` |
| Labels (spec sheet) | `.zeni-spec-label` or `text-[10px] uppercase tracking-widest text-zeni-muted` |
| Numbers / prices / dates | `font-mono` |
| Headings (editorial) | `font-serif` |
| Live dot | `<span className="zeni-dot-live" />` |
| Unread dot | `<span className="zeni-dot-unread" />` |
| Card with hover lift | `.zeni-card` |
| Primary button | `.zeni-btn-primary` |

---

*Apply these 5 rules to every new page so the app stays consistent with the Zeni Landing and Dashboard.*
