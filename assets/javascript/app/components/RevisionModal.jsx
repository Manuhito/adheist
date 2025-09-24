import React, { useState } from 'react';
import { Dialog, DialogContent } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { WandSparkles, ArrowUp } from 'lucide-react';

/**
 * RevisionModal - Modal minimalista para mostrar la imagen generada
 * @param {Object} props - Component props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {function} props.onOpenChange - Función para cambiar el estado del modal
 * @param {string} props.imageUrl - URL de la imagen a mostrar
 * @param {string} props.canvasSize - Tamaño del canvas (ej: "1024x1024")
 */
const RevisionModal = ({ open, onOpenChange, imageUrl, canvasSize }) => {
  // State for the edit description textarea
  const [editDescription, setEditDescription] = useState('');

  // Format canvas size for display (replace 'x' with ' x ')
  const formatCanvasSize = (size) => {
    if (!size) return '1024 x 1024';
    return size.replace('x', ' x ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 border-0 bg-transparent shadow-none">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          {/* Image container with lighter gray background and border */}
          <div className="bg-gray-100 dark:bg-gray-600 rounded-xl p-4 border border-gray-300 dark:border-gray-500 mb-4">
            {/* Header with title and canvas size inside container */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Generated Ad
              </h3>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {formatCanvasSize(canvasSize)}
              </span>
            </div>

            {/* Image */}
            <div className="flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Generated Ad for Revision"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-500 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit description textarea */}
          <div className="relative">
            <div className="relative">
              <WandSparkles className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe your edits (e.g. Make it more vibrant and colorful)"
                className="w-full pl-10 pr-20 min-h-[80px] resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                disabled={!editDescription.trim()}
                className={`absolute bottom-3 right-3 h-8 px-3 text-xs rounded-full ${
                  !editDescription.trim() 
                    ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed' 
                    : ''
                }`}
                size="sm"
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RevisionModal;
