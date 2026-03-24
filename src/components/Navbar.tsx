'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <nav className="w-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-white">🎯 QuizMaster</div>
        </Link>

        <div className="flex items-center gap-6">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-white hover:text-purple-200 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/quiz/join"
                className="text-white hover:text-purple-200 transition"
              >
                Unirse
              </Link>
              <div className="flex items-center gap-3 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <Link
                  href="/profile"
                  className="text-white hover:text-purple-200 transition font-medium"
                >
                  {session.user.name}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-white hover:text-purple-200 transition text-sm"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-white hover:text-purple-200 transition"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
