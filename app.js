import { CONFIG } from "./config.js";
import { data, isCloud, isDevMode } from "./data.js";
import { buildTimeSlots, generateSmartSchedule } from "./scheduler.js";

/* ====================== utilidades ====================== */
const $app = document.getElementById("app");
const $modal = document.getElementById("modal");
const $toasts = document.getElementById("toasts");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + Number(b), 0) / arr.length) * 10) / 10 : null);

function gradeBand(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return { label: "Sin nota", cls: "" };
  return CONFIG.gradingScale.bands.find((b) => n >= b.min && n <= b.max) || { label: "Desaprobatorio", cls: "bad" };
}

function peruNow() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: CONFIG.timezone }));
}

function toast(msg, type = "", title = "") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  if (title) { const b = document.createElement("b"); b.textContent = title; el.appendChild(b); }
  el.appendChild(document.createTextNode(msg));
  $toasts.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/* ====================== estado ====================== */
const S = {
  user: null,
  role: null,
  loading: true,
  tab: null,
  sections: [],
  staff: [],
  students: [],
  courses: [],
  modules: [],
  tasks: [],
  submissions: [],
  grades: [],
  attendance: [],
  conduct: [],
  announcements: [],
  schedules: [],
  tramites: [],
  auditLogs: [],
  schoolSettings: { tramitesEnabled: false, academicYear: CONFIG.academicYear, activePeriod: "B1" },
  periodFilter: "B1",
  selectedCourse: "",
  selectedSection: "3A",
  schedSection: "3A",
};

let unsubs = [];
let rafId = null;
function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    $app.innerHTML = view();
  });
}

function stopWatchers() {
  unsubs.forEach((u) => { try { u(); } catch {} });
  unsubs = [];
}

const NAV = {
  alumno: [["inicio", "Inicio"], ["aula", "Aula Virtual"], ["horario", "Horario"], ["notas", "Notas"], ["tramites", "Trámites"]],
  profesor: [["inicio", "Inicio"], ["cursos", "Módulos"], ["tareas", "Tareas"], ["notas", "Notas"], ["asistencia", "Asistencia"], ["reportes", "Reportes"]],
  director: [["inicio", "Dashboard"], ["academico", "Académico"], ["horarios", "Horarios (28)"], ["personas", "Personas"], ["auditoria", "Auditoría"]],
  secretaria: [["inicio", "Inicio"], ["estudiantes", "Matrículas"], ["conducta", "Conducta"], ["tramites", "Trámites"], ["comunicados", "Comunicados"]],
};

const ROLE_LABEL = {
  alumno: "Alumno",
  profesor: "Profesor",
  director: "Director",
  secretaria: "Dirección / Secretaría",
};

function onWatchErr(col) {
  return (err) => toast(`Error cargando ${col}: ${err.message || "Sin permisos"}`, "bad");
}

function startWatchers(role, u) {
  stopWatchers();
  const w = (col, key, where = null) => {
    unsubs.push(data.watch(col, (rows) => { S[key] = rows; scheduleRender(); }, where, onWatchErr(col)));
  };

  unsubs.push(data.watchDoc("settings", "school", (doc) => {
    if (doc) S.schoolSettings = { ...S.schoolSettings, ...doc };
    scheduleRender();
  }, onWatchErr("settings")));

  // Colecciones comunes de lectura institucional
  w("sections", "sections");
  w("courses", "courses");
  w("announcements", "announcements");
  w("schedules", "schedules");

  if (role === "alumno") {
    // Consultas estrictamente filtradas al alumno autenticado
    w("students", "students", ["uid", u.uid]);
    w("modules", "modules");
    w("tasks", "tasks");
    w("submissions", "submissions", ["studentUid", u.uid]);
    w("grades", "grades", ["studentUid", u.uid]);
    w("attendance", "attendance", ["studentUid", u.uid]);
    w("conduct", "conduct", ["studentUid", u.uid]);
    w("tramites", "tramites", ["studentUid", u.uid]);
  } else if (role === "profesor") {
    w("students", "students");
    w("modules", "modules");
    w("tasks", "tasks");
    w("submissions", "submissions");
    w("grades", "grades");
    w("attendance", "attendance");
  } else if (role === "secretaria") {
    w("students", "students");
    w("conduct", "conduct");
    w("tramites", "tramites");
    w("staff", "staff");
  } else if (role === "director") {
    w("staff", "staff");
    w("students", "students");
    w("grades", "grades");
    w("attendance", "attendance");
    w("tramites", "tramites");
    w("auditLogs", "auditLogs");
  }
}

function resolveRole(u, staffList) {
  if (!u) return null;
  if (isDevMode() && u.demoRole) return u.demoRole;
  const email = (u.email || "").toLowerCase();
  if (email === CONFIG.ownerEmail.toLowerCase()) return "director";
  const st = staffList.find((s) => (s.email || "").toLowerCase() === email && s.active !== false);
  if (st) return st.role;
  return "alumno";
}

data.onAuth((u) => {
  S.user = u;
  if (!u) {
    stopWatchers();
    S.role = null;
    S.loading = false;
    scheduleRender();
    return;
  }
  S.loading = true;
  scheduleRender();

  if (isDevMode() && u.demoRole) {
    S.role = u.demoRole;
    S.tab = NAV[S.role]?.[0]?.[0] || "inicio";
    startWatchers(S.role, u);
    S.loading = false;
    scheduleRender();
    return;
  }

  // En producción, consultamos el documento de staff del usuario para resolver su rol de forma confiable
  const email = (u.email || "").toLowerCase();
  if (email === CONFIG.ownerEmail.toLowerCase()) {
    S.role = "director";
    S.tab = NAV.director[0][0];
    startWatchers("director", u);
    S.loading = false;
    scheduleRender();
    return;
  }

  const unsubRole = data.watchDoc("staff", email || "_", (doc) => {
    unsubRole();
    const role = doc && doc.active !== false ? doc.role : "alumno";
    S.role = NAV[role] ? role : "alumno";
    S.tab = NAV[S.role][0][0];
    startWatchers(S.role, u);
    S.loading = false;
    scheduleRender();
  }, () => {
    S.role = "alumno";
    S.tab = "inicio";
    startWatchers("alumno", u);
    S.loading = false;
    scheduleRender();
  });
});

async function logAudit(action, target) {
  try {
    await data.set("auditLogs", data.newId(), {
      actorEmail: S.user?.email || "sistema",
      actorRole: S.role,
      action,
      target,
      at: data.stamp(),
      dateStr: new Date().toLocaleString("es-PE", { timeZone: CONFIG.timezone }),
    });
  } catch (e) {
    console.warn("Audit log error:", e);
  }
}

/* ====================== helpers de dominio ====================== */
function currentStudent() {
  return S.students.find((s) => s.uid === S.user?.uid || s.email === S.user?.email) || {
    uid: S.user?.uid, name: S.user?.name || "Estudiante", gradeId: "—", section: "—", sectionId: "Sin matrícula", code: "Pendiente"
  };
}

function publishedSchedule() {
  return S.schedules.find((s) => s.id === "published") || null;
}

function currentClassForSection(sectionId) {
  const sched = publishedSchedule();
  if (!sched || !sched.entries) return { status: "none", msg: "Horario aún no publicado por Dirección." };
  const p = peruNow();
  const dayIdx = p.getDay() - 1;
  if (dayIdx < 0 || dayIdx > 4) return { status: "none", msg: "Hoy no hay clases programadas (fin de semana)." };

  const hhmm = `${String(p.getHours()).padStart(2, "0")}:${String(p.getMinutes()).padStart(2, "0")}`;
  const todayEntries = sched.entries.filter((e) => e.sectionId === sectionId && e.dayIdx === dayIdx).sort((a, b) => a.start.localeCompare(b.start));
  const nowEntry = todayEntries.find((e) => hhmm >= e.start && hhmm < e.end);
  if (nowEntry) return { status: "now", entry: nowEntry };
  const nextEntry = todayEntries.find((e) => e.start > hhmm);
  if (nextEntry) return { status: "next", entry: nextEntry };
  return { status: "none", msg: "Jornada escolar finalizada por hoy." };
}

/* ====================== vistas comunes ====================== */
function loginView() {
  const dev = isDevMode();
  return `<header class="top">
    <div class="brand">Portal Colegio<small>${esc(CONFIG.schoolName)} · ${CONFIG.academicYear}</small></div>
    <div class="sp"></div>
    <span class="chip ${dev ? "warn" : "ok"}">${dev ? "Entorno Desarrollo" : "Producción Firebase"}</span>
  </header>
  <section class="hero">
    <span class="pill">SIGE Perú 2027 · Escala Vigesimal (0–20)</span>
    <h1>Gestión Educativa Integral para Secundaria.</h1>
    <p>Plataforma académica y administrativa conectada en tiempo real con Firebase Authentication, Cloud Firestore y Firebase Storage.</p>

    ${dev ? `
      <div class="card" style="max-width:680px;margin:0 auto 22px;text-align:left">
        <h3 style="margin-bottom:8px">Acceso rápido de desarrollo (?env=dev)</h3>
        <div class="row">
          <button class="btn" data-act="demo" data-role="alumno">🎓 Alumno</button>
          <button class="btn ghost" data-act="demo" data-role="profesor">👨‍🏫 Profesor</button>
          <button class="btn ghost" data-act="demo" data-role="director">🏛️ Director</button>
          <button class="btn ghost" data-act="demo" data-role="secretaria">🗂️ Secretaría</button>
        </div>
      </div>
    ` : ""}

    <div class="card" style="max-width:440px;margin:0 auto;text-align:left">
      <h3 style="margin-bottom:10px">Acceso institucional</h3>
      ${isCloud ? `<button class="btn big gbtn full" data-act="login" style="margin-bottom:12px"><i>G</i> Continuar con Google</button>` : ""}
      <form data-form="emailAuth">
        <label class="lbl">Correo institucional<input name="email" type="email" required placeholder="usuario@colegio.edu.pe"></label>
        <label class="lbl">Contraseña<input name="password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres"></label>
        <div class="row" style="margin-top:10px">
          <button class="btn full" type="submit" value="login">Iniciar sesión</button>
          <button class="btn ghost full" type="submit" value="register">Registrarme</button>
        </div>
      </form>
      <button class="btn ghost full sm" type="button" data-act="resetPass" style="margin-top:10px">¿Olvidaste tu contraseña?</button>
    </div>
  </section>`;
}

function topbar() {
  const u = S.user;
  const label = ROLE_LABEL[S.role] || "";
  return `<header class="top">
    <div class="brand">Portal Colegio<small>${esc(CONFIG.schoolName)} · ${S.schoolSettings.academicYear || 2027}</small></div>
    <div class="sp"></div>
    <span class="badge">${esc(label)}</span>
    <div class="avatar" title="${esc(u.email || u.name)}">${esc((u.name || "U")[0].toUpperCase())}</div>
    <button class="btn ghost sm" data-act="logout">Salir</button>
  </header>`;
}

function nav() {
  const items = NAV[S.role] || [];
  return `<nav class="tabs">${items.map(([k, l]) => `<button class="${S.tab === k ? "on" : ""}" data-act="tab" data-t="${k}">${l}</button>`).join("")}</nav>`;
}

/* ====================== PANEL DEL ALUMNO ====================== */
function alumnoView() {
  return ({
    inicio: alumnoInicio,
    aula: alumnoAula,
    horario: alumnoHorario,
    notas: alumnoNotas,
    tramites: alumnoTramites,
  }[S.tab] || alumnoInicio)();
}

function alumnoInicio() {
  const stu = currentStudent();
  const pres = S.attendance.filter((a) => a.status === "Presente").length;
  const attPct = S.attendance.length ? Math.round((pres / S.attendance.length) * 100) : 100;
  const clsNow = currentClassForSection(stu.sectionId);
  const p = peruNow();
  const fechaStr = p.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `
    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <span class="chip ok">${esc(stu.gradeId)}.º Secundaria · Sección ${esc(stu.section)}</span>
        <h2 style="margin-top:8px">¡Bienvenido, ${esc(stu.name)}!</h2>
        <p class="muted" style="text-transform:capitalize">${esc(fechaStr)} · Código: ${esc(stu.code)}</p>
        <div class="grid4" style="margin-top:14px">
          <div class="kpi"><span class="muted">Promedio General</span><b>${avg(S.grades.map((g) => g.score)) ?? "—"} / 20</b></div>
          <div class="kpi"><span class="muted">Asistencia</span><b>${attPct}%</b></div>
          <div class="kpi"><span class="muted">Tareas sección</span><b>${S.tasks.filter((t) => t.sectionId === stu.sectionId).length}</b></div>
        </div>
      </div>

      <div class="card" style="border-left:4px solid var(--accent)">
        <span class="muted">Horario en tiempo real (Hora Perú)</span>
        <h3 style="margin:6px 0">${clsNow.status === "now" ? "🟢 En clase ahora" : clsNow.status === "next" ? "🟡 Próxima clase" : "⚪ Estado del horario"}</h3>
        ${clsNow.entry ? `
          <p style="font-size:1.1rem;font-weight:600;color:var(--accent2)">${esc(clsNow.entry.courseName)}</p>
          <p class="muted">${esc(clsNow.entry.start)} – ${esc(clsNow.entry.end)} · ${esc(clsNow.entry.room)} · ${esc(clsNow.entry.teacherName)}</p>
        ` : `<p class="muted">${esc(clsNow.msg)}</p>`}
        <button class="btn sm ghost" style="margin-top:10px" data-act="tab" data-t="horario">Ver horario completo</button>
      </div>
    </div>

    <h3 class="sec">Anuncios institucionales</h3>
    <div class="stack" style="margin-bottom:16px">
      ${S.announcements.map((a) => `<div class="card"><b>${esc(a.title)}</b><p class="muted" style="margin:4px 0">${esc(a.body)}</p><span class="muted" style="font-size:.75rem">${esc(a.author)} · ${esc(a.date)}</span></div>`).join("") || `<div class="empty">Sin anuncios recientes.</div>`}
    </div>

    <h3 class="sec">Últimas calificaciones (Escala 0–20)</h3>
    <div class="stack">
      ${S.grades.slice(0, 5).map((g) => {
        const b = gradeBand(g.score);
        return `<div class="card"><div class="row" style="align-items:center"><div><b>${esc(g.courseName)}</b> · <span class="muted">${esc(g.evalName)}</span></div><div style="text-align:right"><span class="chip ${b.cls}">${g.score}/20 · ${b.label}</span></div></div>${g.comment ? `<p class="muted" style="margin-top:6px">💬 "${esc(g.comment)}"</p>` : ""}</div>`;
      }).join("") || `<div class="empty">Aún no hay calificaciones registradas.</div>`}
    </div>`;
}

function alumnoAula() {
  const stu = currentStudent();
  const myCourses = S.courses;
  const activeCourse = S.selectedCourse || myCourses[0]?.id || "";
  const course = myCourses.find((c) => c.id === activeCourse);
  const mods = S.modules.filter((m) => m.courseId === activeCourse && m.sectionId === stu.sectionId && m.published !== false);
  const tsks = S.tasks.filter((t) => t.courseId === activeCourse && t.sectionId === stu.sectionId);

  return `
    <h2>Aula Virtual (LMS) — ${esc(stu.sectionId)}</h2>
    <div class="row" style="margin:12px 0">
      ${myCourses.map((c) => `<button class="btn sm ${c.id === activeCourse ? "" : "ghost"}" data-act="pickCourse" data-id="${esc(c.id)}">${esc(c.name)}</button>`).join("")}
    </div>
    ${course ? `
      <div class="card" style="margin-bottom:14px">
        <h3>${esc(course.name)}</h3>
        <p class="muted">Docente: ${esc(course.teacherName)} · ${course.hoursPerWeek} h/semana</p>
      </div>
      <h3 class="sec">Módulos y Sesiones</h3>
      <div class="stack" style="margin-bottom:16px">
        ${mods.map((m) => `<div class="card">
          <span class="chip blue">${esc(m.unit)} · Semana ${m.week}</span>
          <h3 style="margin-top:6px">${esc(m.title)}</h3>
          <p class="muted">${esc(m.description)}</p>
        </div>`).join("") || `<div class="empty">Aún no hay módulos publicados para tu sección.</div>`}
      </div>
      <h3 class="sec">Tareas del curso</h3>
      <div class="stack">
        ${tsks.map((t) => {
          const sub = S.submissions.find((s) => s.taskId === t.id && s.studentUid === stu.uid);
          return `<div class="card">
            <div class="row" style="align-items:center">
              <div><b>${esc(t.title)}</b><p class="muted">${esc(t.instructions)}</p><span class="muted" style="font-size:.76rem">Fecha límite: ${esc(t.dueDate)} · Máx: ${t.maxScore}</span></div>
              <div style="text-align:right">
                ${sub ? `<span class="chip ok">${esc(sub.status)} ${sub.grade != null ? `· ${sub.grade}/20` : ""}</span>` : `<button class="btn sm" data-act="openSubmit" data-id="${esc(t.id)}">Entregar tarea</button>`}
              </div>
            </div>
          </div>`;
        }).join("") || `<div class="empty">Sin tareas asignadas.</div>`}
      </div>
    ` : ""}`;
}

function alumnoHorario() {
  const stu = currentStudent();
  const sched = publishedSchedule();
  const { days, slots } = buildTimeSlots(CONFIG.scheduleDefaults);
  if (!sched) return `<h2>Horario Semanal (${esc(stu.sectionId)})</h2><div class="empty" style="margin-top:12px">Dirección aún no ha publicado el horario oficial.</div>`;

  return `
    <h2>Horario Semanal — Sección ${esc(stu.sectionId)}</h2>
    <div class="card tbl-wrap" style="margin-top:12px">
      <table>
        <thead><tr><th>Hora</th>${days.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
        <tbody>
          ${slots.map((sl) => {
            if (sl.isBreak) return `<tr><td class="sched-break">${sl.label}</td><td colspan="${days.length}" class="sched-break">RECREO INSTITUCIONAL</td></tr>`;
            return `<tr><td><b>${sl.start}–${sl.end}</b></td>${days.map((_, dIdx) => {
              const e = sched.entries.find((x) => x.sectionId === stu.sectionId && x.dayIdx === dIdx && x.block === sl.block);
              return `<td>${e ? `<div class="sched-cell"><b>${esc(e.courseName)}</b><div class="muted" style="font-size:.72rem">${esc(e.teacherName)}</div></div>` : "—"}</td>`;
            }).join("")}</tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function alumnoNotas() {
  const myGrades = S.grades.filter((g) => g.period === S.periodFilter);
  return `
    <div class="row" style="align-items:center;margin-bottom:12px">
      <h2>Libreta de Notas 2027 (Escala 0–20)</h2>
      <select data-change="periodFilter" style="max-width:200px">
        ${CONFIG.periods.map((p) => `<option value="${p.id}" ${S.periodFilter === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
      </select>
    </div>

    <div class="card tbl-wrap" style="margin-bottom:16px">
      <table>
        <thead><tr><th>Curso</th><th>Evaluación</th><th>Nota</th><th>Rendimiento</th><th>Comentario docente</th></tr></thead>
        <tbody>
          ${myGrades.map((g) => {
            const b = gradeBand(g.score);
            return `<tr>
              <td><b>${esc(g.courseName)}</b></td>
              <td>${esc(g.evalName)}</td>
              <td><b>${g.score} / 20</b></td>
              <td><span class="chip ${b.cls}">${b.label}</span></td>
              <td class="muted">${esc(g.comment || "—")}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="5" class="muted">Sin notas registradas en este periodo.</td></tr>`}
        </tbody>
      </table>
    </div>

    <h3 class="sec">Registro Independiente de Conducta</h3>
    <div class="stack">
      ${S.conduct.map((c) => {
        const b = gradeBand(c.score);
        return `<div class="card"><div class="row" style="align-items:center"><b>Conducta · ${esc(c.period)}</b><span class="chip ${b.cls}">${c.score}/20</span></div><p class="muted" style="margin-top:6px">${esc(c.observation)}</p></div>`;
      }).join("") || `<div class="empty">Sin registros de conducta.</div>`}
    </div>`;
}

function alumnoTramites() {
  if (!S.schoolSettings.tramitesEnabled) {
    return `<h2>Trámites Académicos</h2>
    <div class="empty" style="margin-top:16px">
      <h3>🔒 Módulo temporalmente deshabilitado</h3>
      <p class="muted" style="margin-top:8px">Este servicio institucional aún no está habilitado por Dirección.</p>
    </div>`;
  }
  return `<h2>Trámites Académicos</h2>
  <div class="card" style="margin:12px 0">
    <form data-form="reqTramite" class="row" style="align-items:end">
      <label class="lbl">Tipo de trámite<select name="type"><option>Constancia de Estudios</option><option>Certificado Oficial de Notas</option><option>Rectificación de Datos</option></select></label>
      <label class="lbl">Detalle<input name="detail" required placeholder="Motivo o destinatario"></label>
      <button class="btn" type="submit">Solicitar</button>
    </form>
  </div>
  <div class="stack">
    ${S.tramites.map((t) => `<div class="card"><b>${esc(t.type)}</b> · <span class="chip">${esc(t.status)}</span><p class="muted">${esc(t.detail)}</p></div>`).join("")}
  </div>`;
}

/* ====================== PANEL DEL PROFESOR ====================== */
function profesorView() {
  return ({
    inicio: profInicio,
    cursos: profCursos,
    tareas: profTareas,
    notas: profNotas,
    asistencia: profAsistencia,
    reportes: profReportes,
  }[S.tab] || profInicio)();
}

function profInicio() {
  const pendingSubs = S.submissions.filter((s) => s.grade == null).length;
  return `
    <h2>Panel Docente — ${esc(S.user.name)}</h2>
    <div class="grid4" style="margin:14px 0">
      <div class="card kpi"><span class="muted">Cursos</span><b>${S.courses.length}</b></div>
      <div class="card kpi"><span class="muted">Módulos</span><b>${S.modules.length}</b></div>
      <div class="card kpi"><span class="muted">Entregas por calificar</span><b>${pendingSubs}</b></div>
      <div class="card kpi"><span class="muted">Secciones</span><b>${S.sections.length}</b></div>
    </div>`;
}

function profCursos() {
  return `
    <div class="row" style="align-items:center;margin-bottom:12px">
      <h2>Planificación de Módulos (LMS)</h2>
      <button class="btn sm" data-act="openNewMod" style="max-width:200px">+ Nuevo Módulo</button>
    </div>
    <div class="stack">
      ${S.modules.map((m) => `<div class="card"><span class="chip blue">${esc(m.courseName)} · ${esc(m.sectionId)} · Semana ${m.week}</span><h3 style="margin-top:6px">${esc(m.title)}</h3><p class="muted">${esc(m.description)}</p></div>`).join("") || `<div class="empty">Sin módulos creados.</div>`}
    </div>`;
}

function profTareas() {
  return `
    <div class="row" style="align-items:center;margin-bottom:12px">
      <h2>Gestión de Tareas y Entregas</h2>
      <button class="btn sm" data-act="openNewTask" style="max-width:200px">+ Nueva Tarea</button>
    </div>
    <div class="stack" style="margin-bottom:18px">
      ${S.tasks.map((t) => `<div class="card"><b>${esc(t.title)}</b> <span class="chip">${esc(t.courseName)} · ${esc(t.sectionId)}</span><p class="muted">${esc(t.instructions)}</p></div>`).join("")}
    </div>
    <h3 class="sec">Seguimiento de Entregas</h3>
    <div class="card tbl-wrap">
      <table>
        <thead><tr><th>Alumno</th><th>Tarea</th><th>Entrega</th><th>Estado</th><th>Nota (0–20)</th><th>Acción</th></tr></thead>
        <tbody>
          ${S.submissions.map((s) => `<tr>
            <td>${esc(s.studentName)}</td>
            <td>${esc(s.taskTitle)}</td>
            <td>${s.fileUrl ? `<a class="btn sm ghost" href="${esc(s.fileUrl)}" target="_blank">📎 Ver archivo</a>` : esc(s.answer || "—")}</td>
            <td><span class="chip ${s.grade != null ? "ok" : "warn"}">${esc(s.status)}</span></td>
            <td><b>${s.grade != null ? `${s.grade}/20` : "—"}</b></td>
            <td><button class="btn sm" data-act="gradeSub" data-id="${esc(s.id)}">Calificar</button></td>
          </tr>`).join("") || `<tr><td colspan="6" class="muted">Aún no hay entregas.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function profNotas() {
  const secStudents = S.students.filter((s) => s.sectionId === S.selectedSection);
  return `
    <h2>Registro Auxiliar de Notas (0–20)</h2>
    <div class="card" style="margin:12px 0">
      <form data-form="saveGrade" class="row" style="align-items:end">
        <label class="lbl">Sección<select name="sectionId" data-change="selSection">${S.sections.map((s) => `<option value="${s.id}" ${S.selectedSection === s.id ? "selected" : ""}>${s.id}</option>`).join("")}</select></label>
        <label class="lbl">Curso<select name="courseId">${S.courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
        <label class="lbl">Alumno<select name="studentUid">${secStudents.map((st) => `<option value="${st.uid}">${esc(st.name)}</option>`).join("")}</select></label>
        <label class="lbl">Evaluación<input name="evalName" required placeholder="Ej. Examen Parcial"></label>
        <label class="lbl">Nota (0-20)<input name="score" type="number" min="0" max="20" required></label>
        <label class="lbl">Comentario<input name="comment" placeholder="Observación pedagógica"></label>
        <button class="btn" type="submit">Guardar</button>
      </form>
    </div>
    <div class="card tbl-wrap">
      <table>
        <thead><tr><th>Alumno</th><th>Curso</th><th>Evaluación</th><th>Nota</th><th>Comentario</th></tr></thead>
        <tbody>${S.grades.map((g) => `<tr><td>${esc(g.studentName)}</td><td>${esc(g.courseName)}</td><td>${esc(g.evalName)}</td><td><b>${g.score}/20</b></td><td class="muted">${esc(g.comment || "—")}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function profAsistencia() {
  const today = new Date().toISOString().slice(0, 10);
  const secStudents = S.students.filter((s) => s.sectionId === S.selectedSection);
  return `
    <h2>Registro de Asistencia</h2>
    <div class="card" style="margin:12px 0">
      <form data-form="saveAtt" class="row" style="align-items:end">
        <label class="lbl">Sección<select name="sectionId" data-change="selSection">${S.sections.map((s) => `<option value="${s.id}" ${S.selectedSection === s.id ? "selected" : ""}>${s.id}</option>`).join("")}</select></label>
        <label class="lbl">Fecha<input name="date" type="date" value="${today}" required></label>
        <label class="lbl">Alumno<select name="studentUid">${secStudents.map((st) => `<option value="${st.uid}">${esc(st.name)}</option>`).join("")}</select></label>
        <label class="lbl">Estado<select name="status"><option>Presente</option><option>Ausente</option><option>Tardanza</option><option>Justificado</option></select></label>
        <button class="btn" type="submit">Registrar</button>
      </form>
    </div>
    <div class="card tbl-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Sección</th><th>Alumno</th><th>Estado</th></tr></thead>
        <tbody>${S.attendance.map((a) => `<tr><td>${esc(a.date)}</td><td>${esc(a.sectionId)}</td><td>${esc(a.studentName)}</td><td><span class="chip">${esc(a.status)}</span></td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function profReportes() {
  return `
    <h2>Reportes Académicos</h2>
    <div class="card" style="margin-top:12px">
      <div class="row" style="max-width:420px">
        <button class="btn" data-act="exportCsv">📥 Exportar Notas (CSV/Excel)</button>
        <button class="btn ghost" onclick="window.print()">🖨️ Imprimir / PDF</button>
      </div>
    </div>`;
}

/* ====================== PANEL DEL DIRECTOR ====================== */
function directorView() {
  return ({
    inicio: dirInicio,
    academico: dirAcademico,
    horarios: dirHorarios,
    personas: dirPersonas,
    auditoria: dirAuditoria,
  }[S.tab] || dirInicio)();
}

function dirInicio() {
  const avgAll = avg(S.grades.map((g) => g.score)) ?? "—";
  const sched = publishedSchedule();
  return `
    <h2>Dashboard Institucional — ${CONFIG.schoolName}</h2>
    <div class="grid4" style="margin:14px 0">
      <div class="card kpi"><span class="muted">Total Alumnos</span><b>${S.students.length}</b></div>
      <div class="card kpi"><span class="muted">Docentes Activos</span><b>${S.staff.length}</b></div>
      <div class="card kpi"><span class="muted">Secciones (1.º–5.º)</span><b>${S.sections.length}</b></div>
      <div class="card kpi"><span class="muted">Promedio General</span><b>${avgAll} / 20</b></div>
    </div>
    <div class="card">
      <h3>Estado del Horario Institucional</h3>
      <p class="muted">${sched ? `Publicado · ${sched.stats?.totalAssignedBlocks || 0} bloques asignados en ${sched.stats?.totalSections || 28} secciones.` : "Aún no se ha generado el horario."}</p>
      <button class="btn sm" style="margin-top:10px" data-act="tab" data-t="horarios">Ir al Generador de Horarios</button>
    </div>`;
}

function dirAcademico() {
  return `
    <h2>Gestión Académica & MINEDU 2027</h2>
    <div class="card" style="margin:12px 0">
      <div class="row" style="align-items:center">
        <div>
          <b>Módulo de Trámites para Alumnos</b>
          <p class="muted">Estado actual: ${S.schoolSettings.tramitesEnabled ? "🟢 Habilitado" : "🔒 Bloqueado"}</p>
        </div>
        <button class="btn sm ${S.schoolSettings.tramitesEnabled ? "bad" : "ok"}" data-act="toggleTramites" style="max-width:200px">
          ${S.schoolSettings.tramitesEnabled ? "Bloquear Trámites" : "Habilitar Trámites"}
        </button>
      </div>
    </div>
    <div class="card tbl-wrap">
      <table>
        <thead><tr><th>Área Curricular</th><th>Horas/Sem</th><th>Docente</th><th>Competencias</th></tr></thead>
        <tbody>${S.courses.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${c.hoursPerWeek} h</td><td>${esc(c.teacherName)}</td><td class="muted">${c.competencies?.length || 0} competencias</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function dirHorarios() {
  const sched = publishedSchedule();
  const { days, slots } = buildTimeSlots(CONFIG.scheduleDefaults);
  return `
    <h2>Generador Inteligente de Horarios (28 Secciones)</h2>
    <div class="card" style="margin:12px 0">
      <p class="muted" style="margin-bottom:10px">Valida restricciones de docentes, aulas, secciones, horas semanales y recreos. Solo publica si hay 0 conflictos.</p>
      <button class="btn" data-act="runScheduler">⚡ Generar y Publicar Horarios (28 Secciones)</button>
    </div>
    ${sched ? `
      <div class="row" style="align-items:center;margin:12px 0">
        <h3>Vista previa por sección:</h3>
        <select data-change="schedSection" style="max-width:180px">
          ${S.sections.map((s) => `<option value="${s.id}" ${S.schedSection === s.id ? "selected" : ""}>Sección ${s.id} (${s.room})</option>`).join("")}
        </select>
      </div>
      <div class="card tbl-wrap">
        <table>
          <thead><tr><th>Hora</th>${days.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
          <tbody>
            ${slots.map((sl) => {
              if (sl.isBreak) return `<tr><td class="sched-break">${sl.label}</td><td colspan="${days.length}" class="sched-break">RECREO</td></tr>`;
              return `<tr><td><b>${sl.start}–${sl.end}</b></td>${days.map((_, dIdx) => {
                const e = sched.entries.find((x) => x.sectionId === S.schedSection && x.dayIdx === dIdx && x.block === sl.block);
                return `<td>${e ? `<div class="sched-cell"><b>${esc(e.courseName)}</b><div class="muted" style="font-size:.72rem">${esc(e.teacherName)}</div></div>` : "—"}</td>`;
              }).join("")}</tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty">Presiona "Generar y Publicar Horarios" para construir el horario de las 28 secciones.</div>`}`;
}

function dirPersonas() {
  return `
    <h2>Gestión de Estudiantes y Personal</h2>
    <div class="card" style="margin:12px 0">
      <h3>Matricular Nuevo Estudiante</h3>
      <form data-form="enrollStudent" class="row" style="align-items:end;margin-top:8px">
        <label class="lbl">Nombre completo<input name="name" required placeholder="Apellidos y Nombres"></label>
        <label class="lbl">Correo institucional<input name="email" type="email" required placeholder="alumno@colegio.edu.pe"></label>
        <label class="lbl">Sección<select name="sectionId">${S.sections.map((s) => `<option value="${s.id}">${s.id}</option>`).join("")}</select></label>
        <label class="lbl">Apoderado<input name="guardian" placeholder="Nombre y teléfono"></label>
        <button class="btn" type="submit">Matricular</button>
      </form>
    </div>
    <div class="card tbl-wrap">
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Correo</th><th>Sección</th><th>Apoderado</th></tr></thead>
        <tbody>${S.students.map((s) => `<tr><td>${esc(s.code)}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.email)}</td><td><span class="chip ok">${esc(s.sectionId)}</span></td><td class="muted">${esc(s.guardian || "—")}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function dirAuditoria() {
  return `
    <h2>Auditoría de Operaciones</h2>
    <div class="card tbl-wrap" style="margin-top:12px">
      <table>
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>${S.auditLogs.map((l) => `<tr><td>${esc(l.dateStr || "—")}</td><td>${esc(l.actorEmail)}</td><td><span class="chip">${esc(l.actorRole)}</span></td><td><b>${esc(l.action)}</b></td><td class="muted">${esc(l.target)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Sin registros de auditoría aún.</td></tr>`}</tbody>
      </table>
    </div>`;
}

/* ====================== PANEL DE SECRETARÍA ====================== */
function secretariaView() {
  return ({
    inicio: () => `<h2>Dirección / Secretaría</h2><div class="grid4" style="margin-top:12px"><div class="card kpi"><span class="muted">Estudiantes</span><b>${S.students.length}</b></div><div class="card kpi"><span class="muted">Secciones</span><b>${S.sections.length}</b></div><div class="card kpi"><span class="muted">Trámites</span><b>${S.tramites.length}</b></div></div>`,
    estudiantes: dirPersonas,
    conducta: () => `
      <h2>Registro de Conducta (0–20)</h2>
      <div class="card" style="margin:12px 0">
        <form data-form="saveConduct" class="row" style="align-items:end">
          <label class="lbl">Alumno<select name="studentUid">${S.students.map((st) => `<option value="${st.uid}">${esc(st.name)} (${st.sectionId})</option>`).join("")}</select></label>
          <label class="lbl">Nota (0–20)<input name="score" type="number" min="0" max="20" required></label>
          <label class="lbl">Observación descriptiva<input name="observation" required></label>
          <button class="btn" type="submit">Registrar</button>
        </form>
      </div>
      <div class="stack">${S.conduct.map((c) => `<div class="card"><b>${esc(c.studentName)}</b> · <span class="chip">${c.score}/20</span><p class="muted">${esc(c.observation)}</p></div>`).join("")}</div>`,
    tramites: () => `
      <h2>Gestión de Trámites</h2>
      <div class="stack" style="margin-top:12px">
        ${S.tramites.map((t) => `<div class="card"><div class="row" style="align-items:center"><div><b>${esc(t.type)}</b> · ${esc(t.studentName)}<p class="muted">${esc(t.detail)}</p></div><button class="btn sm ok" data-act="approveTramite" data-id="${esc(t.id)}">Aprobar</button></div></div>`).join("") || `<div class="empty">No hay solicitudes de trámites.</div>`}
      </div>`,
    comunicados: () => `
      <h2>Comunicados Institucionales</h2>
      <div class="card" style="margin:12px 0">
        <form data-form="saveAnn" class="stack">
          <label class="lbl">Título<input name="title" required></label>
          <label class="lbl">Mensaje<textarea name="body" rows="3" required></textarea></label>
          <button class="btn" type="submit">Publicar comunicado</button>
        </form>
      </div>`,
  }[S.tab] || (() => ""))();
}

/* ====================== RENDER Y ACCIONES ====================== */
function view() {
  if (!S.user) return loginView();
  if (S.loading || !S.role) return topbar() + `<div class="center"><div class="spin"></div></div>`;
  const body = ({
    alumno: alumnoView,
    profesor: profesorView,
    director: directorView,
    secretaria: secretariaView,
  }[S.role] || alumnoView)();
  return topbar() + nav() + `<main class="wrap">${body}</main>`;
}

function closeModal() { $modal.innerHTML = ""; }

const A = {
  demo: (d) => data.loginDemo(d.role).then(() => toast(`Sesión iniciada como ${ROLE_LABEL[d.role]}`, "ok")).catch((e) => toast(e.message, "bad")),
  login: () => data.login().catch((e) => toast(e.message, "bad")),
  logout: () => { data.logout(); toast("Sesión cerrada"); },
  resetPass: () => {
    const email = prompt("Ingresa tu correo institucional para restablecer tu contraseña:");
    if (!email) return;
    data.resetPassword(email.trim()).then(() => toast("Revisa tu correo para restablecer la contraseña", "ok")).catch((e) => toast(e.message, "bad"));
  },
  tab: (d) => { S.tab = d.t; scheduleRender(); },
  pickCourse: (d) => { S.selectedCourse = d.id; scheduleRender(); },
  closeModal,
  backdrop: (d, e) => { if (e.target === e.currentTarget) closeModal(); },
  toggleTramites: async () => {
    try {
      const next = !S.schoolSettings.tramitesEnabled;
      await data.set("settings", "school", { tramitesEnabled: next });
      await logAudit("TOGGLE_TRAMITES", `tramitesEnabled=${next}`);
      toast(next ? "Módulo de Trámites habilitado" : "Módulo de Trámites bloqueado", "ok");
    } catch (e) { toast(e.message, "bad"); }
  },
  approveTramite: async (d) => {
    try {
      await data.set("tramites", d.id, { status: "Aprobado" });
      await logAudit("APPROVE_TRAMITE", d.id);
      toast("Trámite aprobado", "ok");
    } catch (e) { toast(e.message, "bad"); }
  },
  runScheduler: async () => {
    try {
      const res = generateSmartSchedule({ sections: S.sections, courses: S.courses, teachers: S.staff, cfg: CONFIG.scheduleDefaults });
      if (res.conflicts.length > 0) {
        return toast(`No se publicó: se detectaron ${res.conflicts.length} conflictos de horario.`, "bad");
      }
      await data.set("schedules", "published", res);
      await logAudit("PUBLISH_SCHEDULE", `${res.stats.totalAssignedBlocks} bloques en ${res.stats.totalSections} secciones`);
      toast(`Horario validado (0 conflictos) y publicado para ${res.stats.totalSections} secciones`, "ok");
    } catch (e) { toast(e.message, "bad"); }
  },
  openNewMod: () => {
    $modal.innerHTML = `<div class="backdrop" data-act="backdrop"><form class="sheet" data-form="newMod">
      <h3>Nuevo Módulo de Aprendizaje</h3>
      <label class="lbl">Curso<select name="courseId">${S.courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
      <label class="lbl">Sección<select name="sectionId">${S.sections.map((s) => `<option value="${s.id}">${s.id}</option>`).join("")}</select></label>
      <label class="lbl">Unidad<input name="unit" required></label>
      <label class="lbl">Semana<input name="week" type="number" min="1" max="40" value="1" required></label>
      <label class="lbl">Título<input name="title" required></label>
      <label class="lbl">Descripción<textarea name="description" rows="2" required></textarea></label>
      <div class="row"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn">Publicar</button></div>
    </form></div>`;
  },
  openNewTask: () => {
    $modal.innerHTML = `<div class="backdrop" data-act="backdrop"><form class="sheet" data-form="newTask">
      <h3>Nueva Tarea</h3>
      <label class="lbl">Curso<select name="courseId">${S.courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
      <label class="lbl">Sección<select name="sectionId">${S.sections.map((s) => `<option value="${s.id}">${s.id}</option>`).join("")}</select></label>
      <label class="lbl">Título<input name="title" required></label>
      <label class="lbl">Instrucciones<textarea name="instructions" rows="2" required></textarea></label>
      <label class="lbl">Fecha límite<input name="dueDate" type="date" required></label>
      <div class="row"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn">Crear Tarea</button></div>
    </form></div>`;
  },
  openSubmit: (d) => {
    const t = S.tasks.find((x) => x.id === d.id);
    $modal.innerHTML = `<div class="backdrop" data-act="backdrop"><form class="sheet" data-form="submitTask" data-id="${esc(d.id)}">
      <h3>Entregar: ${esc(t?.title || "")}</h3>
      <label class="lbl">Respuesta escrita<textarea name="answer" rows="3" placeholder="Escribe tu respuesta..."></textarea></label>
      <label class="lbl">Archivo adjunto (PDF/Imagen, máx 5 MB)<input name="file" type="file" accept=".pdf,image/*"></label>
      <div class="row"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn">Enviar Entrega</button></div>
    </form></div>`;
  },
  gradeSub: (d) => {
    const s = S.submissions.find((x) => x.id === d.id);
    $modal.innerHTML = `<div class="backdrop" data-act="backdrop"><form class="sheet" data-form="gradeSub" data-id="${esc(d.id)}">
      <h3>Calificar entrega de ${esc(s?.studentName || "")}</h3>
      <label class="lbl">Nota (0–20)<input name="grade" type="number" min="0" max="20" required></label>
      <label class="lbl">Comentario docente<textarea name="teacherComment" rows="2"></textarea></label>
      <div class="row"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn">Guardar Nota</button></div>
    </form></div>`;
  },
  exportCsv: () => {
    const rows = [["Alumno", "Seccion", "Curso", "Periodo", "Evaluacion", "Nota", "Comentario"]];
    S.grades.forEach((g) => rows.push([g.studentName, g.sectionId, g.courseName, g.period, g.evalName, g.score, g.comment || ""]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_notas_2027.csv`;
    a.click();
    toast("Reporte CSV descargado", "ok");
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) fn(el.dataset, e);
});

document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-change]");
  if (!el) return;
  const k = el.dataset.change;
  if (k === "periodFilter") { S.periodFilter = el.value; scheduleRender(); }
  if (k === "selSection") { S.selectedSection = el.value; scheduleRender(); }
  if (k === "schedSection") { S.schedSection = el.value; scheduleRender(); }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  const f = form.dataset.form;

  try {
    if (f === "emailAuth") {
      const mode = e.submitter?.value || "login";
      if (mode === "register") await data.register(fd.get("email"), fd.get("password"), fd.get("email").split("@")[0]);
      else await data.loginEmail(fd.get("email"), fd.get("password"));
    } else if (f === "newMod") {
      const c = S.courses.find((x) => x.id === fd.get("courseId"));
      await data.set("modules", data.newId(), {
        courseId: c.id, courseName: c.name, sectionId: fd.get("sectionId"),
        unit: fd.get("unit"), week: Number(fd.get("week")), title: fd.get("title"),
        description: fd.get("description"), published: true, createdAt: data.stamp(),
      });
      closeModal(); toast("Módulo publicado", "ok");
    } else if (f === "newTask") {
      const c = S.courses.find((x) => x.id === fd.get("courseId"));
      await data.set("tasks", data.newId(), {
        courseId: c.id, courseName: c.name, sectionId: fd.get("sectionId"),
        title: fd.get("title"), instructions: fd.get("instructions"), dueDate: fd.get("dueDate"), maxScore: 20, createdAt: data.stamp(),
      });
      closeModal(); toast("Tarea creada", "ok");
    } else if (f === "submitTask") {
      const t = S.tasks.find((x) => x.id === form.dataset.id);
      const stu = currentStudent();
      const file = fd.get("file");
      let fileUrl = "";
      if (file && file.size > 0) fileUrl = await data.uploadFile(file, "submissions");
      await data.set("submissions", data.newId(), {
        taskId: t.id, taskTitle: t.title, studentUid: stu.uid, studentName: stu.name,
        answer: fd.get("answer"), fileUrl, status: "En revisión", createdAt: data.stamp(),
      });
      closeModal(); toast("Tarea entregada correctamente", "ok");
    } else if (f === "gradeSub") {
      const score = Number(fd.get("grade"));
      if (score < 0 || score > 20) return toast("La nota debe estar entre 0 y 20", "bad");
      await data.set("submissions", form.dataset.id, { grade: score, teacherComment: fd.get("teacherComment"), status: "Calificada" });
      closeModal(); toast("Entrega calificada", "ok");
    } else if (f === "saveGrade") {
      const score = Number(fd.get("score"));
      if (score < 0 || score > 20) return toast("La nota debe estar entre 0 y 20", "bad");
      const c = S.courses.find((x) => x.id === fd.get("courseId"));
      const st = S.students.find((x) => x.uid === fd.get("studentUid"));
      await data.set("grades", data.newId(), {
        studentUid: st.uid, studentName: st.name, sectionId: fd.get("sectionId"),
        courseId: c.id, courseName: c.name, period: S.periodFilter, evalName: fd.get("evalName"),
        category: "Evaluación", score, comment: fd.get("comment"), teacherName: S.user.name,
      });
      toast("Nota guardada (0–20)", "ok");
    } else if (f === "saveAtt") {
      const st = S.students.find((x) => x.uid === fd.get("studentUid"));
      const date = fd.get("date");
      if (S.attendance.some((a) => a.studentUid === st.uid && a.date === date)) {
        return toast("Ya existe asistencia registrada para este alumno en esa fecha", "bad");
      }
      await data.set("attendance", data.newId(), {
        studentUid: st.uid, studentName: st.name, sectionId: fd.get("sectionId"), date, status: fd.get("status"),
      });
      toast("Asistencia registrada", "ok");
    } else if (f === "saveConduct") {
      const st = S.students.find((x) => x.uid === fd.get("studentUid"));
      await data.set("conduct", data.newId(), {
        studentUid: st.uid, studentName: st.name, sectionId: st.sectionId, period: "B1",
        score: Number(fd.get("score")), observation: fd.get("observation"),
      });
      await logAudit("REGISTER_CONDUCT", `${st.name}: ${fd.get("score")}/20`);
      toast("Conducta registrada", "ok");
    } else if (f === "saveAnn") {
      await data.set("announcements", data.newId(), {
        title: fd.get("title"), body: fd.get("body"), author: S.user.name, date: new Date().toISOString().slice(0, 10),
      });
      await logAudit("PUBLISH_ANNOUNCEMENT", fd.get("title"));
      form.reset(); toast("Comunicado publicado", "ok");
    } else if (f === "enrollStudent") {
      const secId = fd.get("sectionId");
      const id = data.newId();
      await data.set("students", id, {
        uid: id, name: fd.get("name"), email: fd.get("email").toLowerCase(),
        gradeId: secId[0], section: secId.slice(1), sectionId: secId,
        guardian: fd.get("guardian"), code: `2027-${secId}-${String(S.students.length + 1).padStart(2, "0")}`, active: true,
      });
      await logAudit("ENROLL_STUDENT", `${fd.get("name")} -> ${secId}`);
      form.reset(); toast("Estudiante matriculado", "ok");
    } else if (f === "reqTramite") {
      const stu = currentStudent();
      await data.set("tramites", data.newId(), {
        studentUid: stu.uid, studentName: stu.name, type: fd.get("type"), detail: fd.get("detail"), status: "Pendiente", createdAt: data.stamp(),
      });
      form.reset(); toast("Solicitud enviada a Secretaría", "ok");
    }
  } catch (err) {
    toast(err.message || "Error al procesar la operación", "bad");
  }
});
