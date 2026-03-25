'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error('Login error code:', result.error);
        if (result.error === 'CredentialsSignin') {
          setError('Email o contrasena incorrectos.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:OPERATION_NOT_ALLOWED')) {
          setError('En Firebase no esta habilitado Email/Password en Authentication > Sign-in method.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:INVALID_LOGIN_CREDENTIALS')) {
          setError('Email o contrasena incorrectos.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:TOO_MANY_ATTEMPTS_TRY_LATER')) {
          setError('Demasiados intentos. Espera unos minutos y vuelve a intentar.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:USER_DISABLED')) {
          setError('Este usuario fue deshabilitado en Firebase Authentication.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:NETWORK_ERROR')) {
          setError('No se pudo conectar con Firebase Auth desde el servidor. Revisa red/restricciones de API key.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:API_KEY_INVALID')) {
          setError('La API key de Firebase en Vercel es invalida.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:HTTP_403')) {
          setError('Firebase rechazo la solicitud (HTTP 403). Revisa restricciones de la API key.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:INVALID_RESPONSE_')) {
          setError('Firebase devolvio una respuesta no valida. Revisa configuracion de proyecto/API key.');
        } else if (result.error.includes('FIREBASE_AUTH_ERROR:UNEXPECTED')) {
          setError('Error inesperado de autenticacion en servidor. Revisa logs de Vercel Functions.');
        } else {
          setError(`No fue posible iniciar sesion (${result.error}).`);
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            🎯 QuizMaster
          </h1>

          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-purple-600 font-semibold hover:text-purple-700">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
