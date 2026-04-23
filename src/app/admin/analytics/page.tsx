"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, ArrowLeft, TrendingUp, Users, Package, DollarSign, Loader2 } from "lucide-react";
import { BarChart } from "@/components/admin/BarChart";

interface AnalyticsData {
  revenue_by_day: Record<string, number>;
  orders_by_status: Record<string, number>;
  top_products: { name: string; units: number; revenue: number }[];
  category_breakdown: Record<string, { count: number; value: number }>;
  customers_by_day: Record<string, number>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-max py-12 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push("/admin")} className="btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Prepare chart data
  const revenueEntries = Object.entries(data.revenue_by_day)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([label, value]) => ({ label: label.slice(5), value }));

  const customerEntries = Object.entries(data.customers_by_day)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([label, value]) => ({ label: label.slice(5), value }));

  const totalRevenue = Object.values(data.revenue_by_day).reduce((a, b) => a + b, 0);
  const totalOrders = Object.values(data.orders_by_status).reduce((a, b) => a + b, 0);
  const totalCustomers = Object.values(data.customers_by_day).reduce((a, b) => a + b, 0);
  const totalUnits = data.top_products.reduce((a, b) => a + b.units, 0);

  return (
    <div className="container-max py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10 transition-colors">
          <ArrowLeft className="h-5 w-5 text-mocha" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-rust" />
            Analytics
          </h1>
          <p className="text-sm text-mocha">Last 30 days performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: `$${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, color: "text-sage" },
          { label: "Orders", value: totalOrders.toString(), icon: TrendingUp, color: "text-rust" },
          { label: "Units Sold", value: totalUnits.toString(), icon: Package, color: "text-amber-600" },
          { label: "New Customers", value: totalCustomers.toString(), icon: Users, color: "text-sky-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-latte/20 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-mocha">{kpi.label}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-espresso">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-espresso mb-4">Revenue (Last 14 Days)</h2>
          <BarChart data={revenueEntries} currency />
        </div>

        <div className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-espresso mb-4">New Customers (Last 14 Days)</h2>
          <BarChart data={customerEntries} color="#4a7c59" />
        </div>
      </div>

      {/* Top Products */}
      <div className="mt-6 rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-espresso mb-4">Top Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-latte/20 text-left text-xs font-medium uppercase tracking-wider text-mocha">
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4 text-right">Units Sold</th>
                <th className="pb-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-latte/10">
              {data.top_products.map((p) => (
                <tr key={p.name}>
                  <td className="py-3 pr-4 font-medium text-espresso">{p.name}</td>
                  <td className="py-3 pr-4 text-right text-mocha">{p.units}</td>
                  <td className="py-3 text-right text-mocha">${(p.revenue / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mt-6 rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-espresso mb-4">Category Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.category_breakdown).map(([cat, info]) => (
            <div key={cat} className="rounded-lg border border-latte/20 bg-cream p-4">
              <p className="font-medium text-espresso capitalize">{cat.replace(/-/g, " ")}</p>
              <p className="mt-1 text-sm text-mocha">{info.count} products</p>
              <p className="text-sm text-mocha">Avg price: ${((info.value / info.count) / 100).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
