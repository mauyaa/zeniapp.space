import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NeighborhoodPage } from '../NeighborhoodPage';
import { PropertyDetailsPage } from '../PropertyDetails';
import { PropertyListingsPage } from '../PropertyListingsPage';

const push = vi.fn();
const fetchListing = vi.fn();
const searchListings = vi.fn();
const addViewed = vi.fn();

vi.mock('../../lib/api', () => ({
  api: {},
  fetchListing: (...args: unknown[]) => fetchListing(...args),
  toggleSaveListing: vi.fn(),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ push }),
}));

vi.mock('../../context/ChatContext', () => ({
  useChat: () => ({ startConversation: vi.fn(), setActiveConversation: vi.fn() }),
}));

vi.mock('../../context/AuthProvider', () => ({
  useAuth: () => ({ isAuthed: false, user: null }),
}));

vi.mock('../../lib/api/listings', () => ({
  searchListings: (...args: unknown[]) => searchListings(...args),
}));

vi.mock('../../lib/publicSocket', () => ({
  getPublicSocket: () => ({ on: vi.fn(), off: vi.fn() }),
  disconnectPublicSocket: vi.fn(),
}));

vi.mock('../../components/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}));

vi.mock('../../hooks/useListingSEO', () => ({
  useListingSEO: vi.fn(),
}));

vi.mock('../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addViewed }),
}));

describe('production outage behavior', () => {
  beforeEach(() => {
    push.mockReset();
    fetchListing.mockReset();
    searchListings.mockReset();
    addViewed.mockReset();
  });

  it('shows an unavailable state instead of mock inventory when listings fail', async () => {
    searchListings.mockRejectedValue(new Error('service unavailable'));
    render(
      <MemoryRouter initialEntries={['/explore']}>
        <PropertyListingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Live listings are temporarily unavailable/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/listings found \(preview\)/i)).not.toBeInTheDocument();
  });

  it('shows an unavailable state when listing detail API fails without a live preview', async () => {
    fetchListing.mockRejectedValue(new Error('service unavailable'));
    render(
      <MemoryRouter initialEntries={['/listing/live-listing-unavailable']}>
        <Routes>
          <Route path="/listing/:id" element={<PropertyDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Listing unavailable')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Live listing details are temporarily unavailable/i)
    ).toBeInTheDocument();
  });

  it('does not show mock neighborhood inventory when the API is unavailable', async () => {
    searchListings.mockRejectedValue(new Error('service unavailable'));
    render(
      <MemoryRouter initialEntries={['/rent/kilimani']}>
        <Routes>
          <Route path="/rent/:neighborhood" element={<NeighborhoodPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Live listings are temporarily unavailable/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/listings in Kilimani/i)).not.toBeInTheDocument();
  });
});
