import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Sun, Contrast, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PhotoEditorProps {
  photoUrl: string;
  onClose: () => void;
  onSave: (editedPhotoUrl: string) => void;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ photoUrl, onClose, onSave }) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 10,
    width: 50
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);

  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  const handleSave = async () => {
    try {
      if (imgRef.current && completedCrop?.width && completedCrop?.height) {
        const editedImage = await getCroppedImg(
          imgRef.current,
          completedCrop,
          rotation,
          brightness,
          contrast
        );
        onSave(editedImage);
      } else if (imgRef.current) {
        // If no crop, just apply filters
        const fullCrop: PixelCrop = {
          x: 0, y: 0,
          width: imgRef.current.width,
          height: imgRef.current.height,
          unit: 'px'
        };
        const editedImage = await getCroppedImg(
          imgRef.current,
          fullCrop,
          rotation,
          brightness,
          contrast
        );
        onSave(editedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200 p-4 overflow-y-auto">
      <div className="absolute top-4 right-4 flex gap-4 z-10">
        <button onClick={onClose} className="p-2 text-white hover:text-red-400 transition-colors bg-black/50 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <button onClick={handleSave} className="p-2 text-white hover:text-green-400 transition-colors bg-blue-600 rounded-full px-4 flex items-center gap-2">
          <Check className="w-5 h-5" /> <span className="font-medium text-sm">Save</span>
        </button>
      </div>

      <div className="relative w-full max-w-3xl flex-1 min-h-[40vh] bg-black/50 rounded-xl mt-12 mb-6 border border-slate-800 flex items-center justify-center p-4">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          className="flex items-center justify-center"
        >
          <img
            ref={imgRef}
            src={photoUrl}
            alt="Crop me"
            crossOrigin="anonymous"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              maxHeight: '60vh',
              maxWidth: '100%',
              display: 'block'
            }}
          />
        </ReactCrop>
      </div>

      <div className="w-full max-w-md space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl shrink-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Brightness</div>
            <span>{brightness}%</span>
          </div>
          <input
            type="range"
            value={brightness}
            min={0}
            max={200}
            step={1}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2"><Contrast className="w-4 h-4" /> Contrast</div>
            <span>{contrast}%</span>
          </div>
          <input
            type="range"
            value={contrast}
            min={0}
            max={200}
            step={1}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Rotation</div>
            <span>{rotation}°</span>
          </div>
          <input
            type="range"
            value={rotation}
            min={-180}
            max={180}
            step={1}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
            <button 
              onClick={() => {
                setBrightness(100);
                setContrast(100);
                setRotation(0);
                setCrop({ unit: '%', x: 25, y: 10, width: 50 });
              }}
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              Reset All
            </button>
        </div>
      </div>
    </div>
  , document.body);
};

// Helper function to draw cropped image
const getCroppedImg = async (
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  rotation = 0,
  brightness = 100,
  contrast = 100
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Calculate bounding box of the rotated image
  const rotRad = (rotation * Math.PI) / 180;
  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * image.naturalWidth) + Math.abs(Math.sin(rotRad) * image.naturalHeight);
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * image.naturalWidth) + Math.abs(Math.cos(rotRad) * image.naturalHeight);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Draw rotated image
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  
  // Apply filters
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(image, 0, 0);

  // Crop the rotated image
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    return '';
  }

  // In react-image-crop, pixelCrop is relative to the displayed image size.
  // We need to scale it to the natural image size.
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  let targetWidth = pixelCrop.width * scaleX;
  let targetHeight = pixelCrop.height * scaleY;
  
  // Downscale if too large to avoid localStorage quota issues
  const MAX_WIDTH = 300;
  if (targetWidth > MAX_WIDTH) {
    const aspectRatio = targetHeight / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = MAX_WIDTH * aspectRatio;
  }

  croppedCanvas.width = targetWidth;
  croppedCanvas.height = targetHeight;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  try {
    return croppedCanvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error('Canvas is tainted, returning original image', err);
    return image.src;
  }
};

export default PhotoEditor;
