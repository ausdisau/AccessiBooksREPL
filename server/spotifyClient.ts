import { SpotifyApi } from "@spotify/web-api-ts-sdk";

interface SpotifyTokens {
  accessToken: string;
  clientId: string;
  refreshToken: string;
  expiresIn: number;
}

let cachedTokens: SpotifyTokens | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<SpotifyTokens> {
  // Check if we have valid cached tokens
  if (cachedTokens && tokenExpiresAt > Date.now()) {
    return cachedTokens;
  }
  
  // Read Spotify credentials from environment variables
  const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const expiresIn = parseInt(process.env.SPOTIFY_TOKEN_EXPIRES_IN || "3600", 10);

  if (!accessToken || !clientId || !refreshToken) {
    throw new Error('Spotify credentials not configured. Please set SPOTIFY_ACCESS_TOKEN, SPOTIFY_REFRESH_TOKEN, and SPOTIFY_CLIENT_ID environment variables.');
  }
  
  // Cache the tokens with expiration
  cachedTokens = { accessToken, clientId, refreshToken, expiresIn };
  tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; // Expire 1 minute early for safety
  
  return cachedTokens;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableSpotifyClient() {
  const {accessToken, clientId, refreshToken, expiresIn} = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

// Check if Spotify connection is available
export async function isSpotifyConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
