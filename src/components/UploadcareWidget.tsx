import React, { useEffect } from 'react';
import * as UC from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';

// Register blocks if needed (usually handled by the import, but being explicit helps in some environments)
import * as Blocks from '@uploadcare/blocks';
Blocks.registerBlocks();

interface Props {
  onUploadComplete: (videoUrl: string) => void;
  onUploadError?: (error: any) => void;
}

export function UploadcareWidget({ onUploadComplete, onUploadError }: Props) {
  const publicKey = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || "demopublickey";

  return (
    <div className="w-full flex flex-col items-center">
      <UC.FileUploaderMinimal
        pubkey={publicKey}
        multiple={false}
        imgOnly={false}
        accept="video/*"
        maxLocalFileSizeBytes={100 * 1024 * 1024} // 100MB limit
        className="uc-light"
        onFileUploadSuccess={(event: any) => {
          if (event && event.cdnUrl) {
            onUploadComplete(event.cdnUrl);
          }
        }}
        onFileUploadFailed={(event: any) => {
          console.error('Uploadcare upload failed:', event);
          if (onUploadError) onUploadError(event);
        }}
      />
      {publicKey === "demopublickey" && (
        <p className="mt-2 text-[9px] text-gray-400 italic">
          Usando chave de demonstração. Arquivos podem ser removidos em 24h.
        </p>
      )}
    </div>
  );
}
