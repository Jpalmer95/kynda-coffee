"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Search } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  stock: number;
  type: "Cafe" | "Merch";
};

const initialProducts: Product[] = [
  { id: "p1", name: "Ethiopian Guji (12oz)", category: "Beans", price: 18.5, sku: "ETH-GUJI-12", stock: 42, type: "Cafe" },
  { id: "p2", name: "Honduras Finca Yaque (12oz)", category: "Beans", price: 17.0, sku: "HON-FINCA-12", stock: 8, type: "Cafe" },
  { id: "p3", name: "Kynda Ceramic Mug", category: "Merch", price: 22.0, sku: "MER-MUG-CER", stock: 25, type: "Merch" },
  { id: "p4", name: "Kynda T-Shirt (Black)", category: "Merch", price: 28.0, sku: "MER-TEE-BLK", stock: 15, type: "Merch" },
  { id: "p5", name: "Colombia Supremo (12oz)", category: "Beans", price: 16.5, sku: "COL-SUP-12", stock: 33, type: "Cafe" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | "Cafe" | "Merch">("All");

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = selectedType === "All" || p.type === selectedType;
    return matchSearch && matchType;
  });

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold">Products</h1>
            <p className="text-sm text-mocha">Manage all café and merch products</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-2">
          {(["All", "Cafe", "Merch"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 rounded-full text-sm font-medium border py-2 transition ${selectedType === t ? "bg-surface text-sand border-surface" : "bg-white hover:bg-latte/10"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-latte/20 rounded-2xl bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-latte/20 text-mocha">
            <tr>
              <th className="px-6 py-4 text-left font-medium">Product</th>
              <th className="px-6 py-4 text-left font-medium">SKU</th>
              <th className="px-6 py-4 text-left font-medium">Category</th>
              <th className="px-6 py-4 text-center font-medium">Type</th>
              <th className="px-6 py-4 text-center font-medium">Price</th>
              <th className="px-6 py-4 text-center font-medium">Stock</th>
              <th className="px-6 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-mocha">No products found.</td>
              </tr>
            )}
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-latte/5">
                <td className="px-6 py-4 font-medium text-espresso">{product.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-espresso/70">{product.sku}</td>
                <td className="px-6 py-4 text-sm text-mocha">{product.category}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full ${product.type === "Cafe" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                    {product.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-medium">${product.price}</td>
                <td className="px-6 py-4 text-center font-medium">{product.stock}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 hover:bg-latte/20 rounded"><Edit className="h-4 w-4" /></button>
                    <button className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-mocha/70 text-center">
        In production this page would sync directly with the Square Catalog and allow bulk updates.
      </div>
    </div>
  );
}
