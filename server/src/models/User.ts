import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role, agentStatuses } from '../utils/constants';

export interface UserDocument extends Document {
  name: string;
  email?: string;
  phone?: string;
  emailOrPhone: string;
  password: string;
  role: Role;
  status: 'active' | 'suspended' | 'banned';
  availability: 'active' | 'paused';
  agentVerification: (typeof agentStatuses)[number];
  avatarUrl?: string;
  /** EARB (Estate Agents Registration Board) registration number for legal compliance in Kenya. */
  earbRegistrationNumber?: string;
  /** Set when admin has verified EARB number against EARB portal. */
  earbVerifiedAt?: Date;
  verificationEvidence?: { url: string; note?: string; uploadedAt: Date }[];
  /** User KYC (any user): identity verification for compliance. */
  kycStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  kycEvidence?: { url: string; note?: string; uploadedAt: Date }[];
  kycSubmittedAt?: Date;
  /** Agent business verification: company/entity documents. */
  businessVerifyStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  businessVerifyEvidence?: { url: string; note?: string; uploadedAt: Date }[];
  businessVerifySubmittedAt?: Date;
  autoArchivedListings?: mongoose.Types.ObjectId[];
  notificationPrefs?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    quietHours?: { start: string; end: string };
  };
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaRecoveryCodes?: string[];
  /** Terms/privacy consent: version and timestamp. */
  consentVersion?: string;
  consentAt?: Date;
  comparePassword(pw: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    emailOrPhone: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'agent', 'admin', 'finance'],
      default: 'user',
      index: true,
    },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    availability: { type: String, enum: ['active', 'paused'], default: 'active' },
    agentVerification: { type: String, enum: agentStatuses, default: 'unverified' },
    avatarUrl: { type: String },
    earbRegistrationNumber: { type: String, trim: true, index: true },
    earbVerifiedAt: Date,
    autoArchivedListings: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      quietHours: {
        start: { type: String, default: '22:00' },
        end: { type: String, default: '06:00' },
      },
    },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaRecoveryCodes: [{ type: String }],
    verificationEvidence: [
      { url: String, note: String, uploadedAt: { type: Date, default: Date.now } },
    ],
    kycStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
    kycEvidence: [{ url: String, note: String, uploadedAt: { type: Date, default: Date.now } }],
    kycSubmittedAt: Date,
    businessVerifyStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    businessVerifyEvidence: [
      { url: String, note: String, uploadedAt: { type: Date, default: Date.now } },
    ],
    businessVerifySubmittedAt: Date,
    consentVersion: String,
    consentAt: Date,
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ role: 1, agentVerification: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (pw: string) {
  return bcrypt.compare(pw, this.password);
};

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
