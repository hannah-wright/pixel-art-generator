import type { Metadata } from "next";
import Link from "next/link";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = {
  title: "Photo to Pixel Art Converter: 90s Retro Pixel Art Generator",
  description:
    "Convert any photo to chunky 90s pixel art. Landscapes, food, scenery, anything. Free preview, $5 to download the clean PNG.",
  alternates: {
    canonical: "https://pixelartavatar.com/photo-to-pixel-art",
  },
};

export default function PhotoToPixelArtPage() {
  return (
    <Studio
      title="Photo to Pixel Art"
      subtitle="Landscapes, food, scenery, and more. Any scenic photo to chunky 90s pixel art."
      mode="photo"
      redirectNote={
        <>
          ▸ Making a profile pic from a headshot? Use the{" "}
          <Link
            href="/avatar"
            className="font-bold underline underline-offset-2 hover:text-blue"
          >
            Pixel Art Avatar generator
          </Link>{" "}
          instead. It&apos;s tuned for faces.
        </>
      }
    />
  );
}
