import helmet, { HelmetOptions } from 'helmet';
import { env } from './environment';

/**
 * Security configuration for Helmet middleware
 *
 * Adapted for Web3 ecosystem (MetaMask, wallet connectors) and development environment
 *
 * Key principles:
 * - CSP disabled in development to avoid breaking MetaMask, Swagger, inline scripts
 * - HSTS only in production (HTTPS required)
 * - Permissive directives for blockchain wallets (connect-src, script-src)
 */

const isDevelopment = env.NODE_ENV === 'development';
const isProduction = env.NODE_ENV === 'production';

export const helmetConfig: HelmetOptions = {
  // Content Security Policy - disabled in dev, permissive in prod for Web3
  contentSecurityPolicy: isDevelopment
    ? false // Disable CSP in dev to avoid breaking MetaMask, Swagger, HMR
    : {
        directives: {
          defaultSrc: ["'self'"],

          // Allow scripts from self + unsafe-inline for Web3 wallets (MetaMask injects scripts)
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for MetaMask, Dynamic Labs, wallet connectors
            "https://cdn.dynamic.xyz", // Dynamic Labs wallet connector
          ],

          // Allow styles from self + unsafe-inline for Tailwind, inline styles
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Tailwind, Radix UI, inline styles
          ],

          // Allow connections to Supabase, blockchain RPC, APIs
          connectSrc: [
            "'self'",
            "https://*.supabase.co", // Supabase Realtime + API
            "wss://*.supabase.co", // Supabase WebSocket
            "https://spicy-rpc.chiliz.com", // Chiliz testnet RPC
            "https://rpc.ankr.com", // Chiliz mainnet RPC
            "https://api-football-v1.p.rapidapi.com", // API Football
            "https://cdn.dynamic.xyz", // Dynamic Labs
          ],

          // Allow images from self + data URIs + external sources
          imgSrc: [
            "'self'",
            "data:",
            "https:", // Allow all HTTPS images (team logos, avatars, etc.)
          ],

          // Allow fonts from self + data URIs
          fontSrc: [
            "'self'",
            "data:",
          ],

          // Allow media from self (HLS streams)
          mediaSrc: [
            "'self'",
            "blob:", // Required for HLS.js video streaming
          ],

          // Frame ancestors - prevent clickjacking
          frameAncestors: ["'none'"],

          // Upgrade insecure requests in production
          ...(isProduction && { upgradeInsecureRequests: [] }),
        },
      },

  // HTTP Strict Transport Security - only in production
  hsts: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,

  // X-Frame-Options - prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options - prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection - disable (modern browsers use CSP instead)
  xssFilter: false,

  // Referrer-Policy - control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-DNS-Prefetch-Control - control DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options - prevent IE from executing downloads in site context
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies - control Adobe Flash/PDF cross-domain policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
};

/**
 * Get configured Helmet middleware
 */
export const securityHeadersMiddleware = helmet(helmetConfig);
