import React, { useState, useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal, Image, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// ─── TIME PICKER COMPONENT ─────────────────────────────────────

function TimePicker({ value, onChange, label }) {
  const [show, setShow] = useState(false);
  
  function parseTime(timeStr) {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  return (
    <View>
      <Text style={schedStyles.timeLabel}>{label}</Text>
      <TouchableOpacity
        style={schedStyles.timeButton}
        onPress={() => setShow(true)}
      >
        <Text style={schedStyles.timeButtonText}>{value || '09:00'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={parseTime(value)}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, date) => {
            setShow(false);
            if (date) {
              const h = date.getHours().toString().padStart(2, '0');
              const m = date.getMinutes().toString().padStart(2, '0');
              onChange(`${h}:${m}`);
            }
          }}
        />
      )}
    </View>
  );
}

// ─── DATE PICKER COMPONENT ─────────────────────────────────────

function DatePickerComponent({ value, onChange, label }) {
  const [show, setShow] = useState(false);

  function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return (
    <View>
      <Text style={schedStyles.timeLabel}>{label}</Text>
      <TouchableOpacity
        style={schedStyles.timeButton}
        onPress={() => setShow(true)}
      >
        <Text style={schedStyles.timeButtonText}>{value || 'Seleziona data'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="spinner"
          onChange={(event, date) => {
            setShow(false);
            if (date) {
              onChange(formatDate(date));
            }
          }}
        />
      )}
    </View>
  );
}

// ─── DAY OFF MANAGER COMPONENT ─────────────────────────────────

function DayOffManager({ operatorId, onDataChange }) {
  const [dayOffs, setDayOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('09:00');
  const [newBreakEnd, setNewBreakEnd] = useState('17:00');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    loadDayOffs();
  }, [operatorId]);

  async function loadDayOffs() {
    setLoading(true);
    const { data } = await supabase
      .from('operator_day_off')
      .select('*')
      .eq('operator_id', operatorId)
      .order('date', { ascending: true });
    setDayOffs(data || []);
    setLoading(false);
  }

  async function handleAddDayOff() {
    if (!newDate) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('operator_day_off')
      .insert({
        operator_id: operatorId,
        date: newDate,
        break_start: newBreakStart,
        break_end: newBreakEnd,
        reason: newReason || null,
      });

    if (!error) {
      setNewDate('');
      setNewBreakStart('09:00');
      setNewBreakEnd('17:00');
      setNewReason('');
      setShowAddModal(false);
      loadDayOffs();
      onDataChange?.();
    }
    setSaving(false);
  }

  async function handleDeleteDayOff(dayOffId) {
    await supabase
      .from('operator_day_off')
      .delete()
      .eq('id', dayOffId);
    loadDayOffs();
    onDataChange?.();
  }

  function formatDateDisplay(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
    return `${dayName} ${d}/${m}/${y}`;
  }

  if (loading) return <ActivityIndicator color="#FFFFFF" style={{ marginTop: 16 }} />;

  return (
    <View style={schedStyles.container}>
      <View style={schedStyles.dayOffHeader}>
        <Text style={schedStyles.title}>📅 Permessi Giornalieri</Text>
        <TouchableOpacity
          style={schedStyles.addDayOffBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={schedStyles.addDayOffBtnText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {dayOffs.length === 0 ? (
        <Text style={schedStyles.emptyText}>Nessun permesso programmato</Text>
      ) : (
        <View style={schedStyles.dayOffList}>
          {dayOffs.map((dayOff) => (
            <View key={dayOff.id} style={schedStyles.dayOffCard}>
              <View style={schedStyles.dayOffCardContent}>
                <View>
                  <Text style={schedStyles.dayOffDate}>
                    {formatDateDisplay(dayOff.date)}
                  </Text>
                  <Text style={schedStyles.dayOffTime}>
                    {dayOff.break_start} - {dayOff.break_end}
                  </Text>
                  {dayOff.reason && (
                    <Text style={schedStyles.dayOffReason}>{dayOff.reason}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={schedStyles.deleteBtn}
                  onPress={() => handleDeleteDayOff(dayOff.id)}
                >
                  <Text style={schedStyles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal Aggiungi Permesso */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={schedStyles.modalOverlay}>
          <View style={schedStyles.modalContent}>
            <View style={schedStyles.modalHeader}>
              <Text style={schedStyles.modalTitle}>Nuovo Permesso</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={schedStyles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={schedStyles.modalBody}>
              <Text style={schedStyles.fieldLabel}>Data *</Text>
              <DatePickerComponent
                label=""
                value={newDate}
                onChange={setNewDate}
              />

              <Text style={schedStyles.fieldLabel}>Inizio Permesso</Text>
              <TimePicker
                label=""
                value={newBreakStart}
                onChange={setNewBreakStart}
              />

              <Text style={schedStyles.fieldLabel}>Fine Permesso</Text>
              <TimePicker
                label=""
                value={newBreakEnd}
                onChange={setNewBreakEnd}
              />

              <Text style={schedStyles.fieldLabel}>Motivo (opzionale)</Text>
              <TextInput
                style={[schedStyles.input, { marginBottom: 20 }]}
                placeholder="Es: Visita medica, Permesso personale..."
                placeholderTextColor="#888888"
                value={newReason}
                onChangeText={setNewReason}
              />
            </ScrollView>

            <View style={schedStyles.modalActions}>
              <TouchableOpacity
                style={schedStyles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={schedStyles.cancelBtnText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[schedStyles.saveBtn, saving && schedStyles.saveBtnDisabled]}
                onPress={handleAddDayOff}
                disabled={saving || !newDate}
              >
                {saving ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={schedStyles.saveBtnText}>Aggiungi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── SCHEDULE EDITOR COMPONENT ─────────────────────────────────

function ScheduleEditor({ operatorId, onDataChange }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadSchedules();
  }, [operatorId]);

  async function loadSchedules() {
    setLoading(true);
    const { data } = await supabase
      .from('operator_schedules')
      .select('*')
      .eq('operator_id', operatorId)
      .order('day_of_week');
    
    const result = [];
    for (let i = 0; i < 7; i++) {
      const found = data?.find(s => s.day_of_week === i);
      result.push(found || {
        operator_id: operatorId,
        day_of_week: i,
        start_time: '09:00',
        end_time: '18:00',
        is_available: false,
        break_start: null,
        break_end: null,
        id: null,
      });
    }
    setSchedules(result);
    setLoading(false);
  }

  function updateSchedule(dayIndex, field, value) {
    setSchedules(prev => prev.map((s, i) =>
      i === dayIndex ? { ...s, [field]: value } : s
    ));
    onDataChange?.();
  }

  async function saveAllSchedules() {
    for (const sched of schedules) {
      if (sched.id) {
        await supabase
          .from('operator_schedules')
          .update({
            is_available: sched.is_available,
            start_time: sched.start_time,
            end_time: sched.end_time,
            break_start: sched.break_start || null,
            break_end: sched.break_end || null,
          })
          .eq('id', sched.id);
      } else if (sched.is_available) {
        await supabase
          .from('operator_schedules')
          .insert({
            operator_id: operatorId,
            day_of_week: sched.day_of_week,
            start_time: sched.start_time,
            end_time: sched.end_time,
            break_start: sched.break_start || null,
            break_end: sched.break_end || null,
            is_available: true,
          });
      }
    }
    loadSchedules();
  }

  if (loading) return <ActivityIndicator color="#FFFFFF" style={{ marginTop: 16 }} />;

  return (
    <View style={schedStyles.container}>
      <Text style={schedStyles.title}>🕐 Orari di Lavoro</Text>
      {schedules.map((sched, idx) => (
        <View key={idx} style={schedStyles.dayBlock}>
          <View style={schedStyles.dayHeaderRow}>
            <Text style={schedStyles.dayName}>{DAYS[idx]}</Text>
            <TouchableOpacity
              style={[schedStyles.toggle, sched.is_available && schedStyles.toggleOn]}
              onPress={() => updateSchedule(idx, 'is_available', !sched.is_available)}
            >
              <View style={[schedStyles.toggleThumb, sched.is_available && schedStyles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {sched.is_available && (
            <View style={schedStyles.timesContainer}>
              <View style={schedStyles.timeSection}>
                <Text style={schedStyles.timeSectionLabel}>Orario</Text>
                <View style={schedStyles.timeRow}>
                  <TimePicker
                    label="Inizio"
                    value={sched.start_time?.slice(0, 5)}
                    onChange={(v) => updateSchedule(idx, 'start_time', v)}
                  />
                  <Text style={schedStyles.timeSep}>→</Text>
                  <TimePicker
                    label="Fine"
                    value={sched.end_time?.slice(0, 5)}
                    onChange={(v) => updateSchedule(idx, 'end_time', v)}
                  />
                </View>
              </View>

              <View style={schedStyles.timeSection}>
                <View style={schedStyles.breakHeader}>
                  <Text style={schedStyles.timeSectionLabel}>Pausa Ricorrente</Text>
                  {!sched.break_start && (
                    <TouchableOpacity
                      onPress={() => {
                        updateSchedule(idx, 'break_start', '13:00');
                        updateSchedule(idx, 'break_end', '14:00');
                      }}
                    >
                      <Text style={schedStyles.addBreakText}>+ Aggiungi</Text>
                    </TouchableOpacity>
                  )}
                  {sched.break_start && (
                    <TouchableOpacity
                      onPress={() => {
                        updateSchedule(idx, 'break_start', null);
                        updateSchedule(idx, 'break_end', null);
                      }}
                    >
                      <Text style={schedStyles.removeBreakText}>Rimuovi</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {sched.break_start && (
                  <View style={schedStyles.timeRow}>
                    <TimePicker
                      label="Inizio"
                      value={sched.break_start?.slice(0, 5)}
                      onChange={(v) => updateSchedule(idx, 'break_start', v)}
                    />
                    <Text style={schedStyles.timeSep}>→</Text>
                    <TimePicker
                      label="Fine"
                      value={sched.break_end?.slice(0, 5)}
                      onChange={(v) => updateSchedule(idx, 'break_end', v)}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      ))}
      
      {/* Bottone Salva Orari */}
      <TouchableOpacity
        style={schedStyles.saveBtnLarge}
        onPress={saveAllSchedules}
      >
        <Text style={schedStyles.saveBtnText}>Salva Orari</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export default function AdminOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadOperators();
    }, [])
  );

  async function loadOperators() {
    setLoading(true);
    const { data } = await supabase
      .from('operators')
      .select('*')
      .order('created_at');
    
    // Rimuovi /public/ dall'URL e aggiungi timestamp
    const operatorsWithTimestamp = (data || []).map(op => ({
      ...op,
      photo_url: op.photo_url 
        ? `${op.photo_url.replace('/public/', '/')}?t=${Date.now()}` 
        : null,
    }));
    
    setOperators(operatorsWithTimestamp);
    setLoading(false);
  }

async function pickImage(isNewOperator = false) {
  try {
    setUploadingPhoto(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Hai negato l\'accesso alla galleria');
      setUploadingPhoto(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled) {
      setUploadingPhoto(false);
      return;
    }

    const uri = result.assets[0].uri;
    const fileName = `operator_${Date.now()}.jpg`;

    // Ottieni il token di sessione
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Carica direttamente tramite fetch all'API REST di Supabase
    const uploadUrl = `${supabase.supabaseUrl}/storage/v1/object/Operators/${fileName}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: await fetch(uri).then(r => r.blob()),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      Alert.alert('Errore', 'Upload fallito: ' + responseText);
      setUploadingPhoto(false);
      return;
    }

    // Ottieni URL pubblico
    const { data: { publicUrl } } = supabase.storage
      .from('Operators')
      .getPublicUrl(fileName);

    const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

    if (isNewOperator) {
      setNewPhotoUrl(urlWithTimestamp);
    } else {
      setEditPhotoUrl(urlWithTimestamp);
    }

    Alert.alert('Successo', 'Foto caricata!');
    setUploadingPhoto(false);

  } catch (error) {
    console.error('Errore:', error);
    Alert.alert('Errore', error.message);
    setUploadingPhoto(false);
  }
}

  function handleExpand(op) {
    if (expanded?.id === op.id) {
      setExpanded(null);
    } else {
      setExpanded(op);
      setEditName(op.name);
      setEditBio(op.bio || '');
      setEditPhotoUrl(op.photo_url || '');
    }
  }

  async function handleSave(operatorId) {
    setSaving(true);
    const { error } = await supabase
      .from('operators')
      .update({ 
        name: editName, 
        bio: editBio,
        photo_url: editPhotoUrl || null,
      })
      .eq('id', operatorId);
    
    if (error) {
      Alert.alert('Errore', 'Errore durante il salvataggio: ' + error.message);
    } else {
      Alert.alert('Successo', 'Operatore salvato!');
      setExpanded(null);
      loadOperators();
    }
    setSaving(false);
  }

  async function handleToggleActive(op) {
    await supabase
      .from('operators')
      .update({ is_active: !op.is_active })
      .eq('id', op.id);
    loadOperators();
  }

  async function handleAdd() {
    if (!newName) {
      Alert.alert('Errore', 'Inserisci il nome dell\'operatore');
      return;
    }
    
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
      .single();
    
    const { error } = await supabase.from('operators').insert({
      barbershop_id: shops.id,
      name: newName,
      bio: newBio || null,
      photo_url: newPhotoUrl || null,
      is_active: true,
    });

    if (error) {
      Alert.alert('Errore', 'Errore durante la creazione: ' + error.message);
    } else {
      Alert.alert('Successo', 'Operatore creato!');
      setNewName('');
      setNewBio('');
      setNewPhotoUrl('');
      setShowAdd(false);
      loadOperators();
    }
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
        <Text style={styles.headerTitle}>Operatori</Text>
      </View>

      {/* Aggiungi operatore */}
      <View style={styles.section}>
        {!showAdd ? (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
            <Text style={styles.addButtonText}>+ Aggiungi operatore</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addCard}>
            <Text style={styles.addCardTitle}>Nuovo operatore</Text>
            
            {/* Foto */}
            <View style={styles.photoSection}>
              {newPhotoUrl ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: newPhotoUrl }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => setNewPhotoUrl('')}
                  >
                    <Text style={styles.photoRemoveBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoPlaceholder}
                  onPress={() => pickImage(true)}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.photoPlaceholderIcon}>📷</Text>
                      <Text style={styles.photoPlaceholderText}>Aggiungi foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={schedStyles.input}
              placeholder="Nome *"
              placeholderTextColor="#888888"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[schedStyles.input, schedStyles.inputMultiline]}
              placeholder="Bio (opzionale)"
              placeholderTextColor="#888888"
              value={newBio}
              onChangeText={setNewBio}
              multiline
            />
            <View style={styles.addCardActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAdd(false)}
              >
                <Text style={styles.cancelBtnText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAdd}
              >
                <Text style={styles.saveBtnText}>Aggiungi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Lista operatori */}
      <View style={styles.section}>
        {operators.map((op) => {
          const isExpanded = expanded?.id === op.id;
          return (
            <View key={op.id} style={styles.operatorCard}>
              <TouchableOpacity
                style={styles.operatorHeader}
                onPress={() => handleExpand(op)}
              >
                {op.photo_url ? (
                  <Image
                    source={{ uri: op.photo_url }}
                    style={styles.operatorPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.operatorPhotoPlaceholder}>
                    <Text style={styles.operatorAvatarText}>
                      {op.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.operatorMeta}>
                  <Text style={styles.operatorName}>{op.name}</Text>
                  <Text style={styles.operatorBio} numberOfLines={2}>
                    {op.bio || 'Nessuna bio'}
                  </Text>
                </View>
                <View style={styles.operatorRight}>
                  <TouchableOpacity
                    style={[styles.activeToggle, op.is_active && styles.activeToggleOn]}
                    onPress={() => handleToggleActive(op)}
                  >
                    <Text style={styles.activeToggleText}>
                      {op.is_active ? 'Attivo' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />

                  {/* Foto Operatore */}
                  <View style={styles.photoSection}>
                    {editPhotoUrl ? (
                      <View style={styles.photoContainer}>
                        <Image
                          source={{ uri: editPhotoUrl }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.photoRemoveBtn}
                          onPress={() => setEditPhotoUrl('')}
                        >
                          <Text style={styles.photoRemoveBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.photoPlaceholder}
                        onPress={() => pickImage(false)}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Text style={styles.photoPlaceholderIcon}>📷</Text>
                            <Text style={styles.photoPlaceholderText}>Aggiungi foto</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.fieldLabel}>Nome</Text>
                  <TextInput
                    style={schedStyles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholderTextColor="#888888"
                  />

                  <Text style={styles.fieldLabel}>Bio</Text>
                  <TextInput
                    style={[schedStyles.input, schedStyles.inputMultiline]}
                    value={editBio}
                    onChangeText={setEditBio}
                    multiline
                    placeholderTextColor="#888888"
                    placeholder="Descrizione dell'operatore"
                  />

                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={() => handleSave(op.id)}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#000000" size="small" />
                      : <Text style={styles.saveBtnText}>Salva Operatore</Text>
                    }
                  </TouchableOpacity>

                  <ScheduleEditor operatorId={op.id} onDataChange={() => {}} />
                  <DayOffManager operatorId={op.id} onDataChange={() => {}} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────

const schedStyles = StyleSheet.create({
  container: { marginTop: 20, gap: 8 },
  title: {
    fontSize: 13, fontWeight: '700', color: '#AAAAAA',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  dayBlock: {
    backgroundColor: '#222222', borderRadius: 12, padding: 14, gap: 10,
  },
  dayHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dayName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#333333', justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#4CAF50' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#666666',
  },
  toggleThumbOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  timesContainer: { gap: 12 },
  timeSection: { gap: 8 },
  timeSectionLabel: {
    fontSize: 12, fontWeight: '600', color: '#AAAAAA',
  },
  breakHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  addBreakText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  removeBreakText: { fontSize: 13, color: '#E53935', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  timeLabel: {
    fontSize: 11, color: '#AAAAAA', fontWeight: '600',
    letterSpacing: 0.5, marginBottom: 4,
  },
  timeButton: {
    backgroundColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 72, alignItems: 'center',
  },
  timeButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  timeSep: { fontSize: 16, color: '#444444', marginBottom: 10 },
  saveBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  saveBtnLarge: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#000000' },
  
  // Day Off Styles
  dayOffHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  addDayOffBtn: {
    backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6,
  },
  addDayOffBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  emptyText: { fontSize: 13, color: '#AAAAAA', fontStyle: 'italic', marginTop: 8 },
  dayOffList: { gap: 8 },
  dayOffCard: {
    backgroundColor: '#2A2A2A', borderRadius: 10, padding: 12,
  },
  dayOffCardContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dayOffDate: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  dayOffTime: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  dayOffReason: { fontSize: 11, color: '#888888', marginTop: 4, fontStyle: 'italic' },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  modalCloseBtn: { fontSize: 24, color: '#AAAAAA' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 16 },
  modalActions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 20,
  },
  
  // Input Styles
  input: {
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#FFFFFF', marginBottom: 12,
    backgroundColor: '#2A2A2A',
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#AAAAAA',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6,
  },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1, borderColor: '#333333',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#AAAAAA' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  loadingContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#111111',
  },
  header: {
    paddingHorizontal: 24, paddingTop: 60,
    paddingBottom: 28,
  },
  headerLabel: {
    fontSize: 12, fontWeight: '600', color: '#AAAAAA',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '700',
    color: '#FFFFFF', letterSpacing: -0.5,
  },
  section: { paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  addButton: {
    borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  addButtonText: { fontSize: 15, color: '#AAAAAA', fontWeight: '600' },
  addCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, gap: 12,
  },
  addCardTitle: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4,
  },
  addCardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  
  // Photo Styles
  photoSection: { marginBottom: 12, alignItems: 'center' },
  photoContainer: { position: 'relative', alignItems: 'center' },
  photoImage: {
    width: 120, height: 140, borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  photoPlaceholder: {
    width: 120, height: 140, borderRadius: 12,
    backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#333333', borderStyle: 'dashed',
  },
  photoPlaceholderIcon: { fontSize: 40, marginBottom: 4 },
  photoPlaceholderText: { fontSize: 12, color: '#AAAAAA', fontWeight: '600' },
  photoRemoveBtn: {
    position: 'absolute', top: -8, right: -8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveBtnText: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  
  operatorCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, overflow: 'hidden',
  },
  operatorHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  operatorPhoto: {
    width: 120, height: 140, borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  operatorAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center',
  },
  operatorAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  operatorMeta: { flex: 1, gap: 2, padding: 16, paddingTop: 12 },
  operatorName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  operatorBio: { fontSize: 13, color: '#AAAAAA' },
  operatorRight: { alignItems: 'flex-end', gap: 6, position: 'absolute', top: 12, right: 16, zIndex: 10 },
  activeToggle: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: '#2A2A2A',
  },
  activeToggleOn: { backgroundColor: '#1DB954' },
  activeToggleText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  expandArrow: { fontSize: 11, color: '#666666' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginBottom: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#AAAAAA',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  saveBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000000' },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1, borderColor: '#333333',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#AAAAAA' },
});