import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Twitch Pixel Avatar Maker: Retro Pixel Art Profile Pic",
  description:
    "Make a retro pixel art avatar for Twitch from any photo. Free preview, $5 to download a clean PNG for your Twitch profile picture, panels, and offline screens.",
  keywords: [
    "twitch pixel avatar maker",
    "twitch pixel art avatar",
    "twitch pixel profile picture",
    "pixel avatar maker",
  ],
  alternates: {
    canonical: "https://pixelartavatar.com/twitch-pixel-avatar-maker",
  },
};

export default function TwitchPixelAvatarMakerPage() {
  return (
    <LandingPage
      badge="Twitch pixel avatar maker"
      h1="Twitch Pixel Avatar Maker"
      intro="Turn your photo into a chunky 90s pixel art avatar for Twitch. Perfect for your channel profile picture, panels, and offline screen. Upload a photo, preview it free, and download in about two minutes."
      bullets={[
        "Great for Twitch profile pics and panels",
        "Retro 8-bit streamer aesthetic",
        "Free preview, $5 to download the clean version",
      ]}
      faq={[
        {
          q: "How do I make a pixel avatar for Twitch?",
          a: "Upload a photo and Pixel Art Avatar turns it into a chunky 90s pixel art avatar in under two minutes. Preview it free, then download a clean PNG and use it as your Twitch profile picture or in your panels.",
        },
        {
          q: "Is the Twitch pixel avatar maker free?",
          a: "Yes, you can generate and preview your pixel avatar for free. Downloading the clean, watermark-free PNG is $5.",
        },
        {
          q: "Can I use the avatar in my Twitch panels and offline screen?",
          a: "Yes. You get a clean PNG you can use for your Twitch profile picture, panels, offline screen, or anywhere else you want a retro pixel look.",
        },
      ]}
    />
  );
}
