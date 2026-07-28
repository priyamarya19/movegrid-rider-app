import * as Updates from 'expo-updates';

/**
 * Backend per EAS Update channel — same channel-is-truth pattern as the ops app
 * (EXPO_PUBLIC_API_URL is not reliably inlined by `eas update`). Dev (Expo Go /
 * no channel) targets UAT so a development build can never write production data.
 */
const BACKEND_BY_CHANNEL: Record<string, string> = {
  production: 'https://dash.movegrid.in',
  preview: 'https://dash-uat.movegrid.in',
};

export const API_BASE_URL: string =
  (Updates.channel && BACKEND_BY_CHANNEL[Updates.channel]) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://dash-uat.movegrid.in';
