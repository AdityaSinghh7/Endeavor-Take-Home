import React, { useState } from "react";
import ProductMatchDropdown from "./ProductMatchDropdown";

interface LineItem {
  id?: string | number;
  description: string;
  quantity: number;
  [key: string]: any;
}

interface ProductMatch {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface LineItemsTableProps {
  lineItems: LineItem[];
  onLineItemChange?: (idx: number, field: string, value: any) => void;
  onAddLineItem?: () => void;
  searchTerm?: string;
  matches?: Record<number, ProductMatch[]>;
  onDescriptionChange?: (idx: number, description: string) => void;
}

const LineItemsTable = ({ lineItems, onLineItemChange, onAddLineItem, searchTerm = "", matches = {}, onDescriptionChange }: LineItemsTableProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Record<string | number, string | number>>({});

  // Filter line items by search term
  const filteredLineItems = lineItems.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleDropdownChange = (idx: number, value: string | number) => {
    setSelectedProducts((prev) => ({ ...prev, [idx]: value }));
    if (onLineItemChange) {
      onLineItemChange(idx, "product_match", value);
    }
  };

  const handleInputChange = (idx: number, field: string, value: any) => {
    if (onLineItemChange) {
      onLineItemChange(idx, field, value);
    }
    if (field === "description" && onDescriptionChange) {
      onDescriptionChange(idx, value);
    }
  };

  // Determine columns dynamically
  const columns = filteredLineItems.length > 0 ? Object.keys(filteredLineItems[0]) : ["description", "quantity"];

  return (
    <div className="mt-8">
      <div className="mb-4 text-gray-700 text-sm">
        Review and adjust line items below. For each, confirm or change the matched product.
      </div>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-6 py-3 text-left text-gray-900 font-bold uppercase tracking-wider">{col.replace(/_/g, ' ').toUpperCase()}</th>
              ))}
              <th className="px-6 py-3 text-left text-gray-900 font-bold uppercase tracking-wider">Product Match</th>
            </tr>
          </thead>
          <tbody>
            {filteredLineItems.map((item, idx) => (
              <tr key={item.id || idx} className={
                (idx % 2 === 0 ? "bg-gray-50" : "bg-white") +
                " hover:bg-blue-50 transition-colors"
              }>
                {columns.map((col) => (
                  <td key={col} className="px-6 py-3 text-gray-800">
                    <input
                      className="border rounded px-2 py-1 w-full placeholder-gray-600"
                      placeholder={`Enter ${col}`}
                      value={item[col] ?? ""}
                      onChange={e => handleInputChange(idx, col, e.target.value)}
                    />
                  </td>
                ))}
                <td className="px-6 py-3 text-gray-800">
                  <ProductMatchDropdown
                    matches={matches[idx] || []}
                    value={item.product_match || selectedProducts[item.id || idx] || ""}
                    onChange={(val) => handleDropdownChange(idx, val)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold shadow"
          onClick={onAddLineItem}
        >
          + Add Line Item
        </button>
      </div>
    </div>
  );
};

export default LineItemsTable;
