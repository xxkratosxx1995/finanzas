'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // vuelve al mismo origen (prod o local) al hacer clic en el correo
        emailRedirectTo: `${window.location.origin}`,
        // si prefieres una ruta específica: `${window.location.origin}/auth/callback`
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full border rounded-2xl p-6">
          <h1 className="text-xl font-semibold">Revisa tu correo</h1>
          <p className="mt-2 text-sm">
            Te enviamos un enlace de acceso. Ábrelo en este mismo dispositivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="max-w-md w-full border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Inicia sesión</h1>
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded-xl p-3 border">
          Enviarme enlace
        </button>
      </form>
    </div>
  );
}
