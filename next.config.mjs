/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /about intentionally NOT redirected: products serve a real /about page built from
      // src/lib/zo-meta.json. zeroorigine.com ships the sentinel meta so /about 404s there.
      { source: '/minds', destination: '/#minds', permanent: false },
      { source: '/constitution', destination: '/#constitution', permanent: false },
    ];
  },
};

export default nextConfig;
