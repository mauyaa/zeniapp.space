import mongoose, { Schema, Document } from 'mongoose';
import { listingStatuses, listingAvailabilityStatuses, listingRejectionCodes } from '../utils/constants';

interface Image {
  url: string;
  isPrimary?: boolean;
}

interface FloorPlan {
  label: string;
  url: string;
  sizeBytes?: number;
}

export interface ListingDocument extends Document {
  title: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  purpose: 'rent' | 'buy';
  beds?: number;
  baths?: number;
  sqm?: number;
  type?: string;
  amenities?: string[];
  status: typeof listingStatuses[number];
  agentId: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    area?: string;
    county?: string;
    subCounty?: string;
  };
  images: Image[];
  verified: boolean;
  floorPlans?: FloorPlan[];
  catalogueUrl?: string;
  /** available | under_offer | sold | let; only 'available' is bookable. */
  availabilityStatus?: typeof listingAvailabilityStatuses[number];
  rejectionReason?: string;
  rejectionCode?: typeof listingRejectionCodes[number];
}

const ListingSchema = new Schema<ListingDocument>(
  {
    title: { type: String, required: true },
    category: String,
    description: String,
    price: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    purpose: { type: String, enum: ['rent', 'buy'], default: 'rent', index: true },
    beds: Number,
    baths: Number,
    sqm: Number,
    type: String,
    amenities: [String],
    status: { type: String, enum: listingStatuses, default: 'draft', index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: String,
      city: String,
      area: String,
      county: String,
      subCounty: String
    },
    images: [{ url: String, isPrimary: Boolean }],
    verified: { type: Boolean, default: false },
    floorPlans: [{ label: String, url: String, sizeBytes: Number }],
    catalogueUrl: String,
    availabilityStatus: { type: String, enum: listingAvailabilityStatuses, default: 'available', index: true },
    rejectionReason: String,
    rejectionCode: { type: String, enum: listingRejectionCodes }
  },
  { timestamps: true }
);

ListingSchema.index({ location: '2dsphere' });
ListingSchema.index({ status: 1, 'location.city': 1, price: 1 });
ListingSchema.index({ agentId: 1, status: 1 });
ListingSchema.index({ createdAt: -1 });
ListingSchema.index({ title: 'text', description: 'text', type: 'text', amenities: 'text' });
ListingSchema.index({ status: 1, purpose: 1, verified: 1, price: 1 });

export const ListingModel = mongoose.model<ListingDocument>('Listing', ListingSchema);
