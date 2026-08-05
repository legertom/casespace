import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Casespace is an authenticated internal tool: nearly every page depends on
  // the viewer's session, so pages render dynamically by default and we do not
  // enable cacheComponents/PPR.
};

export default nextConfig;
