# Legacy KYC and Verification URL Exposure Audit

Date: 2026-06-03 (Africa/Nairobi)
Classification: P0 privacy and identity-document release gate
Status: **UNRESOLVED - production access and provider revocation evidence required**

## Executive Finding

The release candidate closes the application path for new public KYC, agent identity, and business
verification evidence. It does not prove that legacy evidence URLs already stored in production
have been migrated or revoked. No production database credentials, runtime upload inventory, or
Cloudinary/provider administrative access were available in this workspace, so the affected record
count and public asset revocation status are unknown.

Production remains **NO-GO** for identity-sensitive use until every legacy URL is inventoried,
privately preserved or deleted according to policy, and independently verified as no longer
publicly accessible.

## Code-Level Boundary Completed

- New verification submissions require a private `documentId`; URL evidence is not accepted.
- Generic image uploads reject declared verification purposes and verification document types.
- Private documents enforce purpose/type allowlists, content-signature MIME verification, a 5 MB
  limit, filename sanitization, a malware-scanning adapter boundary, and AES-256-GCM encrypted
  storage.
- Owners receive safe status metadata only and cannot retrieve raw document content.
- Stepped-up administrators stream review content through an authenticated endpoint; every allowed
  or denied review access is logged.
- Linked legacy local `/uploads/` evidence is denied whether the stored URL is relative or fully
  qualified.
- Retention expiry execution removes encrypted payload material unless an approved legal hold or
  policy exception applies.

## Production Inventory Required

Run the inventory from an access-controlled operations environment. Do not place raw URLs,
document content, provider credentials, or exported evidence in source control, CI logs, tickets,
or chat.

Inventory every user record containing a URL without a private `documentId` in:

- `verificationEvidence`
- `kycEvidence`
- `businessVerifyEvidence`

For each affected evidence record, record in a restricted audit system:

- user/object ID
- evidence purpose
- review status and retention decision
- URL provider category: local `/uploads/`, Cloudinary, or other
- provider asset identifier
- current public accessibility result
- migration document ID or deletion decision
- provider revoke/delete result
- independent retest result
- operator, reviewer, timestamp, and release SHA

## Migration and Revocation Procedure

1. Deploy the reviewed private-document boundary to staging and certify it before collecting any
   additional verification evidence.
2. Freeze legacy URL submissions and suspend identity-sensitive production workflows if public
   confidentiality cannot be guaranteed.
3. Export the restricted legacy inventory and determine the approved retention/deletion decision
   for each record.
4. For evidence that must be retained, retrieve it through authorized operations access, validate
   content type and size, scan it, store it in the private encrypted boundary, and update the user
   evidence reference to the new `documentId`.
5. Remove the retrievable legacy URL from the user record. Do not retain a public URL in ordinary
   application responses or logs.
6. Delete local runtime assets after approved preservation. Revoke or delete Cloudinary/provider
   assets using provider administrative credentials.
7. Record the migration, deletion, and provider revocation results in the restricted audit system.
8. Independently retest every former public URL. Public access must fail.
9. Sample migrated document IDs: owner raw retrieval must fail, stepped-up administrator retrieval
   must succeed only for reviewable status, and an access log must be created.

## Required Sign-Off Evidence

| Gate                      | Required evidence                                     | Status         |
| ------------------------- | ----------------------------------------------------- | -------------- |
| Affected record inventory | Restricted count by evidence purpose and provider     | Not available  |
| Private migration         | Every retained record linked to a private document ID | Not executed   |
| Local asset removal       | Runtime assets deleted after approved preservation    | Not executed   |
| Provider revocation       | Cloudinary/other public assets revoked or deleted     | Not executed   |
| Independent URL retest    | Former public URLs return no document content         | Not executed   |
| Privacy review            | Retention/deletion and exposure scope approved        | Not signed off |

If any public verification asset remains accessible or any inventory item lacks a resolved
disposition, the release decision remains **NO-GO**.
