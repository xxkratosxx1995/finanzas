'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Intercambia el código del link por una sesión válida (si viene como ?code=...)
      await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {});
      router.replace('/'); // o a donde quieras llevar al usuario
    })();
  }, [router]);

  return <p className="p-6">Iniciando sesión…</p>;
}
