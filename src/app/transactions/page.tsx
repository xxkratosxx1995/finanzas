'use client';
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; type: 'income' | 'expense' };
type Tx = { id: string; type: 'income'|'expense'; amount: number; currency: string; date: string; note: string|null;
  account_id: string; category_id: string|null; is_transfer: boolean;
  account?: { name: string }; category?: { name: string|null } };

const firstDay = (d: Date)=> new Date(d.getFullYear(), d.getMonth(), 1);
const lastDay  = (d: Date)=> new Date(d.getFullYear(), d.getMonth()+1, 0);

export default function TransactionsPage() {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const now = new Date();
  const [from, setFrom] = useState(format(firstDay(now), 'yyyy-MM-dd'));
  const [to,   setTo]   = useState(format(lastDay(now),  'yyyy-MM-dd'));
  const [includeTransfers, setIncludeTransfers] = useState(false);

  // form
  const [type, setType] = useState<'income'|'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(format(now,'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState(''); const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState(''); const [err, setErr] = useState<string|null>(null); const [ok, setOk] = useState<string|null>(null);

  useEffect(()=>{ supabase.auth.getSession().then(({data})=> setReady(!!data.session)); }, []);
  useEffect(()=>{ if(!ready) return; (async()=>{
    setLoading(true);
    const [a,c] = await Promise.all([
      supabase.from('accounts').select('id,name,currency').order('name'),
      supabase.from('categories').select('id,name,type').order('name'),
    ]);
    if(!a.error && a.data) setAccounts(a.data as any);
    if(!c.error && c.data) setCategories(c.data as any);
    setLoading(false);
  })(); },[ready]);

  const loadTxs = async ()=>{
    let q = supabase
      .from('transactions')
      .select('id,type,amount,currency,date,note,is_transfer,account_id,category_id,account:account_id(name),category:category_id(name)')
      .gte('date', from).lte('date', to)
      .order('date',{ascending:false}).limit(200);
    if (!includeTransfers) q = q.eq('is_transfer', false);
    const { data } = await q;
    setTxs((data||[]) as any);
  };
  useEffect(()=>{ if(ready) loadTxs(); },[ready, from, to, includeTransfers]);

  const selectedAccount = useMemo(()=> accounts.find(a=>a.id===accountId),[accounts,accountId]);
  const currency = selectedAccount?.currency ?? 'PEN';
  const filteredCategories = useMemo(()=> categories.filter(c=>c.type===type),[categories,type]);

  if (!ready) return <p className="p-6">Necesitas iniciar sesión.</p>;

  const onSubmit = async (e: FormEvent)=> {
    e.preventDefault(); setErr(null); setOk(null);
    const amt = Number(amount.replace(',','.')); if(!Number.isFinite(amt)||amt<=0) return setErr('Monto inválido');
    if(!accountId) return setErr('Selecciona una cuenta');
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('transactions').insert({
      user_id: u.user?.id, account_id: accountId, category_id: categoryId || null,
      type, amount: amt, currency, date: dateStr, note: note.trim()||null, is_transfer: false
    } as any);
    if (error) return setErr(error.message);
    setOk('Guardado ✅'); setAmount(''); setNote(''); loadTxs();
  };
  const onDelete = async (id: string)=> { await supabase.from('transactions').delete().eq('id',id); setTxs(txs.filter(t=>t.id!==id)); };

  const exportExcel = () => {
    const rows = txs.map(t=>({
      Fecha: t.date,
      Tipo: t.type,
      Monto: t.amount,
      Moneda: t.currency,
      Cuenta: t.account?.name,
      Categoria: t.category?.name || '',
      Nota: t.note || '',
      EsTransferencia: t.is_transfer ? 'Sí' : 'No'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, `transacciones_${from}_a_${to}.xlsx`);
  };

  return (
    <main className="p-6 space-y-8">
      {/* Filtros */}
      <section className="max-w-3xl border rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 items-center">
          <input type="date" className="border rounded-lg p-2" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" className="border rounded-lg p-2" value={to}   onChange={e=>setTo(e.target.value)} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeTransfers} onChange={e=>setIncludeTransfers(e.target.checked)} />
          Incluir transferencias en la lista
        </label>
        <div className="mt-3">
          <button className="border rounded-xl px-3 py-2" onClick={exportExcel}>Exportar a Excel</button>
        </div>
      </section>

      {/* Formulario */}
      <section className="max-w-2xl border rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Registrar transacción</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={()=>setType('expense')} className={`border rounded-xl px-3 py-2 ${type==='expense'?'bg-white/10':''}`}>Egreso</button>
            <button type="button" onClick={()=>setType('income')}  className={`border rounded-xl px-3 py-2 ${type==='income' ?'bg-white/10':''}`}>Ingreso</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-lg p-2" placeholder="Monto" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <input type="date" className="border rounded-lg p-2" value={dateStr} onChange={e=>setDateStr(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg p-2" value={accountId} onChange={e=>setAccountId(e.target.value)}>
              <option value="">Cuenta (de dónde)</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
            <select className="border rounded-lg p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
              <option value="">{type==='expense'?'Categoría de egreso':'Categoría de ingreso'}</option>
              {categories.filter(c=>c.type===type).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input className="border rounded-lg p-2" placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)}/>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {ok && <p className="text-green-600 text-sm">{ok}</p>}
          <div className="flex items-center gap-3">
            <button className="border rounded-xl px-4 py-2">Guardar</button>
            <span className="opacity-70 text-sm">Moneda: {currency}</span>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section className="max-w-3xl">
        <h2 className="text-lg font-semibold mb-2">Transacciones ({txs.length})</h2>
        {loading ? <p>Cargando…</p> : txs.length===0 ? <p className="opacity-70 text-sm">Sin resultados.</p> :
          <ul className="space-y-2">
            {txs.map(t=>(
              <li key={t.id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t.type==='expense'?'−': '+'}{t.amount.toFixed(2)} {t.currency} • {t.account?.name}{t.category?.name?` • ${t.category.name}`:''}
                    {t.is_transfer ? ' • Transferencia' : ''}
                  </p>
                  <p className="text-sm opacity-70">{new Date(t.date).toLocaleDateString()} {t.note?`• ${t.note}`:''}</p>
                </div>
                <button className="text-sm underline" onClick={()=>onDelete(t.id)}>Eliminar</button>
              </li>
            ))}
          </ul>}
      </section>
    </main>
  );
}
