/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { isCloudinaryConfigured, uploadImage } from '../services/cloudinary.service';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let multer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  multer = require('multer');
} catch (err) {
  multer = null;
  if (process.env.NODE_ENV === 'production') throw err;
  console.warn('[Upload] multer not installed, uploads disabled in this environment');
}

const router = Router();

async function handleUploadedFile(req: any, res: any) {
  const file = req.file as { filename?: string; buffer?: Buffer; mimetype?: string } | undefined;
  if (!file) return res.status(400).json({ code: 'NO_FILE', message: 'No file uploaded' });

  if (isCloudinaryConfigured() && file.buffer) {
    try {
      const url = await uploadImage(file.buffer, file.mimetype || 'image/jpeg');
      return res.status(201).json({ url });
    } catch (err) {
      console.warn('[Upload] Cloudinary failed, falling back to local', (err as Error).message);
    }
  }

  if (file.buffer) {
    const ext = path.extname(req.file?.originalname) || '.jpg';
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    return res.status(201).json({ url: `/uploads/${filename}` });
  }
  res.status(201).json({ url: `/uploads/${file.filename}` });
}

if (multer) {
  const useMemory = isCloudinaryConfigured();
  const storage = useMemory
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname);
          cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
        }
      });

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (align with LISTING_IMAGE_MAX_BYTES)
    fileFilter: (_req: any, file: any, cb: any) => {
      if (!file.mimetype || !allowedMimes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
      }
      cb(null, true);
    }
  });

  router.post('/upload/image', auth, requireRole(['user', 'agent', 'admin']), upload.single('file'), handleUploadedFile);

  /** Chat attachments: user, agent, or admin can upload an image to attach to a message. */
  router.post('/upload/chat-image', auth, requireRole(['user', 'agent', 'admin']), upload.single('file'), handleUploadedFile);
} else {
  router.post('/upload/image', (_req, res) => {
    res.status(503).json({ code: 'UPLOADS_DISABLED', message: 'File uploads unavailable (multer not installed)' });
  });
  router.post('/upload/chat-image', (_req, res) => {
    res.status(503).json({ code: 'UPLOADS_DISABLED', message: 'File uploads unavailable (multer not installed)' });
  });
}

export default router;
/* eslint-disable @typescript-eslint/no-explicit-any */
