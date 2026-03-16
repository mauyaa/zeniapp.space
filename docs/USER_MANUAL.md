# Zeni Real Estate Platform
# User Training Manual (User Guide)

Document version: 1.0
Last updated: 2026-03-16

This manual explains how to use the Zeni web application for property discovery, messaging, viewings, and payments.

---

## Document Control

Fill these in if required by your organization or school:

- Document owner: (name / team)
- Prepared by: (name)
- Reviewed by: (name)
- Approved by: (name)
- Product name: Zeni Real Estate Platform
- Deployment URL: (for example, https://zeni.co.ke)

### Revision History

| Version | Date       | Description              | Author |
|---------|------------|--------------------------|--------|
| 1.0     | 2026-03-16 | Initial user manual draft| (name) |

---

## Table of Contents

1. Introduction
2. Roles and Entry Points
3. Getting Started
4. Public Browsing (No Account)
5. User Portal (`/app/*`)
6. Messaging (Chat)
7. Viewings
8. Pay Portal (`/pay/*`)
9. Agent Portal (`/agent/*`)
10. Admin Portal (`/admin/*`)
11. Security and Privacy
12. Frequently Asked Questions (FAQ)
13. System Messages and Meanings
14. Troubleshooting
15. Glossary and Support
16. Index

---

## 1. Introduction

### 1.1 Purpose

This document provides step-by-step guidance for end users of Zeni, including:

- Users (buyers/tenants)
- Agents
- Admin and finance users

### 1.2 Scope

This manual covers the Zeni web app:

- Public pages (landing, map, listings)
- User portal (`/app/*`)
- Agent portal (`/agent/*`)
- Admin portal (`/admin/*`)
- Pay portal (`/pay/*`)

### 1.3 Conventions Used

- URLs and routes appear like this: `/app/explore`
- Buttons and UI labels appear in quotes, for example: "Pay Now"
- Notes and warnings appear as callouts:

> Note: Helpful extra information.

> Warning: Important information to prevent errors or data loss.

---

## 2. Roles and Entry Points

Zeni has different portals depending on your role.

### 2.1 Public Site (no login required)

- Landing: `/`
- Public explore: `/explore`
- Public map: `/map`
- Listing details: `/listing/:id`
- Neighborhood pages: `/rent/:neighborhood` and `/buy/:neighborhood`

### 2.2 User Portal (authenticated)

- Main app: `/app/*`
- Key pages: `/app/home`, `/app/explore`, `/app/messages`, `/app/profile`

### 2.3 Agent Portal (agent accounts only)

- Login shortcut: `/agentlogin`
- Portal: `/agent/*`

### 2.4 Admin Portal (admin accounts only)

- Login shortcut: `/adminlogin`
- Portal: `/admin/*`

### 2.5 Pay Portal (separate session)

- Login: `/pay/login`
- Portal: `/pay/*`

> Note: The Pay portal is a dedicated area for payments. It can keep its own session separate from the main user portal.

---

## 3. Getting Started

### 3.1 System Requirements

- A modern browser (Chrome, Edge, Safari, Firefox).
- Stable internet connection (limited offline behavior exists, but most actions require connectivity).

### 3.2 Create an Account

1. Open `/register`.
2. Enter your details and create a password.
3. Submit the form.
4. After registration, you are taken to the portal that matches your account role.

### 3.3 Log In

1. Open `/login`.
2. Enter your email and password.
3. Select "Log in".

Role-specific shortcuts:

- Agent login: `/agentlogin`
- Admin login: `/adminlogin`
- Pay login: `/pay/login`

### 3.4 Reset Your Password

1. Open `/forgot`.
2. Follow the on-screen instructions.
3. Open `/reset` to set your new password (often via a link).

### 3.5 Offline Banner

If you lose connectivity, Zeni may display an offline banner:

- Message: "You're offline. Some actions may be unavailable. We'll retry when you're back online."

When the banner is visible:

- Browsing previously loaded content may still work.
- Actions that require the server (login, saving, sending messages, payments) may fail until you are back online.

---

## 4. Public Browsing (No Account)

### 4.1 Landing Page (`/`)

Use the landing page to:

- Understand what Zeni offers.
- Navigate to explore, map, login, and registration.

### 4.2 Public Explore (`/explore`)

Use the public explore page to:

- Browse listings quickly without logging in.
- Open a listing to see full details.

### 4.3 Public Map (`/map`)

Use the public map page to:

- Explore listings based on location.
- Zoom and pan to different neighborhoods.

### 4.4 Listing Details (`/listing/:id`)

A listing typically includes:

- Photos and key details (price, beds, baths, location, amenities).
- Agent information (when available).
- Actions such as messaging or requesting a viewing (depending on your login status).

### 4.5 Neighborhood Pages (`/rent/:neighborhood`, `/buy/:neighborhood`)

Neighborhood pages provide:

- An overview of the area (when configured).
- Live listings filtered to that neighborhood.

---

## 5. User Portal (`/app/*`)

### 5.1 Main Pages

The user portal includes:

- Home: `/app/home`
- Explore: `/app/explore`
- Inventory: `/app/inventory`
- Saved: `/app/saved`
- Viewings: `/app/viewings`
- Refunds: `/app/refunds` (if enabled)
- Messages: `/app/messages`
- Profile: `/app/profile`

### 5.2 Home (`/app/home`)

Home is your starting dashboard after login. Typical items include:

- Quick navigation to Explore, Saved, Messages, and Profile
- Highlights or recommendations (depending on configuration)

### 5.3 Explore (`/app/explore`)

Explore supports both list and map-based searching.

Common actions:

1. Open `/app/explore`.
2. Use filters (purpose rent/buy, price range, beds, baths, type).
3. Switch between "List" and "Map" views.
4. In map view, you can use "Search this area" after moving the map.
5. If compare is enabled, you can compare up to 3 listings.
6. Use "Recently viewed" to quickly reopen the last listings you visited.

Explore filters reference (may vary by deployment):

- Purpose: rent or buy
- Price: minimum and maximum price
- Beds and baths: number of bedrooms/bathrooms
- Type: Apartment, House, Villa, Townhouse, Studio, Penthouse, Commercial, Office, Retail, Warehouse, Land, Other
- Verified only: if enabled, shows verified listings only (often enabled by default)
- Amenities: DSQ, Borehole water, Generator, Fiber internet, Ensuite, Furnished, Gym, Pool, CCTV, Lift/Elevator

Explore sorting reference:

- Recommended
- Price (low to high)
- Price (high to low)

### 5.4 Inventory (`/app/inventory`)

Inventory is optimized for scanning many listings.

Common actions:

1. Open `/app/inventory`.
2. Use the purpose toggle (for example, rental vs buy).
3. Scroll the listing list and open a listing to view details.
4. If you receive a deep link with `?listing=<id>`, the app can open that listing directly.

### 5.5 Saved (`/app/saved`)

Saved is used to keep track of listings and searches you want to revisit.

Common actions:

- Save a listing from Explore/Inventory using the heart/bookmark action.
- Open `/app/saved` to view your saved listings.
- Create and manage saved searches (filters + query).

> Note: Saved listings can be viewed even when offline, but actions such as messaging or requesting viewings still require internet.

### 5.6 Messages (`/app/messages`)

Messages contains:

- Inbox (conversation list)
- Thread view (messages inside a conversation)

Common actions:

1. Open `/app/messages`.
2. Select a conversation in the inbox.
3. Type your message and send.
4. If the conversation is tied to a listing, the thread may show the listing context at the top.

### 5.7 Viewings (`/app/viewings`)

Common actions:

1. Open a listing.
2. Select "Request viewing".
3. Submit the viewing request.
4. Track the viewing status under `/app/viewings`.

Depending on configuration, a viewing fee may be required. If prompted, use the Pay portal.

### 5.8 Refunds (`/app/refunds`)

Refunds are part of "Zeni Shield" (when enabled).

To request a refund:

1. Open `/app/refunds`.
2. Select "Request refund".
3. Choose an eligible payment.
4. Enter a clear reason (at least 10 characters).
5. Submit.

After submission, the request is reviewed and its status updates (for example, pending, approved, rejected).

Refund eligibility notes:

- Only completed payments that do not already have a refund request are typically eligible.
- If no payments appear in the selection list, you may not have eligible payments yet.

### 5.9 Profile and Identity Verification (`/app/profile`)

Profile is used to:

- Update your account details
- Manage identity verification (KYC), when required

If KYC is enabled:

1. Open `/app/profile`.
2. Select the identity verification action (for example, "Verify my identity").
3. Upload the requested document(s).
4. Track the verification status (pending, verified, rejected).

---

## 6. Messaging (Chat)

Messaging exists in multiple portals:

- User: `/app/messages`
- Agent: `/agent/messages`
- Admin: `/admin/messages`

### 6.1 Start a Conversation From a Listing

1. Open a listing (`/listing/:id` or from inside `/app/*`).
2. Select "Message agent".
3. The conversation appears in Messages.

### 6.2 Tips for Effective Messaging

- Include the key details: location, budget, preferred move-in date.
- Use one thread per property to keep context clear.
- If you need support, use the support conversation when available.

---

## 7. Viewings

Viewings connect users and agents to coordinate property visits.

Viewing status reference:

- requested: the user submitted a request
- confirmed: the agent confirmed the viewing
- declined: the agent declined the request
- completed: the viewing took place successfully
- canceled: the viewing was canceled
- no_show: one party did not show up

Operational rules (may vary by deployment):

- Viewing requests may require a minimum lead time (commonly 24 hours from now).
- Agents may have a daily limit of confirmed viewings (commonly 8 per day).

### 7.1 User: Request a Viewing

1. Open a listing.
2. Select "Request viewing".
3. Provide the requested information.
4. Track the request under `/app/viewings`.

### 7.2 Agent: Manage Viewings

1. Open `/agent/viewings`.
2. Review incoming requests.
3. Confirm, reschedule, or decline as needed.
4. Use messages to coordinate details.

---

## 8. Pay Portal (`/pay/*`)

The Pay portal is the dedicated place for payment actions and receipts.

### 8.1 Key Pages

- Login: `/pay/login`
- Dashboard: `/pay/dashboard`
- Make payment: `/pay/payments`
- Transaction ledger: `/pay/transactions`
- Receipt detail: `/pay/receipts/:id`
- Pay profile: `/pay/profile`
- Admin reconcile (restricted): `/pay/admin/reconcile`

### 8.2 Dashboard (`/pay/dashboard`)

The dashboard typically shows:

- Total outstanding balance
- A "Pay Now" action
- A "View History" action
- Recent transactions

### 8.3 Make a Payment (`/pay/payments`)

1. Open `/pay/payments`.
2. Enter amount and choose a payment method (for example, M-Pesa STK, card, bank transfer).
3. Submit and follow the on-screen steps.
4. Track status under `/pay/transactions`.

### 8.4 Transactions (`/pay/transactions`)

The transaction ledger includes:

- Status (for example, pending, paid, failed, reversed)
- Amount and currency
- Reference information (when available)

### 8.5 Receipts (`/pay/receipts/:id`)

Receipts are available after a payment is confirmed as paid.

If you cannot find a receipt:

- Confirm the transaction status is "paid".
- Open the transaction and follow the receipt link.

### 8.6 Admin/Finance Reconciliation (`/pay/admin/reconcile`)

Admin and finance users can:

- Review pending/failed transactions
- Resolve or refund transactions (depending on role and configuration)

Some actions may require "step-up verification" (a short code).

---

## 9. Agent Portal (`/agent/*`)

### 9.1 Access

- Agents can log in using `/agentlogin`.
- Some agent accounts may require verification approval by an admin before full access.

### 9.2 Main Pages

- Dashboard: `/agent/dashboard`
- Listings: `/agent/listings`
- Create listing: `/agent/listings/new`
- Edit listing: `/agent/listings/:listingId/edit`
- Boost: `/agent/boost`
- Leads: `/agent/leads`
- Analytics: `/agent/analytics`
- Verification: `/agent/verification`
- Viewings: `/agent/viewings`
- Messages: `/agent/messages`
- Settings: `/agent/settings`

### 9.3 Verification (`/agent/verification`)

Agents submit verification evidence (and business documents if required).
Admins review these in the admin verification queue.

Agent verification status reference:

- unverified: verification not submitted or not started
- pending: submitted and awaiting admin review
- verified: approved by admin
- rejected: rejected by admin (resubmission may be required)

If your deployment requires professional verification, you may be asked to provide an EARB number for manual verification.

### 9.4 Listings (`/agent/listings`)

Common actions:

1. Open `/agent/listings`.
2. Select "New" to create a listing.
3. Fill in listing details and upload images.
4. Submit for review if required by your organization.

After approval, listings become visible to users in Explore/Inventory.

Listing status reference:

- draft: not submitted / not visible to users
- pending_review: awaiting admin approval
- live: visible to users
- rejected: rejected during review (fix and resubmit)
- archived: removed from active browsing

Listing availability reference:

- available
- under_offer
- sold
- let

Listing media limits (typical defaults):

- Maximum images per listing: 15
- Maximum image size: 10 MB per image
- Videos: not supported

### 9.5 Boost (`/agent/boost`)

Boost lets an agent request promotion for a listing.

1. Open `/agent/boost`.
2. Select a listing to promote.
3. Submit the request.

The app confirms with a message such as "Campaign requested" and the team can follow up.

### 9.6 Leads (`/agent/leads`)

Leads help agents track the status of client interest.

Lead stage reference:

- new
- contacted
- viewing
- offer
- closed

---

## 10. Admin Portal (`/admin/*`)

Admins manage verification, moderation, and platform safety.

### 10.1 Access

Admins can log in using `/adminlogin`.

Depending on deployment, admin access may be restricted using:

- Allowed email domains
- IP allowlists
- Secure network policies (for example, a tailnet)

### 10.2 Main Pages

- Verification queue: `/admin/verification`
- Admin overview: `/admin/overview`
- Listings: `/admin/listings`
- Users: `/admin/users`
- Reports: `/admin/reports`
- Messages: `/admin/messages`
- Audit log: `/admin/audit`
- Network access: `/admin/network-access`
- Refund requests: `/admin/refund-requests`
- Settings: `/admin/settings`

### 10.3 Verification Queue (`/admin/verification`)

The verification queue can include:

- Agent verification requests
- New listing approvals
- KYC (user identity verification)
- Business verification (agent/company documents)

Common actions:

1. Open `/admin/verification`.
2. Expand a request to review evidence.
3. Select "Approve" or "Reject".

Some actions may require step-up verification.

---

### 10.4 Reports (`/admin/reports`)

Reports help admins track and resolve issues raised by users.

Common report category reference:

- scam
- abuse
- duplicates
- spam
- other

Common severity reference:

- low
- medium
- high

### 10.5 Audit Log (`/admin/audit`)

Audit logs record sensitive actions (for example, approvals, role changes, and reconciliation actions) to support traceability and compliance.

### 10.6 Network Access (`/admin/network-access`)

Network access controls may restrict admin access by:

- allowed IP addresses (allowlist)
- secure network policies (for example, a tailnet)

If you cannot access admin pages, confirm your network policy with your deployment owner.

### 10.7 Refund Requests (`/admin/refund-requests`)

Refund requests appear here for review and resolution when refunds are enabled.

## 11. Security and Privacy

### 11.1 Password Safety

- Use a strong password and do not reuse passwords from other sites.
- Log out on shared devices.
- Reset your password if you suspect unauthorized access.

### 11.2 Step-Up Verification (Admin/Finance)

Some sensitive actions can require an additional short code ("step-up").

If you are prompted for step-up:

- Enter the code provided by your organization.
- If you do not have the code, contact your admin/finance lead.

### 11.3 Identity Verification (KYC)

If KYC is enabled:

- Upload clear documents.
- Wait for admin review.
- Check your Profile for status updates.

---

## 12. Frequently Asked Questions (FAQ)

Q: Why am I redirected away from `/agent/*` or `/admin/*`?

- Your account does not have the required role, or your role is pending verification.

Q: Why are listings not loading?

- Check your internet connection, refresh the page, and try again.

Q: Why is my payment still pending?

- Check `/pay/transactions` for status updates. If it remains pending, contact support with the reference and time.

Q: How do I reset my password?

- Use `/forgot` and follow the reset steps.

Q: Why do I only see verified listings in Explore?

- The "Verified only" filter may be enabled by default. Turn it off to include unverified listings.

Q: Why can't I request a viewing for tomorrow?

- Some deployments enforce a minimum lead time (commonly 24 hours from now) before a viewing can be requested.

Q: Why is my listing not visible to users?

- Check the listing status. Draft and pending_review listings are not visible to users until approved and live.

---

## 13. System Messages and Meanings

These are common user-facing messages and what they mean.

- "You're offline. Some actions may be unavailable. We'll retry when you're back online."
  - Meaning: Your device has no internet connection.
  - Action: Restore connectivity and try again.

- "Refund requested"
  - Meaning: Your refund request was submitted successfully.
  - Action: Wait for review; check `/app/refunds` for status.

- "Invalid request" (refunds)
  - Meaning: Missing payment selection or the reason is too short.
  - Action: Select an eligible payment and enter a reason of at least 10 characters.

- "Campaign requested" (boost)
  - Meaning: A request to promote a listing was submitted.
  - Action: Wait for follow-up from the team.

- "Select a listing" (boost)
  - Meaning: You attempted to submit without choosing a listing.
  - Action: Select one listing and try again.

- "Payment confirmed"
  - Meaning: A payment status was updated to paid.
  - Action: View receipt in `/pay/transactions` or `/pay/receipts/:id`.

---

## 14. Troubleshooting

### 14.1 I Cannot Log In

- Use the correct login page: `/login`, `/agentlogin`, `/adminlogin`, or `/pay/login`.
- Confirm email and password.
- Use `/forgot` to reset your password.

### 14.2 I Cannot Access Agent/Admin Pages

- Confirm your account role (user vs agent vs admin).
- If your account is pending verification, wait for admin approval.

### 14.3 The App Loads Slowly

- Confirm your internet connection is stable.
- Close other heavy browser tabs and try again.
- If you are on mobile data, switch to a stronger connection.

### 14.4 Receipts Not Found

- Confirm the transaction status is "paid".
- If still missing, contact support with transaction details.

### 14.5 I Cannot Request a Viewing

- Some deployments enforce a minimum lead time (commonly 24 hours). Try a later date/time.
- If the agent has reached a daily limit, choose another slot or try again later.

### 14.6 Listing Photos Will Not Upload (Agents)

- Confirm each image is under 10 MB.
- Confirm the listing has 15 images or fewer.
- Try a different image format (for example, JPG/PNG) and try again.

---

## 15. Glossary and Support

### 15.1 Glossary

- Listing: A property advertisement posted by an agent.
- Lead: A potential customer interaction related to a listing.
- KYC: "Know Your Customer" identity verification.
- Step-up verification: Extra verification code for sensitive actions.
- Receipt: Proof of payment issued after a transaction is paid.

### 15.2 Support

Add your support details here:

- Support email:
- Support phone:
- Support hours:

---

## 16. Index

- Admin portal: Section 10
- Agent portal: Section 9
- Audit log: Section 10.5
- Boost: Section 9.5
- Explore (filters, map search): Section 5.3
- FAQ: Section 12
- KYC (identity verification): Section 5.9 and Section 11.3
- Lead stages: Section 9.6
- Listing status and availability: Section 9.4
- Offline banner: Section 3.5 and Section 13
- Pay portal: Section 8
- Receipts: Section 8.5
- Refunds: Section 5.8 and Section 13
- Saved listings/searches: Section 5.5
- Step-up verification: Section 11.2
- Viewings: Section 7
- Verification queue: Section 10.3
