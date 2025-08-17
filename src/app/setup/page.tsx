'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetupSeedPage() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Cargando sesión…');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setStatus('Necesitas iniciar sesión.');
      else { setReady(true); setStatus('Listo para cargar datos base.'); }
    });
  }, []);

  const seed = async () => {
    setErr(null); setStatus('Cargando…');
    const { data: usr } = await supabase.auth.getUser();
    const user_id = usr.user?.id;
    if (!user_id) { setErr('Sin usuario.'); return; }

    const accounts = [
      { user_id, name: 'Interbank', currency: 'PEN', starting_balance: 0 },
      { user_id, name: 'Agora',     currency: 'PEN', starting_balance: 0 },
      { user_id, name: 'Lemon',     currency: 'PEN', starting_balance: 0 },
    ];
    const income = [
      { user_id, name: 'Sueldo',         type: 'income' as const },
      { user_id, name: 'Ingresos extra', type: 'income' as const },
      { user_id, name: 'Transferencias', type: 'income' as const },
    ];
    const expense = [
      { user_id, name: 'Comida',        type: 'expense' as const },
      { user_id, name: 'Pasajes',       type: 'expense' as const },
      { user_id, name: 'Familia',       type: 'expense' as const },
      { user_id, name: 'Salidas',       type: 'expense' as const },
      { user_id, name: 'Pago alquiler', type: 'expense' as const },
      { user_id, name: 'Servicios',     type: 'expense' as const },
      { user_id, name: 'Salud',         type: 'expense' as const },
      { user_id, name: 'Educación',     type: 'expense' as const },
      { user_id, name: 'Shopping',      type: 'expense' as const },
      { user_id, name: 'Imprevistos',   type: 'expense' as const },
    ];

    const a = await supabase.from('accounts').upsert(accounts, { onConflict: 'user_id,name' });
    if (a.error) return setErr(a.error.message);

    const c1 = await supabase.from('categories').upsert(income,  { onConflict: 'user_id,name,type' });
    if (c1.error) return setErr(c1.error.message);

    const c2 = await supabase.from('categories').upsert(expense, { onConflict: 'user_id,name,type' });
    if (c2.error) return setErr(c2.error.message);

    setDone(true); setStatus('¡Datos base cargados!');
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Cargar datos base</h1>
      <p className="opacity-80">{status}</p>
      {!ready ? <a className="underline" href="/auth">Ir a login</a> :
        <button className="border rounded-xl p-3" onClick={seed} disabled={done}>{done ? 'Listo ✔' : 'Cargar'}</button>
      }
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {done && <p>Revisa <a className="underline" href="/accounts">/accounts</a> y usa <a className="underline" href="/transactions">/transactions</a>.</p>}
    </main>
  );
}
