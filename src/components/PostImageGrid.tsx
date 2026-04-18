import React from 'react';
import LazyImage from './LazyImage';

interface PostImageGridProps {
  imageUrls: string[];
  onImageClick: (src: string, alt: string) => void;
}

export default function PostImageGrid({ imageUrls, onImageClick }: PostImageGridProps) {
  if (!imageUrls || imageUrls.length === 0) return null;

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const renderGrid = () => {
    const count = imageUrls.length;

    if (count === 1) {
      return (
        <div className="rounded-2xl overflow-hidden border border-gray-100">
          <LazyImage
            src={imageUrls[0]}
            alt="Post attachment"
            className="w-full h-auto max-h-[512px] cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={(e) => {
              stopPropagation(e);
              onImageClick(imageUrls[0], 'Imagem do post');
            }}
          />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-gray-100 aspect-[16/9]">
          {imageUrls.map((url, index) => (
            <LazyImage
              key={index}
              src={url}
              alt={`Post attachment ${index}`}
              className="w-full h-full cursor-pointer"
              referrerPolicy="no-referrer"
              onClick={(e) => {
                stopPropagation(e);
                onImageClick(url, 'Imagem do post');
              }}
            />
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-2xl overflow-hidden border border-gray-100 aspect-[16/9]">
          <LazyImage
            src={imageUrls[0]}
            alt="Post attachment 0"
            className="w-full h-full cursor-pointer row-span-2"
            referrerPolicy="no-referrer"
            onClick={(e) => {
              stopPropagation(e);
              onImageClick(imageUrls[0], 'Imagem do post');
            }}
          />
          <LazyImage
            src={imageUrls[1]}
            alt="Post attachment 1"
            className="w-full h-full cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={(e) => {
              stopPropagation(e);
              onImageClick(imageUrls[1], 'Imagem do post');
            }}
          />
          <LazyImage
            src={imageUrls[2]}
            alt="Post attachment 2"
            className="w-full h-full cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={(e) => {
              stopPropagation(e);
              onImageClick(imageUrls[2], 'Imagem do post');
            }}
          />
        </div>
      );
    }

    if (count >= 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-2xl overflow-hidden border border-gray-100 aspect-[16/9]">
          {imageUrls.slice(0, 4).map((url, index) => (
            <LazyImage
              key={index}
              src={url}
              alt={`Post attachment ${index}`}
              className="w-full h-full cursor-pointer"
              referrerPolicy="no-referrer"
              onClick={(e) => {
                stopPropagation(e);
                onImageClick(url, 'Imagem do post');
              }}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return <div className="mt-3">{renderGrid()}</div>;
}
