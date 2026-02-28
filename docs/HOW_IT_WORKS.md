# How it works

## For agents

1. **Sign up / log in**  
   Use the main site to register or log in. Request agent access if your account is buyer-only. Log in at `/agentlogin` only with an account that has the **agent** role.

2. **Verification**  
   Admins verify your identity and documents. Until verified, listings may be hidden or marked "Unverified". Check **Agent → Verification** for status and upload evidence if requested. You can also submit **Business verification** (company/entity documents); these appear in the admin Moderation Queue as "Business Verify".

3. **Listings**  
   - **Create**: Agent → Listings → New. Add title, price, location, features, and images.  
   - **Edit**: Listings → open a listing → Edit.  
   - **Submit**: Submit for review if your org uses listing approval. Once approved (or if approval is skipped), listings appear in Explore for users.

4. **Leads & messages**  
   - **Leads**: Agent → Leads shows leads from listing views and contact requests.  
   - **Messages**: Agent → Messages is your inbox. Conversations are tied to a listing or to support. Reply and manage stages (new, contacted, viewing, closed).

5. **Viewings**  
   Agent → Viewings lists viewing requests. Confirm or decline and coordinate with the user.

6. **Pay (if enabled)**  
   If your org uses the Pay portal, use **Pay** for rent, fees, or other payments. Step-up verification may be required for sensitive actions.

---

## For admins

1. **Access**  
   Log in at `/adminlogin` with an account that has the **admin** role. Buyer/tenant and agent accounts cannot access the admin portal.

2. **Moderation Queue** (Admin → Verification)  
   Single table with four request types: **Agent Verify** (evidence + EARB), **New Listing**, **KYC Verify** (user identity docs from Profile), **Business Verify** (agent company docs). Expand a row for details; Approve or Reject. Step-up may be required.

3. **Reports & users**  
   - **Reports**: View moderation and safety reports.  
   - **Users**: List users, roles, and status; suspend or adjust access as needed.

4. **Listings**  
   Admin → Listings: view and moderate all listings.

5. **Audit & settings**  
   - **Audit**: Log of sensitive actions.  
   - **Settings**: Step-up codes, MFA, and other security options.

6. **Pay (finance role)**  
   Finance/admin users can access Pay admin (reconcile, etc.) with step-up verification where configured.

---

## For buyers / tenants (users)

1. **Explore**  
   Search and filter listings (rent/buy, price, beds, location). Use the map or list view. Open a listing to see details, agent, and actions.

2. **Contact**  
   "Message agent" or "Request viewing" from a listing. Conversations appear in **App → Messages**.

3. **Saved & viewings**  
   - **Saved**: Save listings and manage saved searches.  
   - **Viewings**: Track viewing requests and confirmations.

4. **Pay**  
   If you pay rent or fees through Zeni, use the **Pay** portal: dashboard, make payment, ledger, and profile.

5. **Profile**  
   Update name and preferences; manage security and sessions. **Verify my identity (KYC)**: upload an ID document for admin verification; status appears in Profile and admins resolve in the Moderation Queue.

---

## Correct login flow

- **Explore / app links**: If you're not logged in, you're redirected to **Login**. After signing in, you're sent back to the page you wanted (e.g. Explore map).  
- **Agent portal**: Only agent accounts can use `/agentlogin` and agent routes.  
- **Admin portal**: Only admin accounts can use `/adminlogin` and admin routes.  
- Wrong-role users see a clear message and should use the main **Login** for their role.
