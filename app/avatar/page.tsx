import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = {
  title:
    "Pixel Art Avatar from Photo: Generate a 90s Pixel Avatar Online",
  description:
    "Turn any photo or image into a chunky 90s pixel art avatar. Perfect for X / Twitter, Discord, and Slack profile pics. Free preview, $5 to download the clean PNG.",
  alternates: {
    canonical: "https://pixelartavatar.com/avatar",
  },
};

export default function AvatarPage() {
  return (
    <Studio
      title="Pixel Art Avatar"
      subtitle="Upload any photo or image, get a chunky 90s pixel art avatar in under 2 minutes."
      mode="avatar"
    />
  );
}
