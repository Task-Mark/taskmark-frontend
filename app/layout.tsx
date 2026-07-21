import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "Taskmark",
  description: "Local Taskmark board dashboard",
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