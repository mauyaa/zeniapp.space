import 'express-async-errors';
import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { corsOrigins } from './config/cors';
import { sanitize } from './middlewares/sanitize';
import { ListingModel } from './models/Listing';
import { requestId } from './middlewares/requestId';
import { requestLogger } from './middlewares/requestLogger';
import { metricsMiddleware } from './middlewares/metrics';
import { initSentry, Sentry } from './config/sentry';
import { env } from './config/env';
import { stripeWebhook } from './controllers/stripeWebhook.controller';

export const app = express();
app.set('trust proxy', env.trustProxy);
app.set('etag', 'weak');

// Optional Sentry
const sentryEnabled = initSentry();
if (sentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'capacitor:', ...corsOrigins, 'https:', 'wss:', 'ws:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        reportUri: '/csp-report'
      }
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: env.nodeEnv === 'production',
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);

// Stripe webhook needs raw body for signature verification (must be before express.json)
app.post('/api/pay/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Body parsing
app.use(express.json({ limit: '2mb' }));

// Static uploads (dev/local)
const uploadDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadDir)) {
  app.use('/uploads', express.static(uploadDir));
}

// Custom middlewares
app.use(sanitize);
app.use(requestId);
app.use(metricsMiddleware);
app.use(requestLogger);
app.use(morgan('tiny'));

// Global basic rate limit (APIs have tighter per-route limits too)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || (env.nodeEnv === 'production' ? 300 : 5000)),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.path === '/health' ||
      req.path === '/health/ready' ||
      req.path === '/api/auth' ||
      req.path.startsWith('/api/auth/') ||
      req.path === '/api/pay/auth' ||
      req.path.startsWith('/api/pay/auth/')
  })
);

// Cache control middleware for API responses
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set default cache headers - no caching for API
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  next();
});

// CSP report endpoint (validated + audited)
app.post(
  '/csp-report',
  express.json({ type: ['application/csp-report', 'application/json'] }),
  async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const reportCandidate = (body['csp-report'] ?? body['cspReport'] ?? body) as unknown;
    if (!reportCandidate || typeof reportCandidate !== 'object') {
      return res.status(400).json({ code: 'INVALID_REPORT', message: 'Invalid CSP report payload' });
    }
    const report = reportCandidate as Record<string, unknown>;
    try {
      const { recordAudit } = await import('./utils/audit');
      await recordAudit({
        actorRole: 'system',
        action: 'csp_report',
        entityType: 'csp',
        entityId: 'violation',
        after: report as Record<string, unknown>
      });
    } catch (err) {
      // non-blocking
      if (env.nodeEnv === 'development') {
        console.warn('[CSP] audit failed', (err as Error).message);
      }
    }
    res.status(204).end();
  }
);

// Health check endpoint (cacheable)
app.get('/health', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=10');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  const dbReady = mongoose.connection.readyState === 1;
  const payload = {
    status: dbReady ? 'ready' : 'degraded',
    dbState: mongoose.connection.readyState
  };
  res.status(dbReady ? 200 : 503).json(payload);
});

app.use('/api', routes);

// SEO Prerendering for listing pages
app.get('/listing/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return next();
    }
    const listing = await ListingModel.findById(listingId).lean();
    if (!listing) return next();

    // Check where index.html is located
    const distPath = path.resolve(__dirname, '../../dist/index.html');
    const devPath = path.resolve(__dirname, '../../index.html');
    const htmlPath = fs.existsSync(distPath) ? distPath : (fs.existsSync(devPath) ? devPath : null);

    if (!htmlPath) {
      return next();
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    const title = `${listing.title} | Zeni`;
    const description = listing.description?.slice(0, 150) || `View this ${listing.type || 'property'} on Zeni.`;
    const image = listing.images?.find((img) => img.isPrimary)?.url || listing.images?.[0]?.url || 'https://zeni.co.ke/default.jpg';
    const url = `https://zeni.co.ke/listing/${listing._id}`;

    // Replace generic meta tags with listing-specific ones
    html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
    html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}"`);
    html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"`);
    html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"`);

    // Inject Twitter Card and other OG tags
    const extraTags = `
      <meta property="og:url" content="${url}" />
      <meta property="og:image" content="${image}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
      <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
      <meta name="twitter:image" content="${image}" />
    `;
    html = html.replace('</head>', `${extraTags}\n  </head>`);

    res.send(html);
  } catch (err) {
    next(err);
  }
});

// Since the server will now also be responsible for falling back standard routes to the SPA if requested:
// (Only necessary if NGINX isn't handling it, but safe to add)
app.get(['/app/*', '/explore', '/login', '/map', '/rent/*', '/buy/*'], (req: Request, res: Response, next: NextFunction) => {
  const distPath = path.resolve(__dirname, '../../dist/index.html');
  const devPath = path.resolve(__dirname, '../../index.html');
  const htmlPath = fs.existsSync(distPath) ? distPath : (fs.existsSync(devPath) ? devPath : null);
  if (htmlPath) {
    res.sendFile(htmlPath);
  } else {
    next();
  }
});

if (sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(notFound);
app.use(errorHandler);
