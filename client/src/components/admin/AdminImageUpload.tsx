import React from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const ACCEPT = "image/*";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export type AdminImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  "data-testid"?: string;
};

async function uploadFile(file: File): Promise<string> {
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

function getImageIdFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/api\/images\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function deleteImageById(id: string): Promise<void> {
  const res = await fetch(`/api/images/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Delete failed");
  }
}

function validateFile(file: File): boolean {
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file (JPEG, PNG, GIF, WebP).");
    return false;
  }
  if (file.size > MAX_SIZE) {
    toast.error("Image must be under 10MB.");
    return false;
  }
  return true;
}

export default function AdminImageUpload({
  value,
  onChange,
  disabled = false,
  "data-testid": dataTestId,
}: AdminImageUploadProps) {
  const isMobile = useIsMobile();
  const [uploading, setUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const libraryInputRef = React.useRef<HTMLInputElement>(null);
  const browseInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled || uploading) return;
      if (!validateFile(file)) return;
      setUploading(true);
      try {
        const url = await uploadFile(file);
        onChange(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, disabled, uploading]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>, inputRef: React.RefObject<HTMLInputElement | null>) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const handleFileRef = React.useRef(handleFile);
  handleFileRef.current = handleFile;

  const onPasteHandler = React.useCallback(
    (e: ClipboardEvent) => {
      if (isMobile) return;
      const file = e.clipboardData?.files?.[0];
      if (file?.type.startsWith("image/")) {
        e.preventDefault();
        handleFileRef.current(file);
      }
    },
    [isMobile]
  );

  React.useEffect(() => {
    if (isMobile) return;
    document.addEventListener("paste", onPasteHandler);
    return () => document.removeEventListener("paste", onPasteHandler);
  }, [isMobile, onPasteHandler]);

  const onPasteDiv = (e: React.ClipboardEvent) => {
    if (isMobile) return;
    const file = e.clipboardData?.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      handleFileRef.current(file);
    }
  };

  const handleRemove = React.useCallback(async () => {
    if (disabled || deleting) return;
    const imageId = getImageIdFromUrl(value);
    if (imageId) {
      setDeleting(true);
      try {
        await deleteImageById(imageId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete image");
      } finally {
        setDeleting(false);
      }
    }
    onChange("");
  }, [value, onChange, disabled, deleting]);

  return (
    <div className="space-y-4" data-testid={dataTestId ?? "admin-image-upload"}>
      <div
        className="aspect-square rounded-lg bg-muted overflow-hidden flex items-center justify-center relative"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onPaste={onPasteDiv}
      >
        {value ? (
          <div className="relative h-full w-full group">
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-contain p-4"
              data-testid="img-admin-preview"
            />
            {!disabled && (
              <div className="absolute inset-0 flex flex-col sm:flex-row items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                <input
                  ref={browseInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => onInputChange(e, browseInputRef)}
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] touch-manipulation"
                  onClick={handleRemove}
                  disabled={deleting}
                >
                  <X className="h-4 w-4 mr-1" />
                  {deleting ? "Removing…" : "Remove"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-[44px] touch-manipulation"
                  onClick={() => browseInputRef.current?.click()}
                >
                  Change photo
                </Button>
              </div>
            )}
          </div>
        ) : uploading ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
            <Upload className="h-10 w-10 animate-pulse mb-2" />
            Uploading…
          </div>
        ) : isMobile ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <p className="text-sm text-muted-foreground text-center">Take a photo or choose from library</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <input
                ref={cameraInputRef}
                type="file"
                accept={ACCEPT}
                capture="environment"
                className="sr-only"
                onChange={(e) => onInputChange(e, cameraInputRef)}
                disabled={disabled}
                data-testid="input-admin-image-camera"
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => onInputChange(e, libraryInputRef)}
                disabled={disabled}
                data-testid="input-admin-image-library"
              />
              <Button
                type="button"
                variant="default"
                className="min-h-[48px] touch-manipulation text-base"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
              >
                <Camera className="h-5 w-5 mr-2" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] touch-manipulation text-base"
                onClick={() => libraryInputRef.current?.click()}
                disabled={disabled}
              >
                <ImagePlus className="h-5 w-5 mr-2" />
                Choose from library
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input
              ref={browseInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => onInputChange(e, browseInputRef)}
              disabled={disabled}
              data-testid="input-admin-image"
            />
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop image here or <button type="button" className="text-primary font-medium underline" onClick={() => browseInputRef.current?.click()}>browse</button>
            </p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
