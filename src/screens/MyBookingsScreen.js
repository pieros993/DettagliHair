import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  async function loadBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        operators (name, photo_url),
        services (name, duration_minutes, price, color)
      `)
      .eq('user_id', user.id)
      .order('start_at', { ascending: true });

    setBookings(data || []);
    setLoading(false);
  }

  async function handleCancel(bookingId) {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    loadBookings();
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                        'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
  }

  function formatTime(isoString) {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function isUpcoming(isoString) {
    return new Date(isoString) > new Date();
  }

  const upcoming = bookings.filter(b => isUpcoming(b.start_at) && b.status !== 'cancelled');
  const past = bookings.filter(b => !isUpcoming(b.start_at) || b.status === 'cancelled');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Le mie prenotazioni</Text>
      </View>

      {/* Prossime */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prossime</Text>
        {upcoming.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>Nessuna prenotazione in programma</Text>
          </View>
        )}
        {upcoming.map((b) => (
          <View key={b.id} style={styles.bookingCard}>
            <View style={[styles.colorBar, { backgroundColor: b.services?.color || '#1A1A1A' }]} />
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingService}>{b.services?.name}</Text>
              <Text style={styles.bookingOperator}>con {b.operators?.name}</Text>
              <Text style={styles.bookingDate}>
                📅 {formatDate(b.start_at)}
              </Text>
              <Text style={styles.bookingTime}>
                🕐 {formatTime(b.start_at)} · {b.services?.duration_minutes} min
              </Text>
              <Text style={styles.bookingPrice}>
                💰 €{Number(b.services?.price).toFixed(2)}
              </Text>
            </View>
            <View style={styles.bookingActions}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{b.status}</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(b.id)}
              >
                <Text style={styles.cancelText}>Annulla</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Storico */}
      {past.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storico</Text>
          {past.map((b) => (
            <View key={b.id} style={[styles.bookingCard, styles.bookingCardPast]}>
              <View style={[styles.colorBar, { backgroundColor: '#CCCCCC' }]} />
              <View style={styles.bookingInfo}>
                <Text style={[styles.bookingService, styles.textPast]}>{b.services?.name}</Text>
                <Text style={[styles.bookingOperator, styles.textPast]}>con {b.operators?.name}</Text>
                <Text style={styles.bookingDate}>📅 {formatDate(b.start_at)}</Text>
                <Text style={styles.bookingTime}>🕐 {formatTime(b.start_at)}</Text>
              </View>
              <View style={styles.bookingActions}>
                <View style={[styles.statusBadge, styles.statusBadgePast]}>
                  <Text style={[styles.statusText, styles.statusTextPast]}>
                    {b.status === 'cancelled' ? 'annullato' : 'completato'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 14, color: '#AAAAAA', textAlign: 'center' },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  bookingCardPast: {
    opacity: 0.7,
  },
  colorBar: {
    width: 4,
  },
  bookingInfo: {
    flex: 1,
    padding: 16,
    gap: 3,
  },
  bookingService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bookingOperator: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
  },
  bookingDate: {
    fontSize: 13,
    color: '#444444',
    fontWeight: '500',
  },
  bookingTime: {
    fontSize: 13,
    color: '#444444',
  },
  bookingPrice: {
    fontSize: 13,
    color: '#444444',
    marginTop: 2,
  },
  textPast: {
    color: '#AAAAAA',
  },
  bookingActions: {
    padding: 16,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusBadgePast: {
    backgroundColor: '#F5F5F5',
  },
  statusTextPast: {
    color: '#AAAAAA',
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancelText: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '600',
  },
});