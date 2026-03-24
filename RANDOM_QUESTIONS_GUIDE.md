# 🎯 Guía: Preguntas Aleatorias en QuizMaster

## ¿Qué es?

Ahora puedes crear quizzes con **muchas preguntas** (hasta 40+) pero mostrar solo **un número específico** de preguntas **aleatorias** a cada jugador en cada sesión.

## ¿Para qué sirve?

| Caso de Uso | Beneficio |
|---|---|
| **Banco de preguntas** | Reutilizar 40 preguntas en múltiples sesiones |
| **Preguntas diferentes** | Cada jugador ve preguntas distintas (anti-copias) |
| **Flexibilidad** | Puedes cambiar cuántas preguntas mostrar sin recrear el quiz |

## 📝 Ejemplo

- **Creo un quiz con:** 40 preguntas  
- **Configuro:** Mostrar 5 preguntas por game  
- **Resultado:** Cada sesión de juego muestra 5 preguntas DIFERENTES seleccionadas al azar

## 🚀 Cómo usar

### Opción 1: Al Crear un Quiz (Frontend)

Cuando crees un quiz, en la sección de **Configuración/Settings**, establece:

```
Preguntas por Juego: 5
```

### Opción 2: Directamente en la API

Si creas un quiz vía API, agrega esto en `settings`:

```json
{
  "title": "Mi Quiz de Ciencia",
  "description": "...",
  "questions": [
    { ... pregunta 1 ... },
    { ... pregunta 2 ... },
    // ... hasta 40 preguntas ...
  ],
  "settings": {
    "allowReplays": true,
    "showCorrectAnswers": true,
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "questionsPerGame": 5  // 👈 NUEVO: Mostrar 5 random
  }
}
```

## ⚙️ Configuración

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `questionsPerGame` | number | No | Número de preguntas a mostrar (si no se especifica, muestra todas) |

### Valores Válidos

- **No especificado:** Muestra todas las preguntas del quiz
- **5:** Muestra 5 preguntas al azar
- **10:** Muestra 10 preguntas al azar
- **40 o más:** Si hay 40 preguntas totales, muestra todas (aleatorizadas)

## ✅ Ejemplo Completo

### Crear un Quiz con 40 Preguntas

```bash
POST /api/quizzes/create

{
  "title": "Matemática - Banco de 40 preguntas",
  "description": "Quiz con preguntas variadas",
  "isPublic": true,
  "questions": [
    // Pregunta 1
    {
      "id": "q1",
      "text": "¿2 + 2 = ?",
      "options": ["3", "4", "5", "6"],
      "correctAnswerIndex": 1,
      "timeLimit": 10,
      "points": 10
    },
    // Pregunta 2
    {
      "id": "q2",
      "text": "¿Capital de Francia?",
      "options": ["Londres", "París", "Berlín", "Madrid"],
      "correctAnswerIndex": 1,
      "timeLimit": 10,
      "points": 10
    },
    // ... Preguntas 3 a 40 ...
  ],
  "settings": {
    "allowReplays": true,
    "showCorrectAnswers": true,
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "questionsPerGame": 5  // Mostrar 5 al azar
  }
}
```

## 🎮 Qué Pasa al Jugar

1. **Tu amigo A juega:** Ve preguntas #1, #15, #22, #35, #38
2. **Tu amigo B juega:** Ve preguntas #3, #7, #29, #40, #12  
3. **Tu amigo C juega:** Ve preguntas #19, #24, #31, #36, #39

**Cada uno ve 5 preguntas DIFERENTES, seleccionadas al azar.**

## 🔄 Comportamiento

### Si `questionsPerGame = 5` y el quiz tiene 40 preguntas:
```
Play 1: Preguntas aleatorias [a, b, c, d, e]
Play 2: Preguntas aleatorias [f, g, h, i, j]  
Play 3: Preguntas aleatorias [k, l, m, n, o]
```

### Si `questionsPerGame` no está configurado:
```
Muestra TODAS las preguntas (comportamiento anterior)
```

## 📊 Ventajas

✅ **Bancos de preguntas grandes**  
✅ **Seguridad:** Menos copias entre jugadores  
✅ **Reusabilidad:** Una banco de 40 = múltiples quizzes  
✅ **Flexible:** Cambia sin recrear el quiz  

## ⚠️ Notas Importantes

1. **La selección es aleatoria:** Cada juego es diferente
2. **No es requerido:** Si no lo configuras, funciona como antes
3. **Compatible:** Trabaja con todas las otras configuraciones
4. **Performance:** No afecta el rendimiento (la selección es rápida)

## 🔧 Implementación Técnica

- **Función:** `getRandomQuestions()` en `src/lib/utils.ts`
- **Tipo:** Campo `questionsPerGame` en `Quiz.settings`
- **Página:** Lógica implementada en `src/app/quiz/[id]/play/page.tsx`

---

**¿Necesitas ayuda?** Revisa el código en:
- Tipos: `src/types/index.ts`
- Lógica: `src/lib/utils.ts`
- Página de juego: `src/app/quiz/[id]/play/page.tsx`
