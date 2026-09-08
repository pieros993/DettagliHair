import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const COLORS = [ 
  '#1A1A1A', '#8B6914', '#2C5F2E', '#2E4057',
  '#8B2FC9', '#C9432F', '#1B998B', '#E84855',
  '#F46036', '#3A86FF', '#6B4226', '#555B6E',
];

function ColorPicker({ value, onChange }) {
  return (
    <View style={styles.colorGrid}>
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.colorDot,
            { backgroundColor: color },
            value === color && styles.colorDotSelected,
          ]}
          onPress={() => onChange(color)}
        />
      ))}
    </View>
  );
}

function ServiceForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() || '30');
  const [price, setPrice] = useState(initial?.price?.toString() || '0');
  const [color, setColor] = useState(initial?.color || '#1A1A1A');

  function handleSave() {
    if (!name || !duration) return;
    onSave({
      name,
      duration_minutes: parseInt(duration),
      price: parseFloat(price) || 0,
      color,
    });
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {initial ? 'Modifica servizio' : 'Nuovo servizio'}
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Es. Taglio + Barba"
          placeholderTextColor="#555555"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Durata (min) *</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor="#555555"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Prezzo (€)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#555555"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Colore</Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      {/* Anteprima */}
      <View style={styles.previewCard}>
        <View style={[styles.previewBar, { backgroundColor: color }]} />
        <View style={styles.previewInfo}>
          <Text style={styles.previewName}>{name || 'Nome servizio'}</Text>
          <Text style={styles.previewMeta}>⏱ {duration || '0'} min</Text>
        </View>
        <Text style={styles.previewPrice}>
          €{parseFloat(price || 0).toFixed(2)}
        </Text>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Annulla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!name || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name || saving}
        >
          {saving
            ? <ActivityIndicator color="#000000" size="small" />
            : <Text style={styles.saveBtnText}>Salva</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [barbershopId, setBarbershopId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [])
  );

  async function loadServices() {
    setLoading(true);
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
      .single();
    setBarbershopId(shops?.id);

    const { data } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });
    setServices(data || []);
    setLoading(false);
  }

  async function handleAdd(formData) {
    setSaving(true);
    await supabase.from('services').insert({
      ...formData,
      barbershop_id: barbershopId,
      is_active: true,
    });
    setSaving(false);
    setShowAdd(false);
    loadServices();
  }

  async function handleEdit(id, formData) {
    setSaving(true);
    await supabase
      .from('services')
      .update(formData)
      .eq('id', id);
    setSaving(false);
    setEditingId(null);
    loadServices();
  }

  async function handleToggleActive(svc) {
    await supabase
      .from('services')
      .update({ is_active: !svc.is_active })
      .eq('id', svc.id);
    loadServices();
  }

  async function handleDelete(svc) {
    Alert.alert(
      'Elimina servizio',
      `Vuoi eliminare "${svc.name}"? Le prenotazioni esistenti non verranno cancellate.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('services').delete().eq('id', svc.id);
            loadServices();
          },
        },
      ]
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
        <Text style={styles.headerTitle}>Servizi</Text>
        <Text style={styles.headerCount}>{services.length} servizi</Text>
      </View>

      <View style={styles.section}>

        {/* Form nuovo servizio */}
        {showAdd ? (
          <ServiceForm
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { setShowAdd(true); setEditingId(null); }}
          >
            <Text style={styles.addButtonText}>+ Aggiungi servizio</Text>
          </TouchableOpacity>
        )}

        {/* Lista servizi */}
        {services.length === 0 && !showAdd && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✂</Text>
            <Text style={styles.emptyText}>Nessun servizio ancora.{'\n'}Aggiungine uno!</Text>
          </View>
        )}

        {services.map((svc) => (
          <View key={svc.id}>
            {editingId === svc.id ? (
              <ServiceForm
                initial={svc}
                onSave={(data) => handleEdit(svc.id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <View style={[styles.serviceCard, !svc.is_active && styles.serviceCardInactive]}>
                {/* Barra colore */}
                <View style={[styles.colorBar, { backgroundColor: svc.color }]} />

                {/* Info */}
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, !svc.is_active && styles.textInactive]}>
                    {svc.name}
                  </Text>
                  <Text style={styles.serviceMeta}>
                    ⏱ {svc.duration_minutes} min · €{Number(svc.price).toFixed(2)}
                  </Text>
                </View>

                {/* Azioni */}
                <View style={styles.serviceActions}>
                  {/* Toggle attivo */}
                  <TouchableOpacity
                    style={[styles.activeToggle, svc.is_active && styles.activeToggleOn]}
                    onPress={() => handleToggleActive(svc)}
                  >
                    <Text style={styles.activeToggleText}>
                      {svc.is_active ? 'On' : 'Off'}
                    </Text>
                  </TouchableOpacity>

                  {/* Modifica */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => { setEditingId(svc.id); setShowAdd(false); }}
                  >
                    <Text style={styles.actionBtnText}>✏️</Text>
                  </TouchableOpacity>

                  {/* Elimina */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDelete]}
                    onPress={() => handleDelete(svc)}
                  >
                    <Text style={styles.actionBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 28, gap: 4,
  },
  headerLabel: {
    fontSize: 12, fontWeight: '600', color: '#666666',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26, fontWeight: '700',
    color: '#FFFFFF', letterSpacing: -0.5,
  },
  headerCount: { fontSize: 13, color: '#555555' },
  section: { paddingHorizontal: 24, gap: 12 },
  addButton: {
    borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed',
    borderRadius: 14, padding: 18, alignItems: 'center',
  },
  addButtonText: { fontSize: 15, color: '#666666', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16,
    padding: 40, alignItems: 'center', gap: 10,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: {
    fontSize: 14, color: '#555555',
    textAlign: 'center', lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, gap: 14,
  },
  formTitle: {
    fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 2,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#666666',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#2A2A2A', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#FFFFFF',
  },
  row: { flexDirection: 'row', gap: 12 },
  colorGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4,
  },
  colorDot: {
    width: 34, height: 34, borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3, borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  previewCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2A2A2A', borderRadius: 12,
    overflow: 'hidden', marginTop: 4,
  },
  previewBar: { width: 4, alignSelf: 'stretch' },
  previewInfo: { flex: 1, paddingVertical: 14, paddingLeft: 12, gap: 2 },
  previewName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  previewMeta: { fontSize: 12, color: '#666666' },
  previewPrice: {
    fontSize: 15, fontWeight: '700',
    color: '#FFFFFF', paddingRight: 14,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1, borderColor: '#333333',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666666' },
  saveBtn: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000000' },
  serviceCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden', minHeight: 72,
  },
  serviceCardInactive: { opacity: 0.45 },
  colorBar: { width: 4, alignSelf: 'stretch' },
  serviceInfo: { flex: 1, paddingVertical: 14, paddingLeft: 14, gap: 4 },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  serviceMeta: { fontSize: 13, color: '#666666' },
  textInactive: { color: '#555555' },
  serviceActions: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 12, gap: 8,
  },
  activeToggle: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#2A2A2A',
  },
  activeToggleOn: { backgroundColor: '#1DB954' },
  activeToggleText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  actionBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnDelete: { backgroundColor: '#2A1A1A' },
  actionBtnText: { fontSize: 14 },
});