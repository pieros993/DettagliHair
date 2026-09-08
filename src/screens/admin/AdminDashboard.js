import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

function getWeekDays() {
  const days = [];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                     'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const weekDays = getWeekDays();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekDays[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Prenotazioni oggi
    const { data: todayData } = await supabase
      .from('bookings')
      .select('*, operators(name), services(name, duration_minutes, price, color)')
      .gte('start_at', todayStart.toISOString())
      .lte('start_at', todayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_at', { ascending: true });

    // Prenotazioni settimana
    const { data: weekBookings } = await supabase
      .from('bookings')
      .select('*, operators(id, name), services(name, price)')
      .gte('start_at', weekStart.toISOString())
      .lte('start_at', weekEnd.toISOString())
      .neq('status', 'cancelled');

    // Operatori
    const { data: ops } = await supabase
      .from('operators')
      .select('*')
      .eq('is_active', true);

    // Stats generali
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled');

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    // Costruisci dati settimana per giorno
    const week = weekDays.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayBookings = (weekBookings || []).filter(b => {
        const d = new Date(b.start_at);
        return d >= dayStart && d <= dayEnd;
      });

      const revenue = dayBookings.reduce((sum, b) =>
        sum + (Number(b.services?.price) || 0), 0);

      return { day, bookings: dayBookings, count: dayBookings.length, revenue };
    });

    // Stats per operatore questa settimana
    const opStats = (ops || []).map(op => {
      const opBookings = (weekBookings || []).filter(b => b.operators?.id === op.id);
      const revenue = opBookings.reduce((sum, b) =>
        sum + (Number(b.services?.price) || 0), 0);
      return { ...op, weekCount: opBookings.length, weekRevenue: revenue };
    });

    const weekRevenue = (weekBookings || []).reduce((sum, b) =>
      sum + (Number(b.services?.price) || 0), 0);

    setTodayBookings(todayData || []);
    setWeekData(week);
    setOperators(opStats);
    setStats({
      todayCount: todayData?.length || 0,
      weekCount: weekBookings?.length || 0,
      weekRevenue,
      totalBookings,
      totalUsers,
    });
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function formatTime(isoString) {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth();
  }

  const maxCount = Math.max(...(weekData.map(d => d.count)), 1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Pannello Admin</Text>
          <Text style={styles.headerTitle}>Dettagli Hair Studio</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </View>

      {/* Stats principali */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardLarge]}>
          <Text style={styles.statLabel}>Oggi</Text>
          <Text style={styles.statValue}>{stats?.todayCount}</Text>
          <Text style={styles.statSub}>prenotazioni</Text>
        </View>
        <View style={[styles.statCard, styles.statCardLarge]}>
          <Text style={styles.statLabel}>Settimana</Text>
          <Text style={styles.statValue}>{stats?.weekCount}</Text>
          <Text style={styles.statSub}>€{stats?.weekRevenue?.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Totali</Text>
          <Text style={styles.statValueSmall}>{stats?.totalBookings}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Utenti</Text>
          <Text style={styles.statValueSmall}>{stats?.totalUsers}</Text>
        </View>
      </View>

      {/* Grafico settimana */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Andamento settimana</Text>
        <View style={styles.weekCard}>
          <View style={styles.barChart}>
            {weekData.map((d, idx) => {
              const height = maxCount > 0 ? (d.count / maxCount) * 80 : 4;
              const today = isToday(d.day);
              return (
                <View key={idx} style={styles.barColumn}>
                  <Text style={styles.barCount}>
                    {d.count > 0 ? d.count : ''}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View style={[
                      styles.bar,
                      { height: Math.max(height, 4) },
                      today && styles.barToday,
                      d.count === 0 && styles.barEmpty,
                    ]} />
                  </View>
                  <Text style={[styles.barDay, today && styles.barDayToday]}>
                    {DAY_NAMES[idx]}
                  </Text>
                  <Text style={styles.barDate}>{d.day.getDate()}</Text>
                </View>
              );
            })}
          </View>

          {/* Revenue per giorno */}
          <View style={styles.revenueRow}>
            {weekData.map((d, idx) => (
              <View key={idx} style={styles.revenueCell}>
                <Text style={styles.revenueText}>
                  {d.revenue > 0 ? `€${d.revenue.toFixed(0)}` : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Operatori questa settimana */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operatori — settimana</Text>
        <View style={styles.operatorsWeekCard}>
          {operators.map((op, idx) => {
            const pct = stats?.weekCount > 0
              ? (op.weekCount / stats.weekCount) * 100
              : 0;
            return (
              <View key={op.id}>
                {idx > 0 && <View style={styles.opDivider} />}
                <View style={styles.opRow}>
                  <View style={styles.opAvatar}>
                    <Text style={styles.opAvatarText}>
                      {op.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.opInfo}>
                    <View style={styles.opTopRow}>
                      <Text style={styles.opName}>{op.name}</Text>
                      <Text style={styles.opRevenue}>€{op.weekRevenue.toFixed(0)}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.opCount}>{op.weekCount} prenotazioni</Text>
                  </View>
                </View>
              </View>
            );
          })}
          {operators.length === 0 && (
            <Text style={styles.emptyText}>Nessun operatore attivo</Text>
          )}
        </View>
      </View>

      {/* Prenotazioni oggi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prenotazioni di oggi</Text>

        {todayBookings.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>😴</Text>
            <Text style={styles.emptyTextCenter}>Nessuna prenotazione per oggi</Text>
          </View>
        )}

        {todayBookings.map((b) => (
          <View key={b.id} style={styles.bookingCard}>
            <View style={[styles.colorBar, { backgroundColor: b.services?.color || '#FFFFFF' }]} />
            <View style={styles.bookingTime}>
              <Text style={styles.bookingTimeText}>{formatTime(b.start_at)}</Text>
            </View>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingService}>{b.services?.name}</Text>
              <Text style={styles.bookingOperator}>✂ {b.operators?.name}</Text>
            </View>
            <View style={styles.bookingRight}>
              <Text style={styles.bookingDuration}>{b.services?.duration_minutes}′</Text>
              <Text style={styles.bookingPrice}>€{Number(b.services?.price).toFixed(0)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  loadingContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 24,
    paddingTop: 60, paddingBottom: 24,
  },
  headerLabel: {
    fontSize: 12, fontWeight: '600', color: '#666666',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '700',
    color: '#FFFFFF', letterSpacing: -0.5,
  },
  logoutBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#333333',
  },
  logoutText: { fontSize: 13, color: '#666666', fontWeight: '500' },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 24, gap: 10, marginBottom: 8,
  },
  statCard: {
    width: '47%', backgroundColor: '#1A1A1A',
    borderRadius: 16, padding: 16, gap: 2,
  },
  statCardLarge: { padding: 20 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#555555', letterSpacing: 0.5 },
  statValue: { fontSize: 40, fontWeight: '700', color: '#FFFFFF', letterSpacing: -2 },
  statValueSmall: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -1 },
  statSub: { fontSize: 13, color: '#666666', fontWeight: '500' },

  // Section
  section: { paddingHorizontal: 24, marginTop: 24, gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#555555',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  // Grafico
  weekCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20,
  },
  barChart: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', height: 120,
  },
  barColumn: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  barCount: {
    fontSize: 11, fontWeight: '700', color: '#888888', minHeight: 16,
  },
  barWrapper: {
    height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center',
  },
  bar: {
    width: 20, backgroundColor: '#333333', borderRadius: 4,
  },
  barToday: { backgroundColor: '#FFFFFF' },
  barEmpty: { backgroundColor: '#222222' },
  barDay: {
    fontSize: 11, fontWeight: '600', color: '#555555',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  barDayToday: { color: '#FFFFFF' },
  barDate: { fontSize: 11, color: '#444444' },
  revenueRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#222222',
  },
  revenueCell: { flex: 1, alignItems: 'center' },
  revenueText: { fontSize: 10, color: '#555555', fontWeight: '600' },

  // Operatori
  operatorsWeekCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16,
  },
  opDivider: { height: 1, backgroundColor: '#222222', marginVertical: 12 },
  opRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  opAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center',
  },
  opAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  opInfo: { flex: 1, gap: 6 },
  opTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  opName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  opRevenue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  progressBarBg: {
    height: 4, backgroundColor: '#2A2A2A',
    borderRadius: 2, overflow: 'hidden',
  },
  progressBarFill: {
    height: 4, backgroundColor: '#FFFFFF', borderRadius: 2,
  },
  opCount: { fontSize: 12, color: '#555555' },
  emptyText: { fontSize: 14, color: '#555555', textAlign: 'center', padding: 16 },

  // Prenotazioni oggi
  emptyCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16,
    padding: 32, alignItems: 'center', gap: 8,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTextCenter: { fontSize: 14, color: '#555555', textAlign: 'center' },
  bookingCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  bookingTime: { paddingVertical: 16, paddingLeft: 14, minWidth: 52 },
  bookingTimeText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  bookingInfo: { flex: 1, paddingVertical: 16, paddingLeft: 4, gap: 3 },
  bookingService: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  bookingOperator: { fontSize: 13, color: '#555555' },
  bookingRight: {
    paddingVertical: 16, paddingRight: 16, alignItems: 'flex-end', gap: 2,
  },
  bookingDuration: { fontSize: 12, color: '#555555' },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});