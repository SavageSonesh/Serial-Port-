import React, { useCallback, useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"];

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelected, disabled }: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAccepted = (file: File) => ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isAccepted(file)) {
        alert(`Unsupported file type. Please choose one of: ${ACCEPTED_EXTENSIONS.join(", ")}`);
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed px-6 py-16 text-center transition ${
        dragActive ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="mb-4 text-4xl">📤</div>
      <p className="text-base font-medium text-slate-200">Drag and drop your video here</p>
      <p className="mt-1 text-sm text-slate-500">or click to browse · MP4, MOV, MKV, WebM</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
