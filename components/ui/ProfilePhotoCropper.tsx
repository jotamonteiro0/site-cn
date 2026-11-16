"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, X, Camera } from "lucide-react";

export interface ProfilePhotoCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  isSaving?: boolean;
  aspectRatio?: "circle" | "3:4" | "4:3" | "1:1";
  title?: string;
  subtitle?: string;
}

export function ProfilePhotoCropper({
  imageSrc,
  onCancel,
  onCropComplete,
  isSaving = false,
  aspectRatio = "circle",
  title,
  subtitle,
}: ProfilePhotoCropperProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const isCircle = aspectRatio === "circle";
  const cropW = isCircle || aspectRatio === "1:1" ? 280 : 270;
  const cropH = isCircle || aspectRatio === "1:1" ? 280 : 360;

  // Carrega imagem e centraliza escala inicial
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Calcula escala inicial para cobrir o viewport
      const initialScale = Math.max(cropW / (img.naturalWidth || 1), cropH / (img.naturalHeight || 1));
      setScale(Math.max(1, initialScale));
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    };
  }, [imageSrc, cropW, cropH]);

  // Manipulação de Arrastar com Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manipulação de Arrastar com Touch (Mobile / iPhone)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom pelo scroll do mouse sobre a área
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(0.6, prev + delta), 4));
  };

  // Girar 90 graus
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Resetar ajustes
  const handleReset = () => {
    if (imageSize.width && imageSize.height) {
      const initialScale = Math.max(cropW / (imageSize.width || 1), cropH / (imageSize.height || 1));
      setScale(Math.max(1, initialScale));
    } else {
      setScale(1);
    }
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Concluir corte e exportar via Canvas de alta resolução
  const handleConfirmCrop = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const OUTPUT_WIDTH = isCircle || aspectRatio === "1:1" ? 600 : 600;
    const OUTPUT_HEIGHT = isCircle || aspectRatio === "1:1" ? 600 : 800;

    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configura antialiasing de alta fidelidade
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (isCircle) {
      // Máscara circular para avatar
      ctx.beginPath();
      ctx.arc(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2, OUTPUT_WIDTH / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else {
      // Retângulo com corte proporcional para fotografias oficiais
      ctx.beginPath();
      ctx.rect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      ctx.closePath();
      ctx.clip();
    }

    // Centraliza o sistema de coordenadas no centro do recorte
    ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);

    // Converte posição e escala para o espaço do Canvas
    const ratio = OUTPUT_WIDTH / cropW;
    ctx.translate(position.x * ratio, position.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * ratio, scale * ratio);

    // Desenha a imagem centralizada
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

    // Exporta como jpeg de alta fidelidade (ou webp para avatares)
    const mimeType = isCircle ? "image/webp" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob, dataUrl);
        } else {
          fetch(dataUrl)
            .then((res) => res.blob())
            .then((b) => onCropComplete(b, dataUrl));
        }
      },
      mimeType,
      0.95
    );
  }, [position, rotation, scale, onCropComplete, isCircle, aspectRatio, cropW]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in select-none">
      <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl ios-glass-card space-y-5 text-white animate-in zoom-in-95 shadow-2xl relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D9AA45]/20 border border-[#D9AA45]/40 flex items-center justify-center text-[#D9AA45] shadow-lg shadow-[#D9AA45]/15">
              <Camera className="w-4 h-4 text-[#D9AA45]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {title || (isCircle ? "Ajustar Foto de Perfil" : "Ajustar Fotografia Oficial")}
              </h3>
              <p className="text-[11px] text-emerald-200/75">
                {subtitle || "Arraste e aproxime para enquadrar perfeitamente"}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Enquadramento Circular ou Retangular */}
        <div className="flex flex-col items-center justify-center py-2">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: `${cropW}px`, height: `${cropH}px` }}
            className={`relative overflow-hidden border-2 border-[#D9AA45] shadow-[0_0_30px_rgba(217,170,69,0.25)] bg-black/40 cursor-grab active:cursor-grabbing touch-none transition-shadow ${
              isCircle ? "rounded-full" : "rounded-2xl"
            } ${
              isDragging ? "shadow-[0_0_35px_rgba(217,170,69,0.5)]" : ""
            }`}
          >
            {/* Imagem Manipulável */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Foto para corte"
              draggable={false}
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: "center center",
                position: "absolute",
                top: "50%",
                left: "50%",
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
              className="will-change-transform"
            />

            {/* Linhas de Grade de Terços */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden ${
              isCircle ? "rounded-full" : "rounded-2xl"
            }`}>
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-25">
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-white/60" />
                <div className="border-r border-white/60" />
                <div />
              </div>
            </div>

            {/* Dica de arrastar quando repouso */}
            {!isDragging && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white/80 backdrop-blur-md border border-white/10">
                  Arraste para mover
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controles de Zoom e Ações Rápidas */}
        <div className="space-y-3.5 pt-1">
          {/* Slider de Zoom */}
          <div className="flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-emerald-300/80 shrink-0" />
            <input
              type="range"
              min="0.6"
              max="3.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#D9AA45]"
            />
            <ZoomIn className="w-4 h-4 text-[#D9AA45] shrink-0" />
          </div>

          {/* Botões de Ação de Foto (Girar, Resetar) */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRotate}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
              title="Girar 90 graus"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#D9AA45]" />
              <span>Girar</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
              title="Restaurar tamanho e posição original"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Centralizar</span>
            </button>
          </div>
        </div>

        {/* Rodapé / Botões de Confirmação */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold cursor-pointer transition-all border border-white/10 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#E5BA55] text-[#041A10] font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? "Salvando foto..." : "Concluir e Salvar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
