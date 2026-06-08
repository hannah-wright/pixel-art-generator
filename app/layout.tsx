import type { Metadata } from "next";
import { VT323, Inter } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pixelartavatar.com"),
  title: "Photo to Pixel Art: Pixel Art Avatar Maker",
  description:
    "Photo to pixel art in under 2 minutes. A pixel art avatar & pixel avatar maker for chunky 90s profile pics. Turn any image to pixel art, free preview, $5 to keep.",
  keywords: [
    "photo to pixel art",
    "pixel art avatar",
    "pixel avatar maker",
    "turn image to pixel art",
  ],
  openGraph: {
    title: "Photo to Pixel Art · Pixel Avatar Maker",
    description:
      "Turn your photo or image into a chunky 90s pixel art avatar. Free preview, $5 to keep.",
    url: "https://pixelartavatar.com",
    siteName: "Pixel Art Avatar",
    type: "website",
    images: [
      {
        url: "/sample-avatar.png",
        width: 768,
        height: 768,
        alt: "Pixel art avatar made from a photo with the pixel avatar maker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Photo to Pixel Art · Pixel Avatar Maker",
    description:
      "Turn your photo or image into a chunky 90s pixel art avatar. Free preview, $5 to keep.",
    images: ["/sample-avatar.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
