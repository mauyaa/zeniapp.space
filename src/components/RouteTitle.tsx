import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TITLES: Record<string, string> = {
  '/': 'Where Kenya Lives',
  '/login': 'Log in',
  '/register': 'Create account',
  '/forgot': 'Forgot password',
  '/app/home': 'Home',
  '/app/explore': 'Explore',
  '/app/inventory': 'Inventory',
  '/app/saved': 'Saved',
  '/app/viewings': 'Viewings',
  '/app/profile': 'Profile',
  '/app/messages': 'Messages',
  '/agent/dashboard': 'Agent dashboard',
  '/agent/listings': 'Listings',
  '/agent/leads': 'Leads',
  '/agent/verification': 'Verification',
  '/admin/verification': 'Admin verification',
  '/admin/overview': 'Admin overview',
  '/admin/network-access': 'Admin network access',
  '/pay/dashboard': 'Pay dashboard',
  '/pay/payments': 'Make payment',
  '/pay/transactions': 'Transaction ledger',
  '/pay/profile': 'Pay profile',
};

export function RouteTitle() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || (pathname.startsWith('/listing/') ? 'Listing' : pathname.startsWith('/pay/') ? 'Pay' : '');
  useDocumentTitle(title || 'Zeni', { skipSuffix: !title });
  return null;
}
