import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Ship a relocatable Node server for `npx taskmark serve` (see bin/ + scripts/).
  output: "standalone",
}

export default nextConfig
