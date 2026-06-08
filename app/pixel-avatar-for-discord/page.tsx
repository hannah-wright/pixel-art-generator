import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Pixel Avatar for Discord: Make a 90s Pixel Art PFP",
  description:
    "Turn your photo into a chunky 90s pixel art avatar for Discord. Free preview, $5 to download a clean square PNG sized for your Discord profile picture.",
  keywords: [
    "pixel avatar for discord",
    "discord pixel art avatar",
    "discord pixel pfp",
    "pixel avatar maker",
  ],
  alternates: {
    canonical: "https://pixelartavatar.com/pixel-avatar-for-discord",
  },
};

export default function PixelAvatarForDiscordPage() {
  return (
    <LandingPage
      badge="Pixel avatar for Discord"
      h1="Pixel Avatar for Discord"
      intro="Turn any photo into a chunky 90s pixel art avatar for your Discord profile. Upload a selfie, get a free preview in under two minutes, and download a clean square PNG that fits Discord's profile picture perfectly."
      bullets={[
        "Square PNG sized for Discord profile pictures",
        "Chunky retro 8-bit / 90s look",
        "Free preview, $5 to download the clean version",
      ]}
      faq={[
        {
          q: "How do I make a pixel avatar for Discord?",
          a: "Upload a photo, and Pixel Art Avatar turns it into a chunky 90s pixel art avatar in under two minutes. Preview it free, then download a clean square PNG and set it as your Discord profile picture.",
        },
        {
          q: "Is the Discord pixel avatar maker free?",
          a: "Generating and previewing your pixel avatar is free. You only pay $5 if you want to download the clean, watermark-free PNG.",
        },
        {
          q: "What size is the downloaded avatar?",
          a: "It is a square PNG, which is exactly what Discord uses for profile pictures, so it looks crisp without cropping.",
        },
      ]}
    />
  );
}
