// scheduler.js
// Generador Inteligente de Horarios con restricciones para las 28 secciones

export function buildTimeSlots(cfg) {
  const days = cfg.days || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const startParts = (cfg.startTime || "07:45").split(":").map(Number);
  const startMin = startParts[0] * 60 + startParts[1];
  const dur = Number(cfg.hourDurationMin || 45);
  const blocks = Number(cfg.blocksPerDay || 8);
  const breakAfter = Number(cfg.breakAfterBlock || 4);
  const breakDur = Number(cfg.breakDurationMin || 25);

  const slots = [];
  let cur = startMin;
  for (let b = 1; b <= blocks; b++) {
    const sH = String(Math.floor(cur / 60)).padStart(2, "0");
    const sM = String(cur % 60).padStart(2, "0");
    cur += dur;
    const eH = String(Math.floor(cur / 60)).padStart(2, "0");
    const eM = String(cur % 60).padStart(2, "0");
    slots.push({ block: b, isBreak: false, start: `${sH}:${sM}`, end: `${eH}:${eM}`, label: `${sH}:${sM} - ${eH}:${eM}` });

    if (b === breakAfter) {
      const bStart = `${eH}:${eM}`;
      cur += breakDur;
      const bEH = String(Math.floor(cur / 60)).padStart(2, "0");
      const bEM = String(cur % 60).padStart(2, "0");
      slots.push({ block: `${b}-recreo`, isBreak: true, start: bStart, end: `${bEH}:${bEM}`, label: `${bStart} - ${bEH}:${bEM} (Recreo)` });
    }
  }
  return { days, slots };
}

/**
 * Genera horarios respetando todas las restricciones obligatorias:
 * 1. Un docente no puede impartir dos cursos simultáneamente.
 * 2. Una sección no puede tener dos cursos en la misma hora.
 * 3. Un aula no puede estar asignada a dos secciones simultáneamente.
 * 4. Ningún curso recibe más horas de las configuradas.
 * 5. Los docentes respetan su disponibilidad por día.
 * 6. Los recreos no tienen asignaciones.
 */
export function generateSmartSchedule({ sections, courses, teachers, cfg }) {
  const { days, slots } = buildTimeSlots(cfg);
  const classBlocks = slots.filter((s) => !s.isBreak);

  const teacherBusy = new Set(); // `${dayIdx}-${block}-${teacherEmail}`
  const sectionBusy = new Set(); // `${dayIdx}-${block}-${sectionId}`
  const roomBusy = new Set();    // `${dayIdx}-${block}-${room}`

  const entries = [];
  const conflicts = [];

  // Mapa rápido de disponibilidad docente
  const teacherMap = {};
  teachers.forEach((t) => { teacherMap[t.email] = t; });

  // Para cada sección, asignamos las horas semanales de cada curso
  for (const sec of sections) {
    // Ordenamos cursos con más horas primero (heurística MRV / mayor demanda)
    const activeCourses = [...courses]
      .filter((c) => Number(c.hoursPerWeek) > 0)
      .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

    for (const course of activeCourses) {
      let remaining = Number(course.hoursPerWeek);
      const t = teacherMap[course.teacherEmail];
      const availDays = t?.availability || [0, 1, 2, 3, 4];

      // Intentamos distribuir equilibradamente a lo largo de la semana
      for (let pass = 0; pass < 3 && remaining > 0; pass++) {
        for (let dIdx = 0; dIdx < days.length && remaining > 0; dIdx++) {
          if (!availDays.includes(dIdx)) continue;

          // En la primera pasada, máximo 2 horas por día del mismo curso (bloque doble)
          const todayCount = entries.filter((e) => e.sectionId === sec.id && e.dayIdx === dIdx && e.courseId === course.id).length;
          if (pass === 0 && todayCount >= 2) continue;

          for (const sl of classBlocks) {
            if (remaining <= 0) break;
            const hasTeacher = Boolean(course.teacherEmail);
            const tKey = hasTeacher ? `${dIdx}-${sl.block}-${course.teacherEmail}` : null;
            const sKey = `${dIdx}-${sl.block}-${sec.id}`;
            const rKey = `${dIdx}-${sl.block}-${sec.room}`;

            if ((!tKey || !teacherBusy.has(tKey)) && !sectionBusy.has(sKey) && !roomBusy.has(rKey)) {
              if (tKey) teacherBusy.add(tKey);
              sectionBusy.add(sKey);
              roomBusy.add(rKey);
              entries.push({
                id: `${sec.id}-${dIdx}-${sl.block}`,
                sectionId: sec.id,
                dayIdx: dIdx,
                day: days[dIdx],
                block: sl.block,
                start: sl.start,
                end: sl.end,
                courseId: course.id,
                courseName: course.name,
                teacherEmail: course.teacherEmail,
                teacherName: course.teacherName,
                room: sec.room,
              });
              remaining--;
              if (pass === 0) break; // Pasar al siguiente día para distribuir mejor
            }
          }
        }
      }

      if (remaining > 0) {
        conflicts.push({
          sectionId: sec.id,
          courseName: course.name,
          missingHours: remaining,
          reason: "Disponibilidad docente o cruce horario en las horas restantes",
        });
      }
    }
  }

  return {
    entries,
    conflicts,
    stats: {
      totalSections: sections.length,
      totalAssignedBlocks: entries.length,
      totalConflicts: conflicts.length,
    },
    generatedAt: Date.now(),
  };
}
