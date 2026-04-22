/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: Allow mobile/LAN devices to access the Next.js dev server.
  // Without this, Next.js 15 blocks cross-origin requests from IP addresses,
  // so JS bundles never load → React never hydrates → forms submit natively
  // as GET requests → credentials appear in the URL, page never redirects.
  // ─────────────────────────────────────────────────────────────────────────
  allowedDevOrigins: [
    "192.168.*.*",   // home / office LAN (most common)
    "10.*.*.*",      // corporate / VPN networks
    "172.16.*.*",    // docker bridge / alternate LAN
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "*.local",       // mDNS hostnames (MacBook.local etc.)
  ],
};

export default nextConfig;
