import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "linkedin-profile-scraper",
    "all-the-cities",
    "pdf-parse",
    "pdfjs-dist",
  ],
};

export default nextConfig;
