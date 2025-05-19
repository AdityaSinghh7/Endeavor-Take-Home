'use client';
import { useEffect, useState } from 'react';
import UploadDocument from './components/UploadDocument';
import LineItemsTable from './components/LineItemsTable';
import Notification from './components/Notification';
import ProcessOrderModal from './components/ProcessOrderModal';

const statusColors: Record<string, string> = {
  Processed: "bg-yellow-200 text-yellow-800",
  Processing: "bg-blue-200 text-blue-800",
  Review: "bg-yellow-200 text-yellow-800",
  Finalized: "bg-green-200 text-green-800",
  Failed: "bg-red-200 text-red-800",
};

const filters = [
  { label: "All", color: "bg-gray-200 text-gray-800" },
  { label: "Processing", color: "bg-blue-200 text-blue-800" },
  { label: "Review", color: "bg-yellow-200 text-yellow-800" },
  { label: "Finalized", color: "bg-green-200 text-green-800" },
  { label: "Failed", color: "bg-red-200 text-red-800" },
];

const progressTabs = ["Processing", "Review", "Finalized", "Failed"];

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("Processing");
  const [showProcessOrder, setShowProcessOrder] = useState(false);
  const [modalPO, setModalPO] = useState<any | null>(null);
  const [modalLineItems, setModalLineItems] = useState<any[] | null>(null);
  const [modalMode, setModalMode] = useState<'new' | 'edit'>("new");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    fetch("http://localhost:8000/purchase_orders/")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch purchase orders");
        return res.json();
      })
      .then(data => setOrders(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) =>
    selectedTab === "All" ? true : (order.progress || order.status) === selectedTab.toLowerCase()
  );

  // Open modal for new PO
  const handleNewPO = () => {
    setModalMode("new");
    setModalPO(null);
    setModalLineItems(null);
    setShowProcessOrder(true);
  };

  // Open modal for existing PO
  const handleEditPO = async (order: any) => {
    setModalMode("edit");
    setLoading(true);
    try {
      const poRes = await fetch(`http://localhost:8000/purchase_orders/${order.id}`);
      const poData = await poRes.json();
      let lineItems: any[] = [];
      if (poData.document_id) {
        const liRes = await fetch(`http://localhost:8000/documents/${poData.document_id}/line_items`);
        lineItems = await liRes.json();
      }
      setModalPO(poData);
      setModalLineItems(lineItems);
      setShowProcessOrder(true);
    } catch (err) {
      setError("Failed to load purchase order details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = async (order: any) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;
    setDeletingId(order.id);
    try {
      await fetch(`http://localhost:8000/purchase_orders/${order.id}`, { method: 'DELETE' });
      fetchOrders();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <ProcessOrderModal
        open={showProcessOrder}
        onClose={() => setShowProcessOrder(false)}
        onSaved={() => {
          setShowProcessOrder(false);
          fetchOrders();
        }}
        mode={modalMode}
        poData={modalPO}
        lineItemsData={modalLineItems ?? undefined}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow"
          onClick={handleNewPO}
        >
          New Purchase Order
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        {progressTabs.map((tab) => (
          <button
            key={tab}
            className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 ${
              selectedTab === tab ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
            }`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto bg-white rounded shadow">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Request ID</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Request</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Finalized</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{order.id}</td>
                  <td className="px-4 py-2 text-gray-700">{order.date}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleEditPO(order)} title="View/Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 hover:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={() => handleDeletePO(order)} title="Delete" className="ml-2" disabled={deletingId === order.id}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${deletingId === order.id ? 'text-gray-400 animate-pulse' : 'text-red-500 hover:text-red-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">{order.progress === 'finalized' ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.progress ? `bg-blue-200 text-blue-800` : "bg-gray-200 text-gray-700"}`}>
                      {order.progress}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No purchase orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
