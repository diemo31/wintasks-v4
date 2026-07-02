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

### Token (`tokenBatches` — array en memoria)

Cada lote representa una entrada de tokens con vencimiento fijo. Nunca se reasigna `expiresAt` al mover lotes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID |
| `userId` | string | Dueño actual del lote |
| `amount` | number | Cantidad original del lote |
| `remaining` | number | Cantidad disponible (nunca > amount) |
| `source` | string | Origen: `signup`, `task_reward`, `transfer`, `expired_refund`, `redeem`, `purchase_*` |
| `acquiredAt` | string (ISO) | Fecha de adquisición del lote |
| `expiresAt` | string (ISO) | Fecha de vencimiento **fija** (nunca se reinicia) |
| `fromChildTransfer` | boolean \| undefined | `true` si proviene de transferencia menor→menor o adulto (no tutor)→menor. Marca tokens que **nunca pueden volver a un adulto**. |

### TokenBatches — reglas de consumo

- **`deductTokens(userId, amount)`**: Consume solo lotes **no vencidos** del usuario. Filtra `new Date(b.expiresAt) > now`. Usado por `createTask` (adulto asigna tokens a una tarea).
- **`transferTokens(from, to, amount, expiryMode, lockTokens)`**: Consume lotes según `expiryMode` (ver sección 9). Crea nuevos lotes en el destino preservando `expiresAt` original. `lockTokens` fuerza `fromChildTransfer: true`.
- **`spendTokens(userId, amount)`**: Consume todos los lotes del usuario sin replicar a nadie. Usado por `redeemPrize`.
- **`getUserTokens(userId)`**: Suma `remaining` de lotes no vencidos. Es el saldo disponible ("Disponible").

### Saldos contables

- **Disponible**: suma de `remaining` de lotes con `expiresAt > now` para el usuario.
- **En tareas pendientes**: suma de `tokenReward` de tareas con `status === 'pending'` creadas por el adulto.
- **Tokens por ganar** (menor): suma de `tokenReward` de tareas asignadas al menor con status `pending` o `in_progress` (todavía no acreditadas).

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
  users: [ { id, alias, phone, age, role, password, tutorId?, trialEnd?, isPremium? } ],
  currentUser: { ... } | null,
  tokenBatches: [
    { id, userId, amount, remaining, source, acquiredAt, expiresAt, fromChildTransfer? }
  ],
  tasks: [
    { id, title, description, childId, createdBy, tokenReward, status, createdAt, expiresAt, _tokenSource? }
  ],
  memberships: { [userId]: { plan, status, startDate, endDate, ... } },
  loyaltyPoints: { [userId]: number },
  loyaltyHistory: [ { id, userId, amount, type, description, date } ],
  surprises: [ { id, title, childId, createdBy, tokenReward, status, forAll?, ... } ],
  prizes: [ { id, title, tokenCost, createdBy, usedCount, ... } ],
  invites: { [userId]: [ { invitedUserId, invitedAlias, invitedAt } ] },
  todoLists: [ { id, name, items, completed, createdAt } ],
  taskPhotos: { [taskId]: photoUri },
  scoreGoals: { [monthKey]: number },
}
```

### Operaciones disponibles
| Operación | Descripción | Mutación |
|-----------|-------------|----------|
| `login(phone, password)` | Auth por teléfono+contraseña | currentUser |
| `register({...})` | Crea usuario + login automático (valida contraseña) | users, currentUser, tokenBatches |
| `logout()` | Limpia sesión | currentUser = null |
| `getChildren(adultId)` | Filtra menores por tutorId | Lectura |
| `getTutorName(tutorId)` | Resuelve alias del tutor | Lectura |
| `getUserTokens(userId)` | Balance disponible | Lectura |
| `addTokens(userId, amount, source, expiresAt?)` | Suma tokens como nuevo lote | tokenBatches |
| `deductTokens(userId, amount)` | Consume solo lotes no vencidos (retorna deductions) | tokenBatches |
| `transferTokens(from, to, amount, expiryMode, lockTokens)` | Transfiere lotes preservando expiresAt | tokenBatches |
| `spendTokens(userId, amount)` | Consume todos los lotes sin replicar | tokenBatches |
| `moveTokens(from, to, amount)` | Wrapper de transferTokens para tutor | tokenBatches |
| `createTask({...})` | Crea tarea (deductTokens del adulto) | tasks, tokenBatches |
| `getTasksForAdult(adultId)` | Tareas creadas por adulto | Lectura |
| `getTasksForChild(childId)` | Tareas asignadas a menor | Lectura |
| `completeTask(taskId)` | Menor marca completada | tasks |
| `approveTask(taskId)` | Adulto aprueba + acredita tokens al menor | tasks, tokenBatches |
| `rejectTask(taskId)` | Adulto rechaza (sin crédito) | tasks |
| `expireOverdueTasks()` | Vence tareas pendientes vencidas, devuelve tokens al adulto | tasks, tokenBatches |
| `createPrize({title, tokenCost, createdBy})` | Crea premio | prizes |
| `getAdultPrizes(adultId)` | Premios del adulto ordenados por uso | Lectura |
| `getPrizesForChild(childId)` | Premios del tutor del menor | Lectura |
| `redeemPrize(childId, prizeId)` | Canjea premio (usa spendTokens) | prizes, tokenBatches |
| `createAndSendSurprise({...})` | Crea sorpresa | surprises |
| `claimSurprise(surpriseId)` | Canjea sorpresa (usa transferTokens 'consume') | surprises, tokenBatches |
| `openSurprise(surpriseId)` | Abre sorpresa | surprises |
| `getSurprisesForChild(childId, tutorId)` | Sorpresas personales + forAll del tutor | Lectura |
| `moveLoyaltyPoints(from, to, amount)` | Transfiere puntos WinTasks | loyaltyPoints, loyaltyHistory |

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

---

## 9. Modelo de Transferencia de Tokens

### Concepto de "Tokens en juego"

Un token está **"en juego"** desde que sale de la cuenta del adulto hasta que el menor lo "caja" (canjea/gasta). Mientras está en juego, su `expiresAt` sigue corriendo pero el token **sigue siendo usable aunque esté vencido**. Al canjear, se determina si vuelve al adulto o se pierde según su origen y estado al momento del canje.

Estados de un token en juego:
- **Vigente**: `expiresAt > now` — puede volver al adulto si es de origen directo
- **Vencido**: `expiresAt <= now` — se pierde al canjear
- **De transferencia** (`fromChildTransfer: true`): proviene de una transferencia menor→menor o adulto (no tutor)→menor. Se pierde al canjear independientemente de su estado de vencimiento.

### 9.1 Menor → Menor

Un menor puede transferir a otro menor cualquier token (vigente, vencido o de transferencia preexistente).

| Condición | Comportamiento | Mensaje al usuario |
|-----------|---------------|-------------------|
| Tokens **vencidos** | Se transfieren al destino. El lote receptor se marca `fromChildTransfer: true`. Nunca podrán volver a un adulto. | "X tokens ya estaban vencidos y no se recuperan una vez que el destinatario los canjee." |
| Tokens **vigentes** | Se transfieren al destino. El lote receptor se marca `fromChildTransfer: true`. Al transferirse a otro menor, pierden su vigencia de retorno. | "Y tokens estaban vigentes pero al transferirlos a otro menor pierden su vigencia y no pueden recuperarse." |
| **Mixto** | Se aplican ambas reglas simultáneamente. | Se muestran ambos mensajes. |

**Regla fundamental**: toda transferencia menor→menor convierte los tokens en no-retornables a un adulto, sin importar su estado de vencimiento.

### 9.2 Menor → Adulto

Un menor solo puede transferir tokens a su **tutor**. Transferir a un adulto que no sea su tutor arroja error.

| Condición | Comportamiento |
|-----------|---------------|
| Tokens **vigentes y directos** (sin `fromChildTransfer`) | Se transfieren al tutor con su `expiresAt` original. Vuelven a la contabilidad normal del adulto. |
| Tokens **vencidos** | Se rechazan (no se transfieren ni se descuentan). Mensaje: "X tokens estaban vencidos y no se transfirieron." |
| Tokens **de transferencia** (`fromChildTransfer`) | Se rechazan. Mensaje: "Y tokens provenían de transferencias y no pueden transferirse a un adulto." |

**Nota**: `fromChildTransfer` incluye tokens recibidos de otro menor o de un adulto no-tutor. Una vez que ingresan a un menor por esa vía, jamás pueden salir hacia un adulto.

### 9.3 Adulto → Menor

Un adulto solo puede transferir tokens **vigentes** (no vencidos). Aplica `lockTokens` según la relación.

| Relación | Comportamiento |
|----------|---------------|
| **Es su tutor** | Los tokens se transfieren con `expiresAt` original, sin `fromChildTransfer`. Cuando el menor los canjee: si están vigentes → vuelven al tutor; si vencidos → se pierden. |
| **No es su tutor** | `lockTokens: true` → el lote receptor se marca `fromChildTransfer: true`. Los tokens se transforman en "vencidos en juego": el menor puede usarlos, pero al canjearlos se pierden (no vuelven a ningún adulto). |

### 9.4 Adulto → Adulto

Transferencia simple de titularidad. Ambos son adultos, los tokens están vigentes (el remitente no puede enviar vencidos porque `deductTokens` los filtra).

| Comportamiento |
|---------------|
| Los tokens se transfieren con `expiresAt` original. El receptor los usa como propios con sus hijos hasta su vencimiento. |

### 9.5 Canje de Sorpresa (menor canjea sorpresa del tutor)

Internamente usa `transferTokens(childId, tutorId, amount, 'consume')`.

| Origen del token | Comportamiento en canje |
|-----------------|------------------------|
| **Vigente + directo** (no vencido, no `fromChildTransfer`) | Vuelve al tutor con su `expiresAt` original. |
| **Vencido** | Se descuenta y se pierde (no llega al tutor). |
| **De transferencia** (`fromChildTransfer`) | Se descuenta y se pierde (no llega al tutor), independientemente de si está vencido o no. |

Mensajes al usuario:
- `expiredLost > 0`: "X vencidos se perdieron en el canje."
- `transferLost > 0`: "Y de transferencias se perdieron en el canje."

### 9.6 Canje de Premio (menor canjea premio del tutor)

Internamente usa `spendTokens(childId, amount)`. Todos los tokens se consumen sin retorno a ningún lado.

| Origen del token | Comportamiento |
|-----------------|---------------|
| Vigente directo | Consumido (no retorna). |
| Vencido | Consumido (se pierde). |
| De transferencia | Consumido (se pierde). |

### 9.7 Funciones internas

| Función | Propósito |
|---------|-----------|
| `transferTokens(from, to, amount, expiryMode, lockTokens)` | Núcleo de todas las transferencias. `expiryMode`: `'transfer'` (salta vencidos/transfer), `'all'` (todo pasa), `'consume'` (vencidos/transfer se pierden). Retorna desglose: `transferred`, `transferredExpired`, `transferredValid`, `expiredLost`, `transferLost`, `expiredSkipped`, `transferSkipped`, `remaining`. |
| `spendTokens(userId, amount)` | Consume lotes de un usuario sin destino (usa en canje de premios). Retorna `{spent, expiredLost, transferLost, remaining}`. |
| `deductTokens(userId, amount)` | Consume solo lotes no vencidos (usa en creación de tareas). Retorna `[{batchId, amount, expiresAt}]`. |
| `moveTokens(from, to, amount)` | Wrapper simple que determina `expiryMode` según roles (ver 9.2 y 9.3). |

### 9.8 Diagrama de decisión (transferTokens con expiryMode)

```
                         ┌─────────────────────┐
                         │  ¿Lote vencido?      │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        expiryMode=           expiryMode=           expiryMode=
        'transfer'            'all' / 'consume'     (todos)
              │                     │                     │
              ▼                     ▼                     ▼
        ┌──────────┐         ┌──────────┐         ┌──────────┐
        │  SKIP    │         │ ¿fromCh- │         │ DEDUCT + │
        │(no toca) │         │ ildTrans?│         │ REPLICATE│
        └──────────┘         └────┬─────┘         │al destino│
                                  │                └──────────┘
                          ┌───────┴───────┐
                          ▼               ▼
                   expiryMode=      expiryMode=
                   'consume'        'all'
                          │               │
                          ▼               ▼
                    ┌──────────┐    ┌──────────┐
                    │ DEDUCT   │    │ DEDUCT + │
                    │(se pierde)    │ REPLICATE│
                    └──────────┘    │al destino│
                                     └──────────┘
```

---

## 10. Integración PayPal

### Arquitectura

```
┌─────────────────────────────┐
│       App (React Native)     │
│  MembresiaScreen/TokensScreen│
│        │  POST /create-order │
│        │  POST /capture-order│
│        ▼                     │
│  ┌──────────────────┐        │
│  │ PayPal SDK (web) │        │
│  │ (Linking.openURL)│        │
│  └────────┬─────────┘        │
└───────────┼──────────────────┘
            │
┌───────────┼──────────────────┐
│  Vercel (Serverless)         │
│  win-tasks.vercel.app        │
│  ┌────────────────────────┐  │
│  │ /api/paypal/create-order│  │
│  │ /api/paypal/capture-order│ │
│  │ ┌──────────────────────┐ │ │
│  │ │ helpers.js           │ │ │
│  │ │ getAccessToken()     │ │ │
│  │ │ createOrder(amount)  │ │ │
│  │ │ captureOrder(orderId)│ │ │
│  │ └──────────────────────┘ │ │
│  └────────────────────────┘  │
│        │                     │
│        ▼                     │
│  PayPal REST API v2          │
│  api-m.paypal.com            │
│  (o sandbox)                 │
└──────────────────────────────┘
```

### Variables de entorno (api/.env.example)
| Variable | Descripción |
|----------|-------------|
| `PAYPAL_CLIENT_ID` | Client ID de la app PayPal |
| `PAYPAL_SECRET` | Secret de la app PayPal |
| `PAYPAL_SANDBOX` | `true` usa sandbox, cualquier otro valor usa producción |

### Flujo de pago

1. Usuario selecciona plan/pack en la app
2. App envía `POST` a `https://win-tasks.vercel.app/api/paypal/create-order` con `{amount: USD, description}`
3. Backend obtiene access token via OAuth2 (`grant_type=client_credentials`) y crea orden en PayPal REST API v2
4. Backend responde con `{id, status, approvalUrl}`
5. App abre `approvalUrl` con `Linking.openURL()` → usuario aprueba en navegador/WebView de PayPal
6. App inicia polling cada 5s a `https://win-tasks.vercel.app/api/paypal/capture-order` con `{orderId}`
7. Backend captura la orden vía PayPal REST API, responde `{status, payerEmail, grossAmount, id}`
8. Si `status === 'COMPLETED'`:
   - **TokensScreen**: `addTokens(userId, amount, source, expiryMonths)` crea lote `purchase_*`
   - **MembresiaScreen**: `requestMembership` → `markPaymentSent` → `verifyMembership` activa membresía
9. Timeout: 5 minutos (300s), tras lo cual se cancela el polling y se muestra error

### Endpoints

#### POST /api/paypal/create-order
- **Body**: `{amount: number, description?: string}`
- **Response**: `{id, status, approvalUrl}`
- **Error**: `{error: string}` (400 si amount inválido, 500 si PayPal falla)

#### POST /api/paypal/capture-order
- **Body**: `{orderId: string}`
- **Response**: `{status, payerEmail, grossAmount, id}`
- **Error**: `{error: string}` (400 si orderId faltante, 500 si PayPal falla)

### Productos

#### Membresías (MembresiaScreen)
| Plan | USD | Meses | Badge |
|------|-----|-------|-------|
| 1 mes | $1.50 | 1 | — |
| 3 meses | $3.00 | 3 | 33% ahorro |
| 6 meses | $5.00 | 6 | 44% ahorro |

#### Packs de tokens (TokensScreen)
| Pack | Tokens | USD | Expiración |
|------|--------|-----|------------|
| Pack 200 (p0) | 200 | $1.50 | 6 meses |
| Pack 500 (p1) | 500 | $2.50 | 6 meses |
| Pack 1000 (p2) | 1000 | $4.00 | 6 meses |
| Pack 2500 (p3) | 2500 | $9.50 | 12 meses |
| Pack 5000 (p4) | 5000 | $18.00 | 12 meses |
| Pack 9000 (p5) | 9000 | $25.00 | 12 meses |

### Dólar MEP
Ambas pantallas consultan `https://dolarapi.com/v1/dolares` al montarse para obtener el tipo de cambio y mostrar el precio referencial en ARS. No afecta el cobro (siempre en USD vía PayPal).

### Despliegue
- Las funciones serverless están en `api/paypal/` y se despliegan en Vercel
- `vercel.json` configura `maxDuration: 10` para evitar timeouts
- El frontend apunta a `https://win-tasks.vercel.app` (cambiar URL en cada screen si se cambia el dominio)
