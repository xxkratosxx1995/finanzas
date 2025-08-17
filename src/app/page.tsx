'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <p className="p-6">Cargando…</p>;

  if (!session) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Finanzas</h1>
        <p className="mt-2">Para continuar, inicia sesión con tu email.</p>
        <Link className="inline-block mt-4 underline" href="/auth">Ir a iniciar sesión</Link>
      </main>
    );
  }

  const user = session.user;

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Hola, {user.email}</h1>
      <p>¡Autenticación funcionando! Aquí irá tu dashboard.</p>
      <button onClick={signOut} className="rounded-xl p-3 border">Cerrar sesión</button>
    </main>
  );
}
