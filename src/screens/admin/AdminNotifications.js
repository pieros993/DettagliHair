import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from '../../lib/supabase';
import config from '../../config/app.config';

const NOTIFICATION_TYPES = [
  {
    key: 'last_minute',
    label: 'Last Minute',
    emoji: '⚡',
    description: "Posto libero all'ultimo momento",
    color: '#F46036',
  },
  {
    key: 'schedule_change',
    label: 'Variazione orario',
    emoji: '🕐',
    description: 'Modifica agli orari di apertura',
    color: '#3A86FF',
  },
  {
    key: 'promo',
    label: 'Promozione',
    emoji: '🎁',
    description: 'Offerta speciale per i clienti',
    color: '#1DB954',
  },
  {
    key: 'reminder',
    label: 'Promemoria',
    emoji: '📅',
    description: 'Avviso generico agli utenti',
    color: '#8B6914',
  },
];

// Componente card social media
function SocialCard({ slot, cardRef }) {
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
  const d = new Date(slot.date);

  return (
    <View ref={cardRef} style={card.container} collapsable={false}>
      {/* Sfondo decorativo */}
      <View style={card.bgCircle1} />
      <View style={card.bgCircle2} />

      {/* Header */}
      <View style={card.header}>
        <Text style={card.shopName}>{config.app.name}</Text>
        <Text style={card.footer}>{config.app.social}</Text>
      </View>

      {/* Badge last minute */}
      <View style={card.badge}>
        <Text style={card.badgeText}>⚡ LAST MINUTE</Text>
      </View>

      {/* Slot disponibile */}
      <Text style={card.slotTitle}>Posto disponibile</Text>
      <Text style={card.slotTime}>{slot.time}</Text>
      <Text style={card.slotDate}>
        {dayNames[d.getDay()]} {d.getDate()} {monthNames[d.getMonth()]}
      </Text>

      {/* Operatore */}
      <View style={card.operatorRow}>
        <View style={card.operatorDot} />
        <Text style={card.operatorName}>{slot.operatorName}</Text>
      </View>

      {/* CTA */}
      <View style={card.cta}>
        <Text style={card.ctaText}>Prenota ora su Barber Milano</Text>
      </View>

      {/* Footer */}
      <Text style={card.footer}>@barbermilano</Text>
    </View>
  );
}

const card = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 28,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F46036',
    opacity: 0.08,
    top: -60,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
    opacity: 0.04,
    bottom: -40,
    left: -40,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { fontSize: 20 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F46036',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  slotTitle: { fontSize: 14, color: '#888888', fontWeight: '500' },
  slotTime: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  slotDate: {
    fontSize: 18,
    color: '#AAAAAA',
    fontWeight: '500',
    marginTop: -8,
  },
  operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  operatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1DB954',
  },
  operatorName: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  footer: { fontSize: 12, color: '#444444', textAlign: 'center' },
});

export default function AdminNotifications() {
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [freeSlots, setFreeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSocialCard, setShowSocialCard] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const cardRef = useRef(null);
  const [notificationSent, setNotificationSent] = useState(null); // salva la notifica inviata

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadFreeSlots();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');
    setSent(data || []);
    setUserCount(count || 0);
    setLoading(false);
  }

  async function loadFreeSlots() {
    setLoadingSlots(true);
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Giorno settimana (0=lun)
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;

    const { data: operators } = await supabase
      .from('operators')
      .select('id, name')
      .eq('is_active', true);

    const { data: schedules } = await supabase
      .from('operator_schedules')
      .select('*')
      .in(
        'operator_id',
        (operators || []).map((o) => o.id)
      )
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('operator_id, start_at, end_at')
      .gte('start_at', todayStart.toISOString())
      .lte('start_at', todayEnd.toISOString())
      .neq('status', 'cancelled');

    const slots = [];
    const now = new Date();
    const nowPlus30 = new Date(now.getTime() + 30 * 60 * 1000);

    for (const op of operators || []) {
      const sched = (schedules || []).find((s) => s.operator_id === op.id);
      if (!sched) continue;

      const [startH, startM] = sched.start_time.split(':').map(Number);
      const [endH, endM] = sched.end_time.split(':').map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;

      while (current + 30 <= end) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const slotDate = new Date(today);
        slotDate.setHours(h, m, 0, 0);

        // Solo slot futuri di almeno 30 min
        if (slotDate > nowPlus30) {
          const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);
          const isBooked = (existingBookings || []).some((b) => {
            const bStart = new Date(b.start_at);
            const bEnd = new Date(b.end_at);
            return (
              b.operator_id === op.id && slotDate < bEnd && slotEnd > bStart
            );
          });

          if (!isBooked) {
            slots.push({
              operatorId: op.id,
              operatorName: op.name,
              time: `${h.toString().padStart(2, '0')}:${m
                .toString()
                .padStart(2, '0')}`,
              date: slotDate.toISOString(),
            });
          }
        }
        current += 30;
      }
    }

    setFreeSlots(slots);
    setLoadingSlots(false);
  }

  function handleSelectSlot(slot) {
    setSelectedSlot(slot);
    setSelectedType(NOTIFICATION_TYPES[0]); // last_minute
    setTitle(`⚡ Posto libero alle ${slot.time}!`);
    setBody(
      `${slot.operatorName} è disponibile oggi alle ${slot.time}. Prenota subito prima che sia tardi!`
    );
    setShowForm(true);
  }

  function handleSelectType(type) {
    setSelectedType(type);
    if (type.key === 'last_minute') {
      setTitle('Posto disponibile ora!');
      setBody("C'è un posto libero oggi. Prenota subito!");
    } else if (type.key === 'schedule_change') {
      setTitle('Variazione orari');
      setBody('');
    } else if (type.key === 'promo') {
      setTitle('Offerta speciale 🎁');
      setBody('');
    } else {
      setTitle('');
      setBody('');
    }
    setShowForm(true);
  }

  async function handleSend() {
    if (!title || !body || !selectedType) return;
    setSending(true);
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
      .single();
    await supabase.from('notifications').insert({
      barbershop_id: shops.id,
      title,
      body,
      type: selectedType.key,
      sent_at: new Date().toISOString(),
    });
    // Recupera token utenti
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('push_token, notification_prefs')
  .eq('role', 'user')
  .not('push_token', 'is', null);

console.log('Profiles error:', profilesError);
console.log('Profiles trovati:', profiles?.length);
console.log('Tokens:', profiles?.map(p => p.push_token));

const tokens = (profiles || [])
  .filter(p => {
    if (selectedType.key === 'last_minute') return p.notification_prefs?.last_minute !== false;
    if (selectedType.key === 'schedule_change') return p.notification_prefs?.schedule_change !== false;
    return true;
  })
  .map(p => p.push_token)
  .filter(Boolean);

console.log('Tokens filtrati:', tokens);

if (tokens.length > 0) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { type: selectedType.key },
  }));

  console.log('Invio a:', messages.length, 'dispositivi');

  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const pushResult = await pushResponse.json();
  console.log('Push result:', JSON.stringify(pushResult));
}

    setSending(false);
    setShowForm(false);
    setSelectedType(null);
    setTitle('');
    setBody('');
    setSentCount(tokens.length);
    // Salva per generazione card
    if (selectedSlot) {
      setNotificationSent({ slot: selectedSlot, title, body });
    }
    setSelectedSlot(null);
    loadData();
  }

  async function handleSaveImage() {
    setSavingImage(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Condividi sui social',
      });
    } catch (e) {
      console.log('Errore immagine:', e);
    }
    setSavingImage(false);
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
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
    return `${dayNames[d.getDay()]} ${d.getDate()} ${
      monthNames[d.getMonth()]
    } · ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  function getTypeInfo(key) {
    return (
      NOTIFICATION_TYPES.find((t) => t.key === key) || NOTIFICATION_TYPES[3]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Admin</Text>
        <Text style={styles.headerTitle}>Notifiche</Text>
        <View style={styles.userCountBadge}>
          <Text style={styles.userCountText}>
            👥 {userCount} utenti iscritti
          </Text>
        </View>
      </View>

      {/* Slot liberi oggi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Slot liberi oggi</Text>
        {loadingSlots && <ActivityIndicator color="#FFFFFF" />}
        {!loadingSlots && freeSlots.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>Nessun posto libero oggi</Text>
          </View>
        )}
        {!loadingSlots && freeSlots.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsRow}>
            {freeSlots.map((slot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.slotCard}
                onPress={() => handleSelectSlot(slot)}>
                <Text style={styles.slotTime}>{slot.time}</Text>
                <Text style={styles.slotOperator}>{slot.operatorName}</Text>
                <View style={styles.slotAction}>
                  <Text style={styles.slotActionText}>Notifica ⚡</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Card social */}
      {/* Feedback invio + Card social */}
      {notificationSent && (
        <View style={styles.section}>
          <View style={styles.sentFeedbackCard}>
            <Text style={styles.sentFeedbackTitle}>
              ✅ Notifica inviata a {sentCount} utenti
            </Text>
            <Text style={styles.sentFeedbackSub}>
              "{notificationSent.title}"
            </Text>
            {!showSocialCard ? (
              <TouchableOpacity
                style={styles.generateCardBtn}
                onPress={() => setShowSocialCard(true)}>
                <Text style={styles.generateCardBtnText}>
                  📸 Genera card social
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cardPreviewContainer}>
                <Text style={styles.cardPreviewLabel}>Anteprima card</Text>
                <View style={styles.cardWrapper}>
                  <SocialCard slot={notificationSent.slot} cardRef={cardRef} />
                </View>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleSaveImage}
                  disabled={savingImage}>
                  {savingImage ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.shareButtonText}>
                      📤 Salva e condividi
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNotificationSent(null);
                    setShowSocialCard(false);
                  }}>
                  <Text style={styles.dismissText}>Chiudi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Form nuova notifica */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nuova notifica</Text>

        {sentCount > 0 && (
          <View style={styles.sentFeedback}>
            <Text style={styles.sentFeedbackText}>
              ✅ Ultima notifica inviata a {sentCount} utenti
            </Text>
          </View>
        )}

        {!showForm ? (
          <>
            <Text style={styles.typePrompt}>Scegli il tipo di notifica</Text>
            <View style={styles.typeGrid}>
              {NOTIFICATION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={styles.typeCard}
                  onPress={() => handleSelectType(type)}>
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: type.color + '22' },
                    ]}>
                    <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  </View>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDesc}>{type.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.formCard}>
            <View
              style={[
                styles.selectedTypeBadge,
                { borderColor: selectedType?.color },
              ]}>
              <Text style={styles.selectedTypeEmoji}>
                {selectedType?.emoji}
              </Text>
              <Text
                style={[
                  styles.selectedTypeLabel,
                  { color: selectedType?.color },
                ]}>
                {selectedType?.label}
              </Text>
              {selectedSlot && (
                <Text style={styles.selectedSlotInfo}>
                  {selectedSlot.time} · {selectedSlot.operatorName}
                </Text>
              )}
              <TouchableOpacity
                style={styles.changeTypeBtn}
                onPress={() => {
                  setShowForm(false);
                  setSelectedSlot(null);
                }}>
                <Text style={styles.changeTypeBtnText}>Cambia</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Titolo *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Titolo della notifica"
                placeholderTextColor="#555555"
                maxLength={60}
              />
              <Text style={styles.charCount}>{title.length}/60</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Messaggio *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={body}
                onChangeText={setBody}
                placeholder="Testo della notifica..."
                placeholderTextColor="#555555"
                multiline
                maxLength={160}
              />
              <Text style={styles.charCount}>{body.length}/160</Text>
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Anteprima</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewApp}>✂ Barber Milano</Text>
                  <Text style={styles.previewTime}>adesso</Text>
                </View>
                <Text style={styles.previewTitle}>{title || 'Titolo'}</Text>
                <Text style={styles.previewBody} numberOfLines={2}>
                  {body || 'Messaggio della notifica...'}
                </Text>
              </View>
            </View>

            <View style={styles.targetInfo}>
              <Text style={styles.targetText}>
                📤 Verrà inviata a tutti i {userCount} utenti iscritti
              </Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setSelectedType(null);
                  setSelectedSlot(null);
                }}>
                <Text style={styles.cancelBtnText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!title || !body || sending) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!title || !body || sending}>
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>Invia ora →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Storico */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inviate di recente</Text>
        {sent.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Nessuna notifica inviata</Text>
          </View>
        )}
        {sent.map((n) => {
          const typeInfo = getTypeInfo(n.type);
          return (
            <View key={n.id} style={styles.sentCard}>
              <View
                style={[
                  styles.sentIcon,
                  { backgroundColor: typeInfo.color + '22' },
                ]}>
                <Text style={styles.sentEmoji}>{typeInfo.emoji}</Text>
              </View>
              <View style={styles.sentInfo}>
                <Text style={styles.sentTitle}>{n.title}</Text>
                <Text style={styles.sentBody} numberOfLines={1}>
                  {n.body}
                </Text>
                <Text style={styles.sentDate}>{formatDate(n.created_at)}</Text>
              </View>
              <View
                style={[
                  styles.sentTypeBadge,
                  { backgroundColor: typeInfo.color + '22' },
                ]}>
                <Text style={[styles.sentTypeText, { color: typeInfo.color }]}>
                  {typeInfo.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 28, gap: 8 },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  userCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userCountText: { fontSize: 13, color: '#888888', fontWeight: '500' },
  section: { paddingHorizontal: 24, gap: 12, marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Slot liberi
  slotsRow: { gap: 10, paddingRight: 24 },
  slotCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    minWidth: 120,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F46036' + '44',
  },
  slotTime: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  slotOperator: { fontSize: 13, color: '#888888' },
  slotAction: {
    backgroundColor: '#F46036',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  slotActionText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // Social card
  socialSection: { gap: 14 },
  socialHint: { fontSize: 13, color: '#555555' },
  slotCardSmall: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    minWidth: 90,
    gap: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  slotCardSmallSelected: { borderColor: '#FFFFFF' },
  slotTimeSmall: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  slotOperatorSmall: { fontSize: 11, color: '#666666' },
  cardPreviewContainer: { gap: 12 },
  cardPreviewLabel: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardWrapper: { alignItems: 'center' },
  cardActions: { alignItems: 'center' },
  shareButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  shareButtonText: { fontSize: 15, fontWeight: '700', color: '#000000' },

  // Form
  emptyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: { fontSize: 28 },
  emptyText: { fontSize: 13, color: '#555555', textAlign: 'center' },
  sentFeedback: {
    backgroundColor: '#0A2A0A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  sentFeedbackText: { fontSize: 13, color: '#1DB954', fontWeight: '600' },
  typePrompt: { fontSize: 14, color: '#888888' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47%',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  typeDesc: { fontSize: 12, color: '#666666', lineHeight: 16 },
  formCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  selectedTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  selectedTypeEmoji: { fontSize: 18 },
  selectedTypeLabel: { fontSize: 14, fontWeight: '700' },
  selectedSlotInfo: { fontSize: 12, color: '#888888', fontWeight: '500' },
  changeTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginLeft: 'auto',
  },
  changeTypeBtnText: { fontSize: 12, color: '#888888', fontWeight: '600' },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#444444', alignSelf: 'flex-end' },
  previewContainer: { gap: 8 },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewApp: { fontSize: 12, color: '#888888', fontWeight: '600' },
  previewTime: { fontSize: 12, color: '#555555' },
  previewTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  previewBody: { fontSize: 13, color: '#888888', lineHeight: 18 },
  targetInfo: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  targetText: { fontSize: 13, color: '#888888', textAlign: 'center' },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666666' },
  sendBtn: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#000000' },
  sentCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  sentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentFeedbackCard: {
    backgroundColor: '#0A2A0A',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  sentFeedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1DB954',
  },
  sentFeedbackSub: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },
  generateCardBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  generateCardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  dismissText: {
    fontSize: 13,
    color: '#444444',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sentEmoji: { fontSize: 18 },
  sentInfo: { flex: 1, gap: 2 },
  sentTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sentBody: { fontSize: 13, color: '#666666' },
  sentDate: { fontSize: 11, color: '#444444', marginTop: 2 },
  sentTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sentTypeText: { fontSize: 11, fontWeight: '700' },
});
