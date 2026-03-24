# QuizMaster - Kahoot Clone

Una aplicación web profesional tipo Kahoot para crear y jugar quizzes en tiempo real.

## 🚀 Características

- ✅ Autenticación segura con email/contraseña
- ✅ Crear quizzes personalizados ilimitados
- ✅ Jugar en tiempo real con amigos
- ✅ Tabla de clasificación dinámica
- ✅ Temporizador por pregunta
- ✅ Cálculo automático de puntos
- ✅ Interfaz moderna y responsive
- ✅ Base de datos en Firestore
- ✅ Deploy gratuito en Vercel

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta Firebase (gratuita)
- Cuenta Vercel (gratuita)

## 🔧 Instalación y Configuración Local

### 1. Instalar Dependencias

```bash
cd quiz-app
npm install
```

### 2. Configurar Firebase

1. Ir a [firebase.google.com](https://firebase.google.com)
2. Crear un nuevo proyecto
3. Habilitar Authentication y Firestore Database
4. Copiar la configuración

### 3. Crear archivo `.env.local`

Copia `.env.local.example` y reemplaza con tus valores de Firebase

### 4. Ejecutar Localmente

```bash
npm run dev
```

Abre http://localhost:3000

## 🌐 Deploy Gratuito

### Vercel (Recomendado)
- Ve a vercel.com
- Conecta tu repositorio GitHub
- Agrega las variables de entorno
- ¡Listo!

### Railway o Netlify
- Alternativas gratuitas en railway.app y netlify.com

Ver DEPLOYMENT_GUIDE.md para instrucciones completas.

## 💡 Cómo Usar

1. Registrarse con email/contraseña
2. Crear un quiz con preguntas
3. Compartir código de sesión con otros
4. ¡A jugar!

## 📞 Soporte

Revisa DEPLOYMENT_GUIDE.md o abre un issue en GitHub

---

**¡Listo para jugar!** 🎉

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
