# 0010. Content Security Policy without a per-request nonce

**Status:** accepted

## Context

A nonce-based policy forces every page to render dynamically on each request, and is incompatible with Partial Prerendering (Next.js CSP guide). The storefront's speed comes from a static shell.

## Alternatives considered

- Nonce CSP with fully dynamic pages.
- Experimental SRI hashes.

## Decision

A static policy in `next.config.ts`: same-origin for everything, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri` and `form-action` locked, `connect-src` allows only Cloudinary uploads. Scripts and styles keep `'unsafe-inline'` for the framework's own inline bootstrap. The API docs page gets a wider policy for its CDN.

## Consequences

Most of the policy's value (no framing, no plugins, no third-party calls, no foreign form posts) with the static shell kept. It is weaker against injected inline script than a nonce; if the threat model grows, switch to nonces and accept dynamic rendering.
