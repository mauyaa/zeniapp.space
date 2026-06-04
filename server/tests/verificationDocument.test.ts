import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { UserModel } from '../src/models/User';
import { VerificationDocumentModel } from '../src/models/VerificationDocument';
import { VerificationDocumentAccessLogModel } from '../src/models/VerificationDocumentAccessLog';
import { VerificationDocumentRetentionPolicyModel } from '../src/models/VerificationDocumentRetentionPolicy';
import { expireVerificationDocuments } from '../src/services/verificationDocument.service';
import { shouldSkipDbTests } from './skipDb';

const PNG_BYTES = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  Buffer.from('secure-image'),
]);

describe('private verification documents', () => {
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({
      name: 'Document User',
      emailOrPhone: 'documents@test.com',
      password: 'secret123',
      role: 'user',
    });
    const admin = await UserModel.create({
      name: 'Document Admin',
      emailOrPhone: 'document-admin@test.com',
      password: 'secret123',
      role: 'admin',
    });
    userToken = sign({ sub: user.id, role: user.role }, env.jwtSecret);
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);
  });

  async function uploadKycDocument() {
    const response = await request(app)
      .post('/api/verification-documents')
      .set('Authorization', `Bearer ${userToken}`)
      .field('purpose', 'kyc_identity')
      .field('documentType', 'national_id')
      .attach('file', PNG_BYTES, { filename: '../identity.png', contentType: 'image/png' })
      .expect(201);
    return response.body.document as { id: string; filename: string };
  }

  it('requires authentication for private document upload', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/verification-documents')
      .field('purpose', 'kyc_identity')
      .field('documentType', 'national_id')
      .attach('file', PNG_BYTES, { filename: 'identity.png', contentType: 'image/png' })
      .expect(401);
  });

  it('stores an encrypted document and returns safe metadata only', async () => {
    if (shouldSkipDbTests()) return;
    const document = await uploadKycDocument();
    expect(document.filename).toBe('identity.png');
    const stored = await VerificationDocumentModel.findById(document.id);
    expect(stored?.storageProvider).toBe('mongodb_encrypted');
    expect(stored?.encryptedBytes).toBeTruthy();
    expect(stored?.encryptedBytes?.equals(PNG_BYTES)).toBe(false);

    const mine = await request(app)
      .get('/api/verification-documents/mine')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(mine.body.documents[0]).not.toHaveProperty('encryptedBytes');
    expect(mine.body.documents[0]).not.toHaveProperty('sha256');
  });

  it('rejects mismatched MIME content and oversized documents', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/verification-documents')
      .set('Authorization', `Bearer ${userToken}`)
      .field('purpose', 'kyc_identity')
      .field('documentType', 'national_id')
      .attach('file', Buffer.from('plain text'), {
        filename: 'identity.png',
        contentType: 'image/png',
      })
      .expect(400);

    await request(app)
      .post('/api/verification-documents')
      .set('Authorization', `Bearer ${userToken}`)
      .field('purpose', 'kyc_identity')
      .field('documentType', 'national_id')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'too-large.png',
        contentType: 'image/png',
      })
      .expect(413);
  });

  it('rejects document types that are not allowed for the declared purpose', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post('/api/verification-documents')
      .set('Authorization', `Bearer ${userToken}`)
      .field('purpose', 'kyc_identity')
      .field('documentType', 'business_registration')
      .attach('file', PNG_BYTES, { filename: 'identity.png', contentType: 'image/png' })
      .expect(400);
    expect(response.body.code).toBe('INVALID_DOCUMENT_TYPE_FOR_PURPOSE');
  });

  it('prevents verification use of the public image upload path', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${userToken}`)
      .field('purpose', 'kyc_identity')
      .attach('file', PNG_BYTES, { filename: 'identity.png', contentType: 'image/png' })
      .expect(400);
    expect(response.body.code).toBe('PRIVATE_DOCUMENT_REQUIRED');
  });

  it('rejects declared verification document types on the generic upload path', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${userToken}`)
      .field('documentType', 'national_id')
      .attach('file', PNG_BYTES, { filename: 'identity.png', contentType: 'image/png' })
      .expect(400);
    expect(response.body.code).toBe('PRIVATE_DOCUMENT_REQUIRED');
  });

  it('denies legacy local verification assets referenced by full public URLs', async () => {
    if (shouldSkipDbTests()) return;
    const filename = 'legacy-sensitive-verification.png';
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, filename);
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(filePath, PNG_BYTES);
    try {
      await UserModel.updateOne(
        { emailOrPhone: 'documents@test.com' },
        {
          $push: {
            kycEvidence: {
              url: `https://zeniapp.space/uploads/${filename}`,
              uploadedAt: new Date(),
            },
          },
        }
      );
      const response = await request(app).get(`/uploads/${filename}`).expect(404);
      expect(response.body.code).toBe('NOT_FOUND');
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  });

  it('allows only administrator review access and audits each view', async () => {
    if (shouldSkipDbTests()) return;
    const document = await uploadKycDocument();

    await request(app)
      .get(`/api/admin/verification-documents/${document.id}/content`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    await request(app)
      .get(`/api/admin/verification-documents/${document.id}/content`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(
      await VerificationDocumentAccessLogModel.countDocuments({
        documentId: document.id,
        action: 'view',
        allowed: false,
      })
    ).toBe(1);

    await request(app)
      .post('/api/user/kyc')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ documentId: document.id, note: 'Review this identity document' })
      .expect(201);

    const response = await request(app)
      .get(`/api/admin/verification-documents/${document.id}/content`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.headers['content-type']).toMatch(/image\/png/);
    expect(response.body).toEqual(PNG_BYTES);

    const views = await VerificationDocumentAccessLogModel.countDocuments({
      documentId: document.id,
      action: 'view',
      allowed: true,
    });
    expect(views).toBe(1);
  });

  it('supports soft deletion and retention expiry without public content access', async () => {
    if (shouldSkipDbTests()) return;
    const deleted = await uploadKycDocument();
    await request(app)
      .delete(`/api/verification-documents/${deleted.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(204);
    expect((await VerificationDocumentModel.findById(deleted.id))?.status).toBe('deleted');

    const expiring = await uploadKycDocument();
    await VerificationDocumentModel.findByIdAndUpdate(expiring.id, { expiresAt: new Date(0) });
    expect(await expireVerificationDocuments()).toBe(1);
    expect((await VerificationDocumentModel.findById(expiring.id))?.status).toBe('expired');

    const held = await uploadKycDocument();
    await VerificationDocumentModel.findByIdAndUpdate(held.id, { expiresAt: new Date(0) });
    await VerificationDocumentRetentionPolicyModel.create({
      purpose: 'kyc_identity',
      retentionDays: 365,
      legalHold: true,
      deleteEncryptedPayloadOnExpiry: true,
    });
    expect(await expireVerificationDocuments()).toBe(0);
    expect((await VerificationDocumentModel.findById(held.id))?.status).toBe('uploaded');
  });
});
