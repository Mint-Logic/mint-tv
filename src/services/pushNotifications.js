import { supabase } from '../supabase';

// Helper to convert base64 VAPID key to Uint8Array for the browser
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(currentUser) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push notifications are not supported on this browser.');
    return false;
  }

  if (!currentUser) {
    alert('Please sign in to enable push notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Notification permission was denied.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('VITE_VAPID_PUBLIC_KEY is missing in .env');
      return false;
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // Subscribe browser to push service
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    // Save/Upsert to Supabase push_subscriptions table
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: currentUser.id,
        subscription: subscription.toJSON(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error saving subscription to Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribeUserFromPush(currentUser) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    if (currentUser) {
      await supabase.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    }
    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}