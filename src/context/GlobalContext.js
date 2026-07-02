import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

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

const EXPIRY_MONTHS = 6;
const SIGNUP_TOKEN_BONUS = 200;
const TASK_COMPLETE_POINTS = 10;
const TASK_EXPIRY_DAYS = 7;

const DEMO_ADULT_ID = '5c44f263-cb3d-4e4e-9d9d-97956bc882f3';
const DEMO_CHILD_ID = '3317ce61-1473-44e6-b5c5-5d5e4f140aa6';

const now = new Date();
const exp6 = new Date(now.getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
const INITIAL_TOKEN_BATCHES = [
  { id: 'b1', userId: DEMO_ADULT_ID, amount: 200, remaining: 167, source: 'signup', acquiredAt: now.toISOString(), expiresAt: exp6 },
  { id: 'b2', userId: DEMO_CHILD_ID, amount: 50, remaining: 50, source: 'signup', acquiredAt: now.toISOString(), expiresAt: exp6 },
  { id: 'b3', userId: DEMO_CHILD_ID, amount: 10, remaining: 10, source: 'task_reward', acquiredAt: '2026-05-12T18:00:00Z', expiresAt: new Date(new Date('2026-05-12T18:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b4', userId: DEMO_CHILD_ID, amount: 15, remaining: 15, source: 'task_reward', acquiredAt: '2026-05-07T12:00:00Z', expiresAt: new Date(new Date('2026-05-07T12:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b5', userId: DEMO_CHILD_ID, amount: 5, remaining: 5, source: 'task_reward', acquiredAt: '2026-03-16T16:00:00Z', expiresAt: new Date(new Date('2026-03-16T16:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b6', userId: DEMO_CHILD_ID, amount: 12, remaining: 12, source: 'task_reward', acquiredAt: '2026-06-18T17:00:00Z', expiresAt: new Date(new Date('2026-06-18T17:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b7', userId: DEMO_CHILD_ID, amount: 7, remaining: 7, source: 'task_reward', acquiredAt: '2026-06-02T12:00:00Z', expiresAt: new Date(new Date('2026-06-02T12:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b8', userId: DEMO_CHILD_ID, amount: 6, remaining: 6, source: 'task_reward', acquiredAt: '2026-06-10T16:00:00Z', expiresAt: new Date(new Date('2026-06-10T16:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'b9', userId: DEMO_CHILD_ID, amount: 5, remaining: 5, source: 'task_reward', acquiredAt: '2026-06-15T14:00:00Z', expiresAt: new Date(new Date('2026-06-15T14:00:00Z').getTime() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() },
];
const INITIAL_LOYALTY = { [DEMO_ADULT_ID]: 40, [DEMO_CHILD_ID]: 0 };
const INITIAL_TASKS = [
  { id: 't1', title: 'Ordenar la habitaci\u00f3n', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 10, status: 'approved', createdAt: '2026-05-10T14:00:00Z', completedAt: '2026-05-12T16:00:00Z', approvedAt: '2026-05-12T18:00:00Z', expiresAt: '2026-05-17T14:00:00Z' },
  { id: 't2', title: 'Pasear al perro', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 15, status: 'approved', createdAt: '2026-05-05T10:00:00Z', completedAt: '2026-05-07T11:00:00Z', approvedAt: '2026-05-07T12:00:00Z', expiresAt: '2026-05-12T10:00:00Z' },
  { id: 't3', title: 'Hacer la tarea de matem\u00e1ticas', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 8, status: 'completed', createdAt: '2026-04-20T09:00:00Z', completedAt: '2026-04-22T15:00:00Z', expiresAt: '2026-04-27T09:00:00Z' },
  { id: 't4', title: 'Lavar los platos', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 5, status: 'approved', createdAt: '2026-03-15T12:00:00Z', completedAt: '2026-03-16T14:00:00Z', approvedAt: '2026-03-16T16:00:00Z', expiresAt: '2026-03-22T12:00:00Z' },
  { id: 't5', title: 'Limpiar el escritorio', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 10, status: 'expired', createdAt: '2026-05-20T08:00:00Z', expiresAt: '2026-05-27T08:00:00Z' },
  { id: 't6', title: 'Regar las plantas', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 6, status: 'expired', createdAt: '2026-06-01T09:00:00Z', expiresAt: '2026-06-08T09:00:00Z' },
  { id: 't7', title: 'Barrer la cocina', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 8, status: 'pending', createdAt: '2026-06-10T10:00:00Z', expiresAt: '2026-06-24T10:00:00Z' },
  { id: 't8', title: 'Sacar la basura', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 5, status: 'pending', createdAt: '2026-06-12T11:00:00Z', expiresAt: '2026-06-26T11:00:00Z' },
  { id: 't9', title: 'Estudiar para el examen', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 20, status: 'pending', createdAt: '2026-06-15T14:00:00Z', expiresAt: '2026-06-29T14:00:00Z' },
  { id: 't10', title: 'Ordenar el cuarto', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 12, status: 'approved', createdAt: '2026-06-01T10:00:00Z', completedAt: '2026-06-18T15:00:00Z', approvedAt: '2026-06-18T17:00:00Z', expiresAt: '2026-06-08T10:00:00Z' },
  { id: 't11', title: 'Doblar la ropa', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 7, status: 'approved', createdAt: '2026-06-01T09:00:00Z', completedAt: '2026-06-02T10:00:00Z', approvedAt: '2026-06-02T12:00:00Z', expiresAt: '2026-06-08T09:00:00Z' },
  { id: 't12', title: 'Preparar la mochila', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 6, status: 'approved', createdAt: '2026-06-08T08:00:00Z', completedAt: '2026-06-10T14:00:00Z', approvedAt: '2026-06-10T16:00:00Z', expiresAt: '2026-06-15T08:00:00Z' },
  { id: 't13', title: 'Ayudar a poner la mesa', description: '', childId: DEMO_CHILD_ID, createdBy: DEMO_ADULT_ID, tokenReward: 5, status: 'approved', createdAt: '2026-06-12T11:00:00Z', completedAt: '2026-06-15T12:00:00Z', approvedAt: '2026-06-15T14:00:00Z', expiresAt: '2026-06-19T11:00:00Z' },
];
const INITIAL_MEMBERSHIPS = {
  [DEMO_ADULT_ID]: {
    plan: '6meses', startDate: '2026-06-19T00:00:00.000Z',
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active', paymentRef: 'GRATIS-6M', amountUsd: 0, amountArs: 0, rate: 0,
    createdAt: '2026-06-19T00:00:00.000Z', expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    userEmail: 'guilleadulto@gmail.com',
  },
};
const INITIAL_INVITES = {};
const INITIAL_LOYALTY_HISTORY = [
  { id: 'lh1', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Ordenar la habitaci\u00f3n" completada', date: '2026-05-12T16:00:00Z' },
  { id: 'lh2', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Pasear al perro" completada', date: '2026-05-07T11:00:00Z' },
  { id: 'lh3', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Hacer la tarea de matem\u00e1ticas" completada', date: '2026-04-22T15:00:00Z' },
  { id: 'lh4', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Lavar los platos" completada', date: '2026-03-16T14:00:00Z' },
  { id: 'lh5', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Doblar la ropa" completada', date: '2026-06-02T10:00:00Z' },
  { id: 'lh6', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Preparar la mochila" completada', date: '2026-06-10T14:00:00Z' },
  { id: 'lh7', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Ayudar a poner la mesa" completada', date: '2026-06-15T12:00:00Z' },
  { id: 'lh8', userId: DEMO_ADULT_ID, amount: 10, type: 'earn_task', description: 'Tarea "Ordenar el cuarto" completada', date: '2026-06-18T15:00:00Z' },
];

const LOYALTY_RATES = { taskApprove: 10, sorpresa: 10, invite: 50, membership1m: 50, membership3m: 170, membership6m: 360 };
const REDEEM_MEMBERSHIP_POINTS = 2500;
const REDEEM_TOKEN_POINTS = 5;
const TOKEN_REDEEM_OPTIONS = [
  { tokens: 500, points: 1000 },
  { tokens: 1000, points: 1400 },
  { tokens: 2000, points: 1900 },
];

export function GlobalProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tokenBatches, setTokenBatches] = useState(INITIAL_TOKEN_BATCHES);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [memberships, setMemberships] = useState(INITIAL_MEMBERSHIPS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [loyaltyPoints, setLoyaltyPoints] = useState(INITIAL_LOYALTY);
  const [loyaltyHistory, setLoyaltyHistory] = useState(INITIAL_LOYALTY_HISTORY);
  const [surprises, setSurprises] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [todoLists, setTodoLists] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState({});
  const [scoreGoals, setScoreGoals] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    expireOverdueTasks();
  }, []);

  const mapProfile = (p) => ({ ...p, tutorId: p.tutor_id, fechaNac: p.fecha_nac });

  const loadProfiles = (session) => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (!data) return;
      const mapped = data.map(mapProfile);
      setUsers(mapped);
      const me = mapped.find(p => p.id === session.user.id);
      if (me) setCurrentUser(me);
    });
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadProfiles(session);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUsers([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfiles(session);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const register = useCallback(async ({ nombre, apellido, email, alias, phone, age, fechaNac, password, tutorCode, referralCode }) => {
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) return { success: false, errors: passwordErrors };
    const isAdult = Number(age) >= 18;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, errors: [error.message] };
    if (!data?.user) return { success: false, errors: ['Error al crear usuario'] };
    if (!data?.session) {
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
    }
    const userId = data.user.id;
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, nombre, apellido, email, alias, phone,
      age: Number(age), fecha_nac: fechaNac, role: isAdult ? 'adulto' : 'menor',
      ...(isAdult ? {} : { tutor_id: tutorCode || null }),
    });
    if (profileError) return { success: false, errors: [profileError.message] };
    const newUser = { id: userId, nombre, apellido, email, alias, phone, age: Number(age), fechaNac, role: isAdult ? 'adulto' : 'menor', ...(isAdult ? {} : { tutorId: tutorCode || null }) };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (newUser.role === 'adulto') {
      (function addTokenBatchDirect(uid, amt) {
        setTokenBatches(prev => [...prev, { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId: uid, amount: amt, remaining: amt, source: 'signup', acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString() }]);
      })(newUser.id, SIGNUP_TOKEN_BONUS);
      const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
      setMemberships(prev => ({ ...prev, [newUser.id]: { plan: '6meses', startDate: new Date().toISOString(), endDate, status: 'active', paymentRef: 'GRATIS-6M', amountUsd: 0, amountArs: 0, rate: 0, createdAt: new Date().toISOString(), expiresAt: endDate, userEmail: email || '' } }));
    }
    if (referralCode && isAdult) {
      const { data: refData } = await supabase.rpc('lookup_profile', { search_text: referralCode }).catch(() => ({}));
      const inviter = refData?.[0] && refData[0].user_id !== newUser.id ? refData[0] : null;
      if (inviter) {
        setLoyaltyPoints(prev => ({ ...prev, [inviter.user_id]: (prev[inviter.user_id] || 0) + 50 }));
        setInvites(prev => ({ ...prev, [inviter.user_id]: [...(prev[inviter.user_id] || []), { invitedUserId: newUser.id, invitedAlias: alias, invitedAt: new Date().toISOString() }] }));
        setMemberships(prev => ({ ...prev, [newUser.id]: { plan: '1mes', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'active', paymentRef: `REF-${newUser.id.slice(-4)}`, amountUsd: 0, amountArs: 0, rate: 0, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), userEmail: email || '' } }));
      }
    }
    return { success: true, user: newUser };
  }, [users]);

  const registerChild = useCallback(async ({ nombre, apellido, email, alias, phone, age, fechaNac, password }) => {
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) return { success: false, errors: passwordErrors };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, errors: [error.message] };
    if (!data?.user) return { success: false, errors: ['Error al crear usuario'] };
    if (!data?.session) {
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
    }
    const userId = data.user.id;
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, nombre, apellido, email, alias, phone,
      age: Number(age), fecha_nac: fechaNac, role: 'menor',
      tutor_id: currentUser?.id || null,
    });
    if (profileError) return { success: false, errors: [profileError.message] };
    const newUser = { id: userId, nombre, apellido, email, alias, phone, age: Number(age), fechaNac, role: 'menor', tutorId: currentUser?.id || null };
    setUsers(prev => [...prev, newUser]);
    return { success: true, user: newUser };
  }, [currentUser]);

  const updatePhone = useCallback(async (userId, newPhone) => {
    await supabase.from('profiles').update({ phone: newPhone }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, phone: newPhone } : u));
    setCurrentUser(prev => prev?.id === userId ? { ...prev, phone: newPhone } : prev);
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

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

  const addTokens = useCallback((userId, amount, source = 'generic', expiresAt) => {
    if (expiresAt && new Date(expiresAt) <= new Date()) return null;
    const exp = expiresAt || new Date(Date.now() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
    const batch = {
      id: String(Date.now()) + String(Math.random()).slice(2, 8),
      userId,
      amount,
      remaining: amount,
      source,
      acquiredAt: new Date().toISOString(),
      expiresAt: exp,
    };
    setTokenBatches(prev => [...prev, batch]);
    return batch;
  }, []);

  const deductTokens = useCallback((userId, amount) => {
    const deductions = [];
    setTokenBatches(prev => {
      const now = new Date();
      const sorted = prev
        .filter(b => b.userId === userId && b.remaining > 0 && new Date(b.expiresAt) > now)
        .sort((a, b) => {
          const aTransfer = a.fromChildTransfer ? 1 : 0;
          const bTransfer = b.fromChildTransfer ? 1 : 0;
          if (bTransfer - aTransfer !== 0) return bTransfer - aTransfer;
          return new Date(a.expiresAt) - new Date(b.expiresAt) || new Date(a.acquiredAt) - new Date(b.acquiredAt);
        });
      let rem = amount;
      const updates = [];
      for (const batch of sorted) {
        if (rem <= 0) break;
        const deduct = Math.min(rem, batch.remaining);
        rem -= deduct;
        deductions.push({ batchId: batch.id, amount: deduct, expiresAt: batch.expiresAt });
        updates.push({ batch, deduct });
      }
      if (rem > 0) { deductions.length = 0; return prev; }
      return prev.map(b => {
        const upd = updates.find(u => u.batch.id === b.id);
        return upd ? { ...b, remaining: b.remaining - upd.deduct } : b;
      });
    });
    return deductions;
  }, []);

  const transferTokens = useCallback((fromUserId, toUserId, amount, expiryMode = 'transfer', lockTokens = false) => {
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);
    const isCrossChild = fromUser?.role === 'menor' && toUser?.role === 'menor';
    const neverReturn = isCrossChild || lockTokens;
    let transferred = 0;
    let transferredExpired = 0;
    let expiredLost = 0;
    let transferLost = 0;
    let expiredSkipped = 0;
    let transferSkipped = 0;
    setTokenBatches(prev => {
      const now = new Date();
      const sourceBatches = prev
        .filter(b => b.userId === fromUserId && b.remaining > 0)
        .sort((a, b) => {
          if (isCrossChild || lockTokens) {
            const aT = a.fromChildTransfer ? 1 : 0;
            const bT = b.fromChildTransfer ? 1 : 0;
            if (bT - aT !== 0) return bT - aT;
          }
          return new Date(a.expiresAt) - new Date(b.expiresAt) || new Date(a.acquiredAt) - new Date(b.acquiredAt);
        });
      let rem = amount;
      const updates = [];
      const newBatches = [];
      for (const batch of sourceBatches) {
        if (rem <= 0) break;
        const isExpired = new Date(batch.expiresAt) <= now;
        if (expiryMode === 'transfer' && (isExpired || batch.fromChildTransfer)) {
          if (isExpired) expiredSkipped += batch.remaining;
          else transferSkipped += batch.remaining;
          continue;
        }
        const deduct = Math.min(rem, batch.remaining);
        rem -= deduct;
        updates.push({ batch, deduct });
        if (expiryMode === 'consume' && (isExpired || batch.fromChildTransfer)) {
          if (isExpired) expiredLost += deduct;
          else transferLost += deduct;
          continue;
        }
        transferred += deduct;
        if (isExpired) transferredExpired += deduct;
        newBatches.push({
          id: String(Date.now()) + String(Math.random()).slice(2, 8),
          userId: toUserId,
          amount: deduct,
          remaining: deduct,
          source: 'transfer',
          acquiredAt: new Date().toISOString(),
          expiresAt: batch.expiresAt,
          ...(neverReturn ? { fromChildTransfer: true } : {}),
        });
      }
      return [
        ...prev.map(b => {
          const upd = updates.find(u => u.batch.id === b.id);
          return upd ? { ...b, remaining: b.remaining - upd.deduct } : b;
        }),
        ...newBatches,
      ];
    });
    const totalLost = expiredLost + transferLost;
    return {
      success: amount - transferred - totalLost <= 0,
      transferred, transferredExpired, transferredValid: transferred - transferredExpired,
      expiredLost, transferLost,
      expiredSkipped, transferSkipped,
      remaining: Math.max(0, amount - transferred - totalLost),
    };
  }, [users]);

  const spendTokens = useCallback((userId, amount) => {
    let spent = 0;
    let expiredLost = 0;
    let transferLost = 0;
    setTokenBatches(prev => {
      const now = new Date();
      const sorted = prev
        .filter(b => b.userId === userId && b.remaining > 0)
        .sort((a, b) => {
          const aTransfer = a.fromChildTransfer ? 1 : 0;
          const bTransfer = b.fromChildTransfer ? 1 : 0;
          if (bTransfer - aTransfer !== 0) return bTransfer - aTransfer;
          return new Date(a.expiresAt) - new Date(b.expiresAt) || new Date(a.acquiredAt) - new Date(b.acquiredAt);
        });
      let rem = amount;
      const updates = [];
      for (const batch of sorted) {
        if (rem <= 0) break;
        const deduct = Math.min(rem, batch.remaining);
        rem -= deduct;
        updates.push({ batch, deduct });
        const isExpired = new Date(batch.expiresAt) <= now;
        if (isExpired) expiredLost += deduct;
        else if (batch.fromChildTransfer) transferLost += deduct;
        else spent += deduct;
      }
      return prev.map(b => {
        const upd = updates.find(u => u.batch.id === b.id);
        return upd ? { ...b, remaining: b.remaining - upd.deduct } : b;
      });
    });
    const totalLost = expiredLost + transferLost;
    return { success: amount - spent - totalLost <= 0, spent, expiredLost, transferLost, remaining: Math.max(0, amount - spent - totalLost) };
  }, []);

  const moveTokens = useCallback((fromUserId, toUserId, amount) => {
    const toUser = users.find(u => u.id === toUserId);
    const isToAdult = toUser?.role === 'adulto';
    const fromIsChild = users.find(u => u.id === fromUserId)?.role === 'menor';
    const expiryMode = isToAdult && fromIsChild ? 'transfer' : 'all';
    const result = transferTokens(fromUserId, toUserId, amount, expiryMode);
    return result.success;
  }, [transferTokens, users]);

  const moveLoyaltyPoints = useCallback((fromUserId, toUserId, amount) => {
    const current = loyaltyPoints[fromUserId] || 0;
    if (current < amount) return false;
    setLoyaltyPoints(prev => ({
      ...prev,
      [fromUserId]: (prev[fromUserId] || 0) - amount,
      [toUserId]: (prev[toUserId] || 0) + amount,
    }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId: fromUserId, amount: -amount, type: 'transfer_out', description: `Transferido a ${toUserId}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    const entryIn = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId: toUserId, amount, type: 'transfer_in', description: `Recibido de ${fromUserId}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entryIn]);
    return true;
  }, [loyaltyPoints]);

  const createTask = useCallback(({ title, description, childId, tokenReward, createdBy, expiresAt }) => {
    const reward = Number(tokenReward);
    const deductions = deductTokens(createdBy, reward);
    if (deductions.length === 0) return null;
    const taskId = String(Date.now());
    const task = {
      id: taskId,
      title,
      description,
      childId,
      createdBy,
      tokenReward: reward,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + TASK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      _tokenSource: deductions,
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

  const startTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId && t.status === 'pending' ? { ...t, status: 'in_progress', startedAt: new Date().toISOString() } : t
    ));
  }, []);

  const saveTaskPhoto = useCallback((taskId, photoUri) => {
    setTaskPhotos(prev => ({ ...prev, [taskId]: photoUri }));
  }, []);

  const completeTask = useCallback((taskId) => {
    let completedTask = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && (t.status === 'pending' || t.status === 'in_progress')) {
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
      const source = taskToApprove._tokenSource;
      if (source && source.length > 0) {
        const now = new Date();
        const newBatches = source.map(d => ({
          id: String(Date.now()) + String(Math.random()).slice(2, 8),
          userId: taskToApprove.childId,
          amount: d.amount,
          remaining: d.amount,
          source: 'task_reward',
          acquiredAt: now.toISOString(),
          expiresAt: d.expiresAt,
        }));
        setTokenBatches(prev => [...prev, ...newBatches]);
      } else {
        addTokens(taskToApprove.childId, taskToApprove.tokenReward, 'task_reward');
      }
    }
  }, [addTokens]);

  const rejectTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'rejected' } : t));
  }, []);

  const redoTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId && (t.status === 'completed' || t.status === 'rejected') ? { ...t, status: 'pending', completedAt: undefined, redoneAt: new Date().toISOString() } : t));
  }, []);

  const sendReminder = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, lastReminderAt: new Date().toISOString() } : t));
  }, []);

  const expireOverdueTasks = useCallback(() => {
    const now = new Date();
    const overdue = tasks.filter(t => t.status === 'pending' && new Date(t.expiresAt) <= now);
    if (overdue.length === 0) return;
    const newBatches = [];
    for (const task of overdue) {
      const source = task._tokenSource;
      if (source && source.length > 0) {
        for (const d of source) {
          if (new Date(d.expiresAt) <= now) continue;
          newBatches.push({
            id: String(Date.now()) + String(Math.random()).slice(2, 8),
            userId: task.createdBy,
            amount: d.amount,
            remaining: d.amount,
            source: 'expired_refund',
            acquiredAt: now.toISOString(),
            expiresAt: d.expiresAt,
          });
        }
      } else {
        addTokens(task.createdBy, task.tokenReward, 'expired_refund');
      }
    }
    if (newBatches.length > 0) setTokenBatches(prev => [...prev, ...newBatches]);
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

  const createAndSendSurprise = useCallback(({ title, description, childId, tokenReward, createdBy, icon, bgColor, expirationDate, bgImageUri, iconImageUri, forAll }) => {
    const surprise = {
      id: String(Date.now()),
      title, description, childId, createdBy,
      tokenReward: Number(tokenReward),
      icon: icon || 'gift',
      bgColor: bgColor || '#2D1B69',
      expirationDate: expirationDate || null,
      bgImageUri: bgImageUri || null,
      iconImageUri: iconImageUri || null,
      forAll: forAll || false,
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

  const getSurprisesForChild = useCallback((childId, tutorId) => {
    return surprises.filter(s => s.childId === childId || (s.forAll && s.createdBy === tutorId));
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
      return transferTokens(target.childId, target.createdBy, target.tokenReward, 'consume');
    }
    return null;
  }, [transferTokens]);

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

  const getPrizesForChild = useCallback((childId) => {
    const child = users.find(u => u.id === childId);
    if (!child?.tutorId) return [];
    return prizes
      .filter(p => p.createdBy === child.tutorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [users, prizes]);

  const redeemPrize = useCallback((childId, prizeId) => {
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) return { success: false, error: 'Premio no encontrado' };
    const child = users.find(u => u.id === childId);
    if (!child) return { success: false, error: 'Usuario no encontrado' };
    const result = spendTokens(childId, prize.tokenCost);
    if (!result.success) return { success: false, error: 'No tenés suficientes tokens' };
    incrementPrizeUsed(prizeId);
    return { ...result, success: true };
  }, [prizes, users, spendTokens, incrementPrizeUsed]);

  const createList = useCallback((name) => {
    const list = { id: String(Date.now()), name, items: [], completed: false, createdAt: new Date().toISOString() };
    setTodoLists(prev => [...prev, list]);
  }, []);

  const deleteList = useCallback((id) => {
    setTodoLists(prev => prev.filter(l => l.id !== id));
  }, []);

  const markListCompleted = useCallback((id) => {
    setTodoLists(prev => prev.map(l => l.id === id ? { ...l, completed: true } : l));
  }, []);

  const addListItem = useCallback((listId, text) => {
    setTodoLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: [...l.items, { id: String(Date.now()), text, checked: false }] } : l
    ));
  }, []);

  const toggleListItem = useCallback((listId, itemId) => {
    setTodoLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) } : l
    ));
  }, []);

  const deleteListItem = useCallback((listId, itemId) => {
    setTodoLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l
    ));
  }, []);

  const renameList = useCallback((id, name) => {
    setTodoLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const setScoreGoal = useCallback((monthKey, goal) => {
    if (goal === null || goal === undefined) {
      setScoreGoals(prev => {
        const next = { ...prev };
        delete next[monthKey];
        return next;
      });
    } else {
      setScoreGoals(prev => ({
        ...prev,
        [monthKey]: Number(goal),
      }));
    }
  }, []);

  const getScoreGoal = useCallback((monthKey) => {
    return scoreGoals[monthKey] ?? null;
  }, [scoreGoals]);

  return (
    <GlobalContext.Provider value={{
      loaded, users, setUsers, currentUser, login, register, registerChild, updatePhone, updatePassword, logout, getTutorName, getUserTokens, getChildren, addTokens, deductTokens, transferTokens, moveTokens, moveLoyaltyPoints,
      tokenBatches, spendTokens, tasks, createTask, getTasksForAdult, getTasksForChild, startTask, completeTask, approveTask, rejectTask, redoTask, sendReminder, saveTaskPhoto, taskPhotos,
      expireOverdueTasks, getPendingTaskTokens, getPendingTasksWithDetails, getPurchaseHistory,
      memberships, requestMembership, markPaymentSent, verifyMembership, getUserMembership, getPendingVerifications,
      invites, getReferralCode, getInvites, getTokensFromInvites,
      loyaltyPoints, getUserLoyaltyPoints, addLoyaltyEntry, getLoyaltyHistory,
      redeemPointsForMembership, redeemPointsForTokens, redeemTokensTiered,
      LOYALTY_RATES, REDEEM_MEMBERSHIP_POINTS, REDEEM_TOKEN_POINTS, TOKEN_REDEEM_OPTIONS,
      surprises, createAndSendSurprise, getSurprisesForAdult, getSurprisesForChild, openSurprise, claimSurprise,
      prizes, createPrize, deletePrize, getAdultPrizes, incrementPrizeUsed, getPrizesForChild, redeemPrize,
      todoLists, createList, deleteList, markListCompleted, addListItem, toggleListItem, deleteListItem, renameList,
      scoreGoals, setScoreGoal, getScoreGoal,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);