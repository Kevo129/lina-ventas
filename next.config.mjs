/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ['postgres'],
  experimental: { serverActions: { bodySizeLimit: '25mb' } },
};
