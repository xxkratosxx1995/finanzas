'use client';
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

type Account = { id: string; name: string; currency: string };

export default function TransfersPage() {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState<string|null>(null);

  useEffect(()=>{ supabase.auth.getSession().then(({data})=> setReady(!!data.session)); },[]);
  useEffect(()=>{ if(!ready) return; supabase.from('accounts').select('id,name,currency').order('name').then(({data})=> setAccounts((data||[]) as any)); },[ready]);

  const fromAcc = useMemo(()=>accounts.find(a=>a.id===fromId),[accounts,fromId]);
  const toAcc   = useMemo(()=>accounts.find(a=>a.id===toId),[accounts,toId]);

  if (!ready) return <p className="p-6">Necesitas iniciar sesión.</p>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);

    if (!fromId || !toId) return setErr('Selecciona cuentas origen y destino.');
    if (fromId === toId)  return setErr('La cuenta origen y destino no pueden ser la misma.');
    const amt = Number(amount.replace(',','.')); if (!Number.isFinite(amt) || amt <= 0) return setErr('Monto inválido.');
    if (!fromAcc || !toAcc) return setErr('Cuentas inválidas.');
    if (fromAcc.currency !== toAcc.currency) return setErr('Las cuentas deben tener la misma moneda (para MVP).');

    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user?.id;

    // 1) Registrar dos transacciones marcadas como transferencia
    const { error: e1 } = await supabase.from('transactions').insert([
      {
        user_id, account_id: fromId, category_id: null,
        type: 'expense', amount: amt, currency: fromAcc.currency,
        date: dateStr, note: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
        is_transfer: true
      } as any,
      {
        user_id, account_id: toId, category_id: null,
        type: 'income', amount: amt, currency: toAcc.currency,
        date: dateStr, note: note ? `Transferencia de ${fromAcc.name}: ${note}` : `Transferencia de ${fromAcc.name}`,
        is_transfer: true
      } as any
    ]);
    if (e1) return setErr(e1.message);

    // 2) Registrar en tabla transfers (histórico)
    const { error: e2 } = await supabase.from('transfers').insert({
      user_id, from_account_id: fromId, to_account_id: toId,
      amount: amt, currency: fromAcc.currency, date: dateStr, note: note || null
    } as any);
    if (e2) return setErr(e2.message);

    setOk('Transferencia registrada ✅');
    setAmount(''); setNote('');
  };

  return (
    <main className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Transferencias</h1>
      <form onSubmit={onSubmit} className="border rounded-2xl p-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <select className="border rounded-lg p-2" value={fromId} onChange={e=>setFromId(e.target.value)}>
            <option value="">Cuenta origen</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
          <select className="border rounded-lg p-2" value={toId} onChange={e=>setToId(e.target.value)}>
            <option value="">Cuenta destino</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded-lg p-2" placeholder="Monto" inputMode="decimal"
                 value={amount} onChange={e=>setAmount(e.target.value)} />
          <input type="date" className="border rounded-lg p-2" value={dateStr} onChange={e=>setDateStr(e.target.value)} />
        </div>
        <input className="border rounded-lg p-2" placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {ok && <p className="text-green-600 text-sm">{ok}</p>}
        <button className="border rounded-xl p-2">Transferir</button>
      </form>
      <p className="text-sm opacity-70">Las transferencias ajustan saldos de cuentas, pero <b>no</b> cuentan como ingresos/egresos en reportes.</p>
    </main>
  );
}
