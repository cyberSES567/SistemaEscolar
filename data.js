// data.js
// Capa de datos real: Firebase (Auth, Firestore, Storage) en producción
// y modo desarrollo (?env=dev) separado explícitamente.
import { CONFIG } from "./config.js";

export const isDevMode = () => {
  const params = new URLSearchParams(location.search);
  if (params.get("env") === "dev") return true;
  if (params.get("env") === "prod") return false;
  return CONFIG.env === "development";
};

export const isCloud = Boolean(CONFIG.firebase && CONFIG.firebase.apiKey) && !isDevMode();

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFile(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo.");
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("Formato no permitido. Solo PDF, JPG, PNG o WEBP.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("El archivo supera el límite de 5 MB.");
  }
}

// ==========================================
// DATOS DE DESARROLLO (SOLO ?env=dev)
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
  ];

  const students = [
    { id: "stu-1", uid: "demo-alumno", email: "alumno@colegio.edu.pe", name: "Mateo Silva Rojas", gradeId: "3", section: "A", sectionId: "3A", active: true, code: "2027-03A-01", guardian: "María Rojas (987654321)" },
    { id: "stu-2", uid: "stu-2", email: "valeria.torres@colegio.edu.pe", name: "Valeria Torres Díaz", gradeId: "3", section: "A", sectionId: "3A", active: true, code: "2027-03A-02", guardian: "Luis Torres (987654322)" },
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

  const settings = [
    { id: "school", tramitesEnabled: false, academicYear: CONFIG.academicYear, activePeriod: "B1", schoolName: CONFIG.schoolName }
  ];

  return { sections, staff: teachers, students, courses, modules: [], tasks: [], submissions: [], grades: [], attendance: [], conduct: [], announcements: [], schedules: [], tramites: [], auditLogs: [], settings };
}

// ==========================================
// IMPLEMENTACIÓN DESARROLLO (SOLO ?env=dev)
// ==========================================
const devImpl = {
  _listeners: {},
  _docListeners: {},
  _authCb: null,
  _user: JSON.parse(localStorage.getItem("portal_dev_user") || "null"),

  _ensureSeed() {
    if (localStorage.getItem("portal_dev_seeded")) return;
    const seed = buildSeedData();
    Object.entries(seed).forEach(([col, rows]) => {
      localStorage.setItem("portal_dev_" + col, JSON.stringify(rows));
    });
    localStorage.setItem("portal_dev_seeded", "1");
  },
  resetDevData() {
    Object.keys(localStorage).filter((k) => k.startsWith("portal_dev_")).forEach((k) => localStorage.removeItem(k));
    this._ensureSeed();
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
  async loginEmail(email) { this._setUser({ uid: "dev-" + email, email, name: email.split("@")[0], verified: true }); },
  async register(email, pass, name) { this._setUser({ uid: "dev-" + email, email, name: name || email, verified: true }); },
  async resetPassword() { return true; },
  _setUser(u) {
    this._user = u;
    if (u) localStorage.setItem("portal_dev_user", JSON.stringify(u));
    else localStorage.removeItem("portal_dev_user");
    if (this._authCb) this._authCb(u);
  },
  _getStore(col) {
    this._ensureSeed();
    return JSON.parse(localStorage.getItem("portal_dev_" + col) || "[]");
  },
  _setStore(col, rows) {
    localStorage.setItem("portal_dev_" + col, JSON.stringify(rows));
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
  async uploadFile(file) {
    validateFile(file);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  },
};

// ==========================================
// IMPLEMENTACIÓN PRODUCCIÓN (FIREBASE REAL)
// ==========================================
let cloudImpl = null;

if (isCloud) {
  const base = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [appM, authM, fs, stM] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-auth.js"),
    import(base + "firebase-firestore.js"),
    import(base + "firebase-storage.js"),
  ]);

  const app = appM.initializeApp(CONFIG.firebase);
  const auth = authM.getAuth(app);
  const db = fs.getFirestore(app);
  const storage = stM.getStorage(app);

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
    async logout() { await authM.signOut(auth); },
    async loginEmail(email, pass) { await authM.signInWithEmailAndPassword(auth, email, pass); },
    async register(email, pass, name) {
      const cred = await authM.createUserWithEmailAndPassword(auth, email, pass);
      if (name) await authM.updateProfile(cred.user, { displayName: name });
      await authM.sendEmailVerification(cred.user);
    },
    async resetPassword(email) { await authM.sendPasswordResetEmail(auth, email); },
    watch(col, cb, where, onErr) {
      let q = fs.collection(db, col);
      if (where) q = fs.query(q, fs.where(where[0], "==", where[1]));
      return fs.onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => ({ ...readDoc(d), id: d.id })));
      }, (err) => {
        console.error("[PortalColegio] Firestore watch error:", col, err);
        if (onErr) onErr(err);
      });
    },
    watchDoc(col, id, cb, onErr) {
      return fs.onSnapshot(fs.doc(db, col, id), (d) => {
        cb(d.exists() ? { ...readDoc(d), id: d.id } : null);
      }, (err) => {
        console.error("[PortalColegio] Firestore doc error:", col, id, err);
        if (onErr) onErr(err);
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
    async uploadFile(file, pathPrefix = "uploads") {
      validateFile(file);
      const uid = auth.currentUser?.uid || "anon";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const ref = stM.ref(storage, `${pathPrefix}/${uid}/${Date.now()}_${safeName}`);
      await stM.uploadBytes(ref, file, { contentType: file.type });
      return await stM.getDownloadURL(ref);
    },
  };
}

const activeImpl = isCloud ? cloudImpl : devImpl;

export const data = {
  isCloud,
  isDevMode,
  resetDevData: () => devImpl.resetDevData(),
  onAuth: (cb) => activeImpl.onAuth(cb),
  login: () => activeImpl.login(),
  loginDemo: (role) => {
    if (isCloud) throw new Error("El modo demo solo está disponible en ?env=dev");
    return devImpl.loginDemo(role);
  },
  logout: () => activeImpl.logout(),
  loginEmail: (e, p) => activeImpl.loginEmail(e, p),
  register: (e, p, n) => activeImpl.register(e, p, n),
  resetPassword: (e) => activeImpl.resetPassword(e),
  watch: (c, cb, w, onErr) => activeImpl.watch(c, cb, w, onErr),
  watchDoc: (c, id, cb, onErr) => activeImpl.watchDoc(c, id, cb, onErr),
  set: (c, id, d) => activeImpl.set(c, id, d),
  remove: (c, id) => activeImpl.remove(c, id),
  newId: () => activeImpl.newId(),
  stamp: () => activeImpl.stamp(),
  uploadFile: (f, prefix) => activeImpl.uploadFile(f, prefix),
};
