'use client';
import { useState } from 'react';
import UploadDocument from './components/UploadDocument';
import LineItemsTable from './components/LineItemsTable';
import Notification from './components/Notification';

export default function Home() {
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Handler for when upload is successful
  const handleExtracted = (items: any[]) => {
    setLineItems(items);
    setNotification('Line items extracted successfully!');
    setError(null);
  };

  // Handler for errors
  const handleError = (msg: string) => {
    setError(msg);
    setNotification(null);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-4">Endeavor Document Processing</h1>
      <p className="mb-8 text-lg text-gray-700 dark:text-gray-300">
        Upload a purchase order PDF to extract and match line items to your product catalog.
      </p>
      {notification && <Notification message={notification} type="success" />}
      {error && <Notification message={error} type="error" />}
      <UploadDocument
        onExtracted={handleExtracted}
        onError={handleError}
        loading={loading}
        setLoading={setLoading}
      />
      {lineItems.length > 0 && <LineItemsTable lineItems={lineItems} />}
    </div>
  );
}
