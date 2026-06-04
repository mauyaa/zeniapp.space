import { env } from './env';

const splitOrigins = (value: string) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isExplicitSecureSource = (source: string, allowWebSocket = false) => {
  const schemes = allowWebSocket ? '(?:https|wss)' : 'https';
  return new RegExp(`^${schemes}:\\/\\/[a-z0-9.-]+(?::\\d+)?(?:\\/[^\\s]*)?$`, 'i').test(
    source
  );
};

const socketOrigins = (origins: string[]) =>
  origins
    .filter((origin) => isExplicitSecureSource(origin))
    .map((origin) => origin.replace(/^http/i, 'ws'));

export function buildContentSecurityPolicy(nodeEnv = env.nodeEnv) {
  const isProduction = nodeEnv === 'production';
  const applicationOrigins = splitOrigins(env.corsOrigin);
  const configuredConnections = splitOrigins(env.cspConnectSrc).filter(
    (source) => !isProduction || isExplicitSecureSource(source, true)
  );
  const configuredImages = splitOrigins(env.cspImgSrc).filter(
    (source) => !isProduction || isExplicitSecureSource(source)
  );

  const connectSrc = isProduction
    ? [
        "'self'",
        ...applicationOrigins.filter((origin) => isExplicitSecureSource(origin)),
        ...socketOrigins(applicationOrigins),
        ...configuredConnections,
      ]
    : [
        "'self'",
        'capacitor:',
        ...applicationOrigins,
        ...socketOrigins(applicationOrigins),
        ...configuredConnections,
      ];

  const imgSrc = isProduction
    ? ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', ...configuredImages]
    : ["'self'", 'data:', 'blob:', 'https:', ...configuredImages];

  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: Array.from(new Set(imgSrc)),
      fontSrc: ["'self'", 'data:'],
      connectSrc: Array.from(new Set(connectSrc)),
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: '/csp-report',
    },
    reportOnly: env.cspReportOnly || !isProduction,
  };
}
