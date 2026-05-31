# WinTasks — Documentación de Arquitectura

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                    WinTasks App                       │
│  ┌───────────────────────────────────────────────┐  │
│  │            Presentation Layer                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Screens  │ │Components│ │   Carousels   │  │  │
│  │  │ (7)      │ │  (1)     │ │  AdCarousel   │  │  │
│  │  │          │ │PearlBckgr│ │ SecondaryCar  │  │  │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │  │
│  │       └────────────┼──────────────┘           │  │
│  └────────────────────┼──────────────────────────┘  │
│  ┌────────────────────┼──────────────────────────┐  │
│  │         State Management (GlobalContext)       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  users   │ │  tokens  │ │    tasks     │  │  │
│  │  │ currentUser│ │          │ │              │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └────────────────────┼──────────────────────────┘  │
│  ┌────────────────────┼──────────────────────────┐  │
│  │         Navigation Layer                       │  │
│  │   @react-navigation/native-stack              │  │
│  │   Auth-gating por currentUser y rol            │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │         External Dependencies                  │  │
│  │  expo-linear-gradient | react-native-svg      │  │
│  │  expo-status-bar | @expo/vector-icons         │  │
│  │  react-native-safe-area-context               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Stack técnico actual
- **Framework**: Expo SDK ~54.0.0
- **UI Layer**: React 19.1.0 / React Native 0.81.5
- **Navegación**: @react-navigation/native v7 + native-stack v7
- **Estado**: React Context (GlobalContext) — sin persistencia
- **Gradientes**: expo-linear-gradient ~15.0.8
- **Iconos**: @expo/vector-icons (Ionicons)
- **SVG**: react-native-svg 15.12.1
- **SafeArea**: react-native-safe-area-context ~5.6.0

---

## 2. Modelo de Datos

### Usuario (`users` — array en memoria)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID (Date.now()) |
| `alias` | string | Nombre público visible para otros usuarios |
| `phone` | string | +54 11 2222-2222 (validado por SMS) |
| `age` | number | Entero |
| `role` | 'adulto' \| 'menor' | Según age ≥ 18 |
| `password` | string | 6-12 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número |
| `trialEnd` | string \| null | Solo adultos, null=no trial |
| `isPremium` | boolean | Solo adultos (true=Demo Guille) |
| `tutorId` | string \| null | Solo menores (id del adulto tutor) |

### Token (`tokens` — objeto userId → number)
- `{ [userId: string]: number }`
- Solo crédito virtual. Sin correlato monetario real.
- Adulto recibe 100 tokens al registrarse, menores 0.

### Tarea (`tasks` — array en memoria)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID (Date.now()) |
| `title` | string | Título de la tarea |
| `description` | string | Opcional |
| `childId` | string | Usuario menor asignado |
| `createdBy` | string | Usuario adulto creador |
| `tokenReward` | number | Tokens al aprobar |
| `status` | 'pending' \| 'completed' \| 'approved' \| 'rejected' | Ciclo de vida |
| `createdAt` | string | ISO 8601 |

### Relaciones
- **Adulto → Menor**: 1 tutor puede tener N hijos (`tutorId`)
- **Adulto → Tarea**: 1 adulto crea N tareas (`createdBy`)
- **Tarea → Menor**: 1 tarea asignada a 1 menor (`childId`)
- **Token → Usuario**: cada usuario tiene un balance

### Planificado (no implementado)
- **Premio**: entidad adulto crea (nombre, costo tokens, delivery status)
- **Transacción**: historial de movimientos (tipo: earn/spend/transfer)
- **Canje**: childId + prizeId + fecha + estado (pending/delivered)

---

## 3. Navigation / Route Map

```
NavigationContainer
  └── Stack.Navigator (screenOptions: header FF8C00, content EDE0D4)
       │
       ├── [No Auth] ──────────────────────────────────────
       │   ├── Welcome      (headerShown: false)
       │   ├── Login        (title: "Iniciar sesión")
       │   └── Register     (title: "Crear cuenta")
       │
       ├── [Role: adulto] ─────────────────────────────────
       │   ├── DashboardAdulto  (headerShown: false, custom header)
       │   ├── CreateTask       (title: "Crear tarea")
       │   └── TareasEnCurso    (title: "Tareas en curso")
       │
       └── [Role: menor] ──────────────────────────────────
           ├── DashboardMenor   (title: "WinTasks", headerBackVisible: false)
           └── TareasMenor      (title: "Mis tareas")
```

### Auth-gating
- `currentUser == null` → solo Welcome, Login, Register
- `currentUser.role === 'adulto'` → dashboard adulto + create/tasks
- `currentUser.role === 'menor'` → dashboard menor + mis tareas
- Cambio de rol implica logout → login

---

## 4. Component Tree

```
<App>
  <GlobalProvider>
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator>
        ├── WelcomeScreen
        │     └── LinearGradient (#FF8C00 → #E07B00)
        │         ├── [animación] Logo SVG (spring scale + fade in)
        │         └── [animación] Botones fade + slide up (Ya tengo cuenta, Crear cuenta)
        │
        ├── LoginScreen
        │     └── PearlBackground
        │         ├── TextInput (phone) + status icon ✓/✗
        │         ├── TextInput (PIN) + eye toggle
        │         └── Button "Ingresar"
        │
        ├── RegisterScreen
        │     └── PearlBackground
        │         ├── [step=phone]
        │         │   ├── CountrySelector + dropdown
        │         │   ├── TextInput (phone)
        │         │   ├── SMS simulation + 120s timer
        │         │   └── OTP input (6 dígitos, hardcoded 123456)
        │         └── [step=profile]
        │             ├── TextInput (name, age, PIN, tutorCode*)
        │             └── Button "Crear cuenta"
        │
        ├── DashboardAdultoScreen
        │     ├── Custom Header (LinearGradient #E88900→#C06000)
        │     │   ├── Hamburger menu (drawer toggle)
        │     │   ├── "¡Hola, {name}!"
        │     │   ├── Notification bell
        │     │   └── Logout icon
        │     ├── Orange Section (LinearGradient #FFF→#FFD699→#E88900)
        │     │   ├── Logo SVG (Win #E05A47 + Tasks #A89F96)
        │     │   └── Wallet Card (LinearGradient #E88900→#C06000)
        │     │       ├── "Tu cuenta de tokens"
        │     │       └── {amount} + chevron
        │     ├── Fidelity Card (LinearGradient #FFF→#F0EDEA)
        │     │   └── "Mis puntos WinTasks" + "0" + chevron
        │     ├── Actions (3 buttons en white pearl band)
        │     │   ├── Crear tarea (navega a CreateTask)
        │     │   ├── Premios (placeholder)
        │     │   └── Tokens (placeholder)
        │     ├── Premios populares (SecondaryCarousel)
        │     │   └── Auto-slide banners (Minecraft, Roblox, Fortnite, Netflix)
        │     ├── PFM Banner Row
        │     │   ├── Tareas (navega a TareasEnCurso)
        │     │   ├── Listas (placeholder)
        │     │   └── Hijos (placeholder)
        │     ├── Beneficios exclusivos (AdCarousel)
        │     │   └── Snap-scroll carousel + dots
        │     ├── Drawer Overlay (Pressable)
        │     └── Animated Drawer (75% width)
        │         ├── Avatar + nombre + teléfono
        │         ├── Inicio | Mis datos | Mi número
        │         ├── Cambiar clave | Membresía
        │         ├── Invitar amig@
        │         └── Cerrar sesión
        │
        ├── DashboardMenorScreen
        │     └── PearlBackground
        │         ├── Header: "¡Hola, {name}!" + Tutor: {name} + logout
        │         ├── Token Card (fondo primario)
        │         │   └── "Tus tokens" + {amount}
        │         ├── Tareas pendientes (empty state)
        │         └── Acciones (4 buttons)
        │             ├── Tareas (navega a TareasMenor)
        │             ├── Premios (placeholder)
        │             ├── Transferir (placeholder)
        │             └── Historial (placeholder)
        │
        ├── CreateTaskScreen
        │     └── PearlBackground
        │         ├── Title, Description inputs
        │         ├── Child selector (chips)
        │         ├── Token reward input
        │         └── "Crear tarea" button
        │
        └── TareasEnCursoScreen / TareasMenor
              └── PearlBackground
                  └── Lista de tareas según rol
                      ├── [menor] Botón "Marcar completada"
                      └── [adulto] Aprobar / Rechazar
```

---

## 5. User Flows

### Registro (adulto o menor)
1. Welcome → "Crear cuenta"
2. Step phone: seleccionar país, ingresar número
3. Solicitar código → simulación SMS (OTP: 123456)
4. Ingresar OTP 6 dígitos → verificación automática
5. Step profile: alias, edad, contraseña (6-12 chars, 1 mayúscula, 1 minúscula, 1 número)
6. Validación de contraseña en tiempo real con feedback de errores
7. Si edad < 18: requiere código de tutor (teléfono del adulto)
8. Si edad ≥ 18: no requiere tutor
9. Submit → register valida contraseña → usuario creado + login automático

### Login
1. Welcome → "Ya tengo cuenta"
2. Ingresar teléfono → debounce 500ms → check existence (✓/✗)
3. Ingresar contraseña (eye toggle)
4. "Ingresar" → valida contra users

### Adulto — Crear Tarea
1. Dashboard → botón "Crear tarea"
2. Completar título, descripción (opcional)
3. Seleccionar hijo (chip selector)
4. Definir recompensa en tokens
5. "Crear tarea" → navega de vuelta

### Menor — Completar Tarea
1. Dashboard Menor → "Tareas" → lista de tareas asignadas
2. "Marcar como completada" → status = 'completed'

### Adulto — Aprobar/Rechazar Tarea
1. Dashboard Adulto → PFM "Tareas" → lista de tareas creadas
2. Si status 'completed': botones Aprobar (verde) / Rechazar (rojo)
3. Aprobar → tokens se acreditan al menor + status 'approved'
4. Rechazar → status 'rejected' (sin crédito)

### Dashboard Adulto — Drawer
1. Tap hamburguesa → animación slide-in izquierda
2. Items: Inicio, Mis datos, Mi número, Cambiar clave, Membresía, Invitar amig@, Cerrar sesión
3. Tap fuera del drawer → cierra
4. Cerrar sesión → vuelve a Welcome

### Planificado (no implementado)
- **Canje de premios**: adulto crea premio → menor canjea con tokens → adulto marca entregado
- **Transferencia entre menores**: menor envía tokens a otro menor del mismo tutor
- **Gestión de hijos**: adulto agrega/vincula/elimina hijos
- **Notificaciones**: alertar al adulto cuando un menor completa tarea
- **Historial**: ver movimientos de tokens

---

## 6. Security & Privacy by Design

### Autenticación
- Login por **teléfono + contraseña** (sin email)
- Contraseña: **6-12 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número**
- Validación de contraseña en tiempo real durante el registro (feedback de errores)
- Contraseña con **eye toggle** para verificar sin errores
- No hay sesión persistente (todo en estado React, se pierde al cerrar)
- No hay tokens JWT ni backend — autenticación contra array en memoria

### Datos recolectados
| Dato | ¿Se recolecta? | Uso |
|------|---------------|-----|
| Alias | Sí | Identificador público visible para otros usuarios |
| Teléfono | Sí | Identificador único + verificación SMS |
| Edad | Sí | Segmentación adulto/menor + ads |
| Contraseña | Sí | Autenticación (6-12 chars, mayúscula+minúscula+número) |
| Código de tutor | Solo menores | Vínculo adulto-menor |
| Geolocalización | No | — |
| Email | No | — |
| Contactos | No | — |
| Fotos/Galería | No | — |
| Micrófono | No | — |
| Movimiento real de dinero | No | Solo tokens virtuales |

### Privacidad por diseño
- **Sin backend**: todos los datos viven en memoria del dispositivo
- **Sin third-party analytics** (no Google Analytics, Firebase, etc.)
- **Sin anuncios todavía** — cuando se implementen, se segmentarán por edad (10-12: juegos infantiles/cuentos, 13-17: videojuegos/recitales/cursos, 18+: todo tipo)
- **Sin compartición de datos con terceros** (excepto SDK de ads en futuro)
- **Tokens virtuales**: cero riesgo regulatorio (no son dinero real, no canjeables por efectivo)
- **Menores**: requieren código de tutor para registrarse; el adulto tutor debe existir en el sistema

### Cumplimiento (planeado)
- **COPPA** (Children's Online Privacy Protection Act): no recolectar datos de <13 sin consentimiento parental verificable
- **GDPR-K / UK Age Appropriate Design Code**: ads apropiados por edad, sin datos excesivos
- **Google Play Families / Apple Kids Category**: políticas específicas para apps con menores

---

## 7. SDK & Third-party Map

### En uso actual
| SDK | Propósito | Datos que accede |
|-----|-----------|-------------------|
| expo | Runtime, build, OTA updates | Ninguno sensible |
| @react-navigation/native | Navegación entre pantallas | Ninguno |
| @react-navigation/native-stack | Stack navigator | Ninguno |
| react-native-screens | Optimización de pantallas nativas | Ninguno |
| react-native-safe-area-context | Safe area insets | Ninguno |
| expo-linear-gradient | Fondos con gradiente | Ninguno |
| expo-status-bar | Status bar styling | Ninguno |
| @expo/vector-icons | Iconos (Ionicons) | Ninguno |
| react-native-svg | Renderizado de logo SVG inline | Ninguno |

### Planificado para futuro
| SDK | Propósito | Datos que accedería |
|-----|-----------|---------------------|
| **SDK de Ads** (AdMob / Meta Audience Network) | Mostrar anuncios segmentados | ID de publicidad del dispositivo, edad del usuario (solo para segmentación), no compartir datos personales |
| **expo-notifications** | Notificaciones push | Token de dispositivo (solo para delivery) |
| **AsyncStorage / SecureStore** | Persistencia local de datos | Tokens de sesión, preferencias |

### Declaración para Data Safety (Google Play)
- **Datos recolectados**: Nombre, Teléfono (personal), Edad (personal)
- **Datos compartidos con terceros**: Ninguno (actualmente)
- **Encriptación en tránsito**: N/A (sin backend)
- **Eliminación de datos**: Posible borrando datos de la app
- **Autenticación**: PIN local (no biométrico)

---

## 8. State Management

### Arquitectura
- **Patrón**: React Context + useReducer (simplificado a useState)
- **Provider**: `<GlobalProvider>` en App.js envuelve toda la app
- **Hook**: `useGlobal()` en cualquier componente hijo

### Estado global
```js
{
  users: [
    { id, alias, phone, age, role, password, tutorId?, trialEnd?, isPremium? }
  ],
  currentUser: { ... } | null,
  tokens: { userId: number, ... },
  tasks: [
    { id, title, description, childId, createdBy, tokenReward, status, createdAt }
  ]
}
```

### Operaciones disponibles
| Operación | Descripción | Mutación |
|-----------|-------------|----------|
| `login(phone, password)` | Auth por teléfono+contraseña | setCurrentUser |
| `register({alias, phone, age, password, tutorCode})` | Crea usuario + login automático (valida contraseña) | users, currentUser, tokens |
| `logout()` | Limpia sesión | setCurrentUser(null) |
| `getChildren(adultId)` | Filtra menores por tutorId | Lectura |
| `getTutorName(tutorId)` | Resuelve alias del tutor | Lectura |
| `getUserTokens(userId)` | Balance de tokens | Lectura |
| `addTokens(userId, amount)` | Suma tokens (aprobación) | tokens |
| `createTask({...})` | Crea tarea | tasks |
| `getTasksForAdult(adultId)` | Tareas creadas por adulto | Lectura |
| `getTasksForChild(childId)` | Tareas asignadas a menor | Lectura |
| `completeTask(taskId)` | Menor marca completada | tasks[].status |
| `approveTask(taskId)` | Adulto aprueba + acredita | tasks + tokens |
| `rejectTask(taskId)` | Adulto rechaza (sin crédito) | tasks |

### Limitaciones actuales
- **Sin persistencia**: todo se pierde al recargar la app
- **Sin backend**: datos en memoria — no escalable
- **Demo users**: guillepadre (adulto) y anita123 (menor) hardcodeados en `DEMO_USERS`
- **Contraseña en texto plano**: sin hash ni bcrypt (MVP)
- **Sin manejo de errores** robusto en approve (puede no encontrar la tarea)

### Plan de persistencia
1. **Corto plazo**: expo-secure-store para PIN + AsyncStorage para users/tokens/tasks
2. **Medio plazo**: backend REST/GraphQL con autenticación real (JWT)
3. **Largo plazo**: WebSockets para notificaciones en tiempo real
