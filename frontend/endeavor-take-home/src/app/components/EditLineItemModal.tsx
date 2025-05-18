const EditLineItemModal = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Line Item</h2>
        <div className="mb-4">(form fields here)</div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditLineItemModal;
