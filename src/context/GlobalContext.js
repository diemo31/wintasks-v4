import React, { createContext, useContext, useState, useCallback } from 'react';

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

const INITIAL_TOKENS = { '1': 200, '2': 50 };
const INITIAL_LOYALTY = { '1': 0, '2': 0 };
const INITIAL_TASKS = [];
const INITIAL_MEMBERSHIPS = {};
const INITIAL_INVITES = {};
const INITIAL_LOYALTY_HISTORY = [];

const LOYALTY_RATES = { taskApprove: 20, sorpresa: 10, invite: 50, membership1m: 50, membership3m: 170, membership6m: 360 };
const REDEEM_MEMBERSHIP_POINTS = 2500;
const REDEEM_TOKEN_POINTS = 5; // 1 token = 5 puntos

export function GlobalProvider({ children }) {
  const [users, setUsers] = useState(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [memberships, setMemberships] = useState(INITIAL_MEMBERSHIPS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [loyaltyPoints, setLoyaltyPoints] = useState(INITIAL_LOYALTY);
  const [loyaltyHistory, setLoyaltyHistory] = useState(INITIAL_LOYALTY_HISTORY);

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
    setTokens(prev => ({ ...prev, [newUser.id]: newUser.role === 'adulto' ? 100 : 0 }));
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
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const getTutorName = useCallback((tutorId) => {
    const tutor = users.find(u => u.id === tutorId);
    return tutor?.alias || 'Desconocido';
  }, [users]);

  const getUserTokens = useCallback((userId) => tokens[userId] || 0, [tokens]);

  const getChildren = useCallback((adultId) => {
    return users.filter(u => u.role === 'menor' && u.tutorId === adultId);
  }, [users]);

  const addTokens = useCallback((userId, amount) => {
    setTokens(prev => ({ ...prev, [userId]: (prev[userId] || 0) + amount }));
  }, []);

  const createTask = useCallback(({ title, description, childId, tokenReward, createdBy }) => {
    const task = {
      id: String(Date.now()),
      title,
      description,
      childId,
      createdBy,
      tokenReward: Number(tokenReward),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, task]);
    return task;
  }, []);

  const getTasksForAdult = useCallback((adultId) => {
    return tasks.filter(t => t.createdBy === adultId);
  }, [tasks]);

  const getTasksForChild = useCallback((childId) => {
    return tasks.filter(t => t.childId === childId);
  }, [tasks]);

  const completeTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
  }, []);

  const approveTask = useCallback((taskId) => {
    let taskToApprove = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.status === 'completed') {
        taskToApprove = t;
        return { ...t, status: 'approved' };
      }
      return t;
    }));
    if (taskToApprove) {
      const reward = taskToApprove.tokenReward;
      const adultId = taskToApprove.createdBy;
      const childId = taskToApprove.childId;
      setTokens(prev => ({
        ...prev,
        [adultId]: Math.max(0, (prev[adultId] || 0) - reward),
        [childId]: (prev[childId] || 0) + reward,
      }));
      addLoyaltyEntry(adultId, LOYALTY_RATES.taskApprove, 'earn_task', `Tarea "${taskToApprove.title}" aprobada`);
    }
  }, [addLoyaltyEntry]);

  const rejectTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'rejected' } : t));
  }, []);

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
    const tokens = Math.floor(puntos / REDEEM_TOKEN_POINTS);
    const puntosUsados = tokens * REDEEM_TOKEN_POINTS;
    setLoyaltyPoints(prev => ({ ...prev, [userId]: (prev[userId] || 0) - puntosUsados }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId, amount: -puntosUsados, type: 'redeem_tokens', description: `Canjeado por ${tokens} token${tokens > 1 ? 's' : ''}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    setTokens(prev => ({ ...prev, [userId]: (prev[userId] || 0) + tokens }));
    return { success: true, tokens, puntosUsados };
  }, [loyaltyPoints]);

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

  return (
    <GlobalContext.Provider value={{
      users, currentUser, login, register, updatePhone, updatePassword, logout, getTutorName, getUserTokens, getChildren, addTokens,
      tokens, setTokens, tasks, createTask, getTasksForAdult, getTasksForChild, completeTask, approveTask, rejectTask,
      memberships, requestMembership, markPaymentSent, verifyMembership, getUserMembership, getPendingVerifications,
      invites, getReferralCode, getInvites, getTokensFromInvites,
      loyaltyPoints, getUserLoyaltyPoints, addLoyaltyEntry, getLoyaltyHistory,
      redeemPointsForMembership, redeemPointsForTokens,
      LOYALTY_RATES, REDEEM_MEMBERSHIP_POINTS, REDEEM_TOKEN_POINTS,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);
