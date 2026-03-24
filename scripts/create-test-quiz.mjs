// Script to create a test quiz directly in Firebase
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve('.', '.env.local');
console.log('📁 Buscando configuración en .env.local...\n');

// Read environment from .env.local
const envContent = readFileSync(serviceAccountPath, 'utf-8');
const projectId = envContent.match(/FIREBASE_PROJECT_ID="([^"]+)"/)?.[1];
const clientEmail = envContent.match(/FIREBASE_CLIENT_EMAIL="([^"]+)"/)?.[1];
const privateKey = envContent.match(/FIREBASE_PRIVATE_KEY="([^"]+)"/)?.[1]?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: No se encontraron las credenciales de Firebase en .env.local');
  process.exit(1);
}

console.log('✓ Credenciales encontradas');
console.log(`✓ Proyecto: ${projectId}\n`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

const quizData = {
  title: 'Prueba de Funcionamiento - 10 Preguntas',
  description: 'Quiz de prueba para verificar cómo funciona el sistema',
  category: 'Testing',
  totalQuestions: 10,
  createdBy: 'BX682JjCbVez5CdN2sEX', // Wilder's ID
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
  difficulty: 'Beginner',
  settings: {
    questionsPerGame: 10,
    allowReplays: true,
    showCorrectAnswers: true,
    randomizeQuestions: false,
    randomizeOptions: false,
  },
};

const questionsData = [
  {
    text: '¿Cuál es la capital de Colombia?',
    options: ['Medellín', 'Bogotá', 'Cali', 'Cartagena'],
    correctAnswer: 1,
    difficulty: 'Beginner',
  },
  {
    text: '¿Cuántos continentes hay?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    difficulty: 'Beginner',
  },
  {
    text: '¿En qué año terminó la Segunda Guerra Mundial?',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
    difficulty: 'Intermediate',
  },
  {
    text: '¿Cuál es el océano más grande?',
    options: ['Océano Atlántico', 'Océano Índico', 'Océano Pacífico', 'Océano Ártico'],
    correctAnswer: 2,
    difficulty: 'Beginner',
  },
  {
    text: '¿Cuántos lados tiene un hexágono?',
    options: ['4', '5', '6', '7'],
    correctAnswer: 2,
    difficulty: 'Beginner',
  },
  {
    text: '¿Qué gas es el más abundante en la atmósfera terrestre?',
    options: ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'],
    correctAnswer: 1,
    difficulty: 'Intermediate',
  },
  {
    text: '¿Cuántos huesos tiene un adulto humano?',
    options: ['186', '206', '226', '246'],
    correctAnswer: 1,
    difficulty: 'Intermediate',
  },
  {
    text: '¿Cuál de estas es una fruta?',
    options: ['Zanahoria', 'Lechuga', 'Tomate', 'Cebolla'],
    correctAnswer: 2,
    difficulty: 'Beginner',
  },
  {
    text: '¿En qué país se encuentra la Torre Eiffel?',
    options: ['Italia', 'España', 'Francia', 'Alemania'],
    correctAnswer: 2,
    difficulty: 'Beginner',
  },
  {
    text: '¿Cuál es el planeta más cercano al Sol?',
    options: ['Venus', 'Mercurio', 'Tierra', 'Marte'],
    correctAnswer: 1,
    difficulty: 'Beginner',
  },
];

async function createTestQuiz() {
  try {
    console.log('📝 Creando quiz de prueba...\n');

    // Create the quiz
    const quizRef = await db.collection('quizzes').add(quizData);
    const quizId = quizRef.id;
    console.log(`✅ Quiz creado: ${quizId}`);
    console.log(`   Título: ${quizData.title}`);
    console.log(`   Preguntas: ${quizData.totalQuestions}\n`);

    // Add questions to the quiz
    console.log('📌 Agregando preguntas...\n');
    
    for (let i = 0; i < questionsData.length; i++) {
      const question = {
        ...questionsData[i],
        id: `test_q${i + 1}`,
        quizId: quizId,
      };
      
      await db.collection(`quizzes/${quizId}/questions`).add(question);
      console.log(`   ✓ Pregunta ${i + 1}: ${question.text.substring(0, 40)}...`);
    }

    console.log('\n✅ Quiz de prueba creado exitosamente!\n');
    console.log('📊 Detalles:');
    console.log(`   ID del Quiz: ${quizId}`);
    console.log(`   Creado por: Wilder (BX682JjCbVez5CdN2sEX)`);
    console.log(`   Total de preguntas: ${questionsData.length}`);
    console.log(`   Es público: ${quizData.isPublic}\n`);
    
    console.log('🔗 Links útiles:');
    console.log(`   Jugar Quiz: http://localhost:3000/quiz/${quizId}/play`);
    console.log(`   Ver Detalles: http://localhost:3000/quiz/${quizId}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear el quiz:', error.message);
    process.exit(1);
  }
}

createTestQuiz();
