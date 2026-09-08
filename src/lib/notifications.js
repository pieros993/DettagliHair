import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import config from '../config/app.config';

// Configurazione comportamento notifiche in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  try {
    // Chiedi permesso
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Ottieni token Expo
    // Sostituisci il projectId hardcodato con:
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: config.expo.projectId,
    });
    const token = tokenData.data;

    // Configurazione specifica Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: config.app.name,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: config.theme.primary,
      });
    }

    // Salva token su Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user && token) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
    }

    return token;
  } catch (e) {
    console.log('Errore push token:', e);
    return null;
  }
}

// Notifica locale — usata per reminder prenotazione
export async function scheduleBookingReminder(booking) {
  const startAt = new Date(booking.start_at);

  // Reminder 1 ora prima
  const oneHourBefore = new Date(startAt.getTime() - 60 * 60 * 1000);
  if (oneHourBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✂ Appuntamento tra 1 ora',
        body: `${booking.service_name} con ${booking.operator_name}`,
        data: { bookingId: booking.id },
      },
      trigger: { date: oneHourBefore },
    });
  }

  // Reminder 15 minuti prima
  const fifteenMinBefore = new Date(startAt.getTime() - 15 * 60 * 1000);
  if (fifteenMinBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✂ Appuntamento tra 15 minuti',
        body: `${booking.service_name} con ${booking.operator_name} — stai arrivando?`,
        data: { bookingId: booking.id },
      },
      trigger: { date: fifteenMinBefore },
    });
  }
}

export async function cancelBookingReminder(bookingId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.bookingId === bookingId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}