import { toast } from "sonner";

export const ACCEPT_IMAGES = "image/*";
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Upload failed");
  }
  const { url } = await res.json();
  return url;
}

export function validateImageFile(file: File): boolean {
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file (JPEG, PNG, GIF, WebP).");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    toast.error("Image must be under 10MB.");
    return false;
  }
  return true;
}
