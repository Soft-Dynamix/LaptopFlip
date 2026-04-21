"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BarChart3, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Laptop } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SalesAnalyticsProps {
  laptops: Laptop[];
  loading?: boolean;
}

const CONDITION_COLORS: Record<string, string> = {
  Mint: "#059669",
  Excellent: "#0ea5e9",
  Good: "#f59e0b",
  Fair: "#f97316",
  Poor: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  active: "#059669",
  sold: "#3b82f6",
  archived: "#64748b",
};

const EMERALD_SHADES = [
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
];

export function SalesAnalytics({ laptops, loading }: SalesAnalyticsProps) {
  const analysis = useMemo(() => {
    if (!laptops || laptops.length === 0) return null;

    // Price Distribution
    const ranges = [
      { name: "Under R5K", min: 0, max: 5000, count: 0 },
      { name: "R5K-10K", min: 5000, max: 10000, count: 0 },
      { name: "R10K-15K", min: 10000, max: 15000, count: 0 },
      { name: "R15K-20K", min: 15000, max: 20000, count: 0 },
      { name: "R20K+", min: 20000, max: Infinity, count: 0 },
    ];
    laptops.forEach((l) => {
      for (const range of ranges) {
        if (l.askingPrice >= range.min && l.askingPrice < range.max) {
          range.count++;
          break;
        }
      }
    });

    // Condition Breakdown
    const conditionMap: Record<string, number> = {};
    laptops.forEach((l) => {
      conditionMap[l.condition] = (conditionMap[l.condition] || 0) + 1;
    });
    const conditionData = Object.entries(conditionMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: CONDITION_COLORS[name] || "#6b7280",
      }));

    // Status Overview
    const statusMap: Record<string, number> = {};
    laptops.forEach((l) => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    const statusData = Object.entries(statusMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: STATUS_COLORS[name] || "#6b7280",
      }));

    // Weekly Trend (laptops added over time by week)
    const weekMap: Record<string, number> = {};
    const sortedByDate = [...laptops].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    sortedByDate.forEach((l) => {
      const d = new Date(l.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weekMap[key] = (weekMap[key] || 0) + 1;
    });
    const trendData = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: week.slice(5), // "MM-DD"
        count,
      }));

    return { ranges, conditionData, statusData, trendData };
  }, [laptops]);

  const hasEnoughForCharts = laptops.length >= 2;
  const hasEnoughForTrend = laptops.length >= 3;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Accordion type="single" collapsible>
        <AccordionItem value="analytics" className="border-0">
          <AccordionTrigger className="py-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-base font-semibold">Sales Analytics</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-4">
            {!hasEnoughForCharts ? (
              <Card className="rounded-xl border-dashed border-2 border-muted py-8">
                <CardContent className="flex flex-col items-center gap-2 text-center p-4">
                  <BarChart3 className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Add at least 2 laptops to see analytics
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Price Distribution */}
                <Card className="rounded-xl border shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      Price Distribution
                    </h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis?.ranges} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              fontSize: "12px",
                              backgroundColor: "var(--popover)",
                              color: "var(--popover-foreground)",
                            }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {analysis?.ranges.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={EMERALD_SHADES[index]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-40" />
                </Card>

                {/* Condition Breakdown & Status Overview side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Condition Breakdown */}
                  <Card className="rounded-xl border shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                        Condition
                      </h3>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analysis?.conditionData}
                              cx="50%"
                              cy="45%"
                              innerRadius={30}
                              outerRadius={48}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {analysis?.conditionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                fontSize: "11px",
                                backgroundColor: "var(--popover)",
                                color: "var(--popover-foreground)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="mt-2 space-y-1">
                        {analysis?.conditionData.slice(0, 4).map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-[10px] text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="text-[10px] font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status Overview */}
                  <Card className="rounded-xl border shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                        Status
                      </h3>
                      {/* Centered count */}
                      <div className="flex items-center justify-center mb-3">
                        <div className="text-center">
                          <span className="text-2xl font-bold">{laptops.length}</span>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                      </div>
                      {/* Stacked horizontal bars */}
                      <div className="space-y-2">
                        {analysis?.statusData.map((item) => (
                          <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">{item.name}</span>
                              <span className="text-[10px] font-semibold">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / laptops.length) * 100}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Weekly Trend */}
                {hasEnoughForTrend && analysis?.trendData && analysis.trendData.length > 1 && (
                  <Card className="rounded-xl border shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Listings Added Over Time
                      </h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analysis.trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                              dataKey="week"
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                fontSize: "12px",
                                backgroundColor: "var(--popover)",
                                color: "var(--popover-foreground)",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#059669"
                              strokeWidth={2}
                              dot={{ fill: "#059669", r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                    <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-40" />
                  </Card>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
