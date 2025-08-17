'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

type BalanceRow = { account_id: string; user_id: string; name: string; currency: string; balance: number; };
type Tx = { id: string; type: 'income'|'expense'; amount: number; currency: string; date: string; category?: { name: string|null } };
type Mode = 'month' | 'range';

const firstDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastDay  = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function DashboardPage() {
  // ── estado base
  const [ready, setReady] = useState(false);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  // ── filtros
  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [from, setFrom] = useState(iso(firstDay(now)));
  const [to,   setTo]   = useState(iso(lastDay(now)));
  const [label, setLabel] = useState('');

  // ── derivadas (siempre antes de cualquier return)
  const totalsByCurrency = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const t of txs) {
      if (!map[t.currency]) map[t.currency] = { income: 0, expense: 0 };
      if (t.type === 'income') map[t.currency].income += t.amount;
      else map[t.currency].expense += t.amount;
    }
    return map;
  }, [txs]);

  const expenseByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) {
      if (t.type === 'expense') {
        const key = t.category?.name || 'Sin categoría';
        m.set(key, (m.get(key) || 0) + t.amount);
      }
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [txs]);

  // datos para gráficos: una fila por moneda con Ingresos/Egresos
  const chartDataByCurrency = useMemo(() => {
    const o: Record<string, Array<{ name: string; Ingresos: number; Egresos: number }>> = {};
    for (const [cur, v] of Object.entries(totalsByCurrency)) {
      o[cur] = [{ name: cur, Ingresos: +v.income.toFixed(2), Egresos: +v.expense.toFixed(2) }];
    }
    return o;
  }, [totalsByCurrency]);

  // ── sesión
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setReady(!!data.session)); }, []);

  // ── cargar datos según filtros (excluye transferencias)
  useEffect(() => {
    if (!ready) return;
    (async () => {
      // balances por cuenta (no dependen del rango)
      const vb = await supabase.from('v_account_balances').select('*').order('name');
      if (!vb.error && vb.data) setBalances(vb.data as any);

      let start: string, end: string, lbl: string;
      if (mode === 'month') {
        const s = new Date(year, month - 1, 1);
        const e = new Date(year, month, 0);
        start = iso(s); end = iso(e);
        lbl = s.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      } else {
        start = from; end = to;
        const sD = new Date(from); const eD = new Date(to);
        lbl = `${sD.toLocaleDateString()} – ${eD.toLocaleDateString()}`;
      }
      setLabel(lbl);

      const { data } = await supabase
        .from('transactions')
        .select('id,type,amount,currency,date,category:category_id(name)')
        .eq('is_transfer', false)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      setTxs((data || []) as any);
    })();
  }, [ready, mode, year, month, from, to]);

  if (!ready) return <p className="p-6">Necesitas iniciar sesión.</p>;

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Filtros */}
      <section className="max-w-4xl border rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-2">Filtros</h2>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={mode==='month'} onChange={()=>setMode('month')} />
            Por mes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={mode==='range'} onChange={()=>setMode('range')} />
            Rango
          </label>
        </div>

        {mode === 'month' ? (
          <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
            <select className="border rounded-lg p-2" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <option key={m} value={m}>{new Date(2000,m-1,1).toLocaleString(undefined,{month:'long'})}</option>
              ))}
            </select>
            <input type="number" className="border rounded-lg p-2" value={year} onChange={e=>setYear(parseInt(e.target.value))}/>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
            <input type="date" className="border rounded-lg p-2" value={from} onChange={e=>setFrom(e.target.value)} />
            <input type="date" className="border rounded-lg p-2" value={to}   onChange={e=>setTo(e.target.value)} />
          </div>
        )}
        <p className="mt-2 opacity-70 text-sm">Mostrando: {label}</p>
      </section>

      {/* Balances por cuenta */}
      <section className="max-w-4xl">
        <h2 className="text-lg font-semibold mb-2">Balances por cuenta</h2>
        {balances.length===0 ? <p className="opacity-70 text-sm">Aún no hay cuentas o transacciones.</p> :
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {balances.map(b=>(
              <li key={b.account_id} className="border rounded-xl p-4">
                <p className="font-medium">{b.name}</p>
                <p className="text-sm opacity-70">{b.currency}</p>
                <p className="text-xl mt-2">{b.balance.toFixed(2)}</p>
              </li>
            ))}
          </ul>}
      </section>

      {/* Resumen + gráfico por moneda */}
      <section className="max-w-4xl space-y-4">
        <h2 className="text-lg font-semibold">Resumen de {label}</h2>

        {Object.keys(totalsByCurrency).length===0 ? (
          <p className="opacity-70 text-sm">Sin movimientos en este período.</p>
        ) : (
          Object.entries(totalsByCurrency).map(([cur, vals])=>{
            const net = vals.income - vals.expense;
            const data = chartDataByCurrency[cur];

            return (
              <div key={cur} className="border rounded-xl p-4 space-y-3">
                <p className="font-medium">{cur}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="border rounded-lg p-2">
                    <p className="opacity-70">Ingresos</p>
                    <p className="text-lg">{vals.income.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-2">
                    <p className="opacity-70">Egresos</p>
                    <p className="text-lg">-{vals.expense.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-2">
                    <p className="opacity-70">Neto</p>
                    <p className="text-lg">{net.toFixed(2)}</p>
                  </div>
                </div>

                {/* Gráfico de barras: Ingresos vs Egresos */}
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Ingresos" />
                      <Bar dataKey="Egresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Top gastos por categoría */}
      <section className="max-w-4xl">
        <h2 className="text-lg font-semibold mb-2">Top gastos por categoría ({label})</h2>
        {expenseByCat.length===0 ? <p className="opacity-70 text-sm">Sin egresos en este período.</p> :
          <ul className="space-y-2">
            {expenseByCat.map(([cat,total])=>(
              <li key={cat} className="border rounded-xl p-3 flex items-center justify-between">
                <span>{cat}</span><span>{total.toFixed(2)}</span>
              </li>
            ))}
          </ul>}
      </section>
    </main>
  );
}
