# 🎯 QuizMaster - Información para Deploy

## Estructura del Proyecto

```
quiz-app/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── auth/             # Páginas de autenticación
│   │   ├── dashboard/        # Dashboard principal
│   │   ├── quiz/             # Páginas de quizzes
│   │   ├── layout.tsx        # Layout principal
│   │   └── page.tsx          # Página de inicio
│   ├── components/           # Componentes React
│   ├── lib/                  # Utilidades (Firebase, helpers)
│   └── types/                # Tipos TypeScript
├── .env.local               # Variables de entorno (no versionar)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Requisitos Previos

1. **Node.js 18+** instalado
2. **npm** o **yarn**
3. Cuenta en **Firebase** (para base de datos)
4. Cuenta en **Vercel** (para hosting gratuito)

## Configuración Local

### 1. Clonar/Descargar el Proyecto

```bash
cd quiz-app
npm install
```

### 2. Configurar Firebase

1. Ve a https://firebase.google.com
2. Crea un nuevo proyecto o usa uno existente
3. Habilita:
   - **Authentication**: Método de Usuario/Contraseña
   - **Firestore Database**: Crea una base de datos en modo producción
4. Copia la configuración del proyecto

### 3. Crear archivo `.env.local`

En la raíz de `quiz-app/`, crea un archivo `.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-min-32-characters
NEXTAUTH_URL=http://localhost:3000
```

### 4. Ejecutar Localmente

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## Deploy Gratuito en Vercel

### Opción 1: Deploy Automático (Recomendado)

1. **Push a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/quiz-app.git
   git push -u origin main
   ```

2. **Conectar a Vercel**:
   - Ve a https://vercel.com
   - Haz click en "New Project"
   - Selecciona tu repositorio de GitHub
   - Configura variables de entorno en "Environment Variables"

3. **Establecer Variables de Entorno**:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY = ...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = ...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID = ...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = ...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = ...
   NEXT_PUBLIC_FIREBASE_APP_ID = ...
   NEXTAUTH_SECRET = ... (genera aquí: https://generate-secret.vercel.app/32)
   NEXTAUTH_URL = https://tu-proyecto.vercel.app
   ```

4. **Deploy**:
   - Click en "Deploy"
   - ¡Listo! La app estará disponible en tu dominio Vercel

### Opción 2: Deploy con Railway (Alternativa Gratuita)

1. Ve a https://railway.app
2. Haz click en "New Project" > "Deploy from GitHub"
3. Selecciona tu repositorio
4. Agrega variables de entorno en "Variables"
5. Deploy automático

### Opción 3: Deploy con Netlify (Otra Alternativa)

1. Ve a https://netlify.com
2. Conecta tu repositorio de GitHub
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Agrega variables de entorno  
5. Deploy automático

## Configuración de Firestore

### Reglas de Seguridad

En Firebase Console > Firestore > Rules, usa:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Quizzes
    match /quizzes/{quizId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth.uid == resource.data.createdBy;
      allow read: if resource.data.isPublic == true;
    }

    // Game Sessions
    match /gameSessions/{sessionId} {
      allow read, write: if request.auth != null;
    }

    // Results
    match /results/{resultId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Estructura de Datos Firestore

```
users/
  └── {userId}
      ├── name: string
      ├── email: string
      ├── avatar: string (optional)
      └── createdAt: timestamp

quizzes/
  └── {quizId}
      ├── title: string
      ├── description: string
      ├── createdBy: string (userId)
      ├── isPublic: boolean
      ├── questions: [Question]
      ├── settings: QuizSettings
      └── createdAt: timestamp

gameSessions/
  └── {sessionId}
      ├── quizId: string
      ├── creatorId: string
      ├── code: string (6 caracteres)
      ├── status: 'waiting' | 'active' | 'finished'
      ├── players: [Player]
      └── startedAt: timestamp

results/
  └── {resultId}
      ├── sessionId: string
      ├── playerId: string
      ├── score: number
      ├── accuracy: number
      └── completedAt: timestamp
```

## Características Incluidas

✅ Autenticación con email/contraseña  
✅ Crear quizzes personalizados  
✅ Jugar en tiempo real  
✅ Tabla de clasificación en vivo  
✅ Temporizador por pregunta  
✅ Cálculo automático de puntos  
✅ Interfaz responsive  
✅ Sistema de sesiones de juego  

## Próximas Mejoras

- [ ] Autenticación social (Google, GitHub)
- [ ] Multiplicadores de puntos
- [ ] Badges y logros
- [ ] Chat en tiempo real
- [ ] Análisis de resultados
- [ ] Exportar resultados a CSV/PDF
- [ ] Modo oscuro
- [ ] Notificaciones push

## Soporte

Para problemas o preguntas:
1. Verifica la consola del navegador (F12)
2. Revisa la consola de Vercel en el dashboard
3. Comprueba que Firebase esté configurado correctamente
4. Asegúrate que las variables de entorno están configuradas

---

**¡Hecho! Tu aplicación Kahoot está lista para deployarse y usarse.** 🚀
