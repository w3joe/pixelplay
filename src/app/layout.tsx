import type { Metadata } from "next";
import { DM_Sans, Syne, Pixelify_Sans, Press_Start_2P, Silkscreen, VT323 } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const pixelify = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel-arcade",
  subsets: ["latin"],
  weight: ["400"],
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "PixelPlay — Event tech planner | PixelPro",
  description:
    "Plan LED walls, PA, staging, and lighting for Singapore events. Get a rule-based sufficiency check and indicative price range, then send your plan to PixelPro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${syne.variable} ${pixelify.variable} ${pressStart.variable} ${silkscreen.variable} ${vt323.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
