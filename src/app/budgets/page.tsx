'use client';
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string; type: 'income'|'expense' };
type Budget = { id: string; category_id: string; period_month: number; period_year: number; limit_amount: number; currency: string };
type Tx = { category_id: string|null; amount: number; currency: string; type: 'income'|'expense'; date: string };

export default function BudgetsPage() {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  // periodo
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1); // 1-12

  // form crear/editar presupuesto
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState<string>('');
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState<string|null>(null);

  useEffect(()=>{ supabase.auth.getSession().then(({data})=> setReady(!!data.session)); }, []);
  useEffect(()=>{ if(!ready) return; supabase.from('categories').select('id,name,type').order('name').then(({data})=> setCategories((data||[]) as any)); },[ready]);

  const loadData = async ()=>{
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const end   = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`;

    const [b, t] = await Promise.all([
      supabase.from('budgets').select('*').eq('period_year', year).eq('period_month', month),
      supabase.from('transactions').select('category_id,amount,currency,type,date').eq('type','expense').gte('date',start).lte('date',end).eq('is_transfer',false)
    ]);
    setBudgets((b.data||[]) as any);
    setTxs((t.data||[]) as any);
  };
  useEffect(()=>{ if(ready) loadData(); },[ready, year, month]);

  const expenseCats = useMemo(()=> categories.filter(c=>c.type==='expense'),[categories]);

  const spentByCategory = useMemo(()=>{
    const m = new Map<string, number>();
    for (const t of txs) if (t.category_id) m.set(t.category_id, (m.get(t.category_id)||0) + t.amount);
    return m;
  },[txs]);

  const onSave = async (e: FormEvent)=>{
    e.preventDefault(); setErr(null); setOk(null);
    const lim = Number(limit.replace(',','.')); if(!Number.isFinite(lim) || lim < 0) return setErr('Límite inválido');
    if(!categoryId) return setErr('Selecciona una categoría');

    const catCurrency = 'PEN'; // si manejas múltiples monedas por presupuesto, cambia esto a tu preferencia
    const { error } = await supabase.from('budgets').upsert({
      category_id: categoryId, period_month: month, period_year: year, limit_amount: lim, currency: catCurrency
    } as any, { onConflict: 'user_id,category_id,period_month,period_year' } as any); // onConflict ya existe por unique
    if (error) return setErr(error.message);
    setOk('Presupuesto guardado ✅'); setLimit(''); setCategoryId(''); loadData();
  };

  const findBudget = (cid: string)=> budgets.find(b=>b.category_id===cid);
  const monthName = new Date(year, month-1, 1).toLocaleDateString(undefined,{month:'long', year:'numeric'});

  if (!ready) return <p className="p-6">Necesitas iniciar sesión.</p>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Presupuestos</h1>

      <section className="border rounded-2xl p-4 max-w-2xl">
        <h2 className="text-lg font-semibold">Periodo</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select className="border rounded-lg p-2" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{new Date(2000,m-1,1).toLocaleString(undefined,{month:'long'})}</option>)}
          </select>
          <input type="number" className="border rounded-lg p-2" value={year} onChange={e=>setYear(parseInt(e.target.value))}/>
        </div>
        <p className="mt-2 opacity-70 text-sm">Mostrando: {monthName}</p>
      </section>

      <section className="border rounded-2xl p-4 max-w-2xl">
        <h2 className="text-lg font-semibold">Nuevo / Editar presupuesto</h2>
        <form onSubmit={onSave} className="mt-3 grid gap-3">
          <select className="border rounded-lg p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
            <option value="">Categoría (egreso)</option>
            {expenseCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="border rounded-lg p-2" placeholder="Límite (PEN)" value={limit} onChange={e=>setLimit(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {ok && <p className="text-green-600 text-sm">{ok}</p>}
          <button className="border rounded-xl p-2">Guardar</button>
        </form>
      </section>

      <section className="max-w-3xl">
        <h2 className="text-lg font-semibold mb-2">Estado por categoría ({monthName})</h2>
        {expenseCats.length===0 ? <p className="opacity-70 text-sm">No hay categorías.</p> :
          <ul className="space-y-2">
            {expenseCats.map(c=>{
              const pres = findBudget(c.id);
              const gast = spentByCategory.get(c.id)||0;
              const limite = pres?.limit_amount ?? 0;
              const rest = limite - gast;
              const passed = limite > 0 && gast > limite;
              return (
                <li key={c.id} className={`border rounded-xl p-3 flex items-center justify-between ${passed?'border-red-500':''}`}>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm opacity-70">Gastado: {gast.toFixed(2)} / Límite: {limite.toFixed(2)} (PEN)</p>
                  </div>
                  <span className={`text-sm ${passed ? 'text-red-600 font-semibold' : 'opacity-80'}`}>
                    {passed ? '¡Excedido!' : `Te queda ${rest.toFixed(2)}`}
                  </span>
                </li>
              );
            })}
          </ul>}
      </section>
    </main>
  );
}
