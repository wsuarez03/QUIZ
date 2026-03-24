**GUÍA RÁPIDA - QuizMaster**

## 📦 Archivos Principales Creados

```
quiz-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Página de inicio
│   │   ├── layout.tsx                  # Layout con NextAuth
│   │   ├── profile/                    # Perfil de usuario con logros
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/     # Autenticación Next Auth
│   │   │   ├── auth/register/          # Registro de usuarios
│   │   │   ├── quizzes/                # CRUD de quizzes
│   │   │   ├── achievements/           # API de logros
│   │   │   └── game-sessions/          # Sesiones de juego
│   │   ├── auth/
│   │   │   ├── login/                  # Página de login
│   │   │   └── register/               # Página de registro
│   │   ├── dashboard/                  # Panel principal
│   │   └── quiz/
│   │       ├── create/                 # Crear quiz
│   │       ├── join/                   # Unirse a quiz
│   │       └── [id]/play/              # Jugar quiz
│   ├── components/                     # Componentes reutilizables
│   │   ├── Navbar.tsx
│   │   ├── Button.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── QuizCard.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── AchievementBadges.tsx      # 🆕 Logros/Achievements
│   │   └── Providers.tsx
│   ├── lib/
│   │   ├── firebase.ts                 # Configuración Firebase
│   │   ├── utils.ts                    # Funciones utilitarias
│   │   ├── socket.ts                   # 🆕 Socket.io config
│   │   └── achievements.ts             # 🆕 Sistema de logros
│   └── types/
│       └── index.ts                    # Tipos TypeScript
├── .env.local.example                  # Ejemplo de variables
├── DEPLOYMENT_GUIDE.md                 # Guía de deployment
├── README.md                           # Documentación
└── package.json                        # Dependencias
```

## 🚀 PASOS PARA DEPLOYMENT GRATUITO

### PASO 1: Completar Configuración de Firebase
1. Ve a https://firebase.google.com
2. Crea un proyecto nuevo
3. En "Project Settings", copia:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### PASO 2: Crear .env.local
En la carpeta `quiz-app/`:
```bash
cp .env.local.example .env.local
```

Abre `.env.local` y reemplaza con tus valores de Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messenger_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXTAUTH_SECRET=generar-aqui-https://generate-secret.vercel.app/32
NEXTAUTH_URL=http://localhost:3000
```

**(Opcional pero recomendado)** para que los endpoints del servidor puedan escribir en Firestore sin caer en errores de permisos, agrega las credenciales de servicio de Firebase. Obténlas en Firebase Console > Settings > Service accounts > Generate new private key. Añade estas variables al mismo `.env.local`:
```env
FIREBASE_PROJECT_ID="tu_proyecto_id"
FIREBASE_CLIENT_EMAIL="correodelservicio@..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
La clave privada debe conservar los `\n` para que se interpreten correctamente.
```

### PASO 3: Probar Localmente
```bash
cd quiz-app
npm install
npm run dev
```

Abre http://localhost:3000 en tu navegador

### PASO 4: Preparar para Deploy
```bash
# Crear repositorio Git
git init
git add .
git commit -m "Initial commit - QuizMaster"
git branch -M main

# Crear repositorio en GitHub
# Ve a https://github.com/new y crea un repositorio
# Luego:
git remote add origin https://github.com/tu_usuario/quiz-app.git
git push -u origin main
```

### PASO 5: Deploy en Vercel (GRATIS)

**OPCIÓN A: Deploy automático (Recomendado)**
1. Ve a https://vercel.com/new
2. Selecciona "Import Git Repository"
3. Elige tu repositorio de GitHub
4. Haz click en "Deploy"
5. ESPERA a que termine de compilar (3-5 minutos)
6. Vercel te dará una URL como: `https://quiz-app-abc123.vercel.app`

**OPCIÓN B: Agregar Variables de Entorno**

Si quieres que funcione todo:

1. Después de importar el repo en Vercel:
2. Ve a "Settings" > "Environment Variables"
3. Agrega todas las variables de `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY = ...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = ...
NEXT_PUBLIC_FIREBASE_PROJECT_ID = ...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = ...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = ...
NEXT_PUBLIC_FIREBASE_APP_ID = ...
NEXTAUTH_SECRET = ... (genera aquí: https://generate-secret.vercel.app/32)
NEXTAUTH_URL = https://tu-dominio.vercel.app
```

4. Haz click en "Save"
5. Ve a "Deployments" y haz click en "Redeploy" en el último deployment

## ✅ Verificación

❓ **¿Cómo sé si está bien deployado?**

1. Abre tu URL en navegador
2. Intenta registrarte con un email
3. Inicia sesión
4. Ve que las páginas carguen sin errores

❌ **Si tienes errores:**
- Revisa la consola del navegador (F12)
- Ve a Vercel > Project > Logs
- Verifica las variables de entorno estén bien

## 🎯 Próximos Pasos

1. ✅ Crear la página de crear quizzes
2. ✅ Crear la página de jugar
3. ✅ Implementar tiempo real con Socket.io (estructura base)
4. ✅ Agregar más tipos de preguntas (framework listo)
5. ✅ Sistema de logros

## 📚 Documentación Completa

Ver `DEPLOYMENT_GUIDE.md` para más detalles

---

**¡Tu aplicación Kahoot ahora está LIVE en internet!** 🎉
