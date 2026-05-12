# 📖 CÓMO MAPEAR CAPÍTULOS A LECCIONES

**Problema:** Tu estructura tiene **Capítulos** (subcategorías) pero Unytea solo tiene **Módulos → Lecciones**

---

## 🏗️ Tu Estructura en el Script:

```
MÓDULO 1: FUNDAMENTOS - Tu Primera Comunidad (Semana 1)
│
├── Capítulo 1.1: Bienvenida y Visión General
│   ├── ¿Qué es unytea y qué lo hace único?
│   ├── Comparativa con Skool, Circle y otras plataformas
│   ├── Casos de uso exitosos
│   └── Tu roadmap de comunidad
│
├── Capítulo 1.2: Configuración Inicial
│   ├── Crear tu cuenta y primera comunidad
│   ├── Entender roles y permisos (Owner, Admin, Member)
│   ├── Dashboard tour completo
│   └── Configuración básica de privacidad
│
└── Capítulo 1.3: Invitación de Miembros
    ├── Estrategias de invitación
    ├── Sistema de invitations
    ├── Links de invitación personalizados
    └── Primeros 10 miembros: dónde encontrarlos
```

---

## ✅ SOLUCIÓN: 2 Opciones

### **OPCIÓN A: Cada Capítulo = 1 Lección** ⭐ RECOMENDADO

**Cómo se ve en Unytea:**

```
Módulo 1: Fundamentos - Tu Primera Comunidad
│
├── Lección 1: Bienvenida y Visión General (15-20 min)
│   Tipo: TEXT o VIDEO
│   Contenido completo que incluye:
│   - ¿Qué es unytea?
│   - Comparativa con Skool
│   - Casos de uso
│   - Roadmap
│
├── Lección 2: Configuración Inicial (20-25 min)
│   Tipo: VIDEO (tutorial paso a paso)
│   Contenido que cubre:
│   - Crear cuenta
│   - Roles y permisos
│   - Dashboard tour
│   - Privacidad
│
└── Lección 3: Invitación de Miembros (15 min)
    Tipo: TEXT + VIDEO embebido
    Contenido:
    - Estrategias
    - Sistema de invitations
    - Links personalizados
    - Dónde encontrar primeros miembros
```

**Ventajas:**
- ✅ Más organizado y fluido
- ✅ Menos lecciones (3 en vez de 12)
- ✅ Mejor experiencia de estudiante
- ✅ Cada lección es completa y sustancial

**Cómo crearlas:**

1. **Crear lección en Unytea:**
   ```
   Title: 1.1 - Bienvenida y Visión General
   Type: TEXT
   Content: [Todo el contenido del capítulo completo en markdown]
   ```

2. **El contenido sería algo así:**
   ```markdown
   # Bienvenida y Visión General
   
   En esta lección vamos a cubrir los fundamentos de unytea.
   
   ## 1. ¿Qué es unytea y qué lo hace único?
   
   Unytea es una plataforma todo-en-uno para crear y escalar comunidades online. A diferencia de Skool o Circle...
   
   [Contenido completo aquí]
   
   ## 2. Comparativa con Skool, Circle y otras plataformas
   
   | Feature | Unytea | Skool | Circle |
   |---------|--------|-------|--------|
   | Cursos | ✅ | ✅ | ✅ |
   | Live Sessions | ✅ | ❌ | ❌ |
   ...
   
   ## 3. Casos de uso exitosos
   
   - **Comunidad de Coaches:** 500 miembros en 3 meses
   - **Comunidad de Developers:** $5K MRR
   ...
   
   ## 4. Tu roadmap de comunidad
   
   [Contenido del roadmap]
   
   ---
   
   **Siguiente:** En la próxima lección configuraremos tu cuenta...
   ```

---

### **OPCIÓN B: Cada Bullet Point = 1 Lección**

**Cómo se ve:**

```
Módulo 1: Fundamentos - Tu Primera Comunidad
│
├── Lección 1: ¿Qué es unytea? (VIDEO 3 min)
├── Lección 2: Comparativa con Skool (TEXT 5 min)
├── Lección 3: Casos de uso exitosos (TEXT 5 min)
├── Lección 4: Tu roadmap de comunidad (TEXT 5 min)
├── Lección 5: Crear tu cuenta (VIDEO 7 min)
├── Lección 6: Entender roles y permisos (VIDEO 8 min)
├── Lección 7: Dashboard tour (VIDEO 10 min)
├── Lección 8: Configuración de privacidad (TEXT 5 min)
├── Lección 9: Estrategias de invitación (TEXT 8 min)
├── Lección 10: Sistema de invitations (VIDEO 5 min)
├── Lección 11: Links personalizados (TEXT 3 min)
└── Lección 12: Primeros 10 miembros (TEXT 10 min)
```

**Ventajas:**
- ✅ Más granular
- ✅ Estudiante avanza más rápido
- ✅ Sensación de progreso constante
- ✅ Fácil consumir en sesiones cortas

**Desventajas:**
- ⚠️ Muchas lecciones (más trabajo de producción)
- ⚠️ Puede sentirse fragmentado

---

## 🎯 MI RECOMENDACIÓN:

### **Híbrido: Lecciones Agrupadas + Micro-lecciones**

```
Módulo 1: Fundamentos - Tu Primera Comunidad
│
├── 1.1 - Bienvenida al Curso (VIDEO 5 min) 🆓
│   Quick intro personal + overview del módulo
│
├── 1.2 - ¿Qué es Unytea? (VIDEO 8 min)
│   - Qué es y qué lo hace único
│   - Comparativa con Skool/Circle
│   - Demo rápida
│
├── 1.3 - Casos de Uso Exitosos (TEXT 10 min)
│   - 5 historias reales con resultados
│   - Template para identificar tu caso
│
├── 1.4 - Tu Roadmap de Comunidad (TEXT 8 min)
│   - Framework paso a paso
│   - Timeline realista
│
├── 1.5 - Setup: Crear Tu Cuenta (VIDEO 10 min)
│   - Crear cuenta paso a paso
│   - Roles y permisos explicados
│   - Primera comunidad creada
│
├── 1.6 - Dashboard Tour Completo (VIDEO 12 min)
│   - Recorrido completo
│   - Features clave
│   - Configuración de privacidad
│
├── 1.7 - Invitar Tus Primeros Miembros (VIDEO 8 min)
│   - Estrategias de invitación
│   - Sistema de invitations
│   - Links personalizados
│
└── 1.8 - PROYECTO: Crea Tu Comunidad (ASSIGNMENT 2-3 horas)
    - Instrucciones del proyecto práctico
    - Checklist de tareas
    - Qué entregar
```

**Total:** 8 lecciones (en vez de 12 micro-lecciones o 3 super-lecciones)

---

## 📝 Cómo Implementar en Unytea:

### **Para Lecciones de VIDEO:**

**1. Crea la lección:**
```
Title: 1.1 - Bienvenida al Curso
Type: VIDEO
Video URL: https://youtube.com/watch?v=tu-video-id
Duration: 5 (escribe en minutos, se guarda en segundos automático)
Free Preview: ✅ (para lección 1.1)
```

**2. Click "Create Lesson"**

---

### **Para Lecciones de TEXT:**

**1. Crea la lección:**
```
Title: 1.3 - Casos de Uso Exitosos
Type: TEXT
Content:
# Casos de Uso Exitosos

## Comunidad 1: Coaching Business
María construyó una comunidad de 500 miembros en 3 meses...

## Comunidad 2: Developers
Juan creó una comunidad técnica que genera $5K/mes...

[Contenido completo en markdown]
```

**2. Click "Create Lesson"**

---

### **Para ASSIGNMENT (Proyectos):**

**Al final de cada módulo:**

```
Title: PROYECTO: Crea Tu Primera Comunidad
Type: ASSIGNMENT
Content:
**Objetivo:** Aplicar todo lo aprendido creando tu comunidad real en Unytea.

**Instrucciones:**
1. Define tu nicho y audiencia
2. Crea tu comunidad siguiendo el video tutorial
3. Configura al menos 3 canales
4. Invita a 5 personas de prueba
5. Publica tu primer post de bienvenida

**Entregables:**
- Screenshot de tu comunidad creada
- Link a tu comunidad
- Reflexión: ¿Qué fue lo más difícil? (200 palabras)

**Tiempo estimado:** 2-3 horas
**Deadline sugerido:** Antes de pasar al Módulo 2
```

---

## 🎨 Títulos Sugeridos (Más Atractivos):

En vez de "Capítulo 1.1", usa títulos que vendan el beneficio:

**Menos atractivo:**
- ❌ Capítulo 1.1: Bienvenida

**Más atractivo:**
- ✅ Bienvenida: Tu Roadmap de 0 a Comunidad Exitosa
- ✅ La Fórmula: Por Qué Unytea Gana vs Skool
- ✅ 5 Comunidades Que Ganaron $10K+ (Casos Reales)
- ✅ Setup en 15 Minutos: Tu Primera Comunidad Live
- ✅ El Sistema: Cómo Invitar 100 Miembros en 7 Días

---

## ⚡ En ~3 Minutos (Cuando Deploy Termine):

**La duración se arreglará:**
- ❌ Antes: 5 minutos → guardaba como 5 segundos → mostraba 0.08 min
- ✅ Ahora: 5 minutos → guarda como 300 segundos → muestra 5 min

**Puedes eliminar esa lección de prueba y crear las lecciones reales.**

---

## 🎯 Siguiente Paso:

**Cuando termine el deploy:**

1. **Borra la lección de prueba** (si quieres)
2. **Agrega lecciones reales siguiendo la estructura híbrida**
3. **Usa títulos atractivos**
4. **Alterna VIDEO/TEXT para variedad**

**¿Te quedó claro cómo mapear los capítulos?** 📚
