import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, TextInput,
  Animated, Easing, Modal, Platform, KeyboardAvoidingView,
  RefreshControl, Switch, Pressable, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  SafeAreaProvider, SafeAreaView, useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo,
} from 'react';

const Tab = createBottomTabNavigator();
const { width: SW, height: SH } = Dimensions.get('window');
const IS_SMALL = SW < 380;

// ─── DESIGN SYSTEM ──────────────────────────────────────
const C = {
  bg:         '#020617',
  bgSoft:     '#070f1f',
  surface:    '#0d1f35',
  surface2:   '#152a47',
  card:       '#102747',
  cardLight:  '#172f52',
  border:     '#1e3a5f',
  borderSoft: '#162a47',
  accent:     '#38bdf8',
  accentBright:'#7dd3fc',
  accentDeep: '#0284c7',
  accentDim:  '#0ea5e9',
  teal:       '#2dd4bf',
  emerald:    '#10b981',
  gold:       '#fbbf24',
  amber:      '#f59e0b',
  warn:       '#fb923c',
  danger:     '#f87171',
  rose:       '#fb7185',
  purple:     '#a78bfa',
  white:      '#ffffff',
  text:       '#e2e8f0',
  textSoft:   '#cbd5e1',
  muted:      '#64748b',
  mutedDim:   '#475569',
  success:    '#22c55e',
};

const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  android: { elevation: 6 },
  default: {},
});

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// ─── TYPES ─────────────────────────────────────────────
type Notif = {
  id: string;
  type: 'reminder' | 'tip' | 'alert' | 'achievement' | 'streak';
  title: string;
  body: string;
  time: number;
  read: boolean;
  emoji: string;
};

type Profile = {
  name: string;
  household: number;
  units: 'gal' | 'L';
  goal: number;
  remindersEnabled: boolean;
  tipsEnabled: boolean;
  alertsEnabled: boolean;
  onboarded: boolean;
};

const DEFAULT_PROFILE: Profile = {
  name: '',
  household: 1,
  units: 'gal',
  goal: 80,
  remindersEnabled: true,
  tipsEnabled: true,
  alertsEnabled: true,
  onboarded: false,
};

// ─── UNITS ─────────────────────────────────────────────
const galToL = (g: number) => g * 3.78541;
const fmtVol = (gallons: number, units: 'gal' | 'L', digits = 1) =>
  units === 'gal'
    ? `${gallons.toFixed(digits)} gal`
    : `${galToL(gallons).toFixed(digits)} L`;

// ─── GROQ HELPER ────────────────────────────────────────
async function askGroq(system: string, user: string): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 600,
      }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content ?? 'No response.';
  } catch {
    return 'Could not reach the briefing service. Try again later.';
  }
}

// ─── MARKDOWN RENDERER ──────────────────────────────────
function MD({ text, style }: { text: string; style?: any }) {
  return (
    <View>
      {text.split('\n').map((line, i) => {
        const bold = line.replace(/\*\*(.*?)\*\*/g, '$1');
        const isBullet = /^[-*•]\s/.test(line);
        const isHeader = /^#+\s/.test(line);
        const clean = bold.replace(/^[-*•#]+\s/, '');
        return (
          <Text key={i} style={[{
            fontSize: 14, lineHeight: 22,
            fontWeight: isHeader ? '700' : '400',
            color: isHeader ? C.accent : C.text,
            marginBottom: line === '' ? 6 : 1,
            paddingLeft: isBullet ? 8 : 0,
          }, style]}>
            {isBullet ? `• ${clean}` : clean}
          </Text>
        );
      })}
    </View>
  );
}

// ─── GRADIENT BG (SVG) ─────────────────────────────────
function GradientBg({
  height = 280, fromColor = C.accentDim, toColor = C.bg, opacity = 0.5,
}: { height?: number; fromColor?: string; toColor?: string; opacity?: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }} pointerEvents="none">
      <Svg width="100%" height={height}>
        <Defs>
          <SvgGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fromColor} stopOpacity={opacity} />
            <Stop offset="1" stopColor={toColor} stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="g2" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.purple} stopOpacity="0.12" />
            <Stop offset="1" stopColor={C.bg} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g1)" />
        <Rect width="100%" height="100%" fill="url(#g2)" />
        <Circle cx={SW * 0.85} cy={40} r={70} fill={C.accent} opacity={0.07} />
        <Circle cx={SW * 0.15} cy={140} r={90} fill={C.teal} opacity={0.05} />
      </Svg>
    </View>
  );
}

// ─── ANIMATED PRESSABLE ────────────────────────────────
function Press({ children, onPress, style, disabled }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── WATER RING (SVG, smooth) ──────────────────────────
function WaterRing({ pct, size = 150, color = C.accent }: { pct: number; size?: number; color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [animVal, setAnimVal] = useState(0);
  useEffect(() => {
    const id = anim.addListener(v => setAnimVal(v.value));
    Animated.timing(anim, { toValue: pct, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [pct]);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - Math.min(animVal, 100) / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={C.teal} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ringGrad)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dash}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: C.white, fontSize: size * 0.22, fontWeight: '800' }}>{Math.round(pct)}%</Text>
        <Text style={{ color: C.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '600' }}>OF GOAL</Text>
      </View>
    </View>
  );
}

// ─── BADGES ────────────────────────────────────────────
const BADGES = [
  { id: 'first_log', icon: '💧', name: 'First Drop', desc: 'Logged your first activity' },
  { id: 'under_50', icon: '🌿', name: 'Eco Warrior', desc: 'Under 50 gal in a day' },
  { id: 'streak_3', icon: '🔥', name: 'On Fire', desc: '3-day streak' },
  { id: 'streak_7', icon: '⚡', name: 'Hydro Hero', desc: '7-day streak' },
  { id: 'streak_30', icon: '👑', name: 'Water Royalty', desc: '30-day streak' },
  { id: 'saver', icon: '💰', name: 'Big Saver', desc: 'Saved 500+ gal vs avg' },
  { id: 'sharer', icon: '🌍', name: 'Ambassador', desc: 'Shared the app' },
  { id: 'goal_set', icon: '🎯', name: 'Focused', desc: 'Set a custom daily goal' },
  { id: 'level_5', icon: '⭐', name: 'Rising Tide', desc: 'Reached level 5' },
];

const xpToLevel = (xp: number) => ({ level: Math.floor(xp / 100) + 1, progress: xp % 100 });

// ─── NOTIFICATIONS ─────────────────────────────────────
const TIPS = [
  { e: '🚿', t: 'Shorten Your Shower', b: 'Cutting just 2 minutes saves ~5 gallons. Try a shower playlist that ends at the right time.' },
  { e: '🪥', t: 'Turn Off the Tap', b: 'Brushing with the tap off saves up to 8 gallons every day.' },
  { e: '🌱', t: 'Water at Dawn or Dusk', b: 'Watering plants in cool hours cuts evaporation by up to 30%.' },
  { e: '🚽', t: 'Brick in the Tank', b: 'Place a sealed bottle in your toilet tank to displace water — save 0.5 gal/flush.' },
  { e: '🍽️', t: 'Skip Pre-Rinsing', b: 'Modern dishwashers don\'t need rinsed plates. Skip it to save 6,000 gal/year.' },
  { e: '🥬', t: 'Save Veggie Water', b: 'Reuse pasta or veggie water (cooled) to water houseplants.' },
  { e: '🚰', t: 'Fix That Drip', b: 'A leaky faucet wastes 3,000+ gallons a year. A free wrench tightening fixes most.' },
  { e: '🏊', t: 'Cover Your Pool', b: 'A pool cover cuts evaporation in half — that\'s thousands of gallons saved monthly.' },
  { e: '🧊', t: 'Reuse Ice', b: 'Drop unused ice cubes into plants instead of the sink.' },
  { e: '🌧️', t: 'Capture Rainwater', b: 'A 55-gal barrel under a downspout fills in a single storm.' },
];

async function getNotifs(): Promise<Notif[]> {
  return JSON.parse(await AsyncStorage.getItem('notifs') || '[]');
}

async function saveNotifs(n: Notif[]) {
  await AsyncStorage.setItem('notifs', JSON.stringify(n));
}

async function addNotif(n: Omit<Notif, 'id' | 'time' | 'read'>) {
  const list = await getNotifs();
  const newN: Notif = { ...n, id: Math.random().toString(36).slice(2), time: Date.now(), read: false };
  list.unshift(newN);
  if (list.length > 50) list.length = 50;
  await saveNotifs(list);
  return newN;
}

async function generateNotifs(profile: Profile) {
  const list = await getNotifs();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const lastGen = await AsyncStorage.getItem('lastNotifGen');
  const log = JSON.parse(await AsyncStorage.getItem(`log_${today}`) || '[]');
  const total = log.reduce((s: number, e: any) => s + e.gallons, 0);
  const hour = now.getHours();

  // tip rotation - one per ~6h window
  const slot = `${today}-${Math.floor(hour / 6)}`;
  if (lastGen !== slot) {
    if (profile.tipsEnabled) {
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      list.unshift({
        id: 'tip-' + slot, type: 'tip', emoji: tip.e, title: tip.t,
        body: tip.b, time: Date.now(), read: false,
      });
    }
    // morning reminder
    if (profile.remindersEnabled && hour >= 7 && hour < 12 && !log.length) {
      list.unshift({
        id: 'morn-' + today, type: 'reminder', emoji: '🌅',
        title: 'Good morning' + (profile.name ? `, ${profile.name}` : '') + '!',
        body: 'Start your day right — log your first activity to keep your streak alive.',
        time: Date.now(), read: false,
      });
    }
    // over goal warning
    if (profile.alertsEnabled && total > profile.goal) {
      list.unshift({
        id: 'over-' + today + '-' + Math.floor(hour / 6), type: 'alert', emoji: '⚠️',
        title: `${Math.round(total - profile.goal)} gal over goal`,
        body: 'You\'ve passed your daily target. Try skipping the next non-essential use.',
        time: Date.now(), read: false,
      });
    }
    // evening streak save
    if (profile.remindersEnabled && hour >= 19 && !log.length) {
      list.unshift({
        id: 'eve-' + today, type: 'streak', emoji: '🔥',
        title: 'Don\'t break your streak!',
        body: 'You haven\'t logged today. A single quick log keeps your fire burning.',
        time: Date.now(), read: false,
      });
    }
    await AsyncStorage.setItem('lastNotifGen', slot);
  }

  // dedupe + cap
  const seen = new Set<string>();
  const dedup = list.filter(n => seen.has(n.id) ? false : (seen.add(n.id), true)).slice(0, 50);
  await saveNotifs(dedup);
  return dedup;
}

// ─── APP CONTEXT ───────────────────────────────────────
type AppCtx = {
  profile: Profile;
  setProfile: (p: Profile) => Promise<void>;
  notifs: Notif[];
  refreshNotifs: () => Promise<void>;
  markAllRead: () => Promise<void>;
  clearNotifs: () => Promise<void>;
  unreadCount: number;
  loaded: boolean;
};
const AppContext = createContext<AppCtx | null>(null);
const useApp = () => {
  const v = useContext(AppContext);
  if (!v) throw new Error('AppContext missing');
  return v;
};

function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    const p = await AsyncStorage.getItem('profile');
    if (p) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(p) });
    setLoaded(true);
  }, []);

  const refreshNotifs = useCallback(async () => {
    const n = await generateNotifs(profile);
    setNotifs(n);
  }, [profile]);

  const setProfile = useCallback(async (p: Profile) => {
    setProfileState(p);
    await AsyncStorage.setItem('profile', JSON.stringify(p));
  }, []);

  const markAllRead = useCallback(async () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated);
    await saveNotifs(updated);
  }, [notifs]);

  const clearNotifs = useCallback(async () => {
    setNotifs([]);
    await saveNotifs([]);
  }, []);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (profile.onboarded) refreshNotifs(); }, [profile.onboarded]);

  // periodic refresh while open
  useEffect(() => {
    const id = setInterval(() => refreshNotifs(), 60_000 * 5);
    return () => clearInterval(id);
  }, [refreshNotifs]);

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{ profile, setProfile, notifs, refreshNotifs, markAllRead, clearNotifs, unreadCount, loaded }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── SCREEN HEADER (custom, in-screen) ─────────────────
function ScreenHeader({
  title, subtitle, onBell, onGear, unread,
}: { title: string; subtitle?: string; onBell?: () => void; onGear?: () => void; unread?: number }) {
  return (
    <View style={st.header}>
      <View style={{ flex: 1 }}>
        <Text style={st.headerTitle}>{title}</Text>
        {subtitle ? <Text style={st.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {onBell ? (
        <Press onPress={onBell} style={st.headerIconBtn}>
          <Ionicons name="notifications-outline" size={20} color={C.text} />
          {unread ? (
            <View style={st.headerBadge}>
              <Text style={st.headerBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Press>
      ) : null}
      {onGear ? (
        <Press onPress={onGear} style={st.headerIconBtn}>
          <Ionicons name="settings-outline" size={20} color={C.text} />
        </Press>
      ) : null}
    </View>
  );
}

// ─── HOME SCREEN ────────────────────────────────────────
function HomeScreen() {
  const { profile, setProfile, notifs, unreadCount, refreshNotifs, loaded } = useApp();
  const [todayGal, setTodayGal] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [savings, setSavings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showOnboard, setShowOnboard] = useState(!profile.onboarded);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(await AsyncStorage.getItem(`log_${today}`) || '[]');
    setTodayGal(log.reduce((s: number, e: any) => s + e.gallons, 0));
    setXp(parseInt(await AsyncStorage.getItem('xp') || '0'));
    setStreak(parseInt(await AsyncStorage.getItem('streak') || '0'));
    setBadges(JSON.parse(await AsyncStorage.getItem('badges') || '[]'));
    const total = log.reduce((s: number, e: any) => s + e.gallons, 0);
    setSavings(Math.max(0, 196 - total));
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    loadData();
  }, []);

  useEffect(() => {
    setShowOnboard(!profile.onboarded);
  }, [profile.onboarded]);

  // refresh data when home tab is focused via interval (cheap polling for Logger updates)
  useEffect(() => {
    const id = setInterval(loadData, 4000);
    return () => clearInterval(id);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshNotifs();
    setRefreshing(false);
  }, [loadData, refreshNotifs]);

  const pct = Math.min((todayGal / profile.goal) * 100, 100);
  const score = pct < 50 ? 'A' : pct < 70 ? 'B' : pct < 90 ? 'C' : pct < 100 ? 'D' : 'F';
  const scoreColor = pct < 50 ? C.success : pct < 70 ? C.teal : pct < 90 ? C.gold : pct < 100 ? C.warn : C.danger;
  const { level, progress } = xpToLevel(xp);
  const ringColor = pct > 90 ? C.danger : pct > 70 ? C.gold : C.accent;

  const onShare = async () => {
    try {
      await Share.share({
        message: `I'm using H2O Watch to conserve water in California 💧 — saved ${savings.toFixed(0)} gallons today and counting! Join me.`,
      });
      const b = JSON.parse(await AsyncStorage.getItem('badges') || '[]');
      if (!b.includes('sharer')) {
        await AsyncStorage.setItem('badges', JSON.stringify([...b, 'sharer']));
        setBadges([...b, 'sharer']);
      }
    } catch {}
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <GradientBg height={340} />
      <ScreenHeader
        title="H2O Watch"
        subtitle={profile.name ? `${greeting}, ${profile.name}` : 'California Water Guardian'}
        onBell={() => setShowNotifs(true)}
        onGear={() => setShowSettings(true)}
        unread={unreadCount}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* HERO CARD */}
          <View style={st.heroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
              <WaterRing pct={pct} size={IS_SMALL ? 120 : 140} color={ringColor} />
              <View style={{ alignItems: 'center' }}>
                <Text style={st.heroLabel}>WATER SCORE</Text>
                <Text style={[st.scoreLetter, { color: scoreColor }]}>{score}</Text>
                <Text style={st.heroValue}>
                  {fmtVol(todayGal, profile.units, 1)} / {fmtVol(profile.goal, profile.units, 0)}
                </Text>
              </View>
            </View>
            <View style={st.xpBarWrap}>
              <View style={st.xpHeader}>
                <Text style={st.xpLevel}>LEVEL {level} GUARDIAN</Text>
                <Text style={st.xpCount}>{progress}/100 XP</Text>
              </View>
              <View style={st.xpTrack}>
                <View style={[st.xpFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View style={st.quickRow}>
            <Press onPress={() => setShowGoal(true)} style={st.quickAction}>
              <View style={[st.quickIcon, { backgroundColor: C.accent + '20' }]}>
                <Ionicons name="flag" size={20} color={C.accent} />
              </View>
              <Text style={st.quickLabel}>Goal</Text>
              <Text style={st.quickValue}>{fmtVol(profile.goal, profile.units, 0)}</Text>
            </Press>
            <Press onPress={onShare} style={st.quickAction}>
              <View style={[st.quickIcon, { backgroundColor: C.teal + '20' }]}>
                <Ionicons name="share-social" size={20} color={C.teal} />
              </View>
              <Text style={st.quickLabel}>Share</Text>
              <Text style={st.quickValue}>Spread word</Text>
            </Press>
            <Press onPress={() => setShowNotifs(true)} style={st.quickAction}>
              <View style={[st.quickIcon, { backgroundColor: C.gold + '20' }]}>
                <Ionicons name="notifications" size={20} color={C.gold} />
              </View>
              <Text style={st.quickLabel}>Alerts</Text>
              <Text style={st.quickValue}>{unreadCount} new</Text>
            </Press>
          </View>

          {/* STAT CARDS */}
          <View style={st.statRow}>
            {[
              { label: 'Saved vs CA Avg', value: fmtVol(savings, profile.units, 0), icon: '🌿', color: C.success },
              { label: 'Day Streak', value: `${streak}`, sub: 'days', icon: '🔥', color: C.gold },
              { label: 'Level', value: `${level}`, sub: 'guardian', icon: '⚡', color: C.accent },
            ].map(c => (
              <View key={c.label} style={st.statCard}>
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={[st.statValue, { color: c.color }]}>{c.value}</Text>
                {c.sub ? <Text style={st.statSub}>{c.sub}</Text> : null}
                <Text style={st.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* DROUGHT ALERT */}
          <View style={st.alertBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={st.alertIcon}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.warn, fontWeight: '700', fontSize: 13 }}>Active Drought Alert</Text>
                <Text style={{ color: C.textSoft, fontSize: 12, marginTop: 2 }}>Severe drought across 74% of California</Text>
              </View>
            </View>
          </View>

          {/* BADGES */}
          <Text style={s.section}>ACHIEVEMENTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {BADGES.map(b => {
              const got = badges.includes(b.id);
              return (
                <View key={b.id} style={[st.badgeCard, !got && { opacity: 0.35 }]}>
                  <Text style={{ fontSize: 26 }}>{b.icon}</Text>
                  <Text style={st.badgeName}>{b.name}</Text>
                  <Text style={st.badgeDesc}>{b.desc}</Text>
                  {got ? (
                    <View style={st.badgeCheck}>
                      <Ionicons name="checkmark" size={10} color={C.bg} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {/* DAILY FACT */}
          <View style={[st.glassCard, { margin: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="bulb" size={16} color={C.gold} />
              <Text style={{ color: C.gold, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>DAILY FACT</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 13, lineHeight: 21 }}>
              A single avocado requires 60 gallons of water to grow. California produces 90% of America's avocados — making water conservation critical to our food supply.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* MODALS */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
      <NotifsModal visible={showNotifs} onClose={() => setShowNotifs(false)} />
      <GoalModal visible={showGoal} onClose={() => setShowGoal(false)} />
      <OnboardingModal
        visible={showOnboard}
        onDone={async (p) => {
          await addNotif({
            type: 'achievement', emoji: '🎉',
            title: 'Welcome aboard!',
            body: 'Your water-saving journey begins now. Tap Log to record your first activity.',
          });
          await setProfile({ ...DEFAULT_PROFILE, ...profile, ...p, onboarded: true });
          setShowOnboard(false);
          await refreshNotifs();
        }}
      />
    </SafeAreaView>
  );
}

// ─── LOGGER SCREEN ──────────────────────────────────────
const ACTIVITIES = [
  { label: 'Shower (5 min)', gallons: 10, icon: '🚿', xp: 10 },
  { label: 'Bath', gallons: 36, icon: '🛁', xp: 5 },
  { label: 'Toilet Flush', gallons: 1.6, icon: '🚽', xp: 10 },
  { label: 'Brushing Teeth', gallons: 1, icon: '🪥', xp: 15 },
  { label: 'Dishwasher', gallons: 6, icon: '🍽️', xp: 12 },
  { label: 'Hand Wash Dishes', gallons: 15, icon: '🧽', xp: 8 },
  { label: 'Washing Machine', gallons: 25, icon: '👕', xp: 8 },
  { label: 'Garden Watering', gallons: 30, icon: '🌱', xp: 6 },
  { label: 'Car Wash', gallons: 100, icon: '🚗', xp: 2 },
  { label: 'Drinking Water', gallons: 0.5, icon: '🥤', xp: 20 },
  { label: 'Pool Refill', gallons: 18500, icon: '🏊', xp: 1 },
  { label: 'Lawn Sprinkler (1h)', gallons: 300, icon: '💦', xp: 3 },
];

function LoggerScreen() {
  const { profile, refreshNotifs } = useApp();
  const [log, setLog] = useState<{ label: string; gallons: number; time: string; icon?: string }[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [popLabel, setPopLabel] = useState('');
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customAmt, setCustomAmt] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const popAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().split('T')[0];
  const total = log.reduce((sum, e) => sum + e.gallons, 0);

  const loadLog = useCallback(async () => {
    const saved = JSON.parse(await AsyncStorage.getItem(`log_${today}`) || '[]');
    setLog(saved);
    setTotalXp(parseInt(await AsyncStorage.getItem('xp') || '0'));
  }, [today]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const showPop = (label: string) => {
    setPopLabel(label);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
      Animated.delay(900),
      Animated.timing(popAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const updateBadgesAndStreak = async (newLog: any[]) => {
    const dailyTotal = newLog.reduce((s, e) => s + e.gallons, 0);
    const badges: string[] = JSON.parse(await AsyncStorage.getItem('badges') || '[]');
    const add = (id: string) => { if (!badges.includes(id)) badges.push(id); };
    if (newLog.length >= 1) add('first_log');
    if (dailyTotal < 50 && dailyTotal > 0) add('under_50');

    // streak: did we log yesterday?
    const yKey = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
    const yesterday = JSON.parse(await AsyncStorage.getItem(`log_${yKey}`) || '[]');
    const lastStreakDate = await AsyncStorage.getItem('lastStreakDate');
    let streak = parseInt(await AsyncStorage.getItem('streak') || '0');
    if (lastStreakDate !== today) {
      if (yesterday.length > 0 || streak === 0) streak = streak + 1;
      else streak = 1;
      await AsyncStorage.setItem('streak', streak.toString());
      await AsyncStorage.setItem('lastStreakDate', today);
    }
    if (streak >= 3) add('streak_3');
    if (streak >= 7) add('streak_7');
    if (streak >= 30) add('streak_30');

    const xp = parseInt(await AsyncStorage.getItem('xp') || '0');
    if (xp >= 500) add('level_5');
    await AsyncStorage.setItem('badges', JSON.stringify(badges));
  };

  const addEntry = async (a: { label: string; gallons: number; icon?: string; xp?: number }) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entry = { label: a.label, gallons: a.gallons, time, icon: a.icon };
    const newLog = [...log, entry];
    setLog(newLog);
    await AsyncStorage.setItem(`log_${today}`, JSON.stringify(newLog));
    const earnedXp = a.xp ?? Math.max(1, Math.floor(20 / Math.max(1, a.gallons)));
    const newXp = totalXp + earnedXp;
    setTotalXp(newXp);
    await AsyncStorage.setItem('xp', newXp.toString());
    showPop(`+${earnedXp} XP`);
    await updateBadgesAndStreak(newLog);
    refreshNotifs();
  };

  const submitCustom = async () => {
    const g = parseFloat(customAmt);
    if (!g || g <= 0) {
      Alert.alert('Invalid amount', 'Enter a number greater than 0.');
      return;
    }
    await addEntry({ label: customLabel.trim() || 'Custom Activity', gallons: g, icon: '✏️', xp: 5 });
    setCustomAmt('');
    setCustomLabel('');
    setShowCustom(false);
  };

  const removeEntry = async (idx: number) => {
    const reversedIdx = log.length - 1 - idx;
    const newLog = log.filter((_, i) => i !== reversedIdx);
    setLog(newLog);
    await AsyncStorage.setItem(`log_${today}`, JSON.stringify(newLog));
  };

  const clearLog = () =>
    Alert.alert('Clear Log', "Reset today's log? This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { setLog([]); await AsyncStorage.removeItem(`log_${today}`); } },
    ]);

  const filtered = ACTIVITIES.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));
  const barPct = Math.min((total / profile.goal) * 100, 100);
  const barColor = barPct > 90 ? C.danger : barPct > 70 ? C.gold : C.accent;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <GradientBg height={200} fromColor={C.teal} opacity={0.25} />
      <ScreenHeader title="Log Activity" subtitle="Tap to record your water use" />

      {/* XP POP */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 130, alignSelf: 'center', zIndex: 99,
          opacity: popAnim,
          transform: [
            { translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          ],
        }}
      >
        <View style={st.popBubble}>
          <Text style={{ color: C.bg, fontWeight: '900', fontSize: 16 }}>{popLabel}</Text>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* TOTAL CARD */}
        <View style={[st.glassCard, { margin: 16, alignItems: 'center' }]}>
          <Text style={st.bigLabel}>TODAY'S USAGE</Text>
          <Text style={{ color: barColor, fontSize: 56, fontWeight: '900', lineHeight: 64 }}>
            {profile.units === 'gal' ? total.toFixed(1) : galToL(total).toFixed(1)}
          </Text>
          <Text style={{ color: C.muted, marginBottom: 14 }}>{profile.units === 'gal' ? 'gallons' : 'liters'} used today</Text>
          <View style={st.bigBarTrack}>
            <Animated.View style={[st.bigBarFill, { width: `${barPct}%`, backgroundColor: barColor }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
            <Text style={{ color: C.muted, fontSize: 10 }}>0</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>{fmtVol(profile.goal, profile.units, 0)} target</Text>
          </View>
        </View>

        {/* MINI STATS */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 10 }}>
          <View style={[st.glassCard, { flex: 1, alignItems: 'center', padding: 14 }]}>
            <Text style={{ color: C.success, fontSize: 18, fontWeight: '800' }}>
              ${(Math.max(0, 196 - total) * 0.004).toFixed(2)}
            </Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Saved today</Text>
          </View>
          <View style={[st.glassCard, { flex: 1, alignItems: 'center', padding: 14 }]}>
            <Text style={{ color: C.gold, fontSize: 18, fontWeight: '800' }}>{totalXp} XP</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Total earned</Text>
          </View>
          <View style={[st.glassCard, { flex: 1, alignItems: 'center', padding: 14 }]}>
            <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>{log.length}</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Activities</Text>
          </View>
        </View>

        {/* SEARCH + CUSTOM */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 }}>
          <View style={[st.searchBox, { flex: 1 }]}>
            <Ionicons name="search" size={16} color={C.muted} />
            <TextInput
              style={st.searchInput}
              placeholder="Search activity..."
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Press onPress={() => setShowCustom(true)} style={st.customBtn}>
            <Ionicons name="add" size={20} color={C.bg} />
          </Press>
        </View>

        <Text style={s.section}>LOG AN ACTIVITY</Text>
        <View style={st.actGrid}>
          {filtered.map(a => (
            <Press key={a.label} onPress={() => addEntry(a)} style={st.actCard}>
              <Text style={{ fontSize: 26 }}>{a.icon}</Text>
              <Text style={st.actLabel}>{a.label}</Text>
              <Text style={st.actGallons}>{fmtVol(a.gallons, profile.units, a.gallons < 5 ? 1 : 0)}</Text>
              <View style={st.xpChip}>
                <Text style={{ color: C.gold, fontSize: 9, fontWeight: '800' }}>+{a.xp} XP</Text>
              </View>
            </Press>
          ))}
        </View>

        {log.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8 }}>
              <Text style={s.sectionInline}>TODAY'S LOG</Text>
              <TouchableOpacity onPress={clearLog} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {[...log].reverse().map((e, i) => (
              <View key={i} style={[st.logRow, { marginHorizontal: 16, marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  {e.icon ? <Text style={{ fontSize: 20 }}>{e.icon}</Text> : null}
                  <View>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{e.label}</Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{e.time}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: C.accent, fontWeight: '800', fontSize: 14 }}>
                    {fmtVol(e.gallons, profile.units, 1)}
                  </Text>
                  <TouchableOpacity onPress={() => removeEntry(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={C.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* CUSTOM ENTRY MODAL */}
      <Modal visible={showCustom} transparent animationType="slide" onRequestClose={() => setShowCustom(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={st.modalOverlay}
        >
          <View style={st.modalBox}>
            <View style={st.modalHandle} />
            <Text style={st.modalTitle}>Custom Entry</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Log any other water use</Text>
            <Text style={st.formLabel}>Activity name</Text>
            <TextInput
              style={st.input}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g. Cooking pasta"
              placeholderTextColor={C.muted}
            />
            <Text style={st.formLabel}>Gallons used</Text>
            <TextInput
              style={st.input}
              value={customAmt}
              onChangeText={setCustomAmt}
              keyboardType="numeric"
              placeholder="e.g. 3"
              placeholderTextColor={C.muted}
            />
            <Press onPress={submitCustom} style={st.btn}>
              <Text style={st.btnText}>Add Entry</Text>
            </Press>
            <TouchableOpacity onPress={() => setShowCustom(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: C.muted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── STATS SCREEN ───────────────────────────────────────
function StatsScreen() {
  const { profile } = useApp();
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [refreshing, setRefreshing] = useState(false);
  const [labels, setLabels] = useState(['M', 'T', 'W', 'T', 'F', 'S', 'S']);

  const loadWeek = useCallback(async () => {
    const days: number[] = [];
    const lbls: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const log = JSON.parse(await AsyncStorage.getItem(`log_${key}`) || '[]');
      days.push(log.reduce((s: number, e: any) => s + e.gallons, 0));
      lbls.push(['S','M','T','W','T','F','S'][d.getDay()]);
    }
    setWeekData(days);
    setLabels(lbls);
  }, []);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWeek();
    setRefreshing(false);
  }, [loadWeek]);

  const sum = weekData.reduce((a, b) => a + b, 0);
  const avg = sum / 7;
  const filtered = weekData.filter(d => d > 0);
  const best = filtered.length ? Math.min(...filtered) : 0;
  const worst = filtered.length ? Math.max(...filtered) : 0;
  const caAvg = 196;
  const savedVsCA = Math.max(0, caAvg - avg);

  // convert for display
  const display = (v: number) => profile.units === 'gal' ? v : galToL(v);
  const unit = profile.units === 'gal' ? 'gal' : 'L';

  const chartCfg = {
    backgroundColor: C.card,
    backgroundGradientFrom: C.card,
    backgroundGradientTo: C.surface,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(56,189,248,${o})`,
    labelColor: () => C.muted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: C.accent },
    propsForBackgroundLines: { stroke: C.border, strokeDasharray: '4 4' },
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <GradientBg height={200} fromColor={C.purple} opacity={0.18} />
      <ScreenHeader title="Statistics" subtitle="Your week at a glance" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* WEEK SUM */}
        <View style={[st.glassCard, { margin: 16, alignItems: 'center' }]}>
          <Text style={st.bigLabel}>WEEK TOTAL</Text>
          <Text style={{ color: C.accent, fontSize: 48, fontWeight: '900', lineHeight: 56 }}>
            {display(sum).toFixed(0)}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{unit} used in last 7 days</Text>
        </View>

        <Text style={s.section}>WEEKLY USAGE</Text>
        <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' }}>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: weekData.map(d => display(d) || 0.1), color: () => C.accent, strokeWidth: 3 },
                { data: Array(7).fill(display(profile.goal)), color: () => C.danger + '60', strokeWidth: 1, withDots: false },
              ],
              legend: [`Usage (${unit})`, 'Target'],
            }}
            width={SW - 32}
            height={210}
            chartConfig={chartCfg}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>

        {/* SUMMARY CARDS */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Avg Daily', value: `${display(avg).toFixed(0)} ${unit}`, color: C.accent },
            { label: 'Best Day', value: best ? `${display(best).toFixed(0)} ${unit}` : '—', color: C.success },
            { label: 'Saved vs CA', value: `${display(savedVsCA).toFixed(0)} ${unit}`, color: C.teal },
          ].map(c => (
            <View key={c.label} style={[st.glassCard, { flex: 1, alignItems: 'center' }]}>
              <Text style={{ color: c.color, fontSize: 16, fontWeight: '800' }}>{c.value}</Text>
              <Text style={{ color: C.muted, fontSize: 10, marginTop: 4, textAlign: 'center' }}>{c.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>DAILY BREAKDOWN</Text>
        <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' }}>
          <BarChart
            data={{ labels, datasets: [{ data: weekData.map(d => display(d) || 0.1) }] }}
            width={SW - 32}
            height={190}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(45,212,191,${o})` }}
            style={{ borderRadius: 16 }}
            yAxisLabel=""
            yAxisSuffix={` ${unit}`}
            fromZero
          />
        </View>

        <Text style={s.section}>YOUR IMPACT THIS WEEK</Text>
        <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 30 }}>
          {[
            { icon: '🌲', label: 'Trees supported', value: `${(savedVsCA * 7 / 50).toFixed(1)}` },
            { icon: '🐟', label: 'Gallons back to nature', value: `${(savedVsCA * 7).toFixed(0)}` },
            { icon: '💰', label: 'Money saved (est.)', value: `$${(savedVsCA * 7 * 0.004).toFixed(2)}` },
            { icon: '🌡️', label: 'CO₂ offset (lbs)', value: `${(savedVsCA * 7 * 0.003).toFixed(2)}` },
          ].map(r => (
            <View key={r.label} style={[st.logRow, { paddingVertical: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 22 }}>{r.icon}</Text>
                <Text style={{ color: C.text, fontSize: 13 }}>{r.label}</Text>
              </View>
              <Text style={{ color: C.accent, fontWeight: '800', fontSize: 15 }}>{r.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── LEARN SCREEN ──────────────────────────────────────
const DROUGHT_LEVELS = [
  { level: 'D0', label: 'Abnormally Dry', color: '#eab308', pct: 12 },
  { level: 'D1', label: 'Moderate Drought', color: '#f97316', pct: 18 },
  { level: 'D2', label: 'Severe Drought', color: '#ef4444', pct: 31 },
  { level: 'D3', label: 'Extreme Drought', color: '#991b1b', pct: 25 },
  { level: 'D4', label: 'Exceptional', color: '#450a0a', pct: 8 },
];

const HISTORY = [
  {
    era: 'Pre-1900s', title: 'Native Stewardship',
    body: 'Indigenous Californians — including Kumeyaay, Chumash, and Ohlone peoples — practiced sustainable water management for over 10,000 years using seasonal migration, controlled burns, and basket-weaving aquifers.',
    color: C.teal,
  },
  {
    era: '1928–1934', title: 'The Worst Drought',
    body: 'A six-year drought devastated agriculture during the Dust Bowl era. It directly led to construction of the Central Valley Project, transforming California\'s water infrastructure forever.',
    color: C.amber,
  },
  {
    era: '1976–1977', title: 'The Two-Year Crisis',
    body: 'California\'s second-worst drought in modern history triggered mandatory rationing for the first time. Reservoir levels hit historic lows, and many cities banned lawn watering outright.',
    color: C.warn,
  },
  {
    era: '1987–1992', title: 'Six-Year Stretch',
    body: 'A prolonged dry spell led to the 1991 statewide emergency. Cities like Santa Barbara built emergency desalination plants and pioneered today\'s water recycling programs.',
    color: C.warn,
  },
  {
    era: '2007–2009', title: 'Climate Change Begins',
    body: 'Scientists confirmed that warming temperatures were intensifying drought. The Delta water pumps shut down repeatedly to protect endangered fish, sparking water wars.',
    color: C.danger,
  },
  {
    era: '2012–2016', title: 'The Megadrought',
    body: 'Tree-ring evidence revealed this was the worst drought in 1,200 years. Mandatory 25% urban cuts. 100+ million trees died. Governor Brown declared a state of emergency.',
    color: C.danger,
  },
  {
    era: '2020–2022', title: 'Megadrought Continues',
    body: 'A third consecutive dry year set new records. Lake Mead and Oroville hit dead-pool warnings. Federal water cuts hit California for the first time in history.',
    color: C.rose,
  },
  {
    era: '2023–2024', title: 'Whiplash',
    body: '31 atmospheric rivers brought historic floods, ending the drought on paper — but groundwater aquifers, depleted over decades, recovered only marginally. The "new normal" is extreme swings.',
    color: C.purple,
  },
  {
    era: '2025–2026', title: 'Today',
    body: 'Severe drought has returned to 74% of California. Reservoirs are at 52%, snowpack at 61%. New mandatory residential limits of 55 gallons per person, per day are now in effect statewide.',
    color: C.danger,
  },
];

const LAWS = [
  { y: '1976', t: 'Federal Clean Water Act', d: 'Established water-quality standards still in force today.' },
  { y: '1991', t: 'Drought Emergency Declared', d: 'First statewide mandatory rationing during the 6-year drought.' },
  { y: '2009', t: 'SBx7-7 (20% by 2020)', d: 'Required cities to cut per-capita use 20% by 2020. Met statewide.' },
  { y: '2014', t: 'SGMA — Sustainable Groundwater Management Act', d: 'First-ever law forcing local agencies to manage groundwater sustainably by 2040.' },
  { y: '2018', t: 'AB 1668 / SB 606', d: 'Long-term water-use efficiency: 55 gal/person/day indoor target by 2025, 42 gal by 2030.' },
  { y: '2022', t: 'Save Water Order', d: 'Governor Newsom\'s executive order on outdoor watering and lawn irrigation limits.' },
  { y: '2024', t: 'Make Conservation a Way of Life', d: 'New permanent rules requiring urban suppliers to set efficiency budgets per agency.' },
];

const TECH = [
  { e: '💧', t: 'Drip Irrigation', b: 'Delivers water directly to plant roots — uses 30–50% less than sprinklers.' },
  { e: '🌊', t: 'Desalination', b: 'CA has 12+ desal plants. Carlsbad produces 50M gal/day from the ocean.' },
  { e: '♻️', t: 'Water Recycling', b: 'Orange County\'s purifier sends 130M gal/day of recycled water back to aquifers.' },
  { e: '🚿', t: 'Greywater Systems', b: 'Reuse shower and laundry water for landscaping — saves 50,000+ gal/year per home.' },
  { e: '📡', t: 'Smart Sprinklers', b: 'Weather-aware controllers reduce outdoor use 20–50% with no manual effort.' },
  { e: '☁️', t: 'Cloud Seeding', b: 'CA invests $4M+/year seeding storms to boost Sierra snowpack 5–15%.' },
  { e: '🏞️', t: 'Atmospheric Rivers', b: 'New tracking systems forecast these rain corridors days in advance, helping reservoir operators time releases.' },
  { e: '🌾', t: 'Precision Ag', b: 'Soil moisture sensors and AI drip systems now save Central Valley farms billions of gallons.' },
];

function LearnScreen() {
  const [tab, setTab] = useState<'status' | 'history' | 'tech' | 'tips'>('status');
  const [news, setNews] = useState('');
  const [loadingNews, setLoadingNews] = useState(false);

  const fetchNews = async () => {
    setLoadingNews(true);
    const result = await askGroq(
      'You are a California water news reporter. Be factual, concise, and constructive.',
      'Give me a 3-bullet summary of the current California drought situation in 2025–2026, including reservoir levels, conservation mandates, and what residents can do. Keep it under 150 words.'
    );
    setNews(result);
    setLoadingNews(false);
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <GradientBg height={220} fromColor={C.amber} opacity={0.18} />
      <ScreenHeader title="Learn" subtitle="History, status, and how to help" />

      {/* TAB BAR */}
      <View style={st.tabBar}>
        {[
          { id: 'status', label: 'Status', icon: 'pulse' },
          { id: 'history', label: 'History', icon: 'time' },
          { id: 'tech', label: 'Solutions', icon: 'flash' },
          { id: 'tips', label: 'Tips', icon: 'bulb' },
        ].map(t => (
          <Press key={t.id} onPress={() => setTab(t.id as any)} style={[st.tabBtn, tab === t.id && st.tabBtnActive]}>
            <Ionicons name={t.icon as any} size={14} color={tab === t.id ? C.bg : C.muted} />
            <Text style={[st.tabBtnText, tab === t.id && { color: C.bg }]}>{t.label}</Text>
          </Press>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {tab === 'status' && (
          <>
            <View style={[st.glassCard, { margin: 16, alignItems: 'center', paddingVertical: 26 }]}>
              <Text style={{ fontSize: 44 }}>🌵</Text>
              <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginTop: 8, fontWeight: '600' }}>CURRENT STATUS</Text>
              <Text style={{ color: C.danger, fontSize: 26, fontWeight: '900', marginTop: 4 }}>SEVERE DROUGHT</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>74% of California affected</Text>
              <View style={{ flexDirection: 'row', gap: 18, marginTop: 18 }}>
                {[
                  { label: 'Reservoirs', value: '52%', color: C.warn },
                  { label: 'Snowpack', value: '61%', color: C.accent },
                  { label: 'Groundwater', value: '↓ Low', color: C.danger },
                ].map(r => (
                  <View key={r.label} style={{ alignItems: 'center' }}>
                    <Text style={{ color: r.color, fontSize: 18, fontWeight: '800' }}>{r.value}</Text>
                    <Text style={{ color: C.muted, fontSize: 10 }}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={s.section}>COVERAGE BY SEVERITY</Text>
            {DROUGHT_LEVELS.map(d => (
              <View key={d.level} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: d.color + '33', borderWidth: 1, borderColor: d.color, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: d.color, fontWeight: '800', fontSize: 11 }}>{d.level}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>{d.label}</Text>
                  <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3 }}>
                    <View style={{ width: `${d.pct}%`, height: 6, backgroundColor: d.color, borderRadius: 3 }} />
                  </View>
                </View>
                <Text style={{ color: C.muted, fontSize: 12, width: 32, textAlign: 'right' }}>{d.pct}%</Text>
              </View>
            ))}

            <Text style={s.section}>AI BRIEFING</Text>
            <View style={[st.glassCard, { margin: 16 }]}>
              {news ? (
                <>
                  <MD text={news} />
                  <TouchableOpacity onPress={() => { setNews(''); }} style={{ marginTop: 10 }}>
                    <Text style={{ color: C.accent, fontSize: 12, textAlign: 'center' }}>Refresh briefing</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Press onPress={fetchNews} disabled={loadingNews} style={st.btn}>
                  {loadingNews
                    ? <ActivityIndicator color={C.bg} />
                    : <Text style={st.btnText}>📡 Get Latest Briefing</Text>}
                </Press>
              )}
            </View>
          </>
        )}

        {tab === 'history' && (
          <>
            <View style={[st.glassCard, { margin: 16 }]}>
              <Text style={{ color: C.purple, fontWeight: '800', fontSize: 13, letterSpacing: 1, marginBottom: 6 }}>📜 A CENTURY OF DROUGHT</Text>
              <Text style={{ color: C.text, fontSize: 13, lineHeight: 21 }}>
                California's relationship with water has shaped its identity. From indigenous stewardship to climate-driven megadroughts, here's the story of how we got here — and where we're going.
              </Text>
            </View>

            <Text style={s.section}>TIMELINE</Text>
            <View style={{ paddingHorizontal: 16 }}>
              {HISTORY.map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <View style={{ alignItems: 'center', width: 44 }}>
                    <View style={[st.timelineDot, { backgroundColor: h.color }]} />
                    {i < HISTORY.length - 1 ? <View style={st.timelineLine} /> : null}
                  </View>
                  <View style={[st.glassCard, { flex: 1, padding: 14 }]}>
                    <Text style={{ color: h.color, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{h.era}</Text>
                    <Text style={{ color: C.white, fontSize: 15, fontWeight: '800', marginTop: 2 }}>{h.title}</Text>
                    <Text style={{ color: C.textSoft, fontSize: 13, lineHeight: 20, marginTop: 6 }}>{h.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.section}>KEY LEGISLATION</Text>
            {LAWS.map(l => (
              <View key={l.y} style={[st.logRow, { marginHorizontal: 16, marginBottom: 8, alignItems: 'flex-start', flexDirection: 'column' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <View style={st.yearChip}>
                    <Text style={{ color: C.bg, fontWeight: '900', fontSize: 11 }}>{l.y}</Text>
                  </View>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 14, flex: 1 }}>{l.t}</Text>
                </View>
                <Text style={{ color: C.textSoft, fontSize: 12, lineHeight: 18 }}>{l.d}</Text>
              </View>
            ))}
          </>
        )}

        {tab === 'tech' && (
          <>
            <View style={[st.glassCard, { margin: 16 }]}>
              <Text style={{ color: C.teal, fontWeight: '800', fontSize: 13, letterSpacing: 1, marginBottom: 6 }}>🔬 INNOVATIONS</Text>
              <Text style={{ color: C.text, fontSize: 13, lineHeight: 21 }}>
                California is the world's lab for water innovation. Here's the tech reshaping our future.
              </Text>
            </View>
            {TECH.map((t, i) => (
              <View key={i} style={[st.glassCard, { marginHorizontal: 16, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 22 }}>{t.e}</Text>
                  <Text style={{ color: C.white, fontWeight: '800', fontSize: 14 }}>{t.t}</Text>
                </View>
                <Text style={{ color: C.textSoft, fontSize: 13, lineHeight: 20 }}>{t.b}</Text>
              </View>
            ))}
          </>
        )}

        {tab === 'tips' && (
          <>
            <View style={[st.glassCard, { margin: 16 }]}>
              <Text style={{ color: C.gold, fontWeight: '800', fontSize: 13, letterSpacing: 1, marginBottom: 6 }}>💡 EVERY DROP COUNTS</Text>
              <Text style={{ color: C.text, fontSize: 13, lineHeight: 21 }}>
                Practical, proven ways to slash your daily water use. Each tip below shows estimated savings.
              </Text>
            </View>
            {TIPS.map((t, i) => (
              <View key={i} style={[st.glassCard, { marginHorizontal: 16, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 22 }}>{t.e}</Text>
                  <Text style={{ color: C.white, fontWeight: '800', fontSize: 14 }}>{t.t}</Text>
                </View>
                <Text style={{ color: C.textSoft, fontSize: 13, lineHeight: 20 }}>{t.b}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── AI CHAT SCREEN ─────────────────────────────────────
type Msg = { role: 'user' | 'assistant'; content: string };

function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! I\'m your H2O assistant 💧 Ask me anything about water conservation, the California drought, or tips to reduce your usage!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const QUICK = [
    'How do I save water in the shower?',
    'What\'s causing CA droughts?',
    'Best drought-tolerant plants?',
    'How much water does a lawn use?',
    'Is bottled water bad for the planet?',
  ];

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const history = newMsgs.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a friendly water conservation expert for California. Give concise, practical advice. Use bullet points when listing things. Keep responses under 150 words.' },
            ...history,
          ],
          max_tokens: 400,
        }),
      });
      const d = await res.json();
      const reply = d.choices?.[0]?.message?.content ?? 'Sorry, I had trouble responding.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <GradientBg height={150} fromColor={C.accent} opacity={0.18} />
      <ScreenHeader title="AI Assistant" subtitle="Ask anything about water" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {QUICK.map(q => (
            <Press key={q} onPress={() => send(q)} style={st.chip}>
              <Text style={{ color: C.accentBright, fontSize: 12, fontWeight: '600' }}>{q}</Text>
            </Press>
          ))}
        </ScrollView>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {messages.map((m, i) => (
            <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4, fontWeight: '600' }}>💧 H2O Assistant</Text>
              )}
              <View style={[st.bubble, m.role === 'user' ? st.bubbleUser : st.bubbleBot]}>
                {m.role === 'assistant'
                  ? <MD text={m.content} />
                  : <Text style={{ color: C.white, fontSize: 14, lineHeight: 20 }}>{m.content}</Text>}
              </View>
            </View>
          ))}
          {loading && (
            <View style={[st.bubble, st.bubbleBot, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={{ color: C.muted, fontSize: 13 }}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={st.inputRow}>
          <TextInput
            style={[st.input, { flex: 1, marginBottom: 0 }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about water conservation..."
            placeholderTextColor={C.muted}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Press onPress={() => send(input)} disabled={loading} style={st.sendBtn}>
            <Ionicons name="send" size={18} color={C.bg} />
          </Press>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SETTINGS MODAL ────────────────────────────────────
function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile, setProfile, clearNotifs } = useApp();
  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => { setDraft(profile); }, [profile, visible]);

  const save = async () => {
    await setProfile(draft);
    onClose();
  };

  const resetData = () =>
    Alert.alert(
      'Reset all data?',
      'This will erase your logs, XP, badges, streak, and preferences. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive', onPress: async () => {
            const keys = await AsyncStorage.getAllKeys();
            await AsyncStorage.multiRemove(keys);
            await setProfile(DEFAULT_PROFILE);
            await clearNotifs();
            onClose();
            Alert.alert('Reset complete', 'Your data has been erased.');
          }
        },
      ]
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalOverlay}>
        <View style={[st.modalBox, { maxHeight: SH * 0.88 }]}>
          <View style={st.modalHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={st.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* PROFILE */}
            <Text style={st.settingHeader}>PROFILE</Text>
            <Text style={st.formLabel}>Your name</Text>
            <TextInput
              style={st.input}
              value={draft.name}
              onChangeText={t => setDraft({ ...draft, name: t })}
              placeholder="e.g. Sam"
              placeholderTextColor={C.muted}
              maxLength={24}
            />
            <Text style={st.formLabel}>Household size</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {[1, 2, 3, 4, '5+'].map(n => {
                const num = typeof n === 'number' ? n : 5;
                const active = draft.household === num;
                return (
                  <Press
                    key={n.toString()}
                    onPress={() => setDraft({ ...draft, household: num })}
                    style={[st.segBtn, active && st.segBtnActive]}
                  >
                    <Text style={[st.segText, active && { color: C.bg }]}>{n}</Text>
                  </Press>
                );
              })}
            </View>

            {/* PREFERENCES */}
            <Text style={st.settingHeader}>PREFERENCES</Text>
            <Text style={st.formLabel}>Units</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {(['gal', 'L'] as const).map(u => {
                const active = draft.units === u;
                return (
                  <Press
                    key={u}
                    onPress={() => setDraft({ ...draft, units: u })}
                    style={[st.segBtn, { flex: 1 }, active && st.segBtnActive]}
                  >
                    <Text style={[st.segText, active && { color: C.bg }]}>
                      {u === 'gal' ? 'Gallons (US)' : 'Liters'}
                    </Text>
                  </Press>
                );
              })}
            </View>

            <Text style={st.formLabel}>Daily goal ({draft.units === 'gal' ? 'gallons' : 'liters'})</Text>
            <TextInput
              style={st.input}
              value={String(draft.goal)}
              onChangeText={t => setDraft({ ...draft, goal: parseInt(t) || 0 })}
              keyboardType="numeric"
              placeholder="80"
              placeholderTextColor={C.muted}
            />
            <Text style={{ color: C.muted, fontSize: 11, marginTop: -6, marginBottom: 12 }}>
              EPA recommends 80–100 gallons/day. CA's 2025 mandate is 55 gal/person/day indoor.
            </Text>

            {/* NOTIFICATIONS */}
            <Text style={st.settingHeader}>NOTIFICATIONS</Text>
            {[
              { key: 'remindersEnabled', label: 'Daily reminders', desc: 'Wake-up and streak nudges' },
              { key: 'tipsEnabled', label: 'Conservation tips', desc: 'Rotating tips throughout the day' },
              { key: 'alertsEnabled', label: 'Drought & goal alerts', desc: 'When you exceed your goal or new alerts hit' },
            ].map(n => (
              <View key={n.key} style={st.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{n.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{n.desc}</Text>
                </View>
                <Switch
                  value={(draft as any)[n.key]}
                  onValueChange={v => setDraft({ ...draft, [n.key]: v } as Profile)}
                  trackColor={{ false: C.border, true: C.accentDeep }}
                  thumbColor={(draft as any)[n.key] ? C.accent : C.muted}
                  ios_backgroundColor={C.border}
                />
              </View>
            ))}

            {/* DANGER */}
            <Text style={st.settingHeader}>DATA</Text>
            <Press onPress={resetData} style={[st.dangerBtn]}>
              <Ionicons name="trash" size={16} color={C.danger} />
              <Text style={{ color: C.danger, fontWeight: '700', fontSize: 14 }}>Reset all data</Text>
            </Press>

            <View style={{ height: 16 }} />
            <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginBottom: 16 }}>
              H2O Watch v1.0 · Made for California
            </Text>
          </ScrollView>

          <Press onPress={save} style={[st.btn, { marginTop: 8 }]}>
            <Text style={st.btnText}>Save Changes</Text>
          </Press>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── NOTIFS MODAL ──────────────────────────────────────
function NotifsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { notifs, markAllRead, clearNotifs, refreshNotifs } = useApp();

  useEffect(() => {
    if (visible) {
      refreshNotifs();
      const t = setTimeout(() => markAllRead(), 1500);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const fmtTime = (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={[st.modalBox, { maxHeight: SH * 0.85 }]}>
          <View style={st.modalHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={st.modalTitle}>Notifications</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {notifs.length > 0 && (
                <TouchableOpacity onPress={clearNotifs} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {notifs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🌊</Text>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>All quiet here</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                You'll see reminders, tips, and alerts as they arrive.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifs.map(n => (
                <View key={n.id} style={[st.notifRow, !n.read && st.notifUnread]}>
                  <View style={st.notifIcon}>
                    <Text style={{ fontSize: 18 }}>{n.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{n.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 10 }}>{fmtTime(n.time)}</Text>
                    </View>
                    <Text style={{ color: C.textSoft, fontSize: 12, lineHeight: 18 }}>{n.body}</Text>
                  </View>
                  {!n.read ? <View style={st.unreadDot} /> : null}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── GOAL MODAL ────────────────────────────────────────
function GoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile, setProfile } = useApp();
  const [val, setVal] = useState(String(profile.goal));

  useEffect(() => { setVal(String(profile.goal)); }, [visible, profile.goal]);

  const save = async () => {
    const g = parseInt(val) || 80;
    await setProfile({ ...profile, goal: g });
    const badges: string[] = JSON.parse(await AsyncStorage.getItem('badges') || '[]');
    if (!badges.includes('goal_set')) {
      badges.push('goal_set');
      await AsyncStorage.setItem('badges', JSON.stringify(badges));
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalOverlay}>
        <View style={st.modalBox}>
          <View style={st.modalHandle} />
          <Text style={st.modalTitle}>Set Daily Goal</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
            EPA recommends 80–100 gallons/day. CA mandate: 55 gal/person/day.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[55, 80, 100, 150].map(g => (
              <Press key={g} onPress={() => setVal(String(g))} style={[st.segBtn, { flex: 1 }, val === String(g) && st.segBtnActive]}>
                <Text style={[st.segText, val === String(g) && { color: C.bg }]}>{g}</Text>
              </Press>
            ))}
          </View>
          <TextInput
            style={st.input}
            value={val}
            onChangeText={setVal}
            keyboardType="numeric"
            placeholderTextColor={C.muted}
            placeholder="e.g. 80"
          />
          <Press onPress={save} style={st.btn}>
            <Text style={st.btnText}>Save Goal</Text>
          </Press>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: C.muted, textAlign: 'center' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ONBOARDING MODAL ──────────────────────────────────
function OnboardingModal({ visible, onDone }: { visible: boolean; onDone: (p: Partial<Profile>) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [household, setHousehold] = useState(1);
  const [goal, setGoal] = useState(80);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setName('');
      setHousehold(1);
      setGoal(80);
      setSubmitting(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.onboardOverlay}>
        <View style={st.onboardBox}>
          {step === 0 && (
            <>
              <Text style={{ fontSize: 60, textAlign: 'center', marginBottom: 12 }}>💧</Text>
              <Text style={st.onboardTitle}>Welcome to H2O Watch</Text>
              <Text style={st.onboardSub}>
                Your personal water guardian for California. Track usage, build streaks, and help fight the drought — one drop at a time.
              </Text>
              <Press onPress={() => setStep(1)} style={[st.btn, { marginTop: 20 }]}>
                <Text style={st.btnText}>Get Started</Text>
              </Press>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>👋</Text>
              <Text style={st.onboardTitle}>What's your name?</Text>
              <Text style={st.onboardSub}>So we can greet you properly. (You can skip this.)</Text>
              <TextInput
                style={[st.input, { marginTop: 16 }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your first name"
                placeholderTextColor={C.muted}
                maxLength={24}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Press onPress={() => { setName(''); setStep(2); }} style={[st.btn, { flex: 1, backgroundColor: C.surface2 }]}>
                  <Text style={[st.btnText, { color: C.text }]}>Skip</Text>
                </Press>
                <Press onPress={() => setStep(2)} style={[st.btn, { flex: 1 }]}>
                  <Text style={st.btnText}>Continue</Text>
                </Press>
              </View>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🏡</Text>
              <Text style={st.onboardTitle}>How many in your household?</Text>
              <Text style={st.onboardSub}>This helps us suggest a smart goal.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 18 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Press key={n} onPress={() => setHousehold(n)} style={[st.segBtn, { flex: 1 }, household === n && st.segBtnActive]}>
                    <Text style={[st.segText, household === n && { color: C.bg }]}>{n}{n === 5 ? '+' : ''}</Text>
                  </Press>
                ))}
              </View>
              <Press onPress={() => setStep(3)} style={st.btn}>
                <Text style={st.btnText}>Continue</Text>
              </Press>
            </>
          )}
          {step === 3 && (
            <>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🎯</Text>
              <Text style={st.onboardTitle}>Set your daily goal</Text>
              <Text style={st.onboardSub}>
                CA average is 196 gal/day. The state mandate is 55 gal/person.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 18 }}>
                {[55, 80, 100, 150].map(g => (
                  <Press key={g} onPress={() => setGoal(g)} style={[st.segBtn, { flex: 1 }, goal === g && st.segBtnActive]}>
                    <Text style={[st.segText, goal === g && { color: C.bg }]}>{g}</Text>
                  </Press>
                ))}
              </View>
              <Press
                onPress={() => {
                  if (submitting) return;
                  setSubmitting(true);
                  onDone({ name: name.trim(), household, goal });
                }}
                disabled={submitting}
                style={[st.btn, submitting && { opacity: 0.6 }]}
              >
                <Text style={st.btnText}>{submitting ? 'Saving…' : 'Start Saving Water'}</Text>
              </Press>
            </>
          )}

          {/* progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 18 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[st.dot, step === i && st.dotActive]} />
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ROOT ────────────────────────────────────────────────
function NavRoot() {
  const { unreadCount, loaded } = useApp();
  const insets = useSafeAreaInsets();
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 0 },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size - 2} />,
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: C.danger, color: C.white, fontSize: 10 },
          }} />
        <Tab.Screen name="Log" component={LoggerScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size - 2} /> }} />
        <Tab.Screen name="Stats" component={StatsScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color} size={size - 2} /> }} />
        <Tab.Screen name="Learn" component={LearnScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size - 2} /> }} />
        <Tab.Screen name="Chat" component={ChatScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size - 2} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  section: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  sectionInline: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});

const st = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 6, paddingBottom: 12, gap: 8,
  },
  headerTitle: { color: C.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { color: C.textSoft, fontSize: 12, marginTop: 2 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.danger, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: { color: C.white, fontSize: 9, fontWeight: '800' },

  // Hero
  heroCard: {
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: C.border,
    ...SHADOW,
  },
  heroLabel: { color: C.muted, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  heroValue: { color: C.muted, fontSize: 11, marginTop: 4 },
  scoreLetter: { fontSize: 68, fontWeight: '900', lineHeight: 76, marginTop: 4 },

  xpBarWrap: { marginTop: 18 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLevel: { color: C.textSoft, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  xpCount: { color: C.accent, fontSize: 10, fontWeight: '800' },
  xpTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },

  // Quick actions
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 6, gap: 10 },
  quickAction: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  quickLabel: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  quickValue: { color: C.text, fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Stats
  statRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  statSub: { color: C.muted, fontSize: 9, marginTop: -2 },
  statLabel: { color: C.muted, fontSize: 9, textAlign: 'center', marginTop: 4, letterSpacing: 0.5 },
  bigLabel: { color: C.muted, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  bigBarTrack: { width: '100%', height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  bigBarFill: { height: 10, borderRadius: 5 },

  // Glass card
  glassCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },

  // Alerts
  alertBanner: {
    backgroundColor: C.warn + '15', borderRadius: 14,
    marginHorizontal: 16, marginTop: 12, padding: 14,
    borderWidth: 1, borderColor: C.warn + '44',
  },
  alertIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.warn + '22', justifyContent: 'center', alignItems: 'center',
  },

  // Badges
  badgeCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 10,
    alignItems: 'center', width: 96, borderWidth: 1, borderColor: C.border,
    position: 'relative',
  },
  badgeName: { color: C.text, fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  badgeDesc: { color: C.muted, fontSize: 9, textAlign: 'center', marginTop: 2 },
  badgeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.success, justifyContent: 'center', alignItems: 'center',
  },

  // Logger
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.card, borderRadius: 12,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 0 },
  customBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center',
  },
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, paddingBottom: 8 },
  actCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 12,
    alignItems: 'center', width: (SW - 44) / 2, minHeight: 110,
    borderWidth: 1, borderColor: C.border,
  },
  actLabel: { color: C.text, fontSize: 11, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  actGallons: { color: C.accent, fontSize: 12, fontWeight: '800', marginTop: 4 },
  xpChip: {
    backgroundColor: C.gold + '22', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 6,
    borderWidth: 1, borderColor: C.gold + '44',
  },
  popBubble: {
    backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 22, ...SHADOW,
  },

  // Log row
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },

  // Modal common
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 28,
    borderTopWidth: 1, borderColor: C.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  modalTitle: { color: C.white, fontSize: 22, fontWeight: '900' },

  formLabel: { color: C.textSoft, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border,
    marginBottom: 12,
  },
  btn: { backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', ...SHADOW },
  btnText: { color: C.bg, fontWeight: '800', fontSize: 15 },

  // Chat
  chip: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  bubble: { maxWidth: SW * 0.78, borderRadius: 18, padding: 14 },
  bubbleUser: { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
    alignItems: 'center',
  },
  sendBtn: { backgroundColor: C.accent, borderRadius: 14, width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },

  // Settings
  settingHeader: {
    color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2,
    marginTop: 12, marginBottom: 10,
  },
  segBtn: {
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
    minWidth: 50,
  },
  segBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  segText: { color: C.text, fontSize: 13, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.danger + '15', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.danger + '44',
  },

  // Notifs
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  notifUnread: { borderColor: C.accent + '88', backgroundColor: C.accent + '0a' },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surface2, justifyContent: 'center', alignItems: 'center',
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, marginLeft: 4, marginTop: 6 },

  // Onboarding
  onboardOverlay: { flex: 1, backgroundColor: '#000000ee', justifyContent: 'center', padding: 20 },
  onboardBox: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: C.border, ...SHADOW,
  },
  onboardTitle: { color: C.white, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  onboardSub: { color: C.textSoft, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.accent, width: 22 },

  // Learn
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 4,
    backgroundColor: C.card, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: C.accent },
  tabBtnText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 16 },
  timelineLine: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 4 },
  yearChip: {
    backgroundColor: C.accent, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
});
