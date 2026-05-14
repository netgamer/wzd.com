import { apiFetch } from "./client";

export interface MediaUploadResponse {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

// Posts an image File/Blob to /api/upload and returns the R2-proxied URL that
// can be stored in note metadata (e.g. metadata.pastedImageUrl).
export const uploadImage = async (file: File | Blob, filename = "image"): Promise<MediaUploadResponse> => {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : filename);
  const response = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: form
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || `Upload failed (${response.status}).`;
    throw new Error(message);
  }
  return (await response.json()) as MediaUploadResponse;
};

export const deleteMedia = async (key: string): Promise<void> => {
  await apiFetch(`/api/media/${key}`, { method: "DELETE" });
};
