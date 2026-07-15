import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Sun, Contrast, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PhotoEditorProps {
  photoUrl: string;
  onClose: () => void;
  onSave: (editedPhotoUrl: string) => void;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ photoUrl, onClose, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const editedImage = await getCroppedImg(
        photoUrl,
        croppedAreaPixels,
        rotation,
        brightness,
        contrast
      );
      onSave(editedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="absolute top-4 right-4 flex gap-4 z-10">
        <button onClick={onClose} className="p-2 text-white hover:text-red-400 transition-colors bg-black/50 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <button onClick={handleSave} className="p-2 text-white hover:text-green-400 transition-colors bg-blue-600 rounded-full px-4 flex items-center gap-2">
          <Check className="w-5 h-5" /> <span className="font-medium text-sm">Save</span>
        </button>
      </div>

      <div className="relative w-full max-w-2xl h-[50vh] md:h-[60vh] bg-black/50 rounded-xl overflow-hidden mt-12 mb-6 border border-slate-800">
        <Cropper
          image={photoUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={3 / 4} // Standard ID photo aspect ratio (passport size)
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          style={{
            containerStyle: { background: 'transparent' },
            mediaStyle: { filter: `brightness(${brightness}%) contrast(${contrast}%)` }
          }}
        />
      </div>

      <div className="w-full max-w-md space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
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
                setZoom(1);
                setRotation(0);
                setCrop({x: 0, y: 0});
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
export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: any,
  rotation = 0,
  brightness = 100,
  contrast = 100
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Calculate bounding box of the rotated image
  const rotRad = (rotation * Math.PI) / 180;
  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Draw rotated image
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  
  // Apply filters
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(image, 0, 0);

  // Crop the rotated image
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    return '';
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        resolve('');
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.95);
  });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid CORS issues
    image.src = url;
  });

export default PhotoEditor;
