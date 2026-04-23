"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Users, Loader2, AlertCircle, Download } from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/export/csv";

interface Customer {
  id: string;
  name: string;
  email: string;
  joined: string;
  orders: number;
  totalSpent: number;
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/customers", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login?redirect=/admin/customers");
            return;
          }
          throw new Error("Failed to load customers");
        }
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, [router]);

  const filtered = q.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase())
      )
    : customers;

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <main className="min-h-screen bg-cream" role="main">
      <div className="container-max px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-rust"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-heading text-2xl font-bold text-espresso">Customers</h1>
              <p className="text-sm text-mocha">{customers.length} total customers</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/export/customers");
              const data = await res.json();
              if (data.rows) {
                const csv = toCsv(data.rows);
                downloadCsv("kynda-customers.csv", csv);
              }
            }}
            className="btn-secondary text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input-field pl-9"
              aria-label="Search customers"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rust" aria-hidden="true" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-latte/20 bg-white p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-latte" aria-hidden="true" />
            <p className="mt-3 font-medium text-espresso">No customers found</p>
            <p className="mt-1 text-sm text-mocha">
              {q ? "Try a different search term." : "Customers will appear here once they create accounts."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-latte/20 bg-white">
            {/* Mobile cards */}
            <div className="sm:hidden">
              {filtered.map((customer) => (
                <div key={customer.id} className="border-b border-latte/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-espresso">{customer.name}</p>
                    <span className="text-xs text-mocha">{customer.orders} orders</span>
                  </div>
                  <p className="mt-1 text-sm text-mocha">{customer.email}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-mocha">
                      Joined {new Date(customer.joined).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-espresso">{formatCents(customer.totalSpent)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden w-full sm:table">
              <thead>
                <tr className="border-b border-latte/10 bg-cream/50 text-left text-xs font-medium uppercase tracking-wider text-mocha">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Orders</th>
                  <th className="px-6 py-3 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-cream/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-espresso">{customer.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-mocha">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-mocha">
                      {new Date(customer.joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-mocha">{customer.orders}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-espresso">
                      {formatCents(customer.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
