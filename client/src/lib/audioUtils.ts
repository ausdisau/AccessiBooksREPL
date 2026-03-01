/**
 * Client-side audio format utilities
 */

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'unknown';

export interface AudioFormatInfo {
  format: AudioFormat;
  mimeType: string;
  extension: string;
}

/**
 * Detects audio format from URL
 */
export function detectAudioFormat(url: string): AudioFormatInfo {
  const urlLower = url.toLowerCase();
  
  if (urlLower.endsWith('.mp3') || urlLower.includes('.mp3')) {
    return { format: 'mp3', mimeType: 'audio/mpeg', extension: '.mp3' };
  }
  if (urlLower.endsWith('.wav') || urlLower.includes('.wav')) {
    return { format: 'wav', mimeType: 'audio/wav', extension: '.wav' };
  }
  if (urlLower.endsWith('.ogg') || urlLower.endsWith('.oga') || urlLower.includes('.ogg')) {
    return { format: 'ogg', mimeType: 'audio/ogg', extension: '.ogg' };
  }
  
  return { format: 'unknown', mimeType: 'audio/mpeg', extension: '' };
}

/**
 * Checks if browser supports the audio format
 */
export function canPlayFormat(format: AudioFormat): boolean {
  const audio = document.createElement('audio');
  
  const formatChecks: Record<AudioFormat, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'unknown': 'audio/mpeg',
  };
  
  const canPlay = audio.canPlayType(formatChecks[format]);
  return canPlay === 'probably' || canPlay === 'maybe';
}

/**
 * Gets all supported formats by the browser
 */
export function getBrowserSupportedFormats(): AudioFormat[] {
  const audio = document.createElement('audio');
  const supported: AudioFormat[] = [];
  
  if (audio.canPlayType('audio/mpeg')) supported.push('mp3');
  if (audio.canPlayType('audio/wav')) supported.push('wav');
  if (audio.canPlayType('audio/ogg')) supported.push('ogg');
  
  return supported.length > 0 ? supported : ['mp3']; // Default to MP3 if detection fails
}

/**
 * Creates multiple source elements for HTML5 audio with fallbacks
 */
export function createAudioSources(url: string): Array<{ src: string; type: string }> {
  const formatInfo = detectAudioFormat(url);
  
  // If format is known, return single source with proper type
  if (formatInfo.format !== 'unknown') {
    return [{ src: url, type: formatInfo.mimeType }];
  }
  
  // If format is unknown, provide all possible sources as fallback
  // This allows the browser to choose the best supported format
  return [
    { src: url, type: 'audio/mpeg' }, // MP3 fallback
    { src: url, type: 'audio/wav' },  // WAV fallback
    { src: url, type: 'audio/ogg' },  // OGG fallback
  ];
}
