# Local Source Change Classification

Date: 2026-06-04 (Africa/Nairobi)
Branch: `codex/local-pc-release-certification`
Preserved backup: `.release-backups/local-pc-source-20260604-115514`
Pre-clean backup: `.release-backups/clean-rc-prep-20260604-122245`

## Decision

The local PC workspace remains the source of truth, but the dirty tree contained mixed release
hardening, unsafe regressions, generated/runtime artifacts, and unrelated feature work. The clean
candidate keeps the reviewed P0 hardening checkpoint at
`357b3f8aabab54acb422c40fae1c4d2c99dcd652`, adds release hygiene for local backup/worktree
exclusion, and rejects unsafe local deviations.

## P0-Safe Release Hardening Kept

These paths are retained from the reviewed P0 checkpoint, with runtime artifact removals excluded
from source control:

- `.gitignore`
- `docs/operations/availability-slo.md`
- `docs/operations/health-contract.md`
- `docs/operations/incident-response.md`
- `docs/operations/monitoring-readiness.md`
- `docs/operations/payment-readiness.md`
- `docs/reviews/LEGACY_KYC_EXPOSURE_AUDIT.md`
- `docs/reviews/RELEASE_CANDIDATE_AUDIT.md`
- `docs/reviews/STAGING_CERTIFICATION_PLAN.md`
- `docs/security/private-verification-documents.md`
- `e2e/auth-flow.spec.ts`
- `e2e/auth-session.spec.ts`
- `e2e/full-stack-flows.spec.ts`
- `index.html`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `render.yaml`
- `server/.env.example`
- `server/package.json`
- `server/package-lock.json`
- `server/scripts/seed.ts`
- `server/src/app.ts`
- `server/src/config/db.ts`
- `server/src/config/env.ts`
- `server/src/config/securityHeaders.ts`
- `server/src/controllers/admin.controller.ts`
- `server/src/controllers/auth.controller.ts`
- `server/src/controllers/pay.controller.ts`
- `server/src/controllers/payAuth.controller.ts`
- `server/src/controllers/payPortal.controller.ts`
- `server/src/controllers/verification.controller.ts`
- `server/src/controllers/verificationDocument.controller.ts`
- `server/src/middlewares/adminStepUp.ts`
- `server/src/middlewares/requestLogger.ts`
- `server/src/models/User.ts`
- `server/src/models/VerificationDocument.ts`
- `server/src/models/VerificationDocumentAccessLog.ts`
- `server/src/models/VerificationDocumentRetentionPolicy.ts`
- `server/src/models/VerificationDocumentReview.ts`
- `server/src/routes/admin.routes.ts`
- `server/src/routes/agent.routes.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/chat.routes.ts`
- `server/src/routes/index.ts`
- `server/src/routes/upload.routes.ts`
- `server/src/routes/user.routes.ts`
- `server/src/routes/verificationDocument.routes.ts`
- `server/src/server.ts`
- `server/src/services/admin.service.ts`
- `server/src/services/auth.service.ts`
- `server/src/services/dashboard.service.ts`
- `server/src/services/paymentReadiness.service.ts`
- `server/src/services/verification.service.ts`
- `server/src/services/verificationDocument.service.ts`
- `server/src/utils/stepUpPolicy.ts`
- `server/tests/admin.test.ts`
- `server/tests/adminStepUp.test.ts`
- `server/tests/auth.test.ts`
- `server/tests/health.test.ts`
- `server/tests/moderation.test.ts`
- `server/tests/pay.test.ts`
- `server/tests/payPortal.test.ts`
- `server/tests/stepUpPolicy.test.ts`
- `server/tests/verificationDocument.test.ts`
- `src/context/AdminStepUpContext.tsx`
- `src/context/AuthProvider.tsx`
- `src/context/ChatContext.tsx`
- `src/lib/api/auth.ts`
- `src/lib/api/chat.ts`
- `src/lib/api/client.test.ts`
- `src/lib/api/client.ts`
- `src/lib/api/index.ts`
- `src/lib/api/listings.ts`
- `src/lib/api/user.ts`
- `src/lib/api/verificationDocuments.ts`
- `src/lib/api/viewings.ts`
- `src/lib/authStorage.test.ts`
- `src/lib/authStorage.ts`
- `src/lib/chat.ts`
- `src/lib/runtime.ts`
- `src/lib/securityHeaders.test.ts`
- `src/pages/__tests__/outageBehavior.test.tsx`
- `src/pages/admin/AdminVerificationPage.tsx`
- `src/pages/agent/ListingEditor.tsx`
- `src/pages/agent/Verification.tsx`
- `src/pages/messages/__tests__/contactLabels.test.ts`
- `src/pages/messages/__tests__/Thread.test.tsx`
- `src/pages/messages/Inbox.tsx`
- `src/pages/messages/messagePreview.ts`
- `src/pages/messages/Thread.tsx`
- `src/pages/NeighborhoodPage.tsx`
- `src/pages/PropertyDetails.tsx`
- `src/pages/PropertyListingsPage.tsx`
- `src/pages/PublicMap.tsx`
- `src/pages/user/Profile.tsx`
- `src/pages/ZeniLanding.tsx`
- `src/types/api.ts`
- `vercel.json`

## Unsafe Or Regressive Local Changes Rejected

These local PC changes were preserved in backup but excluded from the candidate:

- `server/src/models/VerificationDocument.ts`: local changes removed the purpose/type allowlist
  helper. The candidate keeps the allowlist.
- `server/src/services/verificationDocument.service.ts`: local changes removed allowlist
  enforcement, weakened denied review-access logging, and removed retention/legal-hold handling.
  The candidate keeps the stricter checkpoint behavior.
- `server/src/routes/upload.routes.ts`: local changes rejected verification purposes but stopped
  rejecting declared verification document types on the generic upload path. The candidate keeps
  both rejections.
- `server/src/config/env.ts`: local changes stopped treating `ADMIN_DOMAIN=*` as unsafe in
  production. The candidate keeps fail-closed privileged-domain validation.
- `server/src/app.ts`: local changes added a Paystack webhook route and narrowed legacy upload URL
  matching. The candidate rejects the Paystack expansion and keeps broader legacy URL denial.
- `server/src/controllers/paystackWebhook.controller.ts`: excluded as payment-provider expansion.
- `server/src/services/paystack.service.ts`: excluded as payment-provider expansion.
- `server/tests/paystackSignature.test.ts`: excluded with the Paystack expansion.

## Generated And Runtime Artifacts Excluded

- `playwright-report/index.html`
- `test-results/.last-run.json`
- `server/uploads/10e52c53c2166b5840239f68022fd1ee.jpg`
- `server/uploads/3aa8107859d6b451c4177f41b386ebaf.png`
- `server/uploads/93775c850810bb37475a94346003bf10.jpg`
- `server/uploads/c5b816af4d00cd94a60ba6976a9a75fa.png`
- `server/uploads/d515aa6d0b0de8e7e288d90eb32b6f87.jpg`
- `server/uploads/ef382f5a3cbcea10f93a7555c6576f3e.jpg`
- `server/uploads/f439264abccc14704f5edf586a21c850.png`
- `server/uploads/fbb204a06ffe06b9250bbf1012667945.jpg`
- `.release-backups/`
- `ZENI-RC/`
- `dist/`
- `coverage/`
- `server/coverage/`
- `*.tsbuildinfo`
- runtime logs, local database files, and ignored dependency folders

## Unrelated Or Non-Release Work Excluded

These local dirty changes were excluded from the release candidate. Tracked files that already
belonged to the checkpoint remain at their checkpoint/base version; untracked files were removed
from the working tree after backup.

- `docs/CLIPS_INTEGRATION.md`
- `docs/PAYMENTS.md`
- `scripts/check-bundle-budget.mjs`
- `server/expert-system/`
- `server/fix-listings-purpose.ts`
- `server/reset-pw.ts`
- `server/restore-data.ts`
- `server/restore-missing-users.ts`
- `server/scripts/full-restore.ts`
- `server/src/controllers/geocode.controller.ts`
- `server/src/controllers/listing.controller.ts`
- `server/src/controllers/user.controller.ts`
- `server/src/expert-system/`
- `server/src/middlewares/rateLimit.ts`
- `server/src/models/Listing.ts`
- `server/src/models/PayTransaction.ts`
- `server/src/routes/listing.routes.ts`
- `server/src/routes/pay.portal.routes.ts`
- `server/src/services/agentUpgrade.service.ts`
- `server/src/services/chat.service.ts`
- `server/src/services/listing.service.ts`
- `server/src/services/nominatimGeocode.service.ts`
- `server/src/services/payPortal.service.ts`
- `server/src/services/recommendation.service.ts`
- `server/src/services/refundRequest.service.ts`
- `server/src/socket.ts`
- `server/src/utils/constants.ts`
- `server/src/utils/listingCache.ts`
- `server/src/utils/nyaliLandSnap.ts`
- `server/src/utils/risk.ts`
- `server/tests/agentUpgrade.test.ts`
- `server/tests/chat.test.ts`
- `server/tests/expertSystem.test.ts`
- `server/tests/geocode.test.ts`
- `server/tests/listing.test.ts`
- `server/tests/listingGeo.test.ts`
- `server/tests/nyaliLandSnap.test.ts`
- `server/tests/refundRequest.test.ts`
- `src/components/admin/AdminStepUpModal.tsx`
- `src/components/chat/ConversationItem.tsx`
- `src/components/landing/AgentSection.tsx`
- `src/components/landing/SafetySection.tsx`
- `src/components/landing/StepsSlider.tsx`
- `src/components/LazyPropertyMap.tsx`
- `src/components/listings/ListingDrawer.tsx`
- `src/components/listings/ReportListingModal.tsx`
- `src/components/NotificationDrawer.tsx`
- `src/components/PropertyCard.tsx`
- `src/components/PropertyMap.tsx`
- `src/components/RouteTitle.tsx`
- `src/components/ui/BottomNav.tsx`
- `src/components/ui/PageLoader.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/ZeniWordmark.tsx`
- `src/components/ZeniLoading.tsx`
- `src/constants/verification.ts`
- `src/context/ToastContext.tsx`
- `src/hooks/useHomeData.ts`
- `src/layouts/AdminLayout.tsx`
- `src/layouts/AgentLayout.tsx`
- `src/layouts/PaymentLayout.tsx`
- `src/layouts/UserLayout.tsx`
- `src/lib/api/admin.ts`
- `src/lib/prefetch.ts`
- `src/lib/savedListingsCache.ts`
- `src/lib/schemas.ts`
- `src/pages/admin/Listings.tsx`
- `src/pages/admin/Overview.tsx`
- `src/pages/admin/RefundRequests.tsx`
- `src/pages/admin/Reports.tsx`
- `src/pages/admin/Settings.tsx`
- `src/pages/admin/Users.tsx`
- `src/pages/agent/BoostPage.tsx`
- `src/pages/agent/Dashboard.tsx`
- `src/pages/agent/Listings.tsx`
- `src/pages/auth/AuthPage.tsx`
- `src/pages/auth/Login.tsx`
- `src/pages/constants.ts`
- `src/pages/messages/contactLabels.ts`
- `src/pages/messages/Layout.tsx`
- `src/pages/pay/Checkout.tsx`
- `src/pages/user/Explore.tsx`
- `src/pages/user/Home.tsx`
- `src/pages/user/home/WidgetCards.tsx`
- `src/pages/user/Inventory.tsx`
- `src/pages/user/Refunds.tsx`
- `src/pages/user/Saved.tsx`
- `src/pay/components/PayPortalLoading.tsx`
- `src/pay/components/PaySidebar.tsx`
- `src/pay/components/PayTopbar.tsx`
- `src/pay/components/TransactionsTable.tsx`
- `src/pay/layout/PayAppLayout.tsx`
- `src/pay/pages/PayAdminReconcile.tsx`
- `src/pay/pages/PayDashboard.tsx`
- `src/pay/pages/PayLogin.tsx`
- `src/pay/pages/PayPayments.tsx`
- `src/pay/pages/PayProfile.tsx`
- `src/pay/pages/PayTransactions.tsx`
- `src/pay/payApi.ts`
- `src/pay/PayRouter.tsx`
- `src/routes/index.tsx`
- `src/styles/theme.css`
- `src/utils/geo.ts`
- `src/utils/kenyaLocationHints.ts`
- `src/utils/listingCoordinates.ts`
- `src/utils/nyaliLandSnap.ts`
- `src/utils/outageInventory.ts`
- `test-all-accounts.mjs`
- `test-api.mjs`
- `test-integration.mjs`
