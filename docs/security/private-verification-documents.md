# Private Verification Document Boundary

Date: 2026-06-03
Classification: identity and verification evidence, highly sensitive
Production status: local implementation pending staged certification and legacy-data migration

## Boundary

New KYC, agent identity, and business verification evidence must be uploaded through
`POST /api/verification-documents`. The generic public image upload route rejects declared
verification purposes and can no longer satisfy a verification submission, which requires a
private `documentId`.

Documents are stored as encrypted payloads in the database with AES-256-GCM and a dedicated
`VERIFICATION_DOCUMENT_ENCRYPTION_KEY`. Production startup fails if that key is absent or too
short. Allowed content is limited by purpose-specific document type allowlists, a 5 MB size limit,
sanitized names, and verified JPEG, PNG, or PDF signatures.

The current scanner adapter rejects a known test-virus signature and defines the scanning
boundary. A managed malware-scanning provider and its failure policy must be configured and
verified before broad identity-document collection is permitted.

## Access Model

| Actor              | Permitted action                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Authenticated user | Upload own verification document; list safe own status; delete own pending content according to policy.      |
| Authenticated user | Cannot retrieve the raw document or internal review metadata after upload.                                   |
| Agent              | Same access for own authorized agent/business evidence; cannot access any other user's document.             |
| Reviewer/admin     | Stream content only through the authenticated stepped-up admin endpoint; review decision is recorded.        |
| Public             | No access to private content. Legacy local sensitive upload paths are denied where linked evidence is known. |

Every permitted administrator content access writes a `VerificationDocumentAccessLog` record and
an audit event. Decisions are recorded in `VerificationDocumentReview`.

## Status and Retention

Document statuses are:

- `uploaded`
- `pending_review`
- `approved`
- `rejected`
- `expired`
- `deleted`
- `migrated_from_public_url`

`VerificationDocumentRetentionPolicy` provides purpose-specific retention days and legal-hold
state. The deletion/expiration path removes encrypted payload material and marks status. The
server schedules daily retention expiry when crons are enabled. Retention approval and staged
evidence of deletion execution remain required before promotion.

## Migration of Existing Exposed URL Evidence

Existing `kycEvidence`, `verificationEvidence`, or `businessVerifyEvidence` URL records may
reference publicly available local uploads or Cloudinary assets. The new endpoint does not
automatically revoke those assets. This is a P0 migration gate:

1. Freeze new legacy URL submissions by deploying the reviewed private-boundary release.
2. Export an access-controlled inventory of every legacy evidence URL, owner, purpose, status,
   provider asset identifier, and exposure validation result. Do not place the export in source
   control or ordinary logs.
3. For local `/uploads/` legacy evidence, confirm application denial for both relative and fully
   qualified stored URLs, then remove the runtime asset from public serving infrastructure after
   preservation under approved private storage.
4. For Cloudinary/provider URLs, use provider administrative credentials to revoke public delivery
   or delete the public asset after privately storing any evidence that must be retained.
5. Create encrypted `VerificationDocument` records for retained evidence with migration provenance
   and `migrated_from_public_url` status, then update user evidence references to `documentId`
   without retaining retrievable public URLs.
6. Record migration and revocation actions in an access-controlled audit log. Apply retention or
   deletion decisions for unnecessary evidence.
7. Independently retest every prior public URL and a sample of new document IDs: public access
   must fail, owner raw retrieval must fail, and administrator retrieval must create an audit log.

No GO decision is permitted while publicly accessible verification evidence remains unrevoked or
the migration evidence is incomplete.
