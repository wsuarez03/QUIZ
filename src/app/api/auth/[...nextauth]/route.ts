import NextAuth, { type NextAuthOptions, type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { mockUsers } from '@/lib/mockData';
import bcrypt from 'bcryptjs';

function normalizeEnv(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

declare module 'next-auth' {
  interface User {
    id: string;
  }
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}

const authOptions: NextAuthOptions = {
  secret: normalizeEnv(process.env.NEXTAUTH_SECRET) || undefined,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = credentials.email.trim().toLowerCase();
          const password = credentials.password;
          const firebaseApiKey = normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

          // If Firebase API key is missing, only allow mock auth in local development.
          if (!firebaseApiKey) {
            if (process.env.NODE_ENV === 'production') {
              throw new Error('Server misconfiguration: NEXT_PUBLIC_FIREBASE_API_KEY is missing');
            }

            const mockUser = mockUsers.find(
              (user) => user.email === email
            );

            if (!mockUser) {
              return null;
            }

            // For demo purposes, accept the password as-is or match against mock
            // In production, always hash and compare
            const isValidPassword =
              credentials.password === 'password123' ||
              (await bcrypt.compare(password, mockUser.password));

            if (!isValidPassword) {
              return null;
            }

            console.log('✓ Mock authentication successful for:', credentials.email);
            return {
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.name,
              image: mockUser.avatar,
            };
          }

          // Use Firebase REST API to verify password

          const signInResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                password,
                returnSecureToken: true,
              }),
            }
          );

          const rawBody = await signInResponse.text();
          let signInData: any = null;
          try {
            signInData = rawBody ? JSON.parse(rawBody) : null;
          } catch {
            throw new Error(`FIREBASE_AUTH_ERROR:INVALID_RESPONSE_${signInResponse.status}`);
          }

          if (!signInResponse.ok || signInData.error) {
            const firebaseErrorCode = signInData.error?.message;
            if (firebaseErrorCode === 'INVALID_PASSWORD' || firebaseErrorCode === 'EMAIL_NOT_FOUND') {
              return null;
            }
            const code = firebaseErrorCode || `HTTP_${signInResponse.status}`;
            console.error('Firebase signIn error code:', code);
            throw new Error(`FIREBASE_AUTH_ERROR:${code}`);
          }

          return {
            id: signInData.localId,
            email,
            name: signInData.displayName || email.split('@')[0],
            image: null,
          };
        } catch (error: any) {
          // Log full error for debugging
          console.error('Authentication error:', error);

          // if Firestore call failed due to OpenSSL/gRPC issue, fall back to mock data
          const msg = error?.message || '';
          if (
            msg.startsWith('FIREBASE_AUTH_ERROR:') ||
            msg.startsWith('Server misconfiguration:')
          ) {
            throw error;
          }
          const causeCode = error?.cause?.code || '';
          if (
            msg.includes('fetch failed') ||
            msg.includes('ECONNRESET') ||
            msg.includes('ETIMEDOUT') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('Client network socket disconnected') ||
            msg.includes('TLS') ||
            causeCode === 'ECONNRESET' ||
            causeCode === 'ETIMEDOUT' ||
            causeCode === 'ENOTFOUND'
          ) {
            throw new Error('FIREBASE_AUTH_ERROR:NETWORK_ERROR');
          }

          // For any other error, fail with explicit code for easier diagnosis.
          throw new Error('FIREBASE_AUTH_ERROR:UNEXPECTED');
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('jwt callback, user present:', user);
        token.id = user.id;
      }
      console.log('jwt callback returning token:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('session callback, token:', token);
      if (session.user) {
        session.user.id = token.id as string;
      }
      console.log('session callback returning session:', session);
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// export options so other server code can access same callbacks/settings
export { authOptions }; 
