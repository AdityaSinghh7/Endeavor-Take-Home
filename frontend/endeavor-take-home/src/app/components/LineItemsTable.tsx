interface LineItem {
  id?: string | number;
  description: string;
  quantity: number;
  [key: string]: any;
}

interface LineItemsTableProps {
  lineItems: LineItem[];
}

const LineItemsTable = ({ lineItems }: LineItemsTableProps) => {
  return (
    <div className="mt-8">
      <table className="min-w-full border border-gray-200 rounded bg-white">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left text-gray-900 font-semibold">Description</th>
            <th className="px-4 py-2 text-left text-gray-900 font-semibold">Quantity</th>
            <th className="px-4 py-2 text-left text-gray-900 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, idx) => (
            <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
              <td className="px-4 py-2 text-gray-800">{item.description}</td>
              <td className="px-4 py-2 text-gray-800">{item.quantity}</td>
              <td className="px-4 py-2 text-gray-800">(actions here)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LineItemsTable;
