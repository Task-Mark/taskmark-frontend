import type { Metadata, Viewport } from "next"
import { Archivo_Black, Space_Grotesk } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const siteDescription =
  "Local Taskmark board dashboard — markdown product memory with sizing, work logs, and velocity."

export const viewport: Viewport = {
  themeColor: "#111111",
}

export const metadata: Metadata = {
  applicationName: "Taskmark",
  title: {
    default: "Taskmark",
    template: "%s · Taskmark",
  },
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Taskmark",
    title: "Taskmark",
    description: siteDescription,
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "Taskmark — product memory for agent work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskmark",
    description: siteDescription,
    images: ["/og/og-default.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${archivoBlack.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <Toaster />
        {children}
      </body>
    </html>
  )
}
