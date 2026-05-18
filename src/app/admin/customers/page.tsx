"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Search, Star, TrendingUp, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  email: string;
  joined: string;
  orders: number;
  totalSpent: number;
  loyaltyPoints?: number;
  loyaltyTier?: string;
};

function tierFor(customer: Customer) {
  if (customer.loyaltyTier) return customer.loyaltyTier.replace(/-/g, " ");
  if ((customer.loyaltyPoints ?? 0) >= 1000 || customer.totalSpent >= 50000) return "gold";
  if ((customer.loyaltyPoints ?? 0) >= 500 || customer.totalSpent >= 20000) return "silver";
  return "bronze";
}

function lastSeenLabel(joined: string) {
  const date = new Date(joined);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadCustomers(query = searchTerm) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/customers?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(data.customers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(searchTerm), 250);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => ({
        orders: acc.orders + customer.orders,
        spent: acc.spent + customer.totalSpent,
        points: acc.points + (customer.loyaltyPoints ?? 0),
      }),
      { orders: 0, spent: 0, points: 0 }
    );
  }, [customers]);

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/10" aria-label="Back to admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
              <Users className="h-8 w-8 text-forest" /> Customers &amp; Loyalty
            </h1>
            <p className="text-sm text-mocha">
              {customers.length} customers • {totals.orders} orders • {formatPrice(totals.spent)} lifetime value
            </p>
          </div>
        </div>
        <Link href="/admin/export/customers" className="btn-secondary text-sm">
          Export customer CSV
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-mocha"><Users className="h-4 w-4" /> Customers</div>
          <div className="mt-2 text-2xl font-semibold text-espresso">{customers.length}</div>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-mocha"><TrendingUp className="h-4 w-4" /> Lifetime Value</div>
          <div className="mt-2 text-2xl font-semibold text-espresso">{formatPrice(totals.spent)}</div>
        </div>
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-mocha"><Star className="h-4 w-4" /> Loyalty Points</div>
          <div className="mt-2 text-2xl font-semibold text-espresso">{totals.points.toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-latte/20 bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-bronze/30 bg-bronze/10 p-4 text-sm text-espresso">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-latte/20 bg-card py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center text-mocha">
          <Users className="mx-auto h-12 w-12 text-latte" />
          <p className="mt-3 text-lg font-medium text-espresso">No customers found</p>
          <p className="text-sm">Profiles and online order history will appear here as customers order.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => {
            const tier = tierFor(customer);
            return (
              <article key={customer.id} className="rounded-2xl border border-latte/20 bg-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-heading text-xl font-semibold text-espresso">{customer.name || "Unnamed customer"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mocha">
                      <Mail className="h-4 w-4" /> {customer.email}
                      <span>• Joined {lastSeenLabel(customer.joined)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:min-w-[520px]">
                    <div>
                      <div className="font-mono text-2xl font-semibold text-espresso">{formatPrice(customer.totalSpent)}</div>
                      <div className="text-xs text-mocha">Lifetime Value</div>
                    </div>
                    <div>
                      <div className="font-mono text-2xl font-semibold text-espresso">{customer.orders}</div>
                      <div className="text-xs text-mocha">Orders</div>
                    </div>
                    <div>
                      <div className="font-mono text-2xl font-semibold text-forest">{(customer.loyaltyPoints ?? 0).toLocaleString()}</div>
                      <div className="text-xs text-mocha">Points</div>
                    </div>
                    <div className="self-center">
                      <span className="inline-flex rounded-full bg-surface px-4 py-1 text-xs font-medium capitalize text-sand">
                        {tier}
                      </span>
                    </div>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
