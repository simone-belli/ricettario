"use client";

import { getSupabase } from "./supabase/client";
import { PHOTO_BUCKET } from "./supabase/env";

const MAX_EDGE = 2000;

/** Shrinks a phone photo to at most 2000px on its long edge and re-encodes it as JPEG. */
export async function downscalePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process the photo."))), "image/jpeg", 0.85),
  );
}

/** Uploads photos for one recipe and returns their storage paths, in order. */
export async function uploadPhotos(files: File[]): Promise<string[]> {
  const folder = crypto.randomUUID();
  const storage = getSupabase().storage.from(PHOTO_BUCKET);
  return Promise.all(
    files.map(async (file, index) => {
      const path = `${folder}/${index + 1}.jpg`;
      const { error } = await storage.upload(path, await downscalePhoto(file), { contentType: "image/jpeg" });
      if (error) throw new Error(`Couldn't upload photo ${index + 1}: ${error.message}`);
      return path;
    }),
  );
}

/** Short-lived links for showing private photos. */
export async function photoUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  return (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
}
