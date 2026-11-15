"use client";

import { Cell, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKES, monthLabel } from "@/lib/format";

export interface ChartPoint {
  month: string;
  expected: number;
  collected: number;
}

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function CollectionChart({ data }: { data: ChartPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month, true) }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Bar chart of rent expected versus collected for the last six months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            formatter={(v: number) => formatKES(v)}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              color: "hsl(var(--foreground))",
              fontSize: 13,
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="expected" name="Expected" fill="hsl(var(--muted-foreground) / 0.35)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="collected" name="Collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.month} fill="hsl(var(--primary))" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
