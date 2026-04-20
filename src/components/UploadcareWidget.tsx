import React, { useRef, useEffect } from 'react';
import * as UC from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';

interface Props {
  onUploadComplete: (videoUrl: string) => void;
  options?: any;
}

export function UploadcareWidget({ onUploadComplete, options }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full relative" ref={containerRef}>
      <UC.FileUploaderRegular
        className="uc-light"
        pubkey={import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || "demopublickey"} /* Use "demopublickey" as fallback for demo */
        multiple={false}
        imgOnly={false}
        accept="video/*"
        onFileUploadSuccess={(event: any) => {
          if (event && event.cdnUrl) {
            onUploadComplete(event.cdnUrl);
          }
        }}
      />
    </div>
  );
}
