import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Only initialize background worker if not on Vercel
// On Vercel, we use Vercel Cron Jobs instead
// This is a server-side only check, so it's safe to do at module level
if (
  typeof window === 'undefined' && 
  typeof process !== 'undefined' && 
  !process.env.VERCEL && 
  !process.env.VERCEL_ENV
) {
  // Dynamic import to avoid loading on Vercel
  import('@/lib/init-worker').catch((err) => {
    // Silently fail - worker is optional
  });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academy Edge Dashboard",
  description: "Student assessment and interview management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
