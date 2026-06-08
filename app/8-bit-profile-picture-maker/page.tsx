import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "8-Bit Profile Picture Maker: Turn a Photo into Pixel Art",
  description:
    "Turn any photo into an 8-bit, 90s-style pixel art profile picture. Free preview, $5 to download a clean square PNG for any profile.",
  keywords: [
    "8-bit profile picture maker",
    "8 bit pfp maker",
    "8-bit avatar maker",
    "pixel art profile picture",
  ],
  alternates: {
    canonical: "https://pixelartavatar.com/8-bit-profile-picture-maker",
  },
};

export default function EightBitProfilePictureMakerPage() {
  return (
    <LandingPage
      badge="8-bit profile picture maker"
      h1="8-Bit Profile Picture Maker"
      intro="Turn your photo into an 8-bit, 90s-style pixel art profile picture. Upload any image, preview it free, and download a clean square PNG for any profile in about two minutes."
      bullets={[
        "Authentic 8-bit / 90s pixel look",
        "Square PNG that works on any profile",
        "Free preview, $5 to download the clean version",
      ]}
      faq={[
        {
          q: "How do I turn a photo into an 8-bit profile picture?",
          a: "Upload a photo and Pixel Art Avatar renders it as a chunky 8-bit, 90s-style pixel art profile picture in under two minutes. Preview it free, then download the clean PNG.",
        },
        {
          q: "Is the 8-bit profile picture maker free?",
          a: "Generating and previewing is free. Downloading the clean, watermark-free PNG is $5 per image.",
        },
        {
          q: "Where can I use the 8-bit profile picture?",
          a: "Anywhere you need an avatar: Discord, Twitch, X/Twitter, Slack, forums, and more. The download is a square PNG.",
        },
      ]}
    />
  );
}
