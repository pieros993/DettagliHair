import React, { useState, useEffect } from 'react';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { scheduleBookingReminder } from '../lib/notifications';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

// ─── UTILITY FUNCTIONS ─────────────────────────────────────

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (startMin === null || endMin === null) return slots;

  let current = startMin;
  while (current + durationMinutes <= endMin) {
    slots.push(minutesToTime(current));
    current += durationMinutes;
  }
  return slots;
}

/**
 * Filtra slot che si sovrappongono con le pause
 * Gestisce sia break fissi che permessi giornalieri
 */
function filterBreaks(slots, breakStart, breakEnd, durationMinutes) {
  if (!breakStart || !breakEnd) return slots;

  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin = timeToMinutes(breakEnd);

  return slots.filter((slot) => {
    const slotStartMin = timeToMinutes(slot);
    const slotEndMin = slotStartMin + durationMinutes;

    return slotEndMin <= breakStartMin || slotStartMin >= breakEndMin;
  });
}

/**
 * Filtra slot in conflitto con prenotazioni esistenti
 */
function filterBookings(
  slots,
  selectedDate,
  existingBookings,
  durationMinutes
) {
  if (!existingBookings || existingBookings.length === 0) return slots;

  return slots.filter((slot) => {
    const [h, m] = slot.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(h, m, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

    return !existingBookings.some((booking) => {
      const bookingStart = new Date(booking.start_at);
      const bookingEnd = new Date(booking.end_at);

      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  });
}

/**
 * Ottimizza gli slot rimuovendo quelli isolati (gap non utilizzabili)
 */
function optimizeGaps(slots, durationMinutes) {
  if (slots.length <= 1) return slots;

  const optimized = [];

  for (let i = 0; i < slots.length; i++) {
    const currentSlotMin = timeToMinutes(slots[i]);
    const currentSlotEnd = currentSlotMin + durationMinutes;

    if (i < slots.length - 1) {
      const nextSlotMin = timeToMinutes(slots[i + 1]);
      const gap = nextSlotMin - currentSlotEnd;

      if (gap > 0 && gap < durationMinutes) {
        continue;
      }
    }

    optimized.push(slots[i]);
  }

  return optimized;
}

/**
 * Funzione principale che genera slot ottimizzati
 * Gestisce sia break fissi che permessi giornalieri
 */
function generateOptimizedSlots(
  selectedDate,
  service,
  schedule,
  existingBookings,
  dayOffBreak
) {
  if (!schedule || !schedule.is_available) return [];

  // 1. Genera slot base con intervallo dinamico
  let slots = generateSlots(
    schedule.start_time,
    schedule.end_time,
    service.duration_minutes
  );

  // 2. Filtra break fisso ricorrente
  slots = filterBreaks(
    slots,
    schedule.break_start,
    schedule.break_end,
    service.duration_minutes
  );

  // 3. Filtra permesso giornaliero (se esiste per questo giorno)
  if (dayOffBreak) {
    slots = filterBreaks(
      slots,
      dayOffBreak.break_start,
      dayOffBreak.break_end,
      service.duration_minutes
    );
  }

  // 4. Filtra prenotazioni
  slots = filterBookings(
    slots,
    selectedDate,
    existingBookings,
    service.duration_minutes
  );

  // 5. Ottimizza gap isolati
  slots = optimizeGaps(slots, service.duration_minutes);

  return slots;
}

function getNextDays(count = 7) {
  const days = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const monthNames = [
    'Gen',
    'Feb',
    'Mar',
    'Apr',
    'Mag',
    'Giu',
    'Lug',
    'Ago',
    'Set',
    'Ott',
    'Nov',
    'Dic',
  ];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      monthName: monthNames[d.getMonth()],
      dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1,
    });
  }
  return days;
}

/**
 * Formatta una data nel formato YYYY-MM-DD per le query
 */
function formatDateForQuery(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingScreen({ route, navigation }) {
  const { operator, service } = route.params;

  const [days] = useState(getNextDays(20));
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (selectedDay) loadSlots(selectedDay);
  }, [selectedDay]);

  async function loadSlots(day) {
    setLoading(true);
    setSelectedSlot(null);
    setSlots([]);

    // 1. Carica schedule ricorrente
    const { data: schedules } = await supabase
      .from('operator_schedules')
      .select('*')
      .eq('operator_id', operator.id)
      .eq('day_of_week', day.dayOfWeek)
      .eq('is_available', true);

    if (!schedules || schedules.length === 0) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    const sched = schedules[0];
    setSchedule(sched);

    // 2. Carica permesso giornaliero (se esiste)
    const formattedDate = formatDateForQuery(day.date);
    const { data: dayOffData } = await supabase
      .from('operator_day_off')
      .select('*')
      .eq('operator_id', operator.id)
      .eq('date', formattedDate)
      .single(); // Ritorna un singolo record o null

    // 3. Carica prenotazioni esistenti
    const dayStart = new Date(day.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day.date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('start_at, end_at')
      .eq('operator_id', operator.id)
      .neq('status', 'cancelled')
      .gte('start_at', dayStart.toISOString())
      .lte('start_at', dayEnd.toISOString());

    // 4. Genera slot ottimizzati (con break fisso + permesso giornaliero)
    const optimizedSlots = generateOptimizedSlots(
      day.date,
      service,
      sched,
      existingBookings || [],
      dayOffData || null
    );

    // 5. Estrai slot prenotati per visualizzazione
    const booked = (existingBookings || []).map((b) => {
      const d = new Date(b.start_at);
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    });

    setBookedSlots(booked);
    setSlots(optimizedSlots);
    setLoading(false);
  }

  async function addToCalendar() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;

      // Trova o crea il calendario dell'app
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      let calendarId;

      const appCalendar = calendars.find((c) => c.title === 'Barber Milano');
      if (appCalendar) {
        calendarId = appCalendar.id;
      } else {
        const defaultCalendar =
          Platform.OS === 'ios'
            ? await Calendar.getDefaultCalendarAsync()
            : calendars.find((c) => c.accessLevel === 'owner');

        calendarId = await Calendar.createCalendarAsync({
          title: 'Dettagli Hair Studio',
          color: '#1A1A1A',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: defaultCalendar?.source?.id,
          source: defaultCalendar?.source || {
            name: 'Dettagli Hair Studio',
            isLocalAccount: true,
          },
          name: 'Dettagli Hair Studio',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
      }

      // Crea l'evento
      const [h, m] = selectedSlot.split(':').map(Number);
      const startAt = new Date(selectedDay.date);
      startAt.setHours(h, m, 0, 0);
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + service.duration_minutes);

      await Calendar.createEventAsync(calendarId, {
        title: `✂ ${service.name} — Dettagli Hair Studio`,
        startDate: startAt,
        endDate: endAt,
        notes: `Operatore: ${operator.name}\nServizio: ${service.name}\nDurata: ${service.duration_minutes} min`,
        alarms: [
          { relativeOffset: -60 }, // 1 ora prima
          { relativeOffset: -15 }, // 15 min prima
        ],
      });

      setCalendarAdded(true);
    } catch (e) {
      console.log('Errore calendario:', e);
    }
  }

  async function handleConfirm() {
    if (!selectedDay || !selectedSlot) return;
    setBooking(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [h, m] = selectedSlot.split(':').map(Number);
    const startAt = new Date(selectedDay.date);
    startAt.setHours(h, m, 0, 0);
    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + service.duration_minutes);

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      operator_id: operator.id,
      service_id: service.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'confirmed',
    });

    setBooking(false);
    if (!error) setConfirmed(true);
    
    // Dentro handleConfirm, dopo setConfirmed(true):
    if (!error) {
      setConfirmed(true);
      await scheduleBookingReminder({
        id: Date.now().toString(),
        start_at: startAt.toISOString(),
        service_name: service.name,
        operator_name: operator.name,
      });
    }
  }

  if (confirmed) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Prenotazione confermata!</Text>
        <Text style={styles.successDetails}>
          {service.name} con {operator.name}
        </Text>
        <Text style={styles.successDetails}>
          {selectedDay?.dayName} {selectedDay?.dayNum} {selectedDay?.monthName}{' '}
          alle {selectedSlot}
        </Text>

        {/* Aggiungi al calendario */}
        <TouchableOpacity
          style={[
            styles.calendarButton,
            calendarAdded && styles.calendarButtonDone,
          ]}
          onPress={addToCalendar}
          disabled={calendarAdded}>
          {calendarAdded ? (
            <>
              <Text style={styles.calendarButtonEmoji}>✓</Text>
              <Text style={styles.calendarButtonTextDone}>
                Aggiunto al calendario
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.calendarButtonEmoji}>📅</Text>
              <Text style={styles.calendarButtonText}>
                Aggiungi al calendario
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.successButton}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Text style={styles.successButtonText}>
            Torna alla Home →
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scegli orario</Text>
        <View style={styles.serviceTag}>
          <Text style={styles.serviceTagText}>
            {service.name} · {service.duration_minutes} min
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seleziona il giorno</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}>
            {days.map((day, idx) => {
              const isSelected = selectedDay?.dayNum === day.dayNum;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                  onPress={() => setSelectedDay(day)}>
                  <Text
                    style={[
                      styles.dayName,
                      isSelected && styles.dayNameSelected,
                    ]}>
                    {day.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNum,
                      isSelected && styles.dayNumSelected,
                    ]}>
                    {day.dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.dayMonth,
                      isSelected && styles.dayMonthSelected,
                    ]}>
                    {day.monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orari disponibili</Text>
          {!selectedDay && (
            <Text style={styles.emptyText}>Seleziona prima un giorno</Text>
          )}
          {selectedDay && loading && (
            <ActivityIndicator color="#1A1A1A" style={{ marginTop: 20 }} />
          )}
          {selectedDay && !loading && !schedule && (
            <View style={styles.closedCard}>
              <Text style={styles.closedText}>
                😴 {operator.name} non lavora questo giorno
              </Text>
            </View>
          )}
          {selectedDay && !loading && schedule && slots.length === 0 && (
            <Text style={styles.emptyText}>Nessun orario disponibile</Text>
          )}
          {selectedDay && !loading && slots.length > 0 && (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotCard,
                      isBooked && styles.slotBooked,
                      isSelected && styles.slotSelected,
                    ]}
                    onPress={() => !isBooked && setSelectedSlot(slot)}
                    disabled={isBooked}>
                    <Text
                      style={[
                        styles.slotText,
                        isBooked && styles.slotTextBooked,
                        isSelected && styles.slotTextSelected,
                      ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {selectedSlot && (
        <View style={styles.confirmBar}>
          <View>
            <Text style={styles.confirmLabel}>Orario selezionato</Text>
            <Text style={styles.confirmSlot}>
              {selectedDay?.dayName} {selectedDay?.dayNum} · {selectedSlot}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              booking && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={booking}>
            {booking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Conferma</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  successContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  successEmoji: { fontSize: 64, marginBottom: 8 },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  successDetails: { fontSize: 16, color: '#888888', textAlign: 'center' },
  successButton: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  successButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  backText: { fontSize: 15, color: '#888888', fontWeight: '500' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  serviceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  serviceTagText: { fontSize: 13, color: '#444444', fontWeight: '500' },
  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  daysRow: { gap: 10, paddingRight: 24 },
  dayCard: {
    width: 64,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 2,
  },
  dayCardSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNameSelected: { color: '#FFFFFF' },
  dayNum: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  dayNumSelected: { color: '#FFFFFF' },
  dayMonth: { fontSize: 11, color: '#AAAAAA' },
  dayMonthSelected: { color: '#AAAAAA' },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
  },
  closedCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  closedText: { fontSize: 15, color: '#888888' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  slotBooked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F0F0F0',
    opacity: 0.5,
  },
  slotSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  slotText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  slotTextBooked: { color: '#CCCCCC', textDecorationLine: 'line-through' },
  slotTextSelected: { color: '#FFFFFF' },
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: { fontSize: 12, color: '#888888', fontWeight: '500' },
  confirmSlot: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  confirmButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  calendarButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: '#1A1A1A',
  backgroundColor: '#FFFFFF',
},
calendarButtonDone: {
  borderColor: '#2E7D32',
  backgroundColor: '#E8F5E9',
},
calendarButtonEmoji: { fontSize: 18 },
calendarButtonText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#1A1A1A',
},
calendarButtonTextDone: {
  fontSize: 15,
  fontWeight: '600',
  color: '#2E7D32',
},
});
