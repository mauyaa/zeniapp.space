/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import {
  deleteMyVerificationDocument,
  getMyVerificationDocuments,
  uploadVerificationDocument,
} from '../controllers/verificationDocument.controller';
import { MAX_PRIVATE_DOCUMENT_BYTES } from '../services/verificationDocument.service';

const router = Router();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer') as any;
const privateDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRIVATE_DOCUMENT_BYTES },
});

function receivePrivateDocument(req: any, res: any, next: any) {
  privateDocumentUpload.single('file')(req, res, (error: unknown) => {
    if (!error) return next();
    if ((error as { code?: string }).code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ code: 'FILE_TOO_LARGE', message: 'Verification documents must be 5MB or smaller' });
    }
    return next(error);
  });
}

router.use(auth, requireRole(['user', 'agent']));
router.post('/', receivePrivateDocument, uploadVerificationDocument);
router.get('/mine', getMyVerificationDocuments);
router.delete('/:documentId', deleteMyVerificationDocument);

export default router;
