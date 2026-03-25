import NextAuth, { type NextAuthOptions, type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
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
          const firebaseApiKey = normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

          // If Firebase API key is missing, only allow mock auth in local development.
          if (!firebaseApiKey) {
            if (process.env.NODE_ENV === 'production') {
              throw new Error('Server misconfiguration: NEXT_PUBLIC_FIREBASE_API_KEY is missing');
            }

            const mockUser = mockUsers.find(
              (user) => user.email === credentials.email
            );

            if (!mockUser) {
              return null;
            }

            // For demo purposes, accept the password as-is or match against mock
            // In production, always hash and compare
            const isValidPassword =
              credentials.password === 'password123' ||
              (await bcrypt.compare(credentials.password, mockUser.password));

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
                email: credentials.email,
                password: credentials.password,
                returnSecureToken: true,
              }),
            }
          );

          const signInData = await signInResponse.json();

          if (!signInResponse.ok || signInData.error) {
            if (signInData.error?.message === 'INVALID_PASSWORD' || signInData.error?.message === 'EMAIL_NOT_FOUND') {
              return null;
            }
            throw new Error(signInData.error?.message || 'Authentication failed');
          }

          if (!isConfigured || !adminDbInstance) {
            return {
              id: signInData.localId,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              image: null,
            };
          }

          // Get user profile from Firestore
          const usersRef = adminDbInstance.collection('users');
          const q = usersRef.where('email', '==', credentials.email);
          const querySnapshot = await q.get();

          if (querySnapshot.empty) {
            // User authenticated in Firebase but no Firestore profile - create one
            console.log('User authenticated but no Firestore profile found');
            return {
              id: signInData.localId,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              image: null,
            };
          }

          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();

          return {
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            image: userData.avatar,
          };
        } catch (error: any) {
          // Log full error for debugging
          console.error('Authentication error:', error);

          // if Firestore call failed due to OpenSSL/gRPC issue, fall back to mock data
          const msg = error?.message || '';
          if (msg.includes('DECODER routines::unsupported') || msg.includes('Getting metadata from plugin failed')) {
            console.warn('Firestore query failed, falling back to mock authentication');
            const mockUser = mockUsers.find((u) => u.email === credentials.email);
            if (mockUser) {
              const isValid = await bcrypt.compare(credentials.password, mockUser.password);
              if (isValid) {
                return {
                  id: mockUser.id,
                  email: mockUser.email,
                  name: mockUser.name,
                  image: mockUser.avatar,
                };
              }
            }
          }

          // For any other error, fail authentication
          throw new Error('Authentication service unavailable');
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
