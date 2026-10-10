import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "linkedin-profile-scraper",
    "all-the-cities",
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
