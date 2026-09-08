import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking
} from 'react-native';
import config from '../config/app.config';

export default function ConsentScreen({ onAccept }) {
  const [accepted, setAccepted] = useState({
    privacy: false,
    terms: false,
    marketing: false,
  });

  const allRequired = accepted.privacy && accepted.terms;

  function toggle(key) {
    setAccepted(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>{config.app.logo}</Text>
          <Text style={styles.logo}>✂</Text>
          <Text style={styles.title}>Prima di iniziare</Text>
          <Text style={styles.subtitle}>
            Leggi e accetta i nostri termini per utilizzare l'app
          </Text>
        </View>

        {/* Consensi */}
        <View style={styles.consentsContainer}>

          {/* Privacy Policy — obbligatorio */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => toggle('privacy')}
          >
            <View style={[styles.checkbox, accepted.privacy && styles.checkboxChecked]}>
              {accepted.privacy && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.consentText}>
              <View style={styles.consentTitleRow}>
                <Text style={styles.consentTitle}>Privacy Policy</Text>
                <Text style={styles.required}>Obbligatorio</Text>
              </View>
              <Text style={styles.consentDesc}>
                Acconsento al trattamento dei miei dati personali per la gestione delle prenotazioni, come descritto nella{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL(config.app.privacyUrl)}
                >
                  Privacy Policy
                </Text>
                {' '}(GDPR – Reg. UE 2016/679).
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Termini di servizio — obbligatorio */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => toggle('terms')}
          >
            <View style={[styles.checkbox, accepted.terms && styles.checkboxChecked]}>
              {accepted.terms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.consentText}>
              <View style={styles.consentTitleRow}>
                <Text style={styles.consentTitle}>Termini di servizio</Text>
                <Text style={styles.required}>Obbligatorio</Text>
              </View>
              <Text style={styles.consentDesc}>
                Ho letto e accetto i{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL(config.app.termsUrl)}
                >
                  Termini di servizio
                </Text>
                {' '}dell'applicazione.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Marketing — opzionale */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => toggle('marketing')}
          >
            <View style={[styles.checkbox, accepted.marketing && styles.checkboxChecked]}>
              {accepted.marketing && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.consentText}>
              <View style={styles.consentTitleRow}>
                <Text style={styles.consentTitle}>Comunicazioni promozionali</Text>
                <Text style={styles.optional}>Opzionale</Text>
              </View>
              <Text style={styles.consentDesc}>
                Acconsento a ricevere notifiche su promozioni, offerte last minute e novità della barberia.
              </Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* Info GDPR */}
        <View style={styles.gdprInfo}>
          <Text style={styles.gdprInfoText}>
            🔒 I tuoi dati sono trattati da Barber Milano come titolare del trattamento. 
            Puoi esercitare i tuoi diritti (accesso, rettifica, cancellazione) scrivendo a 
            privacy@barbermilano.it. Non vendiamo i tuoi dati a terzi.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottone fisso in basso */}
      <View style={styles.footer}>
        {!allRequired && (
          <Text style={styles.footerHint}>
            Accetta Privacy Policy e Termini di servizio per continuare
          </Text>
        )}
        <TouchableOpacity
          style={[styles.acceptButton, !allRequired && styles.acceptButtonDisabled]}
          onPress={() => allRequired && onAccept(accepted)}
          disabled={!allRequired}
        >
          <Text style={styles.acceptButtonText}>Accetta e continua →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 44, marginBottom: 12 },
  title: {
    fontSize: 26, fontWeight: '700',
    color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: '#888888',
    textAlign: 'center', lineHeight: 22,
  },
  consentsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1,
    borderColor: '#F0F0F0', overflow: 'hidden',
  },
  consentRow: {
    flexDirection: 'row', padding: 18, gap: 14, alignItems: 'flex-start',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#DDDDDD',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2, flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#1A1A1A', borderColor: '#1A1A1A',
  },
  checkmark: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  consentText: { flex: 1, gap: 4 },
  consentTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  consentTitle: {
    fontSize: 15, fontWeight: '700', color: '#1A1A1A',
  },
  required: {
    fontSize: 10, fontWeight: '700', color: '#E53935',
    backgroundColor: '#FFEBEE', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  optional: {
    fontSize: 10, fontWeight: '700', color: '#888888',
    backgroundColor: '#F5F5F5', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  consentDesc: {
    fontSize: 13, color: '#666666', lineHeight: 19,
  },
  link: {
    color: '#1A1A1A', fontWeight: '600',
    textDecorationLine: 'underline',
  },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 18 },
  gdprInfo: {
    marginTop: 16, backgroundColor: '#F5F5F5',
    borderRadius: 12, padding: 14,
  },
  gdprInfoText: {
    fontSize: 12, color: '#888888', lineHeight: 18,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopWidth: 1,
    borderTopColor: '#F0F0F0', paddingHorizontal: 24,
    paddingTop: 12, paddingBottom: 32, gap: 8,
  },
  footerHint: {
    fontSize: 12, color: '#AAAAAA', textAlign: 'center',
  },
  acceptButton: {
    backgroundColor: '#1A1A1A', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  acceptButtonDisabled: { opacity: 0.3 },
  acceptButtonText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '700',
  },
});