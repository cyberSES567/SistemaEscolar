# Despliegue y Configuración — Portal Colegio SIGE Perú 2027

## 1. Separación de Entornos
- **Producción (por defecto)**: `CONFIG.env = "production"` en `config.js`. Conecta exclusivamente con Firebase (`sistemaescolar-x`). No genera datos ficticios ni permite acceso demo.
- **Desarrollo**: Agregar `?env=dev` a la URL (ej. `index.html?env=dev`) para usar `localStorage` con datos de prueba de los 4 roles.

## 2. Despliegue en Firebase
Ejecutar con Firebase CLI:
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

## 3. Configuración Inicial en Firestore (Producción)
1. En Firebase Authentication, habilitar **Google** y **Correo/Contraseña**.
2. El correo `adminnegocio1923@gmail.com` tiene rol `director` automáticamente al iniciar sesión con Google.
3. Para agregar otros docentes o secretaría, crear documentos en la colección `staff/{email}` con:
   ```json
   { "email": "docente@colegio.edu.pe", "name": "Prof. Nombre", "role": "profesor", "active": true }
   ```
   Roles válidos: `director`, `secretaria`, `profesor`.

## 4. Limitaciones Conocidas
- El entorno actual no dispone de Node.js/Firebase Emulator instalado localmente para ejecutar pruebas automatizadas de reglas en CI; las reglas y flujos deben validarse en el proyecto Firebase o con `firebase emulators:start`.
- La vinculación automática de `uid` al matricular un alumno por correo se completa cuando el alumno inicia sesión con ese correo en Firebase Auth.
