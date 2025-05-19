import React, { useState, useRef, useEffect } from "react";
import LineItemsTable from "./LineItemsTable";
import dayjs from "dayjs";

interface ProductMatch {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface ProcessOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: 'new' | 'edit';
  poData?: any;
  lineItemsData?: any[];
}

const tabs = ["Upload", "Extract + Match"];

const initialLineItems = [
  { itm: "12", description: "DEKO VOYAGE 5/4 X 6 SIE", quantity: "0.096 317", uom: "MBIF", price: "" },
  { itm: "15", description: "DEKO VOYAGE 7/16 X 12 MBIF", quantity: "0.026 112", uom: "MBIF", price: "" },
];

const progressOptions = ["processing", "review", "finalized"];

const ProcessOrderModal: React.FC<ProcessOrderModalProps> = ({ open, onClose, onSaved, mode, poData, lineItemsData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lineItems, setLineItems] = useState<any[]>(initialLineItems);
  const [matches, setMatches] = useState<Record<number, ProductMatch[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [poInfo, setPoInfo] = useState({
    requestId: "1730261419548",
    deliveryAddress: "NA",
    poDate: dayjs().format("YYYY-MM-DD"),
    poNumber: "NA",
    progress: "processing",
  });
  const [documentId, setDocumentId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && poData) {
      setPoInfo({
        requestId: String(poData.id),
        deliveryAddress: '', // You may want to fetch this if available
        poDate: poData.date,
        poNumber: '', // You may want to fetch this if available
        progress: poData.progress,
      });
      setLineItems(lineItemsData || []);
      setActiveTab(1);
      setSelectedFile(null);
    } else if (mode === 'new') {
      setPoInfo({
        requestId: '',
        deliveryAddress: 'NA',
        poDate: dayjs().format('YYYY-MM-DD'),
        poNumber: 'NA',
        progress: 'processing',
      });
      setLineItems([]);
      setMatches({});
      setActiveTab(0);
      setSelectedFile(null);
      setDocumentId(null);
    }
  }, [open, mode, poData, lineItemsData]);

  // Fetch next PO ID when switching to Extract+Match tab in 'new' mode
  useEffect(() => {
    if (open && mode === 'new' && activeTab === 1 && !poInfo.requestId) {
      fetch('http://localhost:8000/purchase_orders/next_id')
        .then(res => res.json())
        .then(id => {
          let nextId = id;
          if (typeof id === 'object' && id !== null) {
            const values = Object.values(id);
            nextId = values.length > 0 ? values[0] : 1;
          }
          if (!nextId || isNaN(Number(nextId))) nextId = 1;
          setPoInfo(prev => ({ ...prev, requestId: String(nextId) }));
        })
        .catch(() => setPoInfo(prev => ({ ...prev, requestId: String(1) })));
    }
  }, [open, mode, activeTab]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setLoading(true);
    setError(null);
    try {
      // Upload file to backend
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("http://localhost:8000/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.detail || "Upload failed");
      }
      const data = await uploadRes.json();
      setDocumentId(data.document_id);
      // Extract line items
      const extracted = (data.extracted_line_items || []).map((item: any, idx: number) => ({
        id: idx,
        description: item["Request Item"] || item.description || '',
        quantity: item["Amount"] || item.quantity || '',
        ...item
      }));
      setLineItems(extracted);
      // Call batch match endpoint
      const descs = extracted.map((item: any) => item.description);
      const matchRes = await fetch("http://localhost:8000/matchings/external-batch-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: descs }),
      });
      if (!matchRes.ok) throw new Error("Failed to fetch product matches");
      const matchData = await matchRes.json();
      // Map matches to row index
      const matchMap: Record<number, ProductMatch[]> = {};
      extracted.forEach((item: any, idx: number) => {
        const matchesForItem = (matchData.results && matchData.results[item.description]) || [];
        matchMap[idx] = matchesForItem.slice(0, 10).map((m: any) => ({ id: m.match, name: m.match, score: m.score }));
      });
      setMatches(matchMap);
      setActiveTab(1);
    } catch (err: any) {
      setError(err.message || "Upload or extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLineItemChange = (idx: number, field: string, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handlePoInfoChange = (field: string, value: string) => {
    setPoInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: "", uom: "", price: "", product_match: "" },
    ]);
  };

  // When a description changes, fetch matches for that row only
  const handleDescriptionChange = async (idx: number, description: string) => {
    if (!description) return;
    setLoading(true);
    setError(null);
    try {
      const matchRes = await fetch("http://localhost:8000/matchings/external-batch-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: [description] }),
      });
      if (!matchRes.ok) throw new Error("Failed to fetch product matches");
      const matchData = await matchRes.json();
      setMatches((prev) => ({
        ...prev,
        [idx]: (matchData.results && matchData.results[description] || []).slice(0, 10).map((m: any) => ({ id: m.match, name: m.match, score: m.score })),
      }));
    } catch (err: any) {
      setError(err.message || "Failed to fetch product matches");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      // Save PO
      const res = await fetch("http://localhost:8000/purchase_orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: poInfo.progress,
          date: poInfo.poDate,
          document_id: documentId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save purchase order");
      // Save line items if documentId is set
      if (documentId) {
        const liRes = await fetch(`http://localhost:8000/documents/${documentId}/line_items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lineItems),
        });
        if (!liRes.ok) throw new Error("Failed to save line items");
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save purchase order");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      {/* Overlay */}
      <div className="absolute inset-0 z-40" onClick={onClose}></div>
      {/* Fullscreen modal panel */}
      <div className="relative z-50 w-full h-full max-w-full max-h-full bg-white shadow-xl flex flex-col rounded-none overflow-y-auto">
        {/* Close button */}
        <button
          className="absolute top-6 right-8 text-gray-400 hover:text-gray-600 text-3xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        {/* Header */}
        <div className="px-12 pt-10 pb-4 border-b">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">Process Order</h2>
          <div className="flex gap-8 border-b">
            {tabs.map((tab, idx) => (
              <button
                key={tab}
                className={`pb-3 px-2 text-xl font-medium border-b-2 transition-colors ${
                  activeTab === idx
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-black"
                }`}
                onClick={() => setActiveTab(idx)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-auto">
          {activeTab === 0 && (
            // Upload Tab
            <div
              className="flex-1 flex items-center justify-center border-dashed border-2 border-gray-200 m-12 rounded-lg min-h-[350px] cursor-pointer hover:bg-gray-50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                {selectedFile ? (
                  <p className="text-gray-700 font-medium">{selectedFile.name}</p>
                ) : (
                  <p className="text-gray-600">Drag PDF file here or click to upload.</p>
                )}
                {loading && <div className="mt-4 text-blue-600">Uploading and extracting...</div>}
                {error && <div className="mt-4 text-red-600">{error}</div>}
              </div>
            </div>
          )}
          {activeTab === 1 && (
            // Extract + Match Tab
            <div className="w-full flex flex-col gap-8 p-12">
              {/* PO Info Form */}
              <div className="flex flex-wrap gap-6 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-600 mb-1">Request ID</label>
                  <input className="w-full border rounded px-2 py-1 bg-gray-100 text-gray-900" value={String(poInfo.requestId)} disabled />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-600 mb-1">Delivery Address</label>
                  <input className="w-full border rounded px-2 py-1 placeholder-gray-500 text-gray-900" placeholder="Enter delivery address" value={poInfo.deliveryAddress} onChange={e => handlePoInfoChange("deliveryAddress", e.target.value)} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-600 mb-1">PO Date</label>
                  <input className="w-full border rounded px-2 py-1 placeholder-gray-500 text-gray-900" type="date" placeholder="YYYY-MM-DD" value={poInfo.poDate} onChange={e => handlePoInfoChange("poDate", e.target.value)} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-600 mb-1">PO Number</label>
                  <input className="w-full border rounded px-2 py-1 placeholder-gray-500 text-gray-900" placeholder="Enter PO number" value={poInfo.poNumber} onChange={e => handlePoInfoChange("poNumber", e.target.value)} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-600 mb-1">Progress</label>
                  <select className="w-full border rounded px-2 py-1 text-gray-900" value={poInfo.progress} onChange={e => handlePoInfoChange("progress", e.target.value)}>
                    {progressOptions.map(opt => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Search bar */}
              <div className="mb-2">
                <input
                  className="w-full border rounded px-2 py-1 mb-2 placeholder-gray-500 text-gray-900"
                  placeholder="Search line items..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Editable LineItemsTable with product match dropdowns */}
              <LineItemsTable
                lineItems={lineItems}
                onLineItemChange={handleLineItemChange}
                onAddLineItem={handleAddLineItem}
                searchTerm={searchTerm}
                matches={matches}
                onDescriptionChange={handleDescriptionChange}
              />
              {/* Save/Process Button */}
              <div className="flex justify-end mt-8">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow" onClick={handleSaveProcess} disabled={loading}>
                  {loading ? "Saving..." : "Save / Process"}
                </button>
              </div>
              {loading && <div className="mt-4 text-blue-600">Loading product matches...</div>}
              {error && <div className="mt-4 text-red-600">{error}</div>}
            </div>
          )}
        </div>
        {/* Note */}
        <div className="px-12 py-3 text-xs text-gray-500 border-t">
          <div>Note: Upload files may also be emailed directly to <a href="mailto:po@endeavorai.com" className="underline">po@endeavorai.com</a> and accessed here after processing</div>
        </div>
      </div>
    </div>
  );
};

export default ProcessOrderModal; 