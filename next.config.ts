import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Wikimedia `Special:FilePath` redirects up to 4 hops for http URLs;
    // Next 16 lowered the default from unlimited to 3.
    maximumRedirects: 5,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "commons.wikimedia.org",
        port: "",
        pathname: "/wiki/Special:FilePath/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        port: "",
        pathname: "/wiki/Special:FilePath/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

export default nextConfig
