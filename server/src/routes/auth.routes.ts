import { Router } from 'express';
import {
  login,
  me,
  register,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  googleLogin,
  adminStepUp,
  adminMfaSetup,
  adminMfaEnable,
  adminMfaDisable,
  listSessions,
  revokeSession,
  revokeAllSessions,
} from '../controllers/auth.controller';
import { auth } from '../middlewares/auth';
import { loginLimiter, refreshLimiter } from '../middlewares/rateLimit';

const router = Router();
router.post('/register', loginLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', refreshLimiter, logout);
router.get('/sessions', auth, listSessions);
router.delete('/sessions/:id', auth, revokeSession);
router.post('/sessions/logout-all', auth, revokeAllSessions);
router.get('/me', auth, me);
router.post('/password/forgot', loginLimiter, forgotPassword);
router.post('/password/reset', loginLimiter, resetPassword);
router.post('/google', loginLimiter, googleLogin);
router.post('/step-up', auth, adminStepUp);
router.get('/mfa/setup', auth, adminMfaSetup);
router.post('/mfa/enable', auth, adminMfaEnable);
router.post('/mfa/disable', auth, adminMfaDisable);
export default router;
