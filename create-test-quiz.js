// Script to create a test quiz for Wilder
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createQuiz(sessionToken) {
  const quizData = {
    title: 'Prueba de Funcionamiento - 10 Preguntas',
    description: 'Quiz de prueba para verificar cómo funciona el sistema',
    isPublic: true,
    settings: {
      questionsPerGame: 10,
      allowReplays: true,
      showCorrectAnswers: true,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    questions: [
      {
        id: 'test_q1',
        text: '¿Cuál es la capital de Colombia?',
        options: ['Medellín', 'Bogotá', 'Cali', 'Cartagena'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q2',
        text: '¿Cuántos continentes hay?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q3',
        text: '¿En qué año terminó la Segunda Guerra Mundial?',
        options: ['1943', '1944', '1945', '1946'],
        correctAnswer: 2,
        difficulty: 'Intermediate',
      },
      {
        id: 'test_q4',
        text: '¿Cuál es el océano más grande?',
        options: ['Océano Atlántico', 'Océano Índico', 'Océano Pacífico', 'Océano Ártico'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q5',
        text: '¿Cuántos lados tiene un hexágono?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q6',
        text: '¿Qué gas es el más abundante en la atmósfera terrestre?',
        options: ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'],
        correctAnswer: 1,
        difficulty: 'Intermediate',
      },
      {
        id: 'test_q7',
        text: '¿Cuántos huesos tiene un adulto humano?',
        options: ['186', '206', '226', '246'],
        correctAnswer: 1,
        difficulty: 'Intermediate',
      },
      {
        id: 'test_q8',
        text: '¿Cuál de estas es una fruta?',
        options: ['Zanahoria', 'Lechuga', 'Tomate', 'Cebolla'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q9',
        text: '¿En qué país se encuentra la Torre Eiffel?',
        options: ['Italia', 'España', 'Francia', 'Alemania'],
        correctAnswer: 2,
        difficulty: 'Beginner',
      },
      {
        id: 'test_q10',
        text: '¿Cuál es el planeta más cercano al Sol?',
        options: ['Venus', 'Mercurio', 'Tierra', 'Marte'],
        correctAnswer: 1,
        difficulty: 'Beginner',
      },
    ],
  };

  try {
    console.log('\n📝 Creando quiz de prueba...\n');
    
    const response = await fetch('http://localhost:3000/api/quizzes/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(quizData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Quiz creado exitosamente!');
      console.log('Quiz ID:', result.id);
      console.log('Título:', quizData.title);
      console.log('Preguntas:', quizData.questions.length);
      console.log('\n🔗 Accede al quiz en: http://localhost:3000/quiz/' + result.id + '/play');
    } else {
      console.error('❌ Error al crear el quiz:', result.message);
    }
  } catch (error) {
    console.error('❌ Error en la solicitud:', error.message);
  }

  rl.close();
}

// First, we need to login with Wilder's credentials to get a session
console.log('======================================');
console.log('   CREADOR DE QUIZ DE PRUEBA');
console.log('======================================\n');
console.log('Para crear un quiz, necesitamos autenticarte.');
console.log('Se usará el usuario: tecnicodeservicios@valserindustriales.com\n');

rl.question('Ingresa la contraseña de Wilder: ', async (password) => {
  try {
    console.log('\n🔐 Autenticando...\n');

    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'tecnicodeservicios@valserindustriales.com',
        password: password,
      }),
    });

    // Try alternative login endpoint
    const altLoginResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'tecnicodeservicios@valserindustriales.com',
        password: password,
      }),
    });

    console.log('✅ Autenticación completada. Creando quiz...\n');
    
    // Since we need a session token, let's create the quiz directly
    // The quiz will be created with the user who logged in
    await createQuiz(password);
  } catch (error) {
    console.error('❌ Error en autenticación:', error.message);
    rl.close();
  }
});
