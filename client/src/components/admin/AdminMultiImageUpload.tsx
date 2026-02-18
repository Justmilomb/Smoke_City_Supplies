import React from "react";
import { Reorder } from "framer-motion";
import { Camera, ImagePlus, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { ACCEPT_IMAGES, uploadFile, validateImageFile } from "@/lib/upload";

export type AdminMultiImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
};

export default function AdminMultiImageUpload({
  value,
  onChange,
  max = 10,
  disabled = false,
}: AdminMultiImageUploadProps) {
  const isMobile = useIsMobile();
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const libraryInputRef = React.useRef<HTMLInputElement>(null);
  const browseInputRef = React.useRef<HTMLInputElement>(null);

  const canAdd = value.length < max && !disabled && !uploading;

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      if (disabled || uploading) return;
      const toUpload = Array.from(files).filter(validateImageFile);
      const remaining = max - value.length;
      if (toUpload.length === 0) return;
      const batch = toUpload.slice(0, remaining);
      if (batch.length < toUpload.length) {
        toast.error(`Only ${remaining} more image(s) allowed`);
      }
      setUploading(true);
      try {
        const urls = await Promise.all(batch.map(uploadFile));
        onChange([...value, ...urls]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, value, disabled, uploading, max]
  );

  const handleFile = React.useCallback(
    (file: File | null | undefined) => {
      if (file) handleFiles([file]);
    },
    [handleFiles]
  );

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const handleFilesRef = React.useRef(handleFiles);
  handleFilesRef.current = handleFiles;

  React.useEffect(() => {
    if (isMobile) return;
    const handler = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0];
      if (file?.type.startsWith("image/")) {
        e.preventDefault();
        handleFilesRef.current([file]);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [isMobile]);

  const hasImages = value.length > 0;

  return (
    <div className="space-y-3">
      {hasImages && (
        <Reorder.Group
          axis="x"
          values={value}
          onReorder={onChange}
          className="flex flex-wrap gap-3"
        >
          {value.map((url, index) => (
            <Reorder.Item
              key={url}
              value={url}
              className="relative group cursor-grab active:cursor-grabbing"
              whileDrag={{ scale: 1.05, zIndex: 10 }}
            >
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-lg overflow-hidden border border-border/60 bg-muted">
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {index === 0 && (
                  <div className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Main
                  </div>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-6 sm:w-6 touch-manipulation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {canAdd && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground">
              <Upload className="h-5 w-5 animate-pulse mr-2" />
              Uploading…
            </div>
          ) : isMobile ? (
            <div className="flex gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept={ACCEPT_IMAGES}
                capture="environment"
                className="sr-only"
                onChange={onInputChange}
                disabled={disabled}
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                className="sr-only"
                onChange={onInputChange}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="default"
                className="min-h-[48px] flex-1 touch-manipulation"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
              >
                <Camera className="h-5 w-5 mr-2" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] flex-1 touch-manipulation"
                onClick={() => libraryInputRef.current?.click()}
                disabled={disabled}
              >
                <ImagePlus className="h-5 w-5 mr-2" />
                Choose from library
              </Button>
            </div>
          ) : (
            <div
              className={`flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onClick={() => browseInputRef.current?.click()}
            >
              <input
                ref={browseInputRef}
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                className="sr-only"
                onChange={onInputChange}
                disabled={disabled}
              />
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {hasImages ? "Add more images" : "Drop images here or click to browse"}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{max} images. Drag to reorder — first image is the main photo.
      </p>
    </div>
  );
}
