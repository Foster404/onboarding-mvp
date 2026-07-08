"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const DISPLAY_SIZE = 360;
const OUTPUT_SIZE = 400;
const MIN_CROP = 40;

type CropBox = { x: number; y: number; size: number };

export default function PhotoCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [displayDims, setDisplayDims] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; origin: CropBox } | null>(
    null
  );

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const scale = Math.min(DISPLAY_SIZE / img.naturalWidth, DISPLAY_SIZE / img.naturalHeight, 1);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    setDisplayDims({ width, height });
    const size = Math.min(width, height);
    setCrop({ x: (width - size) / 2, y: (height - size) / 2, size });
  }

  function clampCrop(next: CropBox, bounds: { width: number; height: number }): CropBox {
    const size = Math.min(Math.max(next.size, MIN_CROP), Math.min(bounds.width, bounds.height));
    const x = Math.min(Math.max(next.x, 0), bounds.width - size);
    const y = Math.min(Math.max(next.y, 0), bounds.height - size);
    return { x, y, size };
  }

  function startDrag(mode: "move" | "resize", e: ReactPointerEvent) {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, origin: crop };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleMovePointerDown(e: ReactPointerEvent) {
    startDrag("move", e);
  }

  function handleResizePointerDown(e: ReactPointerEvent) {
    startDrag("resize", e);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragRef.current || !displayDims) return;
    const { mode, startX, startY, origin } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (mode === "move") {
      setCrop(clampCrop({ x: origin.x + dx, y: origin.y + dy, size: origin.size }, displayDims));
    } else {
      const delta = Math.max(dx, dy);
      setCrop(clampCrop({ x: origin.x, y: origin.y, size: origin.size + delta }, displayDims));
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !crop || !displayDims) return;

    const scale = img.naturalWidth / displayDims.width;
    const sx = crop.x * scale;
    const sy = crop.y * scale;
    const sSize = crop.size * scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Choose photo area</h3>
        <div
          className="relative select-none overflow-hidden rounded-md bg-slate-100"
          style={{ width: displayDims?.width ?? DISPLAY_SIZE, height: displayDims?.height ?? DISPLAY_SIZE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Selected"
            onLoad={handleImgLoad}
            className="pointer-events-none block max-w-none"
            style={displayDims ? { width: displayDims.width, height: displayDims.height } : undefined}
          />
          {crop && displayDims && (
            <div
              onPointerDown={handleMovePointerDown}
              className="absolute cursor-move rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"
              style={{ left: crop.x, top: crop.y, width: crop.size, height: crop.size }}
            >
              <div
                onPointerDown={handleResizePointerDown}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-indigo-600"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400">Drag to reposition, drag the handle to resize.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!crop}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
