'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';

export default function HomePage() {

  return (
    <div className="min-h-screen flex flex-col">

      <Navbar />

      <main className="flex flex-1 items-center justify-center">

        <div className="text-center">

          <h1 className="text-5xl font-bold mb-6">
            Plataforma de cuestionarios
          </h1>

          <p className="text-gray-500 mb-16">
            Crea cuestionarios o únete a un juego en vivo.
          </p>

          <div className="flex gap-6 justify-center mb-16">

            {/* Jugadores */}
            <Link href="/quiz/join">
              <Button size="lg">
                Únete al cuestionario
              </Button>
            </Link>

            {/* Host */}
            <Link href="/auth/login">
              <Button size="lg" variant="secondary">
                Iniciar sesión
              </Button>
            </Link>

          </div>

        </div>

      </main>

    </div>
  );
}