"use client";
import { useRef, useState } from 'react';

interface UploadDocumentProps {
  onExtracted: (items: any[]) => void;
  onError: (msg: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const UploadDocument = ({ onExtracted, onError, loading, setLoading }: UploadDocumentProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    onError("");
    try {
      const formData = new FormData();
      formData.append('file', file);
      // TODO: Add authentication if required
        const res = await fetch('http://localhost:8000/documents/upload', {
        method: 'POST',
        body: formData,
        // credentials: 'include', // if using cookies for auth
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      const data = await res.json();
      // Map backend fields to table fields
      const mappedItems = (data.extracted_line_items || []).map((item: any, idx: number) => ({
        id: idx,
        description: item["Request Item"] || item.description || '',
        quantity: item["Amount"] || item.quantity || '',
        ...item
      }));
      onExtracted(mappedItems);
    } catch (err: any) {
      onError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        ref={inputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleUploadClick}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
        disabled={loading}
      >
        Select PDF
      </button>
      {file && <div className="mb-2 text-gray-700 dark:text-gray-300">Selected file: {file.name}</div>}
      <button
        type="button"
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 mt-2 disabled:opacity-50"
        disabled={!file || loading}
        onClick={handleUpload}
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default UploadDocument;
