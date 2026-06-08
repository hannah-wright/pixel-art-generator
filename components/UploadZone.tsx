"use client";

import { useCallback, useRef, useState } from "react";
import { downscaleImage } from "@/lib/imageResize";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UploadZone({ onFileSelected, maxSizeMB = 8 }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please use a JPG, PNG, or WebP image.";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too big. Max ${maxSizeMB} MB.`;
    }
    return null;
  };

  const handleFile = useCallback(
    async (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setProcessing(true);
      try {
        const resized = await downscaleImage(file);
        onFileSelected(resized);
      } catch {
        // If resize fails for any reason, just send the original.
        onFileSelected(file);
      } finally {
        setProcessing(false);
      }
    },
    [onFileSelected, maxSizeMB]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <div
        className={`upload-zone ${dragging ? "dragging" : ""} p-12 text-center cursor-pointer`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="font-pixel text-5xl mb-3">▾</div>
        <p className="font-bold text-lg mb-1">
          {processing ? "Preparing your photo…" : "Drop a photo here"}
        </p>
        <p className="text-muted text-sm">
          or tap to choose. JPG, PNG, WebP. Max {maxSizeMB} MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && (
        <p className="mt-3 text-blue font-bold text-sm">⚠ {error}</p>
      )}
    </div>
  );
}
