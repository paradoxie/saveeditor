import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileUpload({ onFileSelect, accept }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ease-in-out
        ${isDragging
          ? 'border-primary-500 bg-primary-50 scale-[1.02] shadow-lg ring-4 ring-primary-100'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 hover:shadow-md'
        }
      `}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary-50/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 pointer-events-none">
          <div className="animate-bounce text-primary-600 font-bold text-xl">
            Drop to Edit!
          </div>
        </div>
      )}
      <input
        type="file"
        id="file-input"
        className="hidden"
        onChange={handleFileInput}
        {...(accept ? { accept } : {})}
      />

      <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="text-xl font-semibold text-gray-900 mb-2">
          {selectedFile ? selectedFile.name : 'Drop your save file here'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          or click to browse from your computer
        </p>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400 max-w-md">
          <span className="bg-gray-100 px-2 py-1 rounded">.rpgsave</span>
          <span className="bg-gray-100 px-2 py-1 rounded">.rmmzsave</span>
          <span className="bg-gray-100 px-2 py-1 rounded">.save</span>
          <span className="bg-gray-100 px-2 py-1 rounded">.sav</span>
          <span className="bg-gray-100 px-2 py-1 rounded">.xml</span>
          <span className="bg-gray-100 px-2 py-1 rounded">and more...</span>
        </div>
      </label>
    </div>
  );
}
