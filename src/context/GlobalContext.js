import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GlobalContext = createContext();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,12}$/;

export function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

export function getPasswordErrors(password) {
  const errors = [];
  if (!password || password.length < 6 || password.length > 12) errors.push('Debe tener entre 6 y 12 caracteres');
  if (!/(?=.*[a-z])/.test(password)) errors.push('Debe tener al menos una minúscula');
  if (!/(?=.*[A-Z])/.test(password)) errors.push('Debe tener al menos una mayúscula');
  if (!/(?=.*\d)/.test(password)) errors.push('Debe tener al menos un número');
  return errors;
}

const DEMO_USERS = [
  { id: '1', nombre: 'Guille', apellido: 'Adulto', email: 'guilleadulto@gmail.com', alias: 'guillepadre', phone: '+541122222222', fechaNac: '10/05/1984', age: 42, role: 'adulto', password: 'Pass1234', trialEnd: null, isPremium: true },
  { id: '2', nombre: 'Ana', apellido: 'Martínez', email: 'anita@email.com', alias: 'anita123', phone: '+541122221111', fechaNac: '10/07/2014', age: 10, role: 'menor', password: 'Pass1234', tutorId: '1' },
];

const EXPIRY_MONTHS = 6;
const SIGNUP_TOKEN_BONUS = 500;
const TASK_COMPLETE_POINTS = 10;
const TASK_EXPIRY_DAYS = 7;

const now = new Date();
const exp6 = new Date(now.getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
const INITIAL_TOKEN_BATCHES = [
  { id: 'b1', userId: '1', amount: 200, remaining: 200, source: 'signup', acquiredAt: now.toISOString(), expiresAt: exp6 },
  { id: 'b2', userId: '2', amount: 50, remaining: 50, source: 'signup', acquiredAt: now.toISOString(), expiresAt: exp6 },
  { id: 'b3', userId: '2', amount: 10, remaining: 10, source: 'task_reward', acquiredAt: '2026-05-12T18:00:00Z', expiresAt: new Date(new Date('2026-05-12T18:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b4', userId: '2', amount: 15, remaining: 15, source: 'task_reward', acquiredAt: '2026-05-07T12:00:00Z', expiresAt: new Date(new Date('2026-05-07T12:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b5', userId: '2', amount: 5, remaining: 5, source: 'task_reward', acquiredAt: '2026-03-16T16:00:00Z', expiresAt: new Date(new Date('2026-03-16T16:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b6', userId: '2', amount: 12, remaining: 12, source: 'task_reward', acquiredAt: '2026-06-18T17:00:00Z', expiresAt: new Date(new Date('2026-06-18T17:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b7', userId: '2', amount: 7, remaining: 7, source: 'task_reward', acquiredAt: '2026-06-02T12:00:00Z', expiresAt: new Date(new Date('2026-06-02T12:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b8', userId: '2', amount: 6, remaining: 6, source: 'task_reward', acquiredAt: '2026-06-10T16:00:00Z', expiresAt: new Date(new Date('2026-06-10T16:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b9', userId: '2', amount: 5, remaining: 5, source: 'task_reward', acquiredAt: '2026-06-15T14:00:00Z', expiresAt: new Date(new Date('2026-06-15T14:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
];
const INITIAL_LOYALTY = { '1': 40, '2': 0 };
const INITIAL_TASKS = [
  // 4 completadas
  { id: 't1', title: 'Ordenar la habitación', description: '', childId: '2', createdBy: '1', tokenReward: 10, status: 'approved', createdAt: '2026-05-10T14:00:00Z', completedAt: '2026-05-12T16:00:00Z', approvedAt: '2026-05-12T18:00:00Z', expiresAt: '2026-05-17T14:00:00Z' },
  { id: 't2', title: 'Pasear al perro', description: '', childId: '2', createdBy: '1', tokenReward: 15, status: 'approved', createdAt: '2026-05-05T10:00:00Z', completedAt: '2026-05-07T11:00:00Z', approvedAt: '2026-05-07T12:00:00Z', expiresAt: '2026-05-12T10:00:00Z' },
  { id: 't3', title: 'Hacer la tarea de matemáticas', description: '', childId: '2', createdBy: '1', tokenReward: 8, status: 'completed', createdAt: '2026-04-20T09:00:00Z', completedAt: '2026-04-22T15:00:00Z', expiresAt: '2026-04-27T09:00:00Z' },
  { id: 't4', title: 'Lavar los platos', description: '', childId: '2', createdBy: '1', tokenReward: 5, status: 'approved', createdAt: '2026-03-15T12:00:00Z', completedAt: '2026-03-16T14:00:00Z', approvedAt: '2026-03-16T16:00:00Z', expiresAt: '2026-03-22T12:00:00Z' },
  // 2 vencidas
  { id: 't5', title: 'Limpiar el escritorio', description: '', childId: '2', createdBy: '1', tokenReward: 10, status: 'expired', createdAt: '2026-05-20T08:00:00Z', expiresAt: '2026-05-27T08:00:00Z' },
  { id: 't6', title: 'Regar las plantas', description: '', childId: '2', createdBy: '1', tokenReward: 6, status: 'expired', createdAt: '2026-06-01T09:00:00Z', expiresAt: '2026-06-08T09:00:00Z' },
  // 3 pendientes
  { id: 't7', title: 'Barrer la cocina', description: '', childId: '2', createdBy: '1', tokenReward: 8, status: 'pending', createdAt: '2026-06-10T10:00:00Z', expiresAt: '2026-06-24T10:00:00Z' },
  { id: 't8', title: 'Sacar la basura', description: '', childId: '2', createdBy: '1', tokenReward: 5, status: 'pending', createdAt: '2026-06-12T11:00:00Z', expiresAt: '2026-06-26T11:00:00Z' },
  { id: 't9', title: 'Estudiar para el examen', description: '', childId: '2', createdBy: '1', tokenReward: 20, status: 'pending', createdAt: '2026-06-15T14:00:00Z', expiresAt: '2026-06-29T14:00:00Z' },
  // 4 realizadas en junio
  { id: 't10', title: 'Ordenar el cuarto', description: '', childId: '2', createdBy: '1', tokenReward: 12, status: 'approved', createdAt: '2026-06-01T10:00:00Z', completedAt: '2026-06-18T15:00:00Z', approvedAt: '2026-06-18T17:00:00Z', expiresAt: '2026-06-08T10:00:00Z' },
  { id: 't11', title: 'Doblar la ropa', description: '', childId: '2', createdBy: '1', tokenReward: 7, status: 'approved', createdAt: '2026-06-01T09:00:00Z', completedAt: '2026-06-02T10:00:00Z', approvedAt: '2026-06-02T12:00:00Z', expiresAt: '2026-06-08T09:00:00Z' },
  { id: 't12', title: 'Preparar la mochila', description: '', childId: '2', createdBy: '1', tokenReward: 6, status: 'approved', createdAt: '2026-06-08T08:00:00Z', completedAt: '2026-06-10T14:00:00Z', approvedAt: '2026-06-10T16:00:00Z', expiresAt: '2026-06-15T08:00:00Z' },
  { id: 't13', title: 'Ayudar a poner la mesa', description: '', childId: '2', createdBy: '1', tokenReward: 5, status: 'approved', createdAt: '2026-06-12T11:00:00Z', completedAt: '2026-06-15T12:00:00Z', approvedAt: '2026-06-15T14:00:00Z', expiresAt: '2026-06-19T11:00:00Z' },
];
const INITIAL_MEMBERSHIPS = {};
const INITIAL_INVITES = {};
const INITIAL_LOYALTY_HISTORY = [
  { id: 'lh1', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Ordenar la habitación" completada', date: '2026-05-12T16:00:00Z' },
  { id: 'lh2', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Pasear al perro" completada', date: '2026-05-07T11:00:00Z' },
  { id: 'lh3', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Hacer la tarea de matemáticas" completada', date: '2026-04-22T15:00:00Z' },
  { id: 'lh4', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Lavar los platos" completada', date: '2026-03-16T14:00:00Z' },
  { id: 'lh5', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Doblar la ropa" completada', date: '2026-06-02T10:00:00Z' },
  { id: 'lh6', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Preparar la mochila" completada', date: '2026-06-10T14:00:00Z' },
  { id: 'lh7', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Ayudar a poner la mesa" completada', date: '2026-06-15T12:00:00Z' },
  { id: 'lh8', userId: '1', amount: 10, type: 'earn_task', description: 'Tarea "Ordenar el cuarto" completada', date: '2026-06-18T15:00:00Z' },
];

const LOYALTY_RATES = { taskApprove: 10, sorpresa: 10, invite: 50, membership1m: 50, membership3m: 170, membership6m: 360 };
const REDEEM_MEMBERSHIP_POINTS = 2500;
const REDEEM_TOKEN_POINTS = 5; // 1 token = 5 puntos
const TOKEN_REDEEM_OPTIONS = [
  { tokens: 500, points: 1000 },
  { tokens: 1000, points: 1400 },
  { tokens: 2000, points: 1900 },
];

export function GlobalProvider({ children }) {
  const [users, setUsers] = useState(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [tokenBatches, setTokenBatches] = useState(INITIAL_TOKEN_BATCHES);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [memberships, setMemberships] = useState(INITIAL_MEMBERSHIPS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [loyaltyPoints, setLoyaltyPoints] = useState(INITIAL_LOYALTY);
  const [loyaltyHistory, setLoyaltyHistory] = useState(INITIAL_LOYALTY_HISTORY);
  const [surprises, setSurprises] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  const STORAGE_KEYS = ['users', 'tokenBatches', 'tasks', 'memberships', 'invites', 'loyaltyPoints', 'loyaltyHistory', 'surprises', 'prizes'];

  const stateMap = {
    users: [users, setUsers],
    tokenBatches: [tokenBatches, setTokenBatches],
    tasks: [tasks, setTasks],
    memberships: [memberships, setMemberships],
    invites: [invites, setInvites],
    loyaltyPoints: [loyaltyPoints, setLoyaltyPoints],
    loyaltyHistory: [loyaltyHistory, setLoyaltyHistory],
    surprises: [surprises, setSurprises],
    prizes: [prizes, setPrizes],
  };

  const isEmpty = (val) => {
    if (Array.isArray(val)) return val.length === 0;
    if (val && typeof val === 'object') return Object.keys(val).length === 0;
    return !val;
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAll(), 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [users, tokenBatches, tasks, memberships, invites, loyaltyPoints, loyaltyHistory, surprises, prizes, loaded]);

  const saveAll = async () => {
    try {
      for (const key of STORAGE_KEYS) {
        const val = stateMap[key][0];
        await AsyncStorage.setItem(key, JSON.stringify(val));
      }
      if (currentUser) await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (e) { /* silent */ }
  };

  const loadAll = async () => {
    try {
      const saved = {};
      for (const key of STORAGE_KEYS) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) saved[key] = JSON.parse(raw);
      }
      const cuRaw = await AsyncStorage.getItem('currentUser');
      if (cuRaw) saved.currentUser = JSON.parse(cuRaw);
      for (const key of STORAGE_KEYS) {
        if (saved[key] && !isEmpty(saved[key])) stateMap[key][1](saved[key]);
      }
      if (saved.currentUser) setCurrentUser(saved.currentUser);
      // ensure INITIAL_TASKS are always present (merge by id, don't overwrite user-created)
      setTasks(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const missing = INITIAL_TASKS.filter(t => !existingIds.has(t.id));
        return missing.length > 0 ? [...prev, ...missing] : prev;
      });
    } catch (e) { /* silent */ }
    setLoaded(true);
  };


  const login = useCallback((phone, password) => {
    const user = users.find(u => u.phone === phone && u.password === password);
    if (user) setCurrentUser(user);
    return !!user;
  }, [users]);

  const register = useCallback(({ nombre, apellido, email, alias, phone, age, fechaNac, password, tutorCode, referralCode }) => {
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) return { success: false, errors: passwordErrors };
    const isAdult = Number(age) >= 18;
    const newUser = {
      id: String(Date.now()),
      nombre, apellido, email, alias,
      phone,
      age: Number(age),
      fechaNac,
      password,
      role: isAdult ? 'adulto' : 'menor',
      ...(isAdult ? { trialEnd: null, isPremium: false } : { tutorId: tutorCode || null }),
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (newUser.role === 'adulto') {
      addTokenBatchDirect(newUser.id, SIGNUP_TOKEN_BONUS);
    }
    function addTokenBatchDirect(uid, amt) {
      const batch = {
        id: String(Date.now()) + String(Math.random()).slice(2, 8),
        userId: uid, amount: amt, remaining: amt, source: 'signup',
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      setTokenBatches(prev => [...prev, batch]);
    }
    if (referralCode && isAdult) {
      const inviter = users.find(u => u.alias === referralCode && u.id !== newUser.id);
      if (inviter) {
        setLoyaltyPoints(prev => ({ ...prev, [inviter.id]: (prev[inviter.id] || 0) + 50 }));
        const invite = { invitedUserId: newUser.id, invitedAlias: alias, invitedAt: new Date().toISOString() };
        setInvites(prev => ({ ...prev, [inviter.id]: [...(prev[inviter.id] || []), invite] }));
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        setMemberships(prev => ({
          ...prev,
          [newUser.id]: {
            plan: '1mes', startDate: new Date().toISOString(), endDate,
            status: 'active', paymentRef: `REF-${newUser.id.slice(-4)}`, amountUsd: 0, amountArs: 0, rate: 0,
            createdAt: new Date().toISOString(), expiresAt: endDate, userEmail: email || '',
          },
        }));
      }
    }
    return { success: true, user: newUser };
  }, [users]);

  const updatePhone = useCallback((userId, newPhone) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, phone: newPhone } : u));
    setCurrentUser(prev => prev?.id === userId ? { ...prev, phone: newPhone } : prev);
  }, []);

  const updatePassword = useCallback((userId, newPassword) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
    setCurrentUser(prev => prev?.id === userId ? { ...prev, password: newPassword } : prev);
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  const getTutorName = useCallback((tutorId) => {
    const tutor = users.find(u => u.id === tutorId);
    return tutor?.alias || 'Desconocido';
  }, [users]);

  const getUserTokens = useCallback((userId) => {
    const now = new Date();
    return tokenBatches
      .filter(b => b.userId === userId && b.remaining > 0 && new Date(b.expiresAt) > now)
      .reduce((sum, b) => sum + b.remaining, 0);
  }, [tokenBatches]);

  const getChildren = useCallback((adultId) => {
    return users.filter(u => u.role === 'menor' && u.tutorId === adultId);
  }, [users]);

  const addTokens = useCallback((userId, amount, source = 'generic') => {
    const batch = {
      id: String(Date.now()) + String(Math.random()).slice(2, 8),
      userId,
      amount,
      remaining: amount,
      source,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setTokenBatches(prev => [...prev, batch]);
    return batch;
  }, []);

  const deductTokens = useCallback((userId, amount) => {
    let remaining = amount;
    setTokenBatches(prev => {
      const sorted = prev
        .filter(b => b.userId === userId && b.remaining > 0 && new Date(b.expiresAt) > new Date())
        .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt) || new Date(a.acquiredAt) - new Date(b.acquiredAt));
      const updatedIds = new Set();
      for (const batch of sorted) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, batch.remaining);
        batch.remaining -= deduct;
        remaining -= deduct;
        updatedIds.add(batch.id);
      }
      if (remaining > 0) return prev;
      return prev.map(b => updatedIds.has(b.id) ? { ...b, remaining: b.remaining } : b);
    });
    return remaining === 0;
  }, []);

  const moveTokens = useCallback((fromUserId, toUserId, amount) => {
    const success = deductTokens(fromUserId, amount);
    if (success) addTokens(toUserId, amount, 'transfer');
    return success;
  }, [deductTokens, addTokens]);

  const createTask = useCallback(({ title, description, childId, tokenReward, createdBy }) => {
    const reward = Number(tokenReward);
    const deducted = deductTokens(createdBy, reward);
    if (!deducted) return null;
    const task = {
      id: String(Date.now()),
      title,
      description,
      childId,
      createdBy,
      tokenReward: reward,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TASK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };
    setTasks(prev => [...prev, task]);
    return task;
  }, [deductTokens]);

  const getTasksForAdult = useCallback((adultId) => {
    return tasks.filter(t => t.createdBy === adultId);
  }, [tasks]);

  const getTasksForChild = useCallback((childId) => {
    return tasks.filter(t => t.childId === childId);
  }, [tasks]);

  const completeTask = useCallback((taskId) => {
    let completedTask = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.status === 'pending') {
        completedTask = t;
        return { ...t, status: 'completed', completedAt: new Date().toISOString() };
      }
      return t;
    }));
    if (completedTask) {
      addLoyaltyEntry(completedTask.createdBy, TASK_COMPLETE_POINTS, 'earn_task', `Tarea "${completedTask.title}" completada`);
    }
  }, [addLoyaltyEntry]);

  const approveTask = useCallback((taskId) => {
    let taskToApprove = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.status === 'completed') {
        taskToApprove = t;
        return { ...t, status: 'approved', approvedAt: new Date().toISOString() };
      }
      return t;
    }));
    if (taskToApprove) {
      addTokens(taskToApprove.childId, taskToApprove.tokenReward, 'task_reward');
    }
  }, [addTokens]);

  const rejectTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'rejected' } : t));
  }, []);

  const expireOverdueTasks = useCallback(() => {
    const now = new Date();
    const overdue = tasks.filter(t => t.status === 'pending' && new Date(t.expiresAt) <= now);
    if (overdue.length === 0) return;
    for (const task of overdue) {
      addTokens(task.createdBy, task.tokenReward, 'expired_refund');
    }
    setTasks(prev => prev.map(t =>
      t.status === 'pending' && new Date(t.expiresAt) <= now ? { ...t, status: 'expired' } : t
    ));
  }, [tasks, addTokens]);

  const getPendingTaskTokens = useCallback((adultId) => {
    return tasks
      .filter(t => t.createdBy === adultId && t.status === 'pending')
      .reduce((sum, t) => sum + t.tokenReward, 0);
  }, [tasks]);

  const getPendingTasksWithDetails = useCallback((adultId) => {
    return tasks
      .filter(t => t.createdBy === adultId && t.status === 'pending')
      .map(t => {
        const child = users.find(u => u.id === t.childId);
        return { ...t, childName: child?.alias || 'Desconocido' };
      });
  }, [tasks, users]);

  const getPurchaseHistory = useCallback((userId) => {
    return tokenBatches
      .filter(b => b.userId === userId && b.source && b.source.startsWith('purchase_'))
      .sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt));
  }, [tokenBatches]);

  const requestMembership = useCallback((userId, plan, amountUsd, amountArs, rate) => {
    const ref = `MEM-${userId.slice(-4)}-${Date.now().toString().slice(-5)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const planMonths = plan === '1mes' ? 1 : plan === '3meses' ? 3 : 6;
    const user = users.find(u => u.id === userId);
    const existing = memberships[userId];
    let baseDate;
    if (existing?.status === 'active' && existing?.endDate) {
      baseDate = new Date(existing.endDate);
    } else {
      baseDate = new Date();
    }
    const endDate = new Date(baseDate.getTime() + planMonths * 30 * 24 * 60 * 60 * 1000);
    setMemberships(prev => ({
      ...prev,
      [userId]: {
        plan,
        startDate: null,
        endDate: endDate.toISOString(),
        status: 'pending',
        paymentRef: ref,
        amountUsd,
        amountArs,
        rate,
        createdAt: now.toISOString(),
        expiresAt,
        userEmail: user?.email || '',
      },
    }));
    return ref;
  }, [users, memberships]);

  const markPaymentSent = useCallback((userId) => {
    setMemberships(prev => {
      const m = prev[userId];
      if (!m || m.status !== 'pending') return prev;
      const now = new Date();
      if (now > new Date(m.expiresAt)) return { ...prev, [userId]: { ...m, status: 'expired' } };
      return { ...prev, [userId]: { ...m, status: 'waiting_verification', paidAt: now.toISOString() } };
    });
  }, []);

  const verifyMembership = useCallback((userId) => {
    let awarded = null;
    setMemberships(prev => {
      const m = prev[userId];
      if (!m || m.status !== 'waiting_verification') return prev;
      const pts = m.plan === '1mes' ? LOYALTY_RATES.membership1m : m.plan === '3meses' ? LOYALTY_RATES.membership3m : m.plan === '6meses' ? LOYALTY_RATES.membership6m : 0;
      awarded = { plan: m.plan, points: pts };
      return { ...prev, [userId]: { ...m, status: 'active', startDate: new Date().toISOString() } };
    });
    if (awarded) {
      addLoyaltyEntry(userId, awarded.points, 'earn_membership', `Membresía ${awarded.plan} pagada`);
    }
  }, [addLoyaltyEntry]);

  const redeemPointsForMembership = useCallback((userId) => {
    const current = loyaltyPoints[userId] || 0;
    if (current < REDEEM_MEMBERSHIP_POINTS) return { success: false, error: 'No tenés suficientes puntos WinTasks. Necesitás 2500.' };
    setLoyaltyPoints(prev => ({ ...prev, [userId]: (prev[userId] || 0) - REDEEM_MEMBERSHIP_POINTS }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId, amount: -REDEEM_MEMBERSHIP_POINTS, type: 'redeem_membership', description: 'Canjeado por 1 mes de membresía', date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    setMemberships(prev => {
      const existing = prev[userId];
      let baseDate;
      if (existing?.status === 'active' && existing?.endDate) {
        baseDate = new Date(existing.endDate);
      } else {
        baseDate = new Date();
      }
      const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        ...prev,
        [userId]: {
          plan: '1mes', startDate: new Date().toISOString(), endDate: newEndDate.toISOString(),
          status: 'active', paymentRef: `CANJE-${userId.slice(-4)}-${Date.now().toString().slice(-5)}`,
          amountUsd: 0, amountArs: 0, rate: 0,
          createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), userEmail: '',
        },
      };
    });
    return { success: true };
  }, [loyaltyPoints]);

  const redeemPointsForTokens = useCallback((userId, puntos) => {
    const current = loyaltyPoints[userId] || 0;
    if (puntos < REDEEM_TOKEN_POINTS) return { success: false, error: `Mínimo ${REDEEM_TOKEN_POINTS} puntos para canjear.` };
    if (current < puntos) return { success: false, error: 'No tenés suficientes puntos WinTasks.' };
    const tok = Math.floor(puntos / REDEEM_TOKEN_POINTS);
    const puntosUsados = tok * REDEEM_TOKEN_POINTS;
    setLoyaltyPoints(prev => ({ ...prev, [userId]: (prev[userId] || 0) - puntosUsados }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId, amount: -puntosUsados, type: 'redeem_tokens', description: `Canjeado por ${tok} token${tok > 1 ? 's' : ''}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    addTokens(userId, tok, 'redeem');
    return { success: true, tokens: tok, puntosUsados };
  }, [loyaltyPoints, addTokens]);

  const redeemTokensTiered = useCallback((userId, optionIndex) => {
    const option = TOKEN_REDEEM_OPTIONS[optionIndex];
    if (!option) return { success: false, error: 'Opción inválida.' };
    const current = loyaltyPoints[userId] || 0;
    if (current < option.points) return { success: false, error: `Necesitás ${option.points} puntos. Tenés ${current}.` };
    setLoyaltyPoints(prev => ({ ...prev, [userId]: (prev[userId] || 0) - option.points }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId, amount: -option.points, type: 'redeem_tokens', description: `Canjeado por ${option.tokens} tokens`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    addTokens(userId, option.tokens, 'redeem');
    return { success: true, tokens: option.tokens };
  }, [loyaltyPoints, addTokens]);

  const getUserMembership = useCallback((userId) => {
    const m = memberships[userId];
    if (!m) return null;
    if (m.status === 'pending' && new Date() > new Date(m.expiresAt)) {
      setMemberships(prev => ({ ...prev, [userId]: { ...prev[userId], status: 'expired' } }));
      return { ...m, status: 'expired' };
    }
    return m;
  }, [memberships]);

  const getPendingVerifications = useCallback(() => {
    return Object.entries(memberships)
      .filter(([, m]) => m.status === 'waiting_verification')
      .map(([userId, m]) => ({ userId, ...m }));
  }, [memberships]);

  const getReferralCode = useCallback((userId) => {
    const user = users.find(u => u.id === userId);
    return user?.alias || null;
  }, [users]);

  const getInvites = useCallback((userId) => {
    return invites[userId] || [];
  }, [invites]);

  const getTokensFromInvites = useCallback((userId) => {
    return (invites[userId]?.length || 0) * 50;
  }, [invites]);

  const getUserLoyaltyPoints = useCallback((userId) => loyaltyPoints[userId] || 0, [loyaltyPoints]);

  const getLoyaltyHistory = useCallback((userId) => {
    return loyaltyHistory.filter(h => h.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [loyaltyHistory]);

  const addLoyaltyEntry = useCallback((userId, amount, type, description) => {
    setLoyaltyPoints(prev => ({ ...prev, [userId]: (prev[userId] || 0) + amount }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId, amount, type, description, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    return entry;
  }, []);

  const createAndSendSurprise = useCallback(({ title, description, childId, tokenReward, createdBy, icon, bgColor, expirationDate, bgImageUri, iconImageUri }) => {
    const surprise = {
      id: String(Date.now()),
      title, description, childId, createdBy,
      tokenReward: Number(tokenReward),
      icon: icon || 'gift',
      bgColor: bgColor || '#2D1B69',
      expirationDate: expirationDate || null,
      bgImageUri: bgImageUri || null,
      iconImageUri: iconImageUri || null,
      status: 'sent',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
    };
    setSurprises(prev => [...prev, surprise]);
    return surprise;
  }, []);

  const getSurprisesForAdult = useCallback((adultId) => {
    return surprises.filter(s => s.createdBy === adultId);
  }, [surprises]);

  const getSurprisesForChild = useCallback((childId) => {
    return surprises.filter(s => s.childId === childId);
  }, [surprises]);

  const openSurprise = useCallback((surpriseId) => {
    setSurprises(prev => prev.map(s => s.id === surpriseId ? { ...s, status: 'opened' } : s));
  }, []);

  const claimSurprise = useCallback((surpriseId) => {
    let target = null;
    setSurprises(prev => prev.map(s => {
      if (s.id === surpriseId && (s.status === 'opened' || s.status === 'sent')) {
        target = s;
        return { ...s, status: 'claimed' };
      }
      return s;
    }));
    if (target) {
      moveTokens(target.childId, target.createdBy, target.tokenReward);
    }
  }, [moveTokens]);

  const createPrize = useCallback(({ title, description, tokenCost, createdBy }) => {
    const prize = {
      id: String(Date.now()),
      title,
      description: description || '',
      tokenCost: Number(tokenCost),
      createdBy,
      createdAt: new Date().toISOString(),
      usedCount: 0,
    };
    setPrizes(prev => [...prev, prize]);
    return prize;
  }, []);

  const deletePrize = useCallback((prizeId) => {
    setPrizes(prev => prev.filter(p => p.id !== prizeId));
  }, []);

  const getAdultPrizes = useCallback((adultId) => {
    return prizes
      .filter(p => p.createdBy === adultId)
      .sort((a, b) => b.usedCount - a.usedCount || new Date(b.createdAt) - new Date(a.createdAt));
  }, [prizes]);

  const incrementPrizeUsed = useCallback((prizeId) => {
    setPrizes(prev => prev.map(p => p.id === prizeId ? { ...p, usedCount: p.usedCount + 1 } : p));
  }, []);

  return (
    <GlobalContext.Provider value={{
      loaded, users, currentUser, login, register, updatePhone, updatePassword, logout, getTutorName, getUserTokens, getChildren, addTokens, deductTokens, moveTokens,
      tokenBatches, tasks, createTask, getTasksForAdult, getTasksForChild, completeTask, approveTask, rejectTask,
      expireOverdueTasks, getPendingTaskTokens, getPendingTasksWithDetails, getPurchaseHistory,
      memberships, requestMembership, markPaymentSent, verifyMembership, getUserMembership, getPendingVerifications,
      invites, getReferralCode, getInvites, getTokensFromInvites,
      loyaltyPoints, getUserLoyaltyPoints, addLoyaltyEntry, getLoyaltyHistory,
      redeemPointsForMembership, redeemPointsForTokens, redeemTokensTiered,
      LOYALTY_RATES, REDEEM_MEMBERSHIP_POINTS, REDEEM_TOKEN_POINTS, TOKEN_REDEEM_OPTIONS,
      surprises, createAndSendSurprise, getSurprisesForAdult, getSurprisesForChild, openSurprise, claimSurprise,
      prizes, createPrize, deletePrize, getAdultPrizes, incrementPrizeUsed,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);
