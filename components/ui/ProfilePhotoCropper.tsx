"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, X, Camera } from "lucide-react";

interface ProfilePhotoCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  isSaving?: boolean;
}

export function ProfilePhotoCropper({
  imageSrc,
  onCancel,
  onCropComplete,
  isSaving = false,
}: ProfilePhotoCropperProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Viewport size in pixels (circle diameter)
  const CROP_SIZE = 280;

  // Carrega imagem e centraliza escala inicial
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Calcula escala inicial para preencher o círculo
      const minDimension = Math.min(img.naturalWidth, img.naturalHeight);
      const initialScale = Math.max(1, CROP_SIZE / (minDimension || 1));
      setScale(initialScale);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    };
  }, [imageSrc]);

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
      const minDimension = Math.min(imageSize.width, imageSize.height);
      const initialScale = Math.max(1, CROP_SIZE / (minDimension || 1));
      setScale(initialScale);
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
    const OUTPUT_SIZE = 600; // Tamanho ideal nítido para avatares (600x600)
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configura antialiasing de alta fidelidade
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Cria máscara circular (estilo WhatsApp / Instagram)
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Centraliza o sistema de coordenadas no centro do círculo
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // Converte posição e escala para o espaço do Canvas
    const ratio = OUTPUT_SIZE / CROP_SIZE;
    ctx.translate(position.x * ratio, position.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * ratio, scale * ratio);

    // Desenha a imagem centralizada
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

    // Exporta como blob e dataUrl
    const dataUrl = canvas.toDataURL("image/webp", 0.92);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob, dataUrl);
        } else {
          // Fallback via dataUrl
          fetch(dataUrl)
            .then((res) => res.blob())
            .then((b) => onCropComplete(b, dataUrl));
        }
      },
      "image/webp",
      0.92
    );
  }, [position, rotation, scale, onCropComplete]);

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
              <h3 className="text-base font-bold text-white tracking-tight">Ajustar Foto de Perfil</h3>
              <p className="text-[11px] text-emerald-200/75">
                Arraste e aproxime para enquadrar perfeitamente
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

        {/* Viewport de Enquadramento Circular (Instagram / WhatsApp) */}
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
            style={{ width: `${CROP_SIZE}px`, height: `${CROP_SIZE}px` }}
            className={`relative rounded-full overflow-hidden border-2 border-[#D9AA45] shadow-[0_0_30px_rgba(217,170,69,0.25)] bg-black/40 cursor-grab active:cursor-grabbing touch-none transition-shadow ${
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

            {/* Linhas de Grade de Terços (Rule of Thirds - WhatsApp/Instagram) */}
            <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden">
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9AA45] via-[#E5BC5C] to-[#D9AA45] hover:brightness-110 active:scale-95 text-[#04281A] font-extrabold text-xs cursor-pointer disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(217,170,69,0.3)] hover:shadow-[0_6px_22px_rgba(217,170,69,0.45)] flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? "Salvando foto..." : "Concluir e Salvar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
