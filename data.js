// data.js
// Capa de datos: Firebase (tiempo real) + Cloudinary (imágenes) o modo demo local.
import { CONFIG } from "./config.js";

const CLOUDINARY_CLOUD_NAME = "p6szlpdy";
const CLOUDINARY_UPLOAD_PRESET = "turnoya_menu";

export const isCloud = Boolean(CONFIG.firebase && CONFIG.firebase.apiKey);

// ==========================================
// DATOS INICIALES DEMO (PERÚ 2027 - 28 SECCIONES)
// ==========================================
export function buildSeedData() {
  const sections = [];
  CONFIG.grades.forEach((g) => {
    g.sections.forEach((sec) => {
      sections.push({
        id: `${g.id}${sec}`,
        gradeId: g.id,
        gradeName: g.name,
        section: sec,
        room: `Aula ${g.id}0${sec.charCodeAt(0) - 64}`,
        tutor: `Prof. Tutor ${g.id}${sec}`,
      });
    });
  });

  const teachers = [
    { id: "prof-mat", email: "matematicas@colegio.edu.pe", name: "Prof. Carlos Mendoza", role: "profesor", areaId: "mat", areaName: "Matemática", active: true, availability: [0, 1, 2, 3, 4], maxHours: 24 },
    { id: "prof-com", email: "comunicacion@colegio.edu.pe", name: "Prof. Lucía Fernández", role: "profesor", areaId: "com", areaName: "Comunicación", active: true, availability: [0, 1, 2, 3, 4], maxHours: 24 },
    { id: "prof-cyt", email: "ciencias@colegio.edu.pe", name: "Prof. Jorge Quispe", role: "profesor", areaId: "cyt", areaName: "Ciencia y Tecnología", active: true, availability: [0, 1, 2, 3, 4], maxHours: 22 },
    { id: "prof-csoc", email: "sociales@colegio.edu.pe", name: "Prof. Elena Vargas", role: "profesor", areaId: "csoc", areaName: "Ciencias Sociales", active: true, availability: [0, 1, 2, 3, 4], maxHours: 20 },
    { id: "prof-ing", email: "ingles@colegio.edu.pe", name: "Prof. Diana Paredes", role: "profesor", areaId: "ing", areaName: "Inglés como lengua extranjera", active: true, availability: [0, 1, 2, 3, 4], maxHours: 20 },
    { id: "prof-ept", email: "ept@colegio.edu.pe", name: "Prof. Marco Salazar", role: "profesor", areaId: "ept", areaName: "Educación para el Trabajo (EPT)", active: true, availability: [0, 1, 2, 3, 4], maxHours: 20 },
  ];

  const students = [
    { id: "stu-1", uid: "demo-alumno", email: "alumno@colegio.edu.pe", name: "Mateo Silva Rojas", gradeId: "3", section: "A", sectionId: "3A", active: true, code: "2027-03A-01", guardian: "María Rojas (987654321)" },
    { id: "stu-2", uid: "stu-2", email: "valeria.torres@colegio.edu.pe", name: "Valeria Torres Díaz", gradeId: "3", section: "A", sectionId: "3A", active: true, code: "2027-03A-02", guardian: "Luis Torres (987654322)" },
    { id: "stu-3", uid: "stu-3", email: "diego.castro@colegio.edu.pe", name: "Diego Castro Huamán", gradeId: "3", section: "A", sectionId: "3A", active: true, code: "2027-03A-03", guardian: "Rosa Huamán (987654323)" },
    { id: "stu-4", uid: "stu-4", email: "camila.ramos@colegio.edu.pe", name: "Camila Ramos Flores", gradeId: "1", section: "B", sectionId: "1B", active: true, code: "2027-01B-01", guardian: "Pedro Ramos (987654324)" },
    { id: "stu-5", uid: "stu-5", email: "sebastian.vega@colegio.edu.pe", name: "Sebastián Vega León", gradeId: "5", section: "A", sectionId: "5A", active: true, code: "2027-05A-01", guardian: "Ana León (987654325)" },
  ];

  const courses = CONFIG.mineduAreas.filter((a) => !a.optional).map((a) => {
    const t = teachers.find((x) => x.areaId === a.id) || teachers[0];
    return {
      id: `cur-${a.id}`,
      areaId: a.id,
      name: a.name,
      hoursPerWeek: a.hoursPerWeek,
      teacherEmail: t.email,
      teacherName: t.name,
      competencies: a.competencies,
      subtopics: a.subtopics || [],
    };
  });

  const modules = [
    {
      id: "mod-1",
      courseId: "cur-mat",
      courseName: "Matemática",
      sectionId: "3A",
      unit: "Unidad 1: Álgebra y Funciones",
      week: 1,
      title: "Ecuaciones cuadráticas y aplicaciones",
      description: "Resolución de ecuaciones de segundo grado mediante factorización y fórmula general.",
      competency: "Resuelve problemas de regularidad, equivalencia y cambio",
      materials: [{ title: "Guía de ejercicios Semana 1 (PDF)", url: "https://example.com/guia-mat.pdf", type: "pdf" }],
      published: true,
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: "mod-2",
      courseId: "cur-com",
      courseName: "Comunicación",
      sectionId: "3A",
      unit: "Unidad 1: Argumentación Crítica",
      week: 1,
      title: "El ensayo argumentativo",
      description: "Estructura, tesis, argumentos y contraargumentos en textos académicos.",
      competency: "Escribe diversos tipos de textos en lengua materna",
      materials: [{ title: "Rúbrica de ensayo (PDF)", url: "https://example.com/ensayo.pdf", type: "pdf" }],
      published: true,
      createdAt: Date.now() - 86400000 * 2,
    },
  ];

  const tasks = [
    {
      id: "tsk-1",
      courseId: "cur-mat",
      courseName: "Matemática",
      sectionId: "3A",
      moduleId: "mod-1",
      title: "Práctica de Ecuaciones Cuadráticas",
      instructions: "Resuelve los 10 problemas propuestos en la guía y sube tu procedimiento en PDF o escribe tus respuestas.",
      dueDate: "2027-03-19",
      maxScore: 20,
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: "tsk-2",
      courseId: "cur-com",
      courseName: "Comunicación",
      sectionId: "3A",
      moduleId: "mod-2",
      title: "Borrador de Ensayo Argumentativo",
      instructions: "Redacta la introducción y dos argumentos sobre el uso responsable de la IA en la educación.",
      dueDate: "2027-03-22",
      maxScore: 20,
      createdAt: Date.now() - 86400000,
    },
  ];

  const grades = [
    {
      id: "grd-1",
      studentUid: "demo-alumno",
      studentName: "Mateo Silva Rojas",
      sectionId: "3A",
      courseId: "cur-mat",
      courseName: "Matemática",
      period: "B1",
      category: "Práctica calificada",
      evalName: "Práctica Calificada 1",
      score: 17,
      weight: 30,
      comment: "Demuestra un buen dominio de los procedimientos matemáticos. Se recomienda reforzar la resolución de problemas que requieren razonamiento algebraico.",
      date: "2027-03-10",
      teacherName: "Prof. Carlos Mendoza",
    },
    {
      id: "grd-2",
      studentUid: "demo-alumno",
      studentName: "Mateo Silva Rojas",
      sectionId: "3A",
      courseId: "cur-com",
      courseName: "Comunicación",
      period: "B1",
      category: "Exposición",
      evalName: "Exposición Oral: Oratoria",
      score: 18,
      weight: 25,
      comment: "Excelente claridad expositiva, postura y uso de conectores lógicos.",
      date: "2027-03-11",
      teacherName: "Prof. Lucía Fernández",
    },
    {
      id: "grd-3",
      studentUid: "demo-alumno",
      studentName: "Mateo Silva Rojas",
      sectionId: "3A",
      courseId: "cur-cyt",
      courseName: "Ciencia y Tecnología",
      period: "B1",
      category: "Proyecto",
      evalName: "Laboratorio: Método Científico",
      score: 15,
      weight: 30,
      comment: "Buen planteamiento de hipótesis; mejorar el registro de variables.",
      date: "2027-03-12",
      teacherName: "Prof. Jorge Quispe",
    },
  ];

  const attendance = [
    { id: "att-1", studentUid: "demo-alumno", studentName: "Mateo Silva Rojas", sectionId: "3A", courseId: "cur-mat", date: "2027-03-10", status: "Presente" },
    { id: "att-2", studentUid: "demo-alumno", studentName: "Mateo Silva Rojas", sectionId: "3A", courseId: "cur-com", date: "2027-03-11", status: "Presente" },
    { id: "att-3", studentUid: "demo-alumno", studentName: "Mateo Silva Rojas", sectionId: "3A", courseId: "cur-cyt", date: "2027-03-12", status: "Tardanza" },
  ];

  const conduct = [
    {
      id: "cnd-1",
      studentUid: "demo-alumno",
      studentName: "Mateo Silva Rojas",
      sectionId: "3A",
      period: "B1",
      score: 18,
      observation: "Muestra respeto hacia sus compañeros y docentes. Participa activamente en las normas de convivencia.",
      incidents: [],
      date: "2027-03-12",
      by: "Tutoría 3.º A",
    },
  ];

  const announcements = [
    {
      id: "ann-1",
      title: "Inicio del Año Escolar 2027 — Escala Vigesimal",
      body: "Bienvenidos al año académico 2027. Recordamos a nuestra comunidad educativa que las evaluaciones se registran en la escala vigesimal (0 a 20), con nota mínima aprobatoria 11.",
      author: "Dirección General",
      date: "2027-03-01",
      pinned: true,
    },
    {
      id: "ann-2",
      title: "Reunión de Padres de Familia — I Bimestre",
      body: "Se convoca a los padres y apoderados de 1.º a 5.º de Secundaria este viernes a las 18:00 h en el auditorio principal.",
      author: "Secretaría Académica",
      date: "2027-03-14",
      pinned: false,
    },
  ];

  const settings = [
    { id: "school", tramitesEnabled: false, academicYear: 2027, activePeriod: "B1", schoolName: CONFIG.schoolName }
  ];

  return { sections, staff: teachers, students, courses, modules, tasks, grades, attendance, conduct, announcements, settings };
}

// ==========================================
// IMPLEMENTACIÓN LOCAL (MODO DEMO)
// ==========================================
const localImpl = {
  _listeners: {},
  _docListeners: {},
  _authCb: null,
  _user: JSON.parse(localStorage.getItem("portal_user")) || null,

  _ensureSeed() {
    if (localStorage.getItem("portal_seeded_2027")) return;
    const seed = buildSeedData();
    Object.entries(seed).forEach(([col, rows]) => {
      localStorage.setItem("portal_" + col, JSON.stringify(rows));
    });
    localStorage.setItem("portal_seeded_2027", "1");
  },

  onAuth(cb) {
    this._ensureSeed();
    this._authCb = cb;
    setTimeout(() => cb(this._user), 0);
    return () => { this._authCb = null; };
  },
  async loginDemo(role = "alumno") {
    const map = {
      alumno: { uid: "demo-alumno", email: "alumno@colegio.edu.pe", name: "Mateo Silva Rojas", verified: true, demoRole: "alumno" },
      profesor: { uid: "demo-profesor", email: "matematicas@colegio.edu.pe", name: "Prof. Carlos Mendoza", verified: true, demoRole: "profesor" },
      director: { uid: "demo-director", email: CONFIG.ownerEmail, name: "Dr. Ricardo Palma (Director)", verified: true, demoRole: "director" },
      secretaria: { uid: "demo-secretaria", email: "secretaria@colegio.edu.pe", name: "Lic. Carmen Soto (Secretaría)", verified: true, demoRole: "secretaria" },
    };
    this._setUser(map[role] || map.alumno);
  },
  async login() { await this.loginDemo("director"); },
  async logout() { this._setUser(null); },
  async loginEmail(email) { this._setUser({ uid: "demo-email-" + email, email, name: email.split("@")[0], verified: true }); },
  async register(email, pass, name) { this._setUser({ uid: "demo-email-" + email, email, name: name || email, verified: true }); },
  async resetPassword() { return true; },
  async resendVerification() { return true; },
  async recheck() { return true; },
  async call() { return true; },
  _setUser(u) {
    this._user = u;
    if (u) localStorage.setItem("portal_user", JSON.stringify(u));
    else localStorage.removeItem("portal_user");
    if (this._authCb) this._authCb(u);
  },
  _getStore(col) {
    this._ensureSeed();
    return JSON.parse(localStorage.getItem("portal_" + col) || "[]");
  },
  _setStore(col, rows) {
    localStorage.setItem("portal_" + col, JSON.stringify(rows));
    if (this._listeners[col]) {
      this._listeners[col].forEach(({ cb, where }) => {
        const filtered = where ? rows.filter((r) => r[where[0]] === where[1]) : [...rows];
        cb(filtered);
      });
    }
    rows.forEach((r) => {
      const docKey = `${col}/${r.id}`;
      if (this._docListeners[docKey]) this._docListeners[docKey].forEach((cb) => cb(r));
    });
  },
  watch(col, cb, where) {
    if (!this._listeners[col]) this._listeners[col] = [];
    const entry = { cb, where };
    this._listeners[col].push(entry);
    let rows = this._getStore(col);
    if (where) rows = rows.filter((r) => r[where[0]] === where[1]);
    setTimeout(() => cb(rows), 0);
    return () => { this._listeners[col] = this._listeners[col].filter((f) => f !== entry); };
  },
  watchDoc(col, id, cb) {
    const docKey = `${col}/${id}`;
    if (!this._docListeners[docKey]) this._docListeners[docKey] = [];
    this._docListeners[docKey].push(cb);
    const doc = this._getStore(col).find((r) => r.id === id);
    setTimeout(() => cb(doc || null), 0);
    return () => { this._docListeners[docKey] = this._docListeners[docKey].filter((f) => f !== cb); };
  },
  async set(col, id, payload) {
    const rows = this._getStore(col);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...payload, id };
    else rows.push({ ...payload, id });
    this._setStore(col, rows);
  },
  async remove(col, id) {
    const rows = this._getStore(col).filter((r) => r.id !== id);
    this._setStore(col, rows);
  },
  newId() { return "id-" + Math.random().toString(36).substring(2, 9); },
  stamp() { return Date.now(); },
  async uploadImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  },
};

// ==========================================
// IMPLEMENTACIÓN FIREBASE (NUBE)
// ==========================================
let cloudImpl = null;

if (isCloud) {
  const base = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [appM, authM, fs] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-auth.js"),
    import(base + "firebase-firestore.js"),
  ]);

  const app = appM.initializeApp(CONFIG.firebase);
  const auth = authM.getAuth(app);
  const db = fs.getFirestore(app);

  const fixTs = (v) => {
    if (v && typeof v.toMillis === "function") return v.toMillis();
    if (Array.isArray(v)) return v.map(fixTs);
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      const o = {};
      for (const k in v) o[k] = fixTs(v[k]);
      return o;
    }
    return v;
  };
  const readDoc = (doc) => fixTs(doc.data({ serverTimestamps: "estimate" }));

  const toUser = (u) => u && {
    uid: u.uid,
    email: u.email || "",
    name: u.displayName || u.email || "Usuario",
    photo: u.photoURL || "",
    verified: u.emailVerified,
    google: u.providerData.some((p) => p.providerId === "google.com"),
  };

  cloudImpl = {
    onAuth(cb) {
      return authM.onAuthStateChanged(auth, (u) => cb(toUser(u)));
    },
    async login() {
      const provider = new authM.GoogleAuthProvider();
      await authM.signInWithPopup(auth, provider);
    },
    async loginDemo(role) {
      // En modo nube, las pruebas de roles sin cuenta real usan localImpl
      return localImpl.loginDemo(role);
    },
    async logout() { await authM.signOut(auth); },
    async loginEmail(email, pass) { await authM.signInWithEmailAndPassword(auth, email, pass); },
    async register(email, pass, name) {
      const cred = await authM.createUserWithEmailAndPassword(auth, email, pass);
      if (name) await authM.updateProfile(cred.user, { displayName: name });
      await authM.sendEmailVerification(cred.user);
    },
    async resetPassword(email) { await authM.sendPasswordResetEmail(auth, email); },
    async resendVerification() { if (auth.currentUser) await authM.sendEmailVerification(auth.currentUser); },
    async recheck() { if (auth.currentUser) await auth.currentUser.reload(); },
    watch(col, cb, where) {
      let q = fs.collection(db, col);
      if (where) q = fs.query(q, fs.where(where[0], "==", where[1]));
      return fs.onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => ({ ...readDoc(d), id: d.id })));
      }, (err) => console.error("[PortalColegio] watch error:", col, err));
    },
    watchDoc(col, id, cb) {
      return fs.onSnapshot(fs.doc(db, col, id), (d) => {
        cb(d.exists() ? { ...readDoc(d), id: d.id } : null);
      });
    },
    async set(col, id, payload) {
      await fs.setDoc(fs.doc(db, col, id), payload, { merge: true });
    },
    async remove(col, id) {
      await fs.deleteDoc(fs.doc(db, col, id));
    },
    newId() { return fs.doc(fs.collection(db, "_")).id; },
    stamp() { return fs.serverTimestamp(); },
    async uploadImage(file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!json.secure_url) throw new Error("Error subiendo archivo");
      return json.secure_url;
    },
  };
}

// Exportamos una interfaz unificada; si el usuario entra en modo demo local, usa localImpl.
export const data = {
  isDemoSession: () => Boolean(localStorage.getItem("portal_user")),
  _impl() {
    if (localStorage.getItem("portal_user")) return localImpl;
    return isCloud ? cloudImpl : localImpl;
  },
  onAuth(cb) { return this._impl().onAuth(cb); },
  login() { return (isCloud ? cloudImpl : localImpl).login(); },
  loginDemo(role) { return localImpl.loginDemo(role); },
  logout() {
    localStorage.removeItem("portal_user");
    return (isCloud ? cloudImpl : localImpl).logout();
  },
  loginEmail(e, p) { return (isCloud ? cloudImpl : localImpl).loginEmail(e, p); },
  register(e, p, n) { return (isCloud ? cloudImpl : localImpl).register(e, p, n); },
  resetPassword(e) { return (isCloud ? cloudImpl : localImpl).resetPassword(e); },
  resendVerification() { return (isCloud ? cloudImpl : localImpl).resendVerification(); },
  recheck() { return (isCloud ? cloudImpl : localImpl).recheck(); },
  watch(c, cb, w) { return this._impl().watch(c, cb, w); },
  watchDoc(c, id, cb) { return this._impl().watchDoc(c, id, cb); },
  set(c, id, d) { return this._impl().set(c, id, d); },
  remove(c, id) { return this._impl().remove(c, id); },
  newId() { return this._impl().newId(); },
  stamp() { return this._impl().stamp(); },
  uploadImage(f) { return this._impl().uploadImage(f); },
};
