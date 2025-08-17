'use client';
import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Account = { id: string; name: string; currency: string; starting_balance: number };
type BalanceRow = { account_id: string; user_id: string; name: string; currency: string; balance: number };

export default function AccountsPage() {
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<Account[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [name, setName] = useState(''); const [currency, setCurrency] = useState('PEN');
  const [starting, setStarting] = useState<number>(0); const [error, setError] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setReady(!!data.session)); }, []);

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from('accounts').select('id,name,currency,starting_balance').order('name'),
      supabase.from('v_account_balances').select('*').order('name')
    ]);
    setList((a.data || []) as Account[]);
    setBalances((b.data || []) as BalanceRow[]);
  };

  useEffect(() => { if (ready) load(); }, [ready]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('accounts').insert({
      user_id: u.user?.id, name: name.trim(), currency, starting_balance: starting
    } as any);
    if (error) return setError(error.message);
    setName(''); setStarting(0); load();
  };

  const onDelete = async (id: string) => {
    await supabase.from('accounts').delete().eq('id', id);
    load();
  };

  if (!ready) return <p className="p-6">Necesitas iniciar sesión.</p>;

  // helper para leer saldo actual por cuenta
  const current = (id: string) => balances.find(b => b.account_id === id)?.balance ?? 0;

  return (
    <main className="p-6 space-y-6">
      <section className="max-w-xl border rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Nueva cuenta</h2>
        <form onSubmit={onCreate} className="mt-3 grid gap-3">
          <input className="border rounded-lg p-2" placeholder="Nombre (Interbank, Agora…)"
            value={name} onChange={e=>setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg p-2" value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option value="PEN">PEN</option><option value="USD">USD</option>
            </select>
            <input type="number" step="0.01" className="border rounded-lg p-2" placeholder="Saldo inicial"
              value={starting} onChange={e=>setStarting(parseFloat(e.target.value))}/>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="border rounded-xl p-2">Crear</button>
        </form>
      </section>

      <section className="max-w-3xl">
        <h2 className="text-lg font-semibold mb-2">Tus cuentas</h2>
        {list.length===0 ? <p className="text-sm opacity-75">Aún no tienes cuentas.</p> :
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(a=>(
              <li key={a.id} className="border rounded-xl p-3 flex flex-col">
                <p className="font-medium">{a.name}</p>
                <p className="text-sm opacity-70">{a.currency}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="border rounded-lg p-2">
                    <p className="opacity-70">Saldo inicial</p>
                    <p className="text-lg">{a.starting_balance.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-2">
                    <p className="opacity-70">Saldo actual</p>
                    <p className="text-lg">{current(a.id).toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={()=>onDelete(a.id)} className="text-sm underline mt-2 self-end">Eliminar</button>
              </li>
            ))}
          </ul>}
      </section>
    </main>
  );
}
