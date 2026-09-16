import { Platform } from 'react-native';

const FALLBACK_PORT = 4000;

/**
 * Best-guess API base URL when EXPO_PUBLIC_API_URL isn't set (see
 * .env.example). Simulators/emulators can usually reach a backend running
 * on the host machine, but the address differs by platform:
 *  - Android's emulator can't resolve "localhost" to the host machine — it
 *    maps the special address 10.0.2.2 to the host instead.
 *  - iOS simulators and Expo web can use "localhost" directly.
 *  - A PHYSICAL phone/tablet is on its own Wi-Fi interface and can reach
 *    neither — it needs the host computer's real LAN IP address. That case
 *    always requires EXPO_PUBLIC_API_URL to be set explicitly; there's no
 *    way to guess it.
 */
function guessDefaultApiUrl() {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${FALLBACK_PORT}/api`;
  }
  return `http://localhost:${FALLBACK_PORT}/api`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || guessDefaultApiUrl();
