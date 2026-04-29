import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, TextInput,
  Animated, Easing, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useState, useEffect, useRef, useCallback } from 'react';

const Tab = createBottomTabNavigator();
const { width: SW, height: SH } = Dimensions.get('window');

// ─── DESIGN SYSTEM ──────────────────────────────────────
const C = {
  bg:       '#050d1a',
  surface:  '#0d1f35',
  card:     '#112844',
  accent:   '#38bdf8',
  accentDim:'#0ea5e9',
  teal:     '#2dd4bf',
  gold:     '#f59e0b',
  danger:   '#ef4444',
  warn:     '#f97316',
  success:  '#22c55e',
  text:     '#e2e8f0',
  muted:    '#64748b',
  border:   '#1e3a5f',
  white:    '#ffffff',
};

const GROQ_KEY = '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';

// ─── GROQ HELPER ────────────────────────────────────────
async function askGroq(system: string, user: string): Promise<string> {
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
            color: C.text, fontSize: 14, lineHeight: 22,
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

// ─── WATER RING COMPONENT ───────────────────────────────
function WaterRing({ pct, size = 140, color = C.accent }: { pct: number; size?: number; color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 8, borderColor: C.border }} />
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 8, borderColor: color, opacity: pct / 100 }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: C.white, fontSize: size * 0.22, fontWeight: '800' }}>{Math.round(pct)}%</Text>
        <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>OF GOAL</Text>
      </View>
    </View>
  );
}

// ─── BADGE COMPONENT ────────────────────────────────────
const BADGES = [
  { id: 'first_log', icon: '💧', name: 'First Drop', desc: 'Logged your first activity' },
  { id: 'under_50', icon: '🌿', name: 'Eco Warrior', desc: 'Used under 50 gal in a day' },
  { id: 'streak_3', icon: '🔥', name: 'On Fire', desc: '3-day logging streak' },
  { id: 'streak_7', icon: '⚡', name: 'Hydro Hero', desc: '7-day logging streak' },
  { id: 'saver', icon: '💰', name: 'Water Saver', desc: 'Saved 100+ gallons vs average' },
  { id: 'sharer', icon: '🌍', name: 'Ambassador', desc: 'Shared the app' },
];

// ─── XP SYSTEM ──────────────────────────────────────────
function xpToLevel(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100);
  return { level, progress };
}

// ─── HOME SCREEN ────────────────────────────────────────
function HomeScreen() {
  const [todayGal, setTodayGal] = useState(0);
  const [goal, setGoal] = useState(100);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [savings, setSavings] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('100');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(await AsyncStorage.getItem(`log_${today}`) || '[]');
    const total = log.reduce((s: number, e: any) => s + e.gallons, 0);
    setTodayGal(total);
    const g = parseInt(await AsyncStorage.getItem('goal') || '100');
    setGoal(g);
    const x = parseInt(await AsyncStorage.getItem('xp') || '0');
    setXp(x);
    const st = parseInt(await AsyncStorage.getItem('streak') || '0');
    setStreak(st);
    const b = JSON.parse(await AsyncStorage.getItem('badges') || '[]');
    setBadges(b);
    const avgCA = 196;
    setSavings(Math.max(0, avgCA - total));
  };

  const saveGoal = async () => {
    const g = parseInt(goalInput) || 100;
    setGoal(g);
    await AsyncStorage.setItem('goal', g.toString());
    setShowGoalModal(false);
  };

  const pct = Math.min((todayGal / goal) * 100, 100);
  const score = pct < 50 ? 'A' : pct < 70 ? 'B' : pct < 90 ? 'C' : pct < 100 ? 'D' : 'F';
  const scoreColor = pct < 50 ? C.success : pct < 70 ? C.teal : pct < 90 ? C.gold : pct < 100 ? C.warn : C.danger;
  const { level, progress } = xpToLevel(xp);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* HERO */}
        <View style={st.heroGrad}>
          <View style={st.heroBadge}>
            <Text style={st.heroEmoji}>💧</Text>
            <Text style={st.heroAppName}>H2O Watch</Text>
            <Text style={st.heroTagline}>California Water Guardian</Text>
          </View>
          {/* Score + Ring */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 20 }}>
            <WaterRing pct={pct} size={130} color={pct > 90 ? C.danger : C.accent} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>WATER SCORE</Text>
              <Text style={{ color: scoreColor, fontSize: 72, fontWeight: '900', lineHeight: 80 }}>{score}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>{todayGal.toFixed(1)} / {goal} gal</Text>
            </View>
          </View>
          {/* XP Bar */}
          <View style={{ marginHorizontal: 24, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>LEVEL {level} GUARDIAN</Text>
              <Text style={{ color: C.accent, fontSize: 11 }}>{progress}/100 XP</Text>
            </View>
            <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2 }}>
              <View style={{ height: 4, width: `${progress}%`, backgroundColor: C.accent, borderRadius: 2 }} />
            </View>
          </View>
        </View>

        {/* STAT CARDS */}
        <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>
          {[
            { label: 'Saved vs CA Avg', value: `${savings.toFixed(0)} gal`, icon: '🌿', color: C.success },
            { label: 'Day Streak', value: `${streak} days`, icon: '🔥', color: C.gold },
            { label: 'Level', value: `${level}`, icon: '⚡', color: C.accent },
          ].map(c => (
            <View key={c.label} style={[st.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 22 }}>{c.icon}</Text>
              <Text style={{ color: c.color, fontSize: 18, fontWeight: '800', marginTop: 4 }}>{c.value}</Text>
              <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* GOAL SETTER */}
        <TouchableOpacity style={st.goalRow} onPress={() => setShowGoalModal(true)}>
          <View>
            <Text style={{ color: C.text, fontWeight: '600' }}>Daily Goal</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Tap to adjust your target</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>{goal} gal</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </View>
        </TouchableOpacity>

        {/* BADGES */}
        <Text style={s.section}>ACHIEVEMENTS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {BADGES.map(b => (
            <View key={b.id} style={[st.badgeCard, { opacity: badges.includes(b.id) ? 1 : 0.3 }]}>
              <Text style={{ fontSize: 28 }}>{b.icon}</Text>
              <Text style={{ color: C.text, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{b.name}</Text>
              <Text style={{ color: C.muted, fontSize: 9, textAlign: 'center' }}>{b.desc}</Text>
            </View>
          ))}
        </ScrollView>

        {/* DROUGHT ALERT */}
        <View style={st.alertBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View>
              <Text style={{ color: C.warn, fontWeight: '700' }}>Active Drought Alert</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>Severe drought across 74% of California</Text>
            </View>
          </View>
        </View>

        {/* FUN FACT */}
        <View style={[st.glassCard, { margin: 16 }]}>
          <Text style={{ color: C.accent, fontWeight: '700', marginBottom: 6 }}>💡 Daily Fact</Text>
          <Text style={{ color: C.text, fontSize: 13, lineHeight: 20 }}>
            A single avocado requires 60 gallons of water to grow. California produces 90% of America's avocados — making water conservation critical to our food supply.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </Animated.View>

      {/* GOAL MODAL */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitle}>Set Daily Goal</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              EPA recommends 80–100 gallons/day
            </Text>
            <TextInput
              style={st.input}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="numeric"
              placeholderTextColor={C.muted}
              placeholder="e.g. 80"
            />
            <TouchableOpacity style={st.btn} onPress={saveGoal}>
              <Text style={st.btnText}>Save Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: C.muted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── LOGGER SCREEN ──────────────────────────────────────
const ACTIVITIES = [
  { label: 'Shower (5 min)', gallons: 10, icon: '🚿', xp: 10 },
  { label: 'Bath', gallons: 36, icon: '🛁', xp: 5 },
  { label: 'Toilet Flush', gallons: 1.6, icon: '🚽', xp: 10 },
  { label: 'Brushing Teeth', gallons: 1, icon: '🪥', xp: 15 },
  { label: 'Dishwasher', gallons: 6, icon: '🍽️', xp: 12 },
  { label: 'Hand Washing Dishes', gallons: 15, icon: '🧽', xp: 8 },
  { label: 'Washing Machine', gallons: 25, icon: '👕', xp: 8 },
  { label: 'Garden Watering', gallons: 30, icon: '🌱', xp: 6 },
  { label: 'Car Wash', gallons: 100, icon: '🚗', xp: 2 },
  { label: 'Drinking Water', gallons: 0.5, icon: '🥤', xp: 20 },
  { label: 'Pool Refill', gallons: 18500, icon: '🏊', xp: 1 },
  { label: 'Lawn Sprinkler (1hr)', gallons: 300, icon: '💦', xp: 3 },
];

function LoggerScreen() {
  const [log, setLog] = useState<{ label: string; gallons: number; time: string }[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [popLabel, setPopLabel] = useState('');
  const popAnim = useRef(new Animated.Value(0)).current;

  const today = new Date().toISOString().split('T')[0];
  const total = log.reduce((sum, e) => sum + e.gallons, 0);

  useEffect(() => { loadLog(); }, []);

  const loadLog = async () => {
    const saved = JSON.parse(await AsyncStorage.getItem(`log_${today}`) || '[]');
    setLog(saved);
    const xp = parseInt(await AsyncStorage.getItem('xp') || '0');
    setTotalXp(xp);
  };

  const showPop = (label: string) => {
    setPopLabel(label);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.timing(popAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(popAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const addEntry = async (a: typeof ACTIVITIES[0]) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newLog = [...log, { label: a.label, gallons: a.gallons, time }];
    setLog(newLog);
    await AsyncStorage.setItem(`log_${today}`, JSON.stringify(newLog));
    const newXp = totalXp + a.xp;
    setTotalXp(newXp);
    await AsyncStorage.setItem('xp', newXp.toString());
    showPop(`+${a.xp} XP`);
    // badge: first log
    const badges = JSON.parse(await AsyncStorage.getItem('badges') || '[]');
    if (!badges.includes('first_log')) {
      await AsyncStorage.setItem('badges', JSON.stringify([...badges, 'first_log']));
    }
    if (newLog.reduce((s, e) => s + e.gallons, 0) < 50 && !badges.includes('under_50')) {
      await AsyncStorage.setItem('badges', JSON.stringify([...badges, 'under_50']));
    }
  };

  const clearLog = () =>
    Alert.alert('Clear Log', "Reset today's log?", [
      { text: 'Cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { setLog([]); await AsyncStorage.removeItem(`log_${today}`); } },
    ]);

  const barPct = Math.min((total / 100) * 100, 100);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* XP Pop */}
      <Animated.View style={{
        position: 'absolute', top: 100, alignSelf: 'center', zIndex: 99,
        opacity: popAnim, transform: [{ translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      }}>
        <Text style={{ color: C.bg, fontWeight: '800', fontSize: 15 }}>{popLabel}</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Total Bar */}
        <View style={[st.glassCard, { margin: 16, alignItems: 'center' }]}>
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>TODAY'S USAGE</Text>
          <Text style={{ color: barPct > 90 ? C.danger : C.accent, fontSize: 64, fontWeight: '900', lineHeight: 72 }}>
            {total.toFixed(1)}
          </Text>
          <Text style={{ color: C.muted, marginBottom: 12 }}>gallons used today</Text>
          <View style={{ width: '100%', height: 8, backgroundColor: C.border, borderRadius: 4 }}>
            <View style={{ width: `${barPct}%`, height: 8, backgroundColor: barPct > 90 ? C.danger : C.accent, borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
            <Text style={{ color: C.muted, fontSize: 10 }}>0</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>100 gal target</Text>
          </View>
        </View>

        {/* Savings tip */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 }}>
          <View style={[st.glassCard, { flex: 1, alignItems: 'center', padding: 12 }]}>
            <Text style={{ color: C.success, fontSize: 18, fontWeight: '800' }}>${(Math.max(0, 196 - total) * 0.004).toFixed(2)}</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>Est. savings today</Text>
          </View>
          <View style={[st.glassCard, { flex: 1, alignItems: 'center', padding: 12 }]}>
            <Text style={{ color: C.gold, fontSize: 18, fontWeight: '800' }}>{totalXp} XP</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>Total earned</Text>
          </View>
        </View>

        <Text style={s.section}>LOG AN ACTIVITY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, paddingBottom: 8 }}>
          {ACTIVITIES.map(a => (
            <TouchableOpacity key={a.label} style={st.actCard} onPress={() => addEntry(a)} activeOpacity={0.7}>
              <Text style={{ fontSize: 26 }}>{a.icon}</Text>
              <Text style={{ color: C.text, fontSize: 11, marginTop: 6, textAlign: 'center', fontWeight: '600' }}>{a.label}</Text>
              <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{a.gallons} gal</Text>
              <View style={{ backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                <Text style={{ color: C.gold, fontSize: 9, fontWeight: '700' }}>+{a.xp} XP</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {log.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8 }}>
              <Text style={s.section}>TODAY'S LOG</Text>
              <TouchableOpacity onPress={clearLog}>
                <Text style={{ color: C.danger, fontSize: 13 }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {[...log].reverse().map((e, i) => (
              <View key={i} style={[st.logRow, { marginHorizontal: 16, marginBottom: 8 }]}>
                <View>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{e.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{e.time}</Text>
                </View>
                <Text style={{ color: C.accent, fontWeight: '800', fontSize: 15 }}>{e.gallons} gal</Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ─── STATS SCREEN ───────────────────────────────────────
function StatsScreen() {
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => { loadWeek(); }, []);

  const loadWeek = async () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const log = JSON.parse(await AsyncStorage.getItem(`log_${key}`) || '[]');
      days.push(log.reduce((s: number, e: any) => s + e.gallons, 0));
    }
    setWeekData(days);
  };

  const avg = weekData.reduce((a, b) => a + b, 0) / 7;
  const best = Math.min(...weekData.filter(d => d > 0));
  const caAvg = 196;
  const savedVsCA = Math.max(0, caAvg - avg);

  const chartCfg = {
    backgroundColor: C.card,
    backgroundGradientFrom: C.card,
    backgroundGradientTo: C.surface,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(56,189,248,${o})`,
    labelColor: () => C.muted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: C.accent },
  };

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <Text style={[s.section, { marginTop: 20 }]}>WEEKLY OVERVIEW</Text>
      <LineChart
        data={{
          labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
          datasets: [
            { data: weekData.map(d => d || 0.1), color: () => C.accent, strokeWidth: 2 },
            { data: Array(7).fill(100), color: () => C.danger + '80', strokeWidth: 1 },
          ],
          legend: ['Usage (gal)', 'Target'],
        }}
        width={SW - 32}
        height={200}
        chartConfig={chartCfg}
        bezier
        style={{ borderRadius: 16, marginHorizontal: 16, marginBottom: 16 }}
      />

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Avg Daily', value: `${avg.toFixed(0)} gal`, color: C.accent },
          { label: 'Best Day', value: best === Infinity ? '—' : `${best.toFixed(0)} gal`, color: C.success },
          { label: 'Saved vs CA', value: `${savedVsCA.toFixed(0)} gal`, color: C.teal },
        ].map(c => (
          <View key={c.label} style={[st.glassCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={{ color: c.color, fontSize: 17, fontWeight: '800' }}>{c.value}</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      <Text style={s.section}>DAILY BREAKDOWN</Text>
      <BarChart
        data={{
          labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
          datasets: [{ data: weekData.map(d => d || 0.1) }],
        }}
        width={SW - 32}
        height={180}
        chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(45,212,191,${o})` }}
        style={{ borderRadius: 16, marginHorizontal: 16, marginBottom: 16 }}
        yAxisLabel=""
        yAxisSuffix=" g"
      />

      {/* Environmental Impact */}
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
              <Text style={{ fontSize: 24 }}>{r.icon}</Text>
              <Text style={{ color: C.text, fontSize: 14 }}>{r.label}</Text>
            </View>
            <Text style={{ color: C.accent, fontWeight: '800', fontSize: 16 }}>{r.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── DROUGHT SCREEN ─────────────────────────────────────
const DROUGHT_LEVELS = [
  { level: 'D0', label: 'Abnormally Dry', color: '#eab308', pct: 12 },
  { level: 'D1', label: 'Moderate Drought', color: '#f97316', pct: 18 },
  { level: 'D2', label: 'Severe Drought', color: '#ef4444', pct: 31 },
  { level: 'D3', label: 'Extreme Drought', color: '#991b1b', pct: 25 },
  { level: 'D4', label: 'Exceptional', color: '#450a0a', pct: 8 },
];

function DroughtScreen() {
  const [news, setNews] = useState('');
  const [loadingNews, setLoadingNews] = useState(false);

  const fetchNews = async () => {
    setLoadingNews(true);
    const result = await askGroq(
      'You are a California water news reporter. Be factual, concise, and alarming in a constructive way.',
      'Give me a 3-bullet summary of the current California drought situation in 2025–2026, including reservoir levels, conservation mandates, and what residents can do. Keep it under 150 words.'
    );
    setNews(result);
    setLoadingNews(false);
  };

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Status Hero */}
      <View style={[st.glassCard, { margin: 16, alignItems: 'center', paddingVertical: 28 }]}>
        <Text style={{ fontSize: 48 }}>🌵</Text>
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginTop: 8 }}>CURRENT STATUS</Text>
        <Text style={{ color: C.danger, fontSize: 28, fontWeight: '900', marginTop: 4 }}>SEVERE DROUGHT</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>74% of California affected</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
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

      {/* Drought Map Breakdown */}
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

      {/* AI News */}
      <Text style={s.section}>AI DROUGHT BRIEFING</Text>
      <View style={[st.glassCard, { margin: 16 }]}>
        {news ? (
          <MD text={news} />
        ) : (
          <TouchableOpacity style={st.btn} onPress={fetchNews} disabled={loadingNews}>
            {loadingNews
              ? <ActivityIndicator color={C.bg} />
              : <Text style={st.btnText}>📡 Get Latest Briefing</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Facts */}
      <Text style={s.section}>DID YOU KNOW</Text>
      {[
        { icon: '📅', fact: 'The 2012–2017 drought was the worst in 1,200 years of CA history.' },
        { icon: '🥑', fact: 'One avocado takes 60 gallons to grow. CA produces 90% of US avocados.' },
        { icon: '🌾', fact: 'Agriculture uses 80% of California\'s developed water supply.' },
        { icon: '❄️', fact: 'Sierra Nevada snowpack provides 30% of California\'s annual water.' },
        { icon: '🌡️', fact: 'Climate change is projected to reduce Sierra snowpack by 65% by 2100.' },
      ].map((f, i) => (
        <View key={i} style={[st.logRow, { marginHorizontal: 16, marginBottom: 10, alignItems: 'flex-start', gap: 12 }]}>
          <Text style={{ fontSize: 20 }}>{f.icon}</Text>
          <Text style={{ color: C.text, fontSize: 13, flex: 1, lineHeight: 20 }}>{f.fact}</Text>
        </View>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ─── AI CHAT SCREEN ─────────────────────────────────────
type Msg = { role: 'user' | 'assistant'; content: string };

function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! I\'m your H2O assistant 💧 Ask me anything about water conservation, California drought, or tips to reduce your usage!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const QUICK = [
    'How do I save water in the shower?',
    'What\'s causing CA droughts?',
    'Best drought-tolerant plants?',
    'How much water does a lawn use?',
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Quick prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, paddingHorizontal: 12, paddingVertical: 8 }} contentContainerStyle={{ gap: 8 }}>
        {QUICK.map(q => (
          <TouchableOpacity key={q} style={st.chip} onPress={() => send(q)}>
            <Text style={{ color: C.accent, fontSize: 12 }}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {messages.map((m, i) => (
          <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>💧 H2O Assistant</Text>
            )}
            <View style={[st.bubble, m.role === 'user' ? st.bubbleUser : st.bubbleBot]}>
              {m.role === 'assistant'
                ? <MD text={m.content} />
                : <Text style={{ color: C.white, fontSize: 14, lineHeight: 20 }}>{m.content}</Text>
              }
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

      {/* Input */}
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
        <TouchableOpacity style={st.sendBtn} onPress={() => send(input)} disabled={loading}>
          <Ionicons name="send" size={18} color={C.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ROOT ────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border, height: 60, paddingBottom: 8 },
          headerStyle: { backgroundColor: C.surface, shadowColor: 'transparent', elevation: 0 },
          headerTintColor: C.white,
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />, title: 'Home' }} />
        <Tab.Screen name="Log" component={LoggerScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size} />, title: 'Log' }} />
        <Tab.Screen name="Stats" component={StatsScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color} size={size} />, title: 'Stats' }} />
        <Tab.Screen name="Drought" component={DroughtScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="sunny" color={color} size={size} />, title: 'Drought' }} />
        <Tab.Screen name="AI Chat" component={ChatScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size} />, title: 'AI Chat' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  section: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
});

const st = StyleSheet.create({
  heroGrad: { backgroundColor: C.surface, paddingTop: 40, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroBadge: { alignItems: 'center' },
  heroEmoji: { fontSize: 40 },
  heroAppName: { color: C.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 },
  heroTagline: { color: C.muted, fontSize: 12, letterSpacing: 1, marginTop: 2 },
  statCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center' },
  glassCard: { backgroundColor: C.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  badgeCard: { backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: 'center', width: 90, borderWidth: 1, borderColor: C.border },
  alertBanner: { backgroundColor: '#2a1500', borderRadius: 14, margin: 16, padding: 16, borderWidth: 1, borderColor: C.warn + '44' },
  actCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', width: '46%', flexGrow: 1, borderWidth: 1, borderColor: C.border },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 },
  modalTitle: { color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 14, color: C.white, fontSize: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  btn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: C.bg, fontWeight: '800', fontSize: 15 },
  chip: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  bubble: { maxWidth: SW * 0.78, borderRadius: 18, padding: 14 },
  bubbleUser: { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  inputRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  sendBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 14, justifyContent: 'center', alignItems: 'center' },
});