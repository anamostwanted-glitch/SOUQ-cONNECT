import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageFile, ImageThumbnail } from './ImageThumbnail';

interface SortableItemProps {
  id: string;
  image: ImageFile;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onEnhance?: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, image, onRemove, onRetry, onEnhance }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <ImageThumbnail image={image} onRemove={onRemove} onRetry={onRetry} onEnhance={onEnhance} />
    </div>
  );
};

interface DraggableGridProps {
  images: ImageFile[];
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onEnhance?: (id: string) => void;
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({ images, setImages, onRemove, onRetry, onEnhance }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update isMain flag
        return newItems.map((item, index) => ({
          ...item,
          isMain: index === 0,
        }));
      });
    }
  };

  if (images.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-6">
        <SortableContext
          items={images.map(img => img.id)}
          strategy={rectSortingStrategy}
        >
          {images.map((image) => (
            <SortableItem 
              key={image.id} 
              id={image.id} 
              image={image} 
              onRemove={onRemove} 
              onRetry={onRetry} 
              onEnhance={onEnhance}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};
