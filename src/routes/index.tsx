import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { RequireAuth } from '../components/guards/RequireAuth';
import { RequireRole } from '../components/guards/RequireRole';
import {
  RouteErrorBoundary,
  MessagesErrorBoundary,
  PayErrorBoundary,
} from '../components/ErrorBoundary';
import { ZeniLoading } from '../components/ZeniLoading';

// ---------- Eager imports for critical hot-path routes ----------
// These are loaded in the main bundle so they render instantly (no Suspense wait).
// UserLayout + HomePage = the most common post-login path.
// LoginPage = the entry point for unauthenticated users.
import { UserLayout } from '../layouts/UserLayout';
import { HomePage } from '../pages/user/Home';
import { LoginPage } from '../pages/auth/Login';

// ---------- Lazy imports for everything else ----------
// Code-split the landing page — GSAP, Lenis, and ScrollTrigger are heavy
const ZeniLanding = lazy(() =>
  import('../pages/ZeniLanding').then((m) => ({ default: m.ZeniLanding }))
);
const PublicMapPage = lazy(() =>
  import('../pages/PublicMap').then((m) => ({ default: m.PublicMapPage }))
);
const PublicExplorePage = lazy(() =>
  import('../pages/PropertyListingsPage').then((m) => ({ default: m.PropertyListingsPage }))
);

const AgentLayout = lazy(() =>
  import('../layouts/AgentLayout').then((m) => ({ default: m.AgentLayout }))
);
const AdminLayout = lazy(() =>
  import('../layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);

const RegisterPage = lazy(() =>
  import('../pages/auth/Register').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPassword').then((m) => ({ default: m.ResetPasswordPage }))
);

const ExplorePage = lazy(() =>
  import('../pages/user/Explore').then((m) => ({ default: m.ExplorePage }))
);
const InventoryPage = lazy(() =>
  import('../pages/user/Inventory').then((m) => ({ default: m.InventoryPage }))
);
const SavedPage = lazy(() => import('../pages/user/Saved').then((m) => ({ default: m.SavedPage })));
const MessagesLayout = lazy(() =>
  import('../pages/messages/Layout').then((m) => ({ default: m.MessagesLayout }))
);
const InboxPage = lazy(() =>
  import('../pages/messages/Inbox').then((m) => ({ default: m.InboxPage }))
);
const ThreadPage = lazy(() =>
  import('../pages/messages/Thread').then((m) => ({ default: m.ThreadPage }))
);
const ProfilePage = lazy(() =>
  import('../pages/user/Profile').then((m) => ({ default: m.ProfilePage }))
);
const ViewingsPage = lazy(() =>
  import('../pages/user/Viewings').then((m) => ({ default: m.ViewingsPage }))
);
const RefundsPage = lazy(() =>
  import('../pages/user/Refunds').then((m) => ({ default: m.RefundsPage }))
);
const PropertyDetailsPage = lazy(() =>
  import('../pages/PropertyDetails').then((m) => ({ default: m.PropertyDetailsPage }))
);

const DashboardPage = lazy(() =>
  import('../pages/agent/Dashboard').then((m) => ({ default: m.DashboardPage }))
);
const AgentListingsPage = lazy(() =>
  import('../pages/agent/Listings').then((m) => ({ default: m.ListingsPage }))
);
const LeadsPage = lazy(() =>
  import('../pages/agent/Leads').then((m) => ({ default: m.LeadsPage }))
);
const AnalyticsPage = lazy(() =>
  import('../pages/agent/Analytics').then((m) => ({ default: m.AnalyticsPage }))
);
const ListingEditorPage = lazy(() =>
  import('../pages/agent/ListingEditor').then((m) => ({ default: m.ListingEditorPage }))
);
const AgentViewingsPage = lazy(() =>
  import('../pages/agent/Viewings').then((m) => ({ default: m.AgentViewingsPage }))
);
const AgentVerificationPage = lazy(() =>
  import('../pages/agent/Verification').then((m) => ({ default: m.AgentVerificationPage }))
);
const BoostPage = lazy(() =>
  import('../pages/agent/BoostPage').then((m) => ({ default: m.BoostPage }))
);
const AgentSettingsPage = lazy(() =>
  import('../pages/agent/Settings').then((m) => ({ default: m.AgentSettingsPage }))
);

const OverviewPage = lazy(() =>
  import('../pages/admin/Overview').then((m) => ({ default: m.OverviewPage }))
);
const AdminVerificationPage = lazy(() =>
  import('../pages/admin/AdminVerificationPage').then((m) => ({ default: m.AdminVerificationPage }))
);
const ReportsPage = lazy(() =>
  import('../pages/admin/Reports').then((m) => ({ default: m.ReportsPage }))
);
const UsersPage = lazy(() =>
  import('../pages/admin/Users').then((m) => ({ default: m.UsersPage }))
);
const AdminListingsPage = lazy(() =>
  import('../pages/admin/Listings').then((m) => ({ default: m.ListingsPage }))
);
const SettingsPage = lazy(() =>
  import('../pages/admin/Settings').then((m) => ({ default: m.SettingsPage }))
);
const AuditPage = lazy(() =>
  import('../pages/admin/Audit').then((m) => ({ default: m.AuditPage }))
);
const NetworkAccessPage = lazy(() =>
  import('../pages/admin/NetworkAccess').then((m) => ({ default: m.NetworkAccessPage }))
);
const AdminRefundRequestsPage = lazy(() =>
  import('../pages/admin/RefundRequests').then((m) => ({ default: m.RefundRequestsPage }))
);

const PayRouter = lazy(() => import('../pay/PayRouter').then((m) => ({ default: m.PayRouter })));
const NotFoundPage = lazy(() =>
  import('../pages/NotFound').then((m) => ({ default: m.NotFoundPage }))
);
const NeighborhoodPage = lazy(() =>
  import('../pages/NeighborhoodPage').then((m) => ({ default: m.default }))
);

function LegacyAppListingRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/listing/${id}` : '/app/explore'} replace />;
}

export function RoutesIndex() {
  return (
    <Suspense fallback={<ZeniLoading />}>
      <Routes>
        <Route path="/" element={<ZeniLanding />} />
        <Route path="/map" element={<PublicMapPage />} />
        <Route path="/explore" element={<PublicExplorePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/:role" element={<LoginPage />} />
        <Route path="/agentlogin" element={<LoginPage forcedRole="agent" locked />} />
        <Route path="/adminlogin" element={<LoginPage forcedRole="admin" locked />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/listing/:id" element={<PropertyDetailsPage />} />
        <Route path="/rent/:neighborhood" element={<NeighborhoodPage />} />
        <Route path="/buy/:neighborhood" element={<NeighborhoodPage />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />

        <Route
          path="/app"
          element={
            <RouteErrorBoundary routeName="User portal">
              <UserLayout />
            </RouteErrorBoundary>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route
            path="home"
            element={
              <RequireAuth>
                <RequireRole roles={['user']} redirectToRole>
                  <HomePage />
                </RequireRole>
              </RequireAuth>
            }
          />
          {/* Public Routes (Discovery) */}
          <Route path="explore" element={<ExplorePage />} />
          <Route path="listing/:id" element={<LegacyAppListingRedirect />} />
          {/* Redirect old /app/listing to root /listing */}
          {/* Private Post-Login Routes */}
          <Route
            element={
              <RequireAuth>
                <RequireRole roles={['user']} redirectToRole>
                  <Outlet />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="viewings" element={<ViewingsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route
              path="messages"
              element={
                <MessagesErrorBoundary>
                  <MessagesLayout />
                </MessagesErrorBoundary>
              }
            >
              <Route index element={<InboxPage />} />
              <Route path=":conversationId" element={<ThreadPage />} />
            </Route>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="home" replace />} />
        </Route>

        <Route
          path="/agent"
          element={
            <RouteErrorBoundary routeName="Agent portal">
              <RequireAuth>
                <RequireRole roles={['agent']} redirectToRole>
                  <AgentLayout />
                </RequireRole>
              </RequireAuth>
            </RouteErrorBoundary>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="listings" element={<AgentListingsPage />} />
          <Route path="boost" element={<BoostPage />} />
          <Route path="listings/new" element={<ListingEditorPage />} />
          <Route path="listings/:listingId/edit" element={<ListingEditorPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="verification" element={<AgentVerificationPage />} />
          <Route path="settings" element={<AgentSettingsPage />} />
          <Route path="viewings" element={<AgentViewingsPage />} />
          <Route
            path="messages"
            element={
              <MessagesErrorBoundary>
                <MessagesLayout />
              </MessagesErrorBoundary>
            }
          >
            <Route index element={<InboxPage />} />
            <Route path=":conversationId" element={<ThreadPage />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RouteErrorBoundary routeName="Admin portal">
              <RequireAuth>
                <RequireRole roles={['admin']} redirectToRole>
                  <AdminLayout />
                </RequireRole>
              </RequireAuth>
            </RouteErrorBoundary>
          }
        >
          <Route index element={<Navigate to="verification" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="verification" element={<AdminVerificationPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="listings" element={<AdminListingsPage />} />
          <Route
            path="messages"
            element={
              <MessagesErrorBoundary>
                <MessagesLayout />
              </MessagesErrorBoundary>
            }
          >
            <Route index element={<InboxPage />} />
            <Route path=":conversationId" element={<ThreadPage />} />
          </Route>
          <Route path="audit" element={<AuditPage />} />
          <Route path="network-access" element={<NetworkAccessPage />} />
          <Route path="refund-requests" element={<AdminRefundRequestsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="verification" replace />} />
        </Route>

        <Route
          path="/pay/*"
          element={
            <RouteErrorBoundary routeName="Pay portal">
              <PayErrorBoundary>
                <Suspense
                  fallback={<div className="p-6 text-sm text-neutral-500">Loading pay...</div>}
                >
                  <PayRouter />
                </Suspense>
              </PayErrorBoundary>
            </RouteErrorBoundary>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
