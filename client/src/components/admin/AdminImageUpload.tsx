import React from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { ACCEPT_IMAGES as ACCEPT, uploadFile, validateImageFile as validateFile } from "@/lib/upload";

export type AdminImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  "data-testid"?: string;
};

export default function AdminImageUpload({
  value,
  onChange,
  disabled = false,
  "data-testid": dataTestId,
}: AdminImageUploadProps) {
  const isMobile = useIsMobile();
  const [uploading, setUploading] = React.useState(false);
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
              className="h-full w-full object-contain p-2"
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
                  onClick={() => onChange("")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
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
