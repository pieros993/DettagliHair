import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }) {
  const [operators, setOperators] = useState([]);
  const [services, setServices] = useState([]);
  const [barbershop, setBarbershop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Carica barberia
      const { data: shops } = await supabase
        .from('barbershops')
        .select('*')
        .limit(1)
        .single();
      setBarbershop(shops);

      // Carica operatori
      const { data: ops } = await supabase
        .from('operators')
        .select('*')
        .eq('is_active', true);
      setOperators(ops || []);

      // Carica servizi
      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      setServices(svcs || []);

      // Carica profilo utente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(prof);
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function handleBooking() {
    if (!selectedOperator) {
      Alert.alert('Attenzione', 'Seleziona un operatore');
      return;
    }
    if (!selectedService) {
      Alert.alert('Attenzione', 'Seleziona un servizio');
      return;
    }
    navigation.navigate('Booking', {
      operator: selectedOperator,
      service: selectedService,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
      
        <ActivityIndicator size="large" color="#1A1A1A" />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View>
          <Text style={styles.greeting}>
            Ciao, {profile?.full_name?.split(' ')[0] || 'benvenuto'} 👋
          </Text>
          <Text style={styles.shopName}>{barbershop?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Sezione operatori */}
      <SafeAreaView style={styles.section} edges={['top']}>
        <Text style={styles.sectionTitle}>Scegli il tuo barbiere</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.operatorsRow}
        >
          {operators.map((op) => {
            const isSelected = selectedOperator?.id === op.id;
            return (
              <TouchableOpacity
                key={op.id}
                style={[styles.operatorCard, isSelected && styles.operatorCardSelected]}
                onPress={() => setSelectedOperator(op)}
              >
                <View style={[styles.operatorAvatar, isSelected && styles.operatorAvatarSelected]}>
                  {op.photo_url ? (
                    <Image source={{ uri: op.photo_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarEmoji}>✂</Text>
                  )}
                </View>
                <Text style={[styles.operatorName, isSelected && styles.operatorNameSelected]}>
                  {op.name}
                </Text>
                {op.bio && (
                  <Text style={styles.operatorBio} numberOfLines={2}>{op.bio}</Text>
                )}
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Sezione servizi */}
      <SafeAreaView style={styles.section} edges={['top']}>
        <Text style={styles.sectionTitle}>Scegli il servizio</Text>
        <View style={styles.servicesList}>
          {services.map((svc) => {
            const isSelected = selectedService?.id === svc.id;
            return (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => setSelectedService(svc)}
              >
                <View style={[styles.serviceColor, { backgroundColor: svc.color }]} />
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>
                    {svc.name}
                  </Text>
                  <Text style={styles.serviceDuration}>⏱ {svc.duration_minutes} min</Text>
                </View>
                <Text style={[styles.servicePrice, isSelected && styles.servicePriceSelected]}>
                  €{Number(svc.price).toFixed(2)}
                </Text>
                {isSelected && <Text style={styles.serviceCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Riepilogo selezione */}
      {(selectedOperator || selectedService) && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Riepilogo</Text>
          {selectedOperator && (
            <Text style={styles.summaryText}>✂ {selectedOperator.name}</Text>
          )}
          {selectedService && (
            <Text style={styles.summaryText}>
              💈 {selectedService.name} — {selectedService.duration_minutes} min — €{Number(selectedService.price).toFixed(2)}
            </Text>
          )}
        </View>
      )}

      {/* Bottone prenotazione */}
      <TouchableOpacity
        style={[
          styles.bookButton,
          (!selectedOperator || !selectedService) && styles.bookButtonDisabled
        ]}
        onPress={handleBooking}
        disabled={!selectedOperator || !selectedService}
      >
        <Text style={styles.bookButtonText}>Scegli orario →</Text>
      </TouchableOpacity>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  greeting: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 2,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutText: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  operatorsRow: {
    gap: 12,
    paddingRight: 24,
  },
  operatorCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  operatorCardSelected: {
    borderColor: '#1A1A1A',
    backgroundColor: '#1A1A1A',
  },
  operatorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  operatorAvatarSelected: {
    backgroundColor: '#333333',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  operatorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  operatorNameSelected: {
    color: '#FFFFFF',
  },
  operatorBio: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 15,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  serviceCardSelected: {
    borderColor: '#1A1A1A',
    backgroundColor: '#1A1A1A',
  },
  serviceColor: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  serviceNameSelected: {
    color: '#FFFFFF',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  servicePriceSelected: {
    color: '#FFFFFF',
  },
  serviceCheck: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  bookButton: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center', 
  },
  bookButtonDisabled: {
    opacity: 0.3,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});