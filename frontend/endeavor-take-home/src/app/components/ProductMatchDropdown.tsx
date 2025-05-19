import React from "react";

interface ProductMatch {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface ProductMatchDropdownProps {
  matches: ProductMatch[];
  value?: string | number;
  onChange?: (value: string | number) => void;
}

const ProductMatchDropdown = ({ matches, value, onChange }: ProductMatchDropdownProps) => {
  return (
    <select
      className="border rounded px-2 py-1"
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
    >
      <option value="">Select a product</option>
      {matches.map(match => (
        <option key={match.id} value={match.id}>
          {match.name}
        </option>
      ))}
    </select>
  );
};

export default ProductMatchDropdown;
