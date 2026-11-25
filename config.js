// ============================================================
//  CONFIGURACIÓN DE PORTAL COLEGIO — SIGE PERÚ 2027
// ============================================================

export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyA5rgccpD7TQe5_X-Bh0RvHDDhGCuBpGEc",
    authDomain: "sistemaescolar-x.firebaseapp.com",
    projectId: "sistemaescolar-x",
    storageBucket: "sistemaescolar-x.firebasestorage.app",
    messagingSenderId: "675397683389",
    appId: "1:675397683389:web:a292ae32ea79e3a3a9cfd4",
    measurementId: "G-BT-JXTP8LG8"
  },

  ownerEmail: "adminnegocio1923@gmail.com",
  schoolName: "Colegio San Martín de Porres",
  schoolSlogan: "Excelencia Académica · Secundaria",
  academicYear: 2027,
  timezone: "America/Lima",

  periods: [
    { id: "B1", name: "I Bimestre", start: "2027-03-01", end: "2027-05-07" },
    { id: "B2", name: "II Bimestre", start: "2027-05-17", end: "2027-07-23" },
    { id: "B3", name: "III Bimestre", start: "2027-08-09", end: "2027-10-15" },
    { id: "B4", name: "IV Bimestre", start: "2027-10-25", end: "2027-12-22" },
  ],

  grades: [
    { id: "1", name: "1.º de Secundaria", sections: ["A", "B", "C", "D", "E", "F"] },
    { id: "2", name: "2.º de Secundaria", sections: ["A", "B", "C", "D", "E", "F"] },
    { id: "3", name: "3.º de Secundaria", sections: ["A", "B", "C", "D", "E", "F"] },
    { id: "4", name: "4.º de Secundaria", sections: ["A", "B", "C", "D", "E", "F"] },
    { id: "5", name: "5.º de Secundaria", sections: ["A", "B", "C", "D"] },
  ],

  // Escala vigesimal 2027 (0 a 20, nota mínima aprobatoria 11)
  gradingScale: {
    min: 0,
    max: 20,
    passing: 11,
    bands: [
      { min: 18, max: 20, label: "Rendimiento sobresaliente", cls: "ok" },
      { min: 14, max: 17, label: "Buen rendimiento", cls: "blue" },
      { min: 11, max: 13, label: "Rendimiento básico", cls: "warn" },
      { min: 0, max: 10, label: "Rendimiento desaprobatorio", cls: "bad" },
    ],
  },

  evalCategories: [
    "Examen escrito",
    "Práctica calificada",
    "Trabajo individual",
    "Trabajo grupal",
    "Exposición",
    "Proyecto",
    "Participación",
    "Tarea",
    "Evaluación final",
  ],

  // 11 Áreas Curriculares Oficiales — MINEDU Secundaria
  mineduAreas: [
    {
      id: "mat",
      name: "Matemática",
      hoursPerWeek: 6,
      competencies: [
        "Resuelve problemas de cantidad",
        "Resuelve problemas de regularidad, equivalencia y cambio",
        "Resuelve problemas de forma, movimiento y localización",
        "Resuelve problemas de gestión de datos e incertidumbre",
      ],
    },
    {
      id: "com",
      name: "Comunicación",
      hoursPerWeek: 5,
      competencies: [
        "Se comunica oralmente en su lengua materna",
        "Lee diversos tipos de textos escritos en lengua materna",
        "Escribe diversos tipos de textos en lengua materna",
      ],
    },
    {
      id: "ing",
      name: "Inglés como lengua extranjera",
      hoursPerWeek: 3,
      competencies: [
        "Se comunica oralmente en inglés como lengua extranjera",
        "Lee diversos tipos de textos en inglés como lengua extranjera",
        "Escribe diversos tipos de textos en inglés como lengua extranjera",
      ],
    },
    {
      id: "art",
      name: "Arte y Cultura",
      hoursPerWeek: 2,
      competencies: [
        "Aprecia de manera crítica manifestaciones artístico-culturales",
        "Crea proyectos desde los lenguajes artísticos",
      ],
    },
    {
      id: "csoc",
      name: "Ciencias Sociales",
      hoursPerWeek: 3,
      subtopics: ["Historia", "Geografía", "Economía"],
      competencies: [
        "Construye interpretaciones históricas",
        "Gestiona responsablemente el espacio y el ambiente",
        "Gestiona responsablemente los recursos económicos",
      ],
    },
    {
      id: "dpcc",
      name: "Desarrollo Personal, Ciudadanía y Cívica (DPCC)",
      hoursPerWeek: 3,
      competencies: [
        "Construye su identidad",
        "Convive y participa democráticamente en la búsqueda del bien común",
      ],
    },
    {
      id: "efis",
      name: "Educación Física",
      hoursPerWeek: 3,
      competencies: [
        "Se desenvuelve de manera autónoma a través de su motricidad",
        "Asume una vida saludable",
        "Interactúa a través de sus habilidades sociomotrices",
      ],
    },
    {
      id: "erel",
      name: "Educación Religiosa",
      hoursPerWeek: 2,
      competencies: [
        "Construye su identidad como persona humana, amada por Dios",
        "Asume la experiencia del encuentro personal y comunitario con Dios",
      ],
    },
    {
      id: "cyt",
      name: "Ciencia y Tecnología",
      hoursPerWeek: 4,
      subtopics: ["Biología", "Química", "Física"],
      competencies: [
        "Indaga mediante métodos científicos para construir conocimientos",
        "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía",
        "Diseña y construye soluciones tecnológicas para resolver problemas",
      ],
    },
    {
      id: "ept",
      name: "Educación para el Trabajo (EPT)",
      hoursPerWeek: 3,
      subtopics: ["Computación", "Programación", "Diseño", "Emprendimiento"],
      competencies: [
        "Gestiona proyectos de emprendimiento económico o social",
      ],
    },
    {
      id: "csl",
      name: "Castellano como segunda lengua",
      hoursPerWeek: 0,
      optional: true,
      competencies: [
        "Se comunica oralmente en castellano como segunda lengua",
        "Lee diversos tipos de textos escritos en castellano como segunda lengua",
        "Escribe diversos tipos de textos en castellano como segunda lengua",
      ],
    },
  ],

  transversalCompetencies: [
    "Se desenvuelve en entornos virtuales generados por las TIC",
    "Gestiona su aprendizaje de manera autónoma",
  ],

  scheduleDefaults: {
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    startTime: "07:45",
    hourDurationMin: 45,
    blocksPerDay: 8,
    breakAfterBlock: 4,
    breakDurationMin: 25,
  },
};
