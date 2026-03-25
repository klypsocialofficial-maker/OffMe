import React, { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { getCroppedImg } from '../lib/imageUtils';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion } from 'motion/react';

interface ImageCropperProps {
  image: string;
  aspect: number;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  title?: string;
}

export default function ImageCropper({ image, aspect, onCropComplete, onCancel, title = 'Crop Image' }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onRotationChange = (rotation: number) => {
    setRotation(rotation);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation, image, onCropComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/50 backdrop-blur-md z-10">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-black tracking-tight">{title}</h3>
        <button
          onClick={showCroppedImage}
          className="px-6 py-2 bg-white text-black rounded-full font-black hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Apply
        </button>
      </div>

      {/* Cropper Container */}
      <div className="flex-1 relative bg-neutral-900">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          classes={{
            containerClassName: "bg-neutral-900",
            mediaClassName: "max-h-full",
          }}
        />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50 backdrop-blur-md space-y-6 z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-white/50" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <ZoomIn className="w-5 h-5 text-white/50" />
          </div>

          <div className="flex items-center gap-4">
            <RotateCw className="w-5 h-5 text-white/50" />
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              aria-labelledby="Rotation"
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <span className="text-white/50 text-xs font-bold w-8">{rotation}°</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {[1, 1.5, 2, 2.5, 3].map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`w-10 h-10 rounded-full border font-bold text-xs transition-all ${
                zoom === z ? 'bg-white text-black border-white' : 'text-white border-white/20 hover:border-white/50'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
