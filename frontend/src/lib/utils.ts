import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  // Simple cn utility without tailwind-merge
  return inputs
    .flat()
    .filter((x) => typeof x === "string" && x.length > 0)
    .join(" ");
}

export async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  // Fix extension to match actual content type
  const contentType = blob.type;
  let ext = ".png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
  else if (contentType.includes("webp")) ext = ".webp";
  const correctedFilename = filename.replace(/\.\w+$/, ext);

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = correctedFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
