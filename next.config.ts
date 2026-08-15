import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Casespace is an authenticated internal tool: nearly every page depends on
  // the viewer's session, so pages render dynamically by default and we do not
  // enable cacheComponents/PPR.

  // /docs renders the repo's own markdown at request time, so the docs folder
  // has to travel with the deployment — file tracing can't infer it.
  outputFileTracingIncludes: {
    "/docs": ["./docs/**/*.md"],
    "/docs/**": ["./docs/**/*.md"],
  },
};

export default nextConfig;
