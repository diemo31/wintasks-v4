import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  const [tokenBatches, setTokenBatches] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memberships, setMemberships] = useState(INITIAL_MEMBERSHIPS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [loyaltyPoints, setLoyaltyPoints] = useState(INITIAL_LOYALTY);
  const [loyaltyHistory, setLoyaltyHistory] = useState(INITIAL_LOYALTY_HISTORY);
  const [surprises, setSurprises] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [todoLists, setTodoLists] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState({});
  const [scoreGoals, setScoreGoals] = useState({});
  const [redemptions, setRedemptions] = useState([]);
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
      if (me) {
        setCurrentUser(me);
        const gid = me.tutorId || me.id;
        supabase.from('score_goals').select('*').eq('user_id', gid).then(({ data: gd, error }) => {
          if (error) console.log('SCORE_GOAL_LOAD_ERR', error);
          else if (gd) setScoreGoals(Object.fromEntries(gd.map(g => [g.month_key, g.goal])));
        });
      }
    });
    supabase.from('tasks').select('*').then(({ data }) => {
      if (data) setTasks(data.map(t => ({
        id: t.id, title: t.title, description: t.description || '',
        childId: t.child_id, createdBy: t.created_by, tokenReward: t.token_reward,
        status: t.status, createdAt: t.created_at, completedAt: t.completed_at,
        approvedAt: t.approved_at, expiresAt: t.expires_at,
      })));
    });
    supabase.from('token_batches').select('*').then(({ data }) => {
      if (data) setTokenBatches(data.map(b => ({
        id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
        source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
        fromChildTransfer: b.from_child_transfer,
      })));
    });
    supabase.from('redemptions').select('*').then(({ data }) => {
      if (data) setRedemptions(data.map(r => ({
        id: r.id, childId: r.child_id, adultId: r.adult_id,
        type: r.type, title: r.title, tokenCost: r.token_cost,
        status: r.status, redemptionDetails: r.redemption_details,
        redeemedAt: r.redeemed_at, deliveredAt: r.delivered_at,
      })));
    });
    supabase.from('prizes').select('*').then(({ data }) => {
      if (data) setPrizes(data.map(p => ({
        id: p.id, title: p.title, description: p.description || '',
        tokenCost: p.token_cost, createdBy: p.created_by,
        usedCount: p.used_count, createdAt: p.created_at,
      })));
    });
    supabase.from('surprises').select('*').then(({ data }) => {
      if (data) setSurprises(data.map(s => ({
        id: s.id, title: s.title, description: s.description || '',
        childId: s.child_id, createdBy: s.created_by,
        tokenReward: s.token_reward, forAll: s.for_all,
        status: s.status, createdAt: s.created_at,
        expirationDate: s.expiration_date, icon: s.icon || 'gift',
        bgColor: s.bg_color || '#2D1B69',
        bgImageUri: s.bg_image_uri, iconImageUri: s.icon_image_uri,
        sentAt: s.sent_at,
      })));
    });
    supabase.from('loyalty_points').select('*').then(({ data }) => {
      if (data) {
        const obj = {};
        for (const lp of data) obj[lp.user_id] = lp.points;
        setLoyaltyPoints(obj);
      }
    });
    supabase.from('loyalty_history').select('*').then(({ data }) => {
      if (data) setLoyaltyHistory(data.map(h => ({
        id: h.id, userId: h.user_id, amount: h.amount,
        type: h.type, description: h.description || '',
        date: h.date,
      })));
    });
    supabase.from('memberships').select('*').then(({ data }) => {
      if (data) {
        const obj = {};
        for (const m of data) {
          obj[m.user_id] = {
            plan: m.plan, status: m.status, paymentStatus: m.payment_status,
            startDate: m.start_date, endDate: m.end_date,
            createdAt: m.created_at, paymentRef: m.payment_ref || '',
            amountUsd: m.amount_usd || 0, amountArs: m.amount_ars || 0,
            rate: m.rate || 0, userEmail: m.user_email || '',
            expiresAt: m.expires_at,
          };
        }
        setMemberships(obj);
      }
    });
    supabase.from('invites').select('*').then(({ data }) => {
      if (data) {
        const obj = {};
        for (const inv of data) {
          if (!obj[inv.user_id]) obj[inv.user_id] = [];
          obj[inv.user_id].push({
            id: inv.id, invitedUserId: inv.invited_user_id,
            invitedAlias: inv.invited_alias, invitedAt: inv.created_at,
          });
        }
        setInvites(obj);
      }
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
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { 
            display_name: `${nombre} ${apellido}`, 
            nombre, apellido, phone, alias, 
            role: isAdult ? 'adulto' : 'menor',
            fecha_nac: fechaNac,
            age: Number(age),
            ...(!isAdult && tutorCode ? { tutor_id: tutorCode } : {}),
        },
      },
    });
    if (error) return { success: false, errors: [error.message] };
    if (!data?.user) return { success: false, errors: ['Error al crear usuario'] };
    if (!data?.session) {
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
    }
    const userId = data.user.id;
    if (phone) {
      await supabase.auth.updateUser({ phone }).catch(e => console.warn('updateUser phone falló', e?.message));
    }
    try { await supabase.rpc('set_user_phone', { user_id: userId, phone_number: phone }); } catch (e) { console.warn('set_user_phone falló', e.message); }
    const newUser = { id: userId, nombre, apellido, email, alias, phone, age: Number(age), fechaNac, role: isAdult ? 'adulto' : 'menor', ...(isAdult ? {} : { tutorId: tutorCode || null }) };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    if (newUser.role === 'adulto') {
      await addTokens(newUser.id, SIGNUP_TOKEN_BONUS, 'signup');
      const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
      const membership = { plan: '6meses', startDate: new Date().toISOString(), endDate, status: 'active', paymentRef: 'GRATIS-6M', amountUsd: 0, amountArs: 0, rate: 0, createdAt: new Date().toISOString(), expiresAt: endDate, userEmail: email || '' };
      setMemberships(prev => ({ ...prev, [newUser.id]: membership }));
      supabase.from('memberships').upsert({ user_id: newUser.id, plan: '6meses', status: 'active', payment_status: 'verified', payment_ref: 'GRATIS-6M', start_date: new Date().toISOString(), end_date: endDate, created_at: new Date().toISOString(), expires_at: endDate, user_email: email || '' }, { onConflict: 'user_id' }).catch(() => {});
    }
    if (referralCode && isAdult) {
      const { data: refData } = await supabase.rpc('lookup_profile', { search_text: referralCode }).catch(() => ({}));
      const inviter = refData?.[0] && refData[0].user_id !== newUser.id ? refData[0] : null;
      if (inviter) {
        const inviterNewPoints = (loyaltyPoints[inviter.user_id] || 0) + 50;
        setLoyaltyPoints(prev => ({ ...prev, [inviter.user_id]: inviterNewPoints }));
        setInvites(prev => ({ ...prev, [inviter.user_id]: [...(prev[inviter.user_id] || []), { invitedUserId: newUser.id, invitedAlias: alias, invitedAt: new Date().toISOString() }] }));
        supabase.from('loyalty_points').upsert({ user_id: inviter.user_id, points: inviterNewPoints }, { onConflict: 'user_id' }).catch(() => {});
        supabase.from('invites').insert({ user_id: inviter.user_id, invited_user_id: newUser.id, invited_alias: alias, created_at: new Date().toISOString() }).catch(() => {});
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const refMembership = { plan: '1mes', startDate: new Date().toISOString(), endDate, status: 'active', paymentRef: `REF-${newUser.id.slice(-4)}`, amountUsd: 0, amountArs: 0, rate: 0, createdAt: new Date().toISOString(), expiresAt: endDate, userEmail: email || '' };
        setMemberships(prev => ({ ...prev, [newUser.id]: refMembership }));
        supabase.from('memberships').upsert({ user_id: newUser.id, plan: '1mes', status: 'active', payment_status: 'verified', payment_ref: `REF-${newUser.id.slice(-4)}`, start_date: new Date().toISOString(), end_date: endDate, created_at: new Date().toISOString(), expires_at: endDate, user_email: email || '' }, { onConflict: 'user_id' }).catch(() => {});
      }
    }
    return { success: true, user: newUser };
  }, [users, addTokens, loyaltyPoints]);

  const registerChild = useCallback(async ({ nombre, apellido, email, alias, phone, age, fechaNac, password }) => {
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) return { success: false, errors: passwordErrors };
    const { data: { session: adultSession } } = await supabase.auth.getSession();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { 
            display_name: `${nombre} ${apellido}`, 
            nombre, apellido, phone, alias, 
            role: 'menor',
            fecha_nac: fechaNac,
            age: Number(age),
            ...(currentUser?.id ? { tutor_id: currentUser.id } : {}),
        },
      },
    });
    if (error) return { success: false, errors: [error.message] };
    if (!data?.user) return { success: false, errors: ['Error al crear usuario'] };
    const userId = data.user.id;
    if (phone) {
      if (!data?.session) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
      }
      await supabase.auth.updateUser({ phone }).catch(e => console.warn('updateUser phone falló', e?.message));
      try { await supabase.rpc('set_user_phone', { user_id: userId, phone_number: phone }); } catch (e) { console.warn('set_user_phone falló', e.message); }
    }
    if (adultSession) {
      await supabase.auth.setSession({ access_token: adultSession.access_token, refresh_token: adultSession.refresh_token }).catch(() => {});
    }
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

  const addTokens = useCallback(async (userId, amount, source = 'generic', expiresAt) => {
    let exp = expiresAt;
    if (typeof exp === 'number') exp = new Date(Date.now() + exp * 30 * 24 * 60 * 60 * 1000).toISOString();
    if (!exp) exp = new Date(Date.now() + EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc('add_tokens', {
      p_user_id: userId, p_amount: amount, p_source: source, p_expires_at: exp,
    });
    if (error || !data) return null;
    const batch = { id: data, userId, amount, remaining: amount, source, acquiredAt: new Date().toISOString(), expiresAt: exp };
    setTokenBatches(prev => [...prev, batch]);
    return batch;
  }, []);

  const deductTokens = useCallback(async (userId, amount) => {
    const { data: batches } = await supabase.from('token_batches')
      .select('id, remaining, expires_at')
      .eq('user_id', userId)
      .gt('remaining', 0)
      .gt('expires_at', new Date().toISOString())
      .eq('from_child_transfer', false)
      .order('expires_at', { ascending: true })
      .order('acquired_at', { ascending: true });
    if (!batches) return [];
    let rem = amount;
    const deductions = [];
    for (const b of batches) {
      if (rem <= 0) break;
      const take = Math.min(rem, b.remaining);
      rem -= take;
      deductions.push({ batchId: b.id, amount: take, expiresAt: b.expires_at });
      await supabase.from('token_batches').update({ remaining: b.remaining - take }).eq('id', b.id);
    }
    if (rem > 0) return [];
    const newBatches = tokenBatches.map(tb => {
      const d = deductions.find(dd => dd.batchId === tb.id);
      return d ? { ...tb, remaining: tb.remaining - d.amount } : tb;
    });
    setTokenBatches(newBatches);
    return deductions;
  }, [tokenBatches]);

  const transferTokens = useCallback(async (fromUserId, toUserId, amount, expiryMode = 'transfer', lockTokens = false, source = 'transfer') => {
    const { data, error } = await supabase.rpc('transfer_tokens', {
      p_from_user_id: fromUserId, p_to_user_id: toUserId,
      p_amount: amount, p_expiry_mode: expiryMode, p_lock_tokens: lockTokens, p_source: source,
    });
    if (error || !data) return { success: false, transferred: 0, expiredLost: 0, transferLost: 0, expiredSkipped: 0, transferSkipped: 0, remaining: amount };
    const { data: fresh } = await supabase.from('token_batches').select('*');
    if (fresh) setTokenBatches(fresh.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
    return {
      success: data.success, transferred: data.transferred || 0,
      transferredExpired: 0, transferredValid: data.transferred || 0,
      expiredLost: data.expired_lost || 0, transferLost: data.transfer_lost || 0,
      expiredSkipped: data.expired_skipped || 0, transferSkipped: data.transfer_skipped || 0,
      remaining: data.remaining || 0,
    };
  }, []);

  const spendTokens = useCallback(async (userId, amount) => {
    const { data, error } = await supabase.rpc('spend_tokens', { p_user_id: userId, p_amount: amount });
    if (error || !data) return { success: false, spent: 0, expiredLost: 0, transferLost: 0, remaining: amount };
    const { data: fresh } = await supabase.from('token_batches').select('*');
    if (fresh) setTokenBatches(fresh.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
    return { success: data.success, spent: data.spent || 0, expiredLost: data.expired_lost || 0, transferLost: data.transfer_lost || 0, remaining: data.remaining || 0 };
  }, []);

  const moveTokens = useCallback(async (fromUserId, toUserId, amount) => {
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);
    const isFromAdult = fromUser?.role === 'adulto';
    const isToChild = toUser?.role === 'menor';
    if (isFromAdult && isToChild && fromUserId !== toUser?.tutorId) return false;
    const isToAdult = toUser?.role === 'adulto';
    const fromIsChild = fromUser?.role === 'menor';
    const expiryMode = isToAdult && (fromIsChild || isFromAdult) ? 'transfer' : 'all';
    const result = await transferTokens(fromUserId, toUserId, amount, expiryMode);
    return result.success;
  }, [transferTokens, users]);

  const moveLoyaltyPoints = useCallback((fromUserId, toUserId, amount) => {
    const current = loyaltyPoints[fromUserId] || 0;
    if (current < amount) return false;
    const fromNew = (loyaltyPoints[fromUserId] || 0) - amount;
    const toNew = (loyaltyPoints[toUserId] || 0) + amount;
    setLoyaltyPoints(prev => ({
      ...prev,
      [fromUserId]: fromNew,
      [toUserId]: toNew,
    }));
    const entry = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId: fromUserId, amount: -amount, type: 'transfer_out', description: `Transferido a ${toUserId}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entry]);
    const entryIn = { id: String(Date.now()) + String(Math.random()).slice(2, 8), userId: toUserId, amount, type: 'transfer_in', description: `Recibido de ${fromUserId}`, date: new Date().toISOString() };
    setLoyaltyHistory(prev => [...prev, entryIn]);
    supabase.from('loyalty_points').upsert({ user_id: fromUserId, points: fromNew }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_points').upsert({ user_id: toUserId, points: toNew }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_history').insert([
      { user_id: fromUserId, amount: -amount, type: 'transfer_out', description: `Transferido a ${toUserId}`, date: new Date().toISOString() },
      { user_id: toUserId, amount, type: 'transfer_in', description: `Recibido de ${fromUserId}`, date: new Date().toISOString() },
    ]).catch(() => {});
    return true;
  }, [loyaltyPoints]);

  const createTask = useCallback(async ({ title, description, childId, tokenReward, createdBy, expiresAt }) => {
    const reward = Number(tokenReward);
    const exp = expiresAt || new Date(Date.now() + TASK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc('create_task', {
      p_title: title, p_description: description || '', p_child_id: childId,
      p_created_by: createdBy, p_token_reward: reward, p_expires_at: exp,
    });
    if (error || !data) return null;
    const task = {
      id: data.id, title, description: description || '', childId, createdBy,
      tokenReward: reward, status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: exp,
    };
    setTasks(prev => [...prev, task]);
    const { data: fresh } = await supabase.from('token_batches').select('*');
    if (fresh) setTokenBatches(fresh.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
    return task;
  }, []);

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

  const completeTask = useCallback(async (taskId, childId) => {
    const { error } = await supabase.rpc('complete_task', { p_task_id: taskId, p_child_id: childId });
    if (error) return;
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t));
    if (task) {
      addLoyaltyEntry(task.createdBy, TASK_COMPLETE_POINTS, 'earn_task', `Tarea "${task.title}" completada`);
    }
  }, [addLoyaltyEntry, tasks]);

  const approveTask = useCallback(async (taskId, adultId) => {
    const { data, error } = await supabase.rpc('approve_task', { p_task_id: taskId, p_adult_id: adultId });
    if (error || !data?.success) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'approved', approvedAt: new Date().toISOString() } : t));
    const { data: fresh } = await supabase.from('token_batches').select('*');
    if (fresh) setTokenBatches(fresh.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
  }, []);

  const rejectTask = useCallback(async (taskId, adultId) => {
    await supabase.rpc('reject_task', { p_task_id: taskId, p_adult_id: adultId });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'rejected' } : t));
  }, []);

  const redoTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId && (t.status === 'completed' || t.status === 'rejected') ? { ...t, status: 'pending', completedAt: undefined, redoneAt: new Date().toISOString() } : t));
  }, []);

  const sendReminder = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, lastReminderAt: new Date().toISOString() } : t));
  }, []);

  const expireOverdueTasks = useCallback(async () => {
    const { data: count } = await supabase.rpc('expire_overdue_tasks');
    if (count > 0) {
      const { data: freshTasks } = await supabase.from('tasks').select('*');
      if (freshTasks) setTasks(freshTasks.map(t => ({
        id: t.id, title: t.title, description: t.description || '',
        childId: t.child_id, createdBy: t.created_by, tokenReward: t.token_reward,
        status: t.status, createdAt: t.created_at, completedAt: t.completed_at,
        approvedAt: t.approved_at, expiresAt: t.expires_at,
      })));
      const { data: freshBatches } = await supabase.from('token_batches').select('*');
      if (freshBatches) setTokenBatches(freshBatches.map(b => ({
        id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
        source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
        fromChildTransfer: b.from_child_transfer,
      })));
    }
  }, []);

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
    const existing = memberships[userId]?.status === 'active' ? memberships[userId] : null;
    let baseDate;
    if (existing?.endDate) {
      baseDate = new Date(existing.endDate);
    } else {
      baseDate = new Date();
    }
    const endDate = new Date(baseDate.getTime() + planMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const membership = {
      plan, startDate: null, endDate,
      status: 'pending', paymentRef: ref,
      amountUsd, amountArs, rate,
      createdAt: now.toISOString(), expiresAt,
      userEmail: user?.email || '',
    };
    setMemberships(prev => ({ ...prev, [userId]: membership }));
    supabase.from('memberships').upsert({
      user_id: userId, plan, status: 'pending', payment_status: 'pending',
      payment_ref: ref, start_date: null, end_date: endDate,
      amount_usd: amountUsd, amount_ars: amountArs, rate,
      created_at: now.toISOString(), expires_at: expiresAt,
      user_email: user?.email || '',
    }, { onConflict: 'user_id' }).catch(() => {});
    return ref;
  }, [users, memberships]);

  const markPaymentSent = useCallback((userId) => {
    setMemberships(prev => {
      const m = prev[userId];
      if (!m || m.status !== 'pending') return prev;
      const now = new Date();
      if (now > new Date(m.expiresAt)) {
        supabase.from('memberships').update({ status: 'expired' }).eq('user_id', userId).catch(() => {});
        return { ...prev, [userId]: { ...m, status: 'expired' } };
      }
      supabase.from('memberships').update({ status: 'waiting_verification', payment_status: 'sent' }).eq('user_id', userId).catch(() => {});
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
      supabase.from('memberships').update({ status: 'active', payment_status: 'verified', start_date: new Date().toISOString() }).eq('user_id', userId).catch(() => {});
      return { ...prev, [userId]: { ...m, status: 'active', startDate: new Date().toISOString() } };
    });
    if (awarded) {
      addLoyaltyEntry(userId, awarded.points, 'earn_membership', `Membresía ${awarded.plan} pagada`);
    }
  }, [addLoyaltyEntry]);

  const redeemPointsForMembership = useCallback((userId) => {
    const current = loyaltyPoints[userId] || 0;
    if (current < REDEEM_MEMBERSHIP_POINTS) return { success: false, error: 'No tenés suficientes puntos WinTasks. Necesitás 2500.' };
    const newPoints = (loyaltyPoints[userId] || 0) - REDEEM_MEMBERSHIP_POINTS;
    setLoyaltyPoints(prev => ({ ...prev, [userId]: newPoints }));
    supabase.from('loyalty_points').upsert({ user_id: userId, points: newPoints }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_history').insert({ user_id: userId, amount: -REDEEM_MEMBERSHIP_POINTS, type: 'redeem_membership', description: 'Canjeado por 1 mes de membresía', date: new Date().toISOString() }).catch(() => {});
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
      const membership = {
        plan: '1mes', startDate: new Date().toISOString(), endDate: newEndDate.toISOString(),
        status: 'active', paymentRef: `CANJE-${userId.slice(-4)}-${Date.now().toString().slice(-5)}`,
        amountUsd: 0, amountArs: 0, rate: 0,
        createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), userEmail: '',
      };
      supabase.from('memberships').upsert({ user_id: userId, plan: '1mes', status: 'active', payment_status: 'verified', payment_ref: membership.paymentRef, start_date: membership.startDate, end_date: membership.endDate, created_at: membership.createdAt }, { onConflict: 'user_id' }).catch(() => {});
      return { ...prev, [userId]: membership };
    });
    return { success: true };
  }, [loyaltyPoints]);

  const redeemPointsForTokens = useCallback((userId, puntos) => {
    const current = loyaltyPoints[userId] || 0;
    if (puntos < REDEEM_TOKEN_POINTS) return { success: false, error: `Mínimo ${REDEEM_TOKEN_POINTS} puntos para canjear.` };
    if (current < puntos) return { success: false, error: 'No tenés suficientes puntos WinTasks.' };
    const tok = Math.floor(puntos / REDEEM_TOKEN_POINTS);
    const puntosUsados = tok * REDEEM_TOKEN_POINTS;
    const newPoints = (loyaltyPoints[userId] || 0) - puntosUsados;
    setLoyaltyPoints(prev => ({ ...prev, [userId]: newPoints }));
    supabase.from('loyalty_points').upsert({ user_id: userId, points: newPoints }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_history').insert({ user_id: userId, amount: -puntosUsados, type: 'redeem_tokens', description: `Canjeado por ${tok} token${tok > 1 ? 's' : ''}`, date: new Date().toISOString() }).catch(() => {});
    addTokens(userId, tok, 'redeem');
    return { success: true, tokens: tok, puntosUsados };
  }, [loyaltyPoints, addTokens]);

  const redeemTokensTiered = useCallback((userId, optionIndex) => {
    const option = TOKEN_REDEEM_OPTIONS[optionIndex];
    if (!option) return { success: false, error: 'Opción inválida.' };
    const current = loyaltyPoints[userId] || 0;
    if (current < option.points) return { success: false, error: `Necesitás ${option.points} puntos. Tenés ${current}.` };
    const newPoints = (loyaltyPoints[userId] || 0) - option.points;
    setLoyaltyPoints(prev => ({ ...prev, [userId]: newPoints }));
    supabase.from('loyalty_points').upsert({ user_id: userId, points: newPoints }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_history').insert({ user_id: userId, amount: -option.points, type: 'redeem_tokens', description: `Canjeado por ${option.tokens} tokens`, date: new Date().toISOString() }).catch(() => {});
    addTokens(userId, option.tokens, 'redeem');
    return { success: true, tokens: option.tokens };
  }, [loyaltyPoints, addTokens]);

  const getUserMembership = useCallback((userId) => {
    const m = memberships[userId];
    if (!m) return null;
    if (m.status === 'pending' && new Date() > new Date(m.expiresAt)) {
      setMemberships(prev => ({ ...prev, [userId]: { ...prev[userId], status: 'expired' } }));
      supabase.from('memberships').update({ status: 'expired' }).eq('user_id', userId).catch(() => {});
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
    supabase.from('loyalty_points').upsert({ user_id: userId, points: (loyaltyPoints[userId] || 0) + amount }, { onConflict: 'user_id' }).catch(() => {});
    supabase.from('loyalty_history').insert({ user_id: userId, amount, type, description, date: new Date().toISOString() }).catch(() => {});
    return entry;
  }, [loyaltyPoints]);

  const createAndSendSurprise = useCallback(async ({ title, description, childId, tokenReward, createdBy, icon, bgColor, expirationDate, bgImageUri, iconImageUri, forAll }) => {
    const { data, error } = await supabase.from('surprises').insert({
      title, description: description || '', child_id: childId, created_by: createdBy,
      token_reward: Number(tokenReward), for_all: forAll || false,
      expiration_date: expirationDate || null, icon: icon || 'gift',
      bg_color: bgColor || '#2D1B69', bg_image_uri: bgImageUri || null,
      icon_image_uri: iconImageUri || null,
      status: 'sent', sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }).select().single();
    if (error || !data) return null;
    const surprise = {
      id: data.id, title, description: description || '', childId, createdBy,
      tokenReward: Number(tokenReward), icon: icon || 'gift',
      bgColor: bgColor || '#2D1B69', bgImageUri: bgImageUri || null,
      iconImageUri: iconImageUri || null, forAll: forAll || false,
      status: 'sent', createdAt: data.created_at,
      sentAt: data.sent_at, expirationDate: expirationDate || null,
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

  const openSurprise = useCallback(async (surpriseId) => {
    await supabase.from('surprises').update({ status: 'opened' }).eq('id', surpriseId).eq('status', 'sent');
    setSurprises(prev => prev.map(s => s.id === surpriseId ? { ...s, status: 'opened' } : s));
  }, []);

  const claimSurprise = useCallback(async (surpriseId) => {
    const { data, error } = await supabase.rpc('claim_surprise', { p_surprise_id: surpriseId });
    setSurprises(prev => prev.map(s => s.id === surpriseId ? { ...s, status: 'claimed' } : s));
    const { data: freshR } = await supabase.from('redemptions').select('*');
    if (freshR) setRedemptions(freshR.map(r => ({
      id: r.id, childId: r.child_id, adultId: r.adult_id,
      type: r.type, title: r.title, tokenCost: r.token_cost,
      status: r.status, redemptionDetails: r.redemption_details,
      redeemedAt: r.redeemed_at, deliveredAt: r.delivered_at,
    })));
    const { data: freshB } = await supabase.from('token_batches').select('*');
    if (freshB) setTokenBatches(freshB.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
    if (error || !data?.success) return { success: false, error: data?.error || 'Error al canjear' };
    return { success: true, ...data };
  }, []);

  const createPrize = useCallback(async ({ title, description, tokenCost, createdBy }) => {
    const { error } = await supabase.rpc('create_prize', {
      p_title: title, p_description: description || '', p_token_cost: Number(tokenCost), p_created_by: createdBy,
    });
    if (error) return null;
    const { data } = await supabase.from('prizes').select('*');
    if (data) setPrizes(data.map(p => ({
      id: p.id, title: p.title, description: p.description || '',
      tokenCost: p.token_cost, createdBy: p.created_by,
      usedCount: p.used_count, createdAt: p.created_at,
    })));
    return data?.find(p => p.created_by === createdBy);
  }, []);

  const deletePrize = useCallback(async (prizeId) => {
    await supabase.rpc('delete_prize', { p_prize_id: prizeId, p_user_id: currentUser?.id });
    const { data } = await supabase.from('prizes').select('*');
    if (data) setPrizes(data.map(p => ({
      id: p.id, title: p.title, description: p.description || '',
      tokenCost: p.token_cost, createdBy: p.created_by,
      usedCount: p.used_count, createdAt: p.created_at,
    })));
  }, [currentUser]);

  const getAdultPrizes = useCallback((adultId) => {
    return prizes
      .filter(p => p.createdBy === adultId)
      .sort((a, b) => b.usedCount - a.usedCount || new Date(b.createdAt) - new Date(a.createdAt));
  }, [prizes]);

  const incrementPrizeUsed = useCallback(async (prizeId) => {
    await supabase.rpc('increment_prize_used', { p_prize_id: prizeId });
  }, []);

  const getPrizesForChild = useCallback((childId) => {
    const child = users.find(u => u.id === childId);
    if (!child?.tutorId) return [];
    return prizes
      .filter(p => p.createdBy === child.tutorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [users, prizes]);

  const redeemPrize = useCallback(async (childId, prizeId) => {
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) return { success: false, error: 'Premio no encontrado' };
    const child = users.find(u => u.id === childId);
    if (!child) return { success: false, error: 'Usuario no encontrado' };
    const tutorId = child.tutorId;
    if (!tutorId) return { success: false, error: 'No tiene tutor asignado' };
    const { data, error } = await supabase.rpc('create_redemption', {
      p_child_id: childId, p_adult_id: tutorId,
      p_type: 'prize', p_title: prize.title, p_token_cost: prize.tokenCost,
    });
    const { data: fresh } = await supabase.from('redemptions').select('*');
    if (fresh) setRedemptions(fresh.map(r => ({
      id: r.id, childId: r.child_id, adultId: r.adult_id,
      type: r.type, title: r.title, tokenCost: r.token_cost,
      status: r.status, redemptionDetails: r.redemption_details,
      redeemedAt: r.redeemed_at, deliveredAt: r.delivered_at,
    })));
    if (error || !data?.success) return { success: false, error: data?.error || 'No tenés suficientes tokens' };
    await incrementPrizeUsed(prizeId);
    return { success: true, ...data };
  }, [prizes, users, incrementPrizeUsed]);

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

  const deliverRedemption = useCallback(async (redemptionId) => {
    const { data, error } = await supabase.rpc('deliver_redemption', { p_redemption_id: redemptionId });
    const { data: fresh } = await supabase.from('redemptions').select('*');
    if (fresh) setRedemptions(fresh.map(r => ({
      id: r.id, childId: r.child_id, adultId: r.adult_id,
      type: r.type, title: r.title, tokenCost: r.token_cost,
      status: r.status, redemptionDetails: r.redemption_details,
      redeemedAt: r.redeemed_at, deliveredAt: r.delivered_at,
    })));
    const { data: batches } = await supabase.from('token_batches').select('*');
    if (batches) setTokenBatches(batches.map(b => ({
      id: b.id, userId: b.user_id, amount: b.amount, remaining: b.remaining,
      source: b.source, acquiredAt: b.acquired_at, expiresAt: b.expires_at,
      fromChildTransfer: b.from_child_transfer,
    })));
    if (error || !data?.success) return { success: false, error: data?.error || 'Error al entregar' };
    return { success: true, ...data };
  }, []);

  const getRedemptionsForAdult = useCallback((adultId) => {
    return redemptions.filter(r => r.adultId === adultId).sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
  }, [redemptions]);

  const getRedemptionsForChild = useCallback((childId) => {
    return redemptions.filter(r => r.childId === childId).sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
  }, [redemptions]);

  const setScoreGoal = useCallback((monthKey, goal) => {
    const userId = currentUser?.id;
    if (!userId) return;
    if (goal === null || goal === undefined) {
      setScoreGoals(prev => { const next = { ...prev }; delete next[monthKey]; return next; });
      supabase.from('score_goals').delete().eq('user_id', userId).eq('month_key', monthKey).then(({ error }) => error && console.log('SCORE_GOAL_DEL_ERR', error));
    } else {
      setScoreGoals(prev => ({ ...prev, [monthKey]: Number(goal) }));
      supabase.from('score_goals').upsert({ user_id: userId, month_key: monthKey, goal: Number(goal) }, { onConflict: 'user_id,month_key' }).then(({ error }) => error && console.log('SCORE_GOAL_UPSERT_ERR', error));
    }
  }, [currentUser]);

  const getScoreGoal = useCallback((monthKey) => {
    return scoreGoals[monthKey] ?? null;
  }, [scoreGoals]);

  const refreshData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) loadProfiles(session);
  }, []);

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
      redemptions, deliverRedemption, getRedemptionsForAdult, getRedemptionsForChild,
      todoLists, createList, deleteList, markListCompleted, addListItem, toggleListItem, deleteListItem, renameList,
      scoreGoals, setScoreGoal, getScoreGoal, refreshData,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);