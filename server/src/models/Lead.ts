import mongoose, { Schema, Document } from 'mongoose';

export interface LeadDocument extends Document {
    listingId: mongoose.Types.ObjectId;
    agentId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // Optional if guest
    source: 'whatsapp' | 'message' | 'call';
    converted: boolean; // True if the lead resulted in a closed deal later
    createdAt: Date;
    updatedAt: Date;
}

const LeadSchema = new Schema<LeadDocument>(
    {
        listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
        agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        source: { type: String, enum: ['whatsapp', 'message', 'call'], required: true },
        converted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const LeadModel = mongoose.model<LeadDocument>('Lead', LeadSchema);
