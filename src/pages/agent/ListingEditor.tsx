import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import {
  createAgentListing,
  updateAgentListing,
  submitAgentListing,
  fetchAgentListing
} from '../../lib/api';
import type { AgentListing } from '../../lib/api';
import { errors } from '../../constants/messages';
import { LISTING_TYPES } from '../../constants/listings';

export function ListingEditorPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const isEdit = Boolean(listingId);
  const navigate = useNavigate();
  const { success, error, push } = useToast();

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

  const [loading, setLoading] = useState(Boolean(listingId));
  const [saving, setSaving] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    currency: 'KES',
    purpose: 'rent',
    beds: '',
    baths: '',
    sqm: '',
    type: '',
    amenities: '',
    address: '',
    city: '',
    area: '',
    lat: '',
    lng: '',
    imageUrl: ''
  });

  const hydrateForm = useCallback((data: AgentListing & { description?: string; location?: { address?: string; area?: string; coordinates?: number[] }; images?: { url?: string }[]; amenities?: string[] }) => {
    setForm({
      title: data.title || '',
      category: (data as Record<string, unknown>).category as string || '',
      description: (data as Record<string, unknown>).description as string || '',
      price: data.price?.toString?.() || '',
      currency: data.currency || 'KES',
      purpose: data.purpose || 'rent',
      beds: (data as Record<string, unknown>).beds?.toString?.() || '',
      baths: (data as Record<string, unknown>).baths?.toString?.() || '',
      sqm: (data as Record<string, unknown>).sqm?.toString?.() || '',
      type: data.type || '',
      amenities: Array.isArray((data as Record<string, unknown>).amenities) ? ((data as Record<string, unknown>).amenities as string[]).join(', ') : '',
      address: data.location?.address || (data.location as { address?: string })?.address || '',
      city: (data.location as { city?: string })?.city || '',
      area: (data.location as { area?: string })?.area || '',
      lat: (data.location as { coordinates?: number[] })?.coordinates?.[1]?.toString?.() || '',
      lng: (data.location as { coordinates?: number[] })?.coordinates?.[0]?.toString?.() || '',
      imageUrl: ((data as Record<string, unknown>).images as { url?: string }[])?.[0]?.url || ''
    });
  }, []);

  useEffect(() => {
    if (!listingId) return;
    setLoading(true);
    fetchAgentListing(listingId)
      .then(hydrateForm)
      .catch(() => {
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      })
      .finally(() => setLoading(false));
  }, [listingId, hydrateForm, push]);

  useEffect(() => {
    if (isEdit) return;
    const draft = localStorage.getItem('agent_listing_draft');
    if (draft) {
      try {
        setForm(JSON.parse(draft));
        setHasLocalDraft(true);
      } catch {
        setHasLocalDraft(false);
      }
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    localStorage.setItem('agent_listing_draft', JSON.stringify(form));
  }, [form, isEdit]);

  const payload = useMemo(() => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const beds = form.beds ? Number(form.beds) : undefined;
    const baths = form.baths ? Number(form.baths) : undefined;
    const sqm = form.sqm ? Number(form.sqm) : undefined;
    const amenities = form.amenities
      ? form.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : undefined;

    return {
      title: form.title.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      price: Number(form.price),
      currency: form.currency || 'KES',
      purpose: form.purpose as 'rent' | 'buy',
      beds,
      baths,
      sqm,
      type: form.type.trim() || undefined,
      amenities,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        area: form.area.trim() || undefined
      },
      images: form.imageUrl ? [{ url: form.imageUrl.trim(), isPrimary: true }] : []
    };
  }, [form]);

  const completeness = useMemo(() => {
    const required = ['title', 'price', 'lat', 'lng', 'imageUrl'];
    const optional = ['category', 'description', 'beds', 'baths', 'sqm', 'type', 'amenities', 'address', 'city', 'area'];
    const hasValue = (value: string) => Boolean(value && String(value).trim().length);
    const f = form as Record<string, string>;
    const total = required.length + optional.length;
    const filled =
      required.filter((key) => hasValue(f[key])).length +
      optional.filter((key) => hasValue(f[key])).length;
    return Math.round((filled / total) * 100);
  }, [form]);

  const validate = () => {
    let message: string | null = null;
    if (!form.title.trim()) message = 'Title is required';
    else if (!form.price || Number.isNaN(Number(form.price))) message = 'Valid price is required';
    else if (!form.lat || Number.isNaN(Number(form.lat))) message = 'Valid latitude is required';
    else if (!form.lng || Number.isNaN(Number(form.lng))) message = 'Valid longitude is required';
    setValidationMessage(message);
    return message;
  };

  const handleSave = async (submit = false) => {
    const validationError = validate();
    if (validationError) {
      error(validationError);
      return;
    }

    setSaving(true);
    try {
      let listing: AgentListing;
      if (isEdit && listingId) {
        listing = await updateAgentListing(listingId, payload);
      } else {
        listing = await createAgentListing(payload) as AgentListing;
        navigate(`/agent/listings/${listing._id}/edit`, { replace: true });
      }

      if (submit) {
        const id = listingId || listing?._id;
        if (id) {
          await submitAgentListing(id);
          success('Listing submitted for review');
          if (!isEdit) localStorage.removeItem('agent_listing_draft');
          setValidationMessage(null);
        }
      } else {
        success('Listing saved');
        setValidationMessage(null);
      }
    } catch {
      push({ title: 'Save failed', description: errors.generic, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-black mb-2">{isEdit ? 'Edit listing' : 'Create listing'}</h1>
          <p className="text-sm text-gray-500">
            {isEdit ? `Listing ID: ${listingId}` : 'Build a complete, review-ready listing with media and map precision.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => handleSave(false)}>
            Save draft
          </Button>
          <Button size="sm" disabled={saving} onClick={() => handleSave(true)}>
            {isEdit ? 'Submit for review' : 'Publish for review'}
          </Button>
          {!isEdit && hasLocalDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const draft = localStorage.getItem('agent_listing_draft');
                if (draft) {
                  try {
                    setForm(JSON.parse(draft));
                  } catch {
                    // ignore invalid draft
                  }
                }
              }}
            >
              Restore draft
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Completeness</div>
          <div className="text-2xl font-semibold text-black mt-1">{completeness}%</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Mode</div>
          <div className="text-2xl font-semibold text-black mt-1">{isEdit ? 'Editing' : 'New'}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Currency</div>
          <div className="text-2xl font-semibold text-black mt-1">{form.currency}</div>
        </div>
      </div>

      {validationMessage && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-sm border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading listing...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-5 space-y-4">
              <div className="text-sm font-semibold text-slate-900">Property basics</div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={fieldClass}
                  placeholder="Listing title"
                />
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={fieldClass}
                  placeholder="Category label (e.g. Premium Listing)"
                />
                <input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className={fieldClass}
                  placeholder="Price"
                />
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <select
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="rent">Rent</option>
                  <option value="buy">Buy</option>
                </select>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className={fieldClass}
                  aria-label="Property type"
                >
                  <option value="">Property type</option>
                  {LISTING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={form.beds}
                  onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))}
                  className={fieldClass}
                  placeholder="Bedrooms"
                />
                <input
                  value={form.baths}
                  onChange={(e) => setForm((f) => ({ ...f, baths: e.target.value }))}
                  className={fieldClass}
                  placeholder="Bathrooms"
                />
                <input
                  value={form.sqm}
                  onChange={(e) => setForm((f) => ({ ...f, sqm: e.target.value }))}
                  className={fieldClass}
                  placeholder="Square ft"
                />
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${fieldClass} min-h-[130px] resize-y`}
                placeholder="Description"
              />
            </div>

            <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-5 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Location and map</div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={fieldClass}
                  placeholder="Address"
                />
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className={fieldClass}
                  placeholder="City"
                />
                <input
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                  className={fieldClass}
                  placeholder="Area"
                />
                <input
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className={fieldClass}
                  placeholder="Latitude"
                />
                <input
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  className={fieldClass}
                  placeholder="Longitude"
                />
              </div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-5 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Media and amenities</div>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className={fieldClass}
                placeholder="Primary image URL"
              />
              <input
                value={form.amenities}
                onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                className={fieldClass}
                placeholder="Amenities separated by commas (Parking, Gym, Lift)"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-5 space-y-4">
              <div className="text-sm font-semibold text-slate-900">Live preview</div>
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {form.category && (
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-green-700 mb-1">
                    {form.category}
                  </div>
                )}
                <div className="font-semibold text-black">{form.title || 'Listing title'}</div>
                <div className="mt-1">{form.currency} {form.price || '0'}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {form.city || 'City'} {form.area ? `- ${form.area}` : ''}{form.sqm ? ` • ${form.sqm} sq ft` : ''}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-500">Readiness</div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-green-600" style={{ width: `${completeness}%` }} />
                </div>
                <div className="text-xs text-gray-500">{completeness}% completed</div>
              </div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-5 space-y-2">
              <div className="text-sm font-semibold text-slate-900">Quality checklist</div>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>Use a clear hero image with natural light.</li>
                <li>Include exact location coordinates for map quality.</li>
                <li>Add standout amenities to increase conversion.</li>
                <li>Keep pricing and currency consistent with market.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
