import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { registerBackgroundSync } from '../src/sync/backgroundSync';

export default function RootLayout() {
  useEffect(() => { void registerBackgroundSync(); }, []);
  return <><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></>;
}
