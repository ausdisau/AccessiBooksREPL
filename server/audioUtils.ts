/**
 * Audio format utilities for supporting MP3, WAV, and OGG formats
 */

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'unknown';

export interface AudioFormatInfo {
  format: AudioFormat;
  mimeType: string;
  extension: string;
}

/**
 * Detects audio format from URL or file extension
 */
export function detectAudioFormat(url: string): AudioFormatInfo {
  const urlLower = url.toLowerCase();
  
  // Check for explicit file extension
  if (urlLower.endsWith('.mp3')) {
    return { format: 'mp3', mimeType: 'audio/mpeg', extension: '.mp3' };
  }
  if (urlLower.endsWith('.wav')) {
    return { format: 'wav', mimeType: 'audio/wav', extension: '.wav' };
  }
  if (urlLower.endsWith('.ogg') || urlLower.endsWith('.oga')) {
    return { format: 'ogg', mimeType: 'audio/ogg', extension: '.ogg' };
  }
  
  // Check query parameters or path segments for format hints
  const mp3Pattern = /\.mp3|format=mp3|type=mp3/i;
  const wavPattern = /\.wav|format=wav|type=wav/i;
  const oggPattern = /\.ogg|\.oga|format=ogg|type=ogg/i;
  
  if (mp3Pattern.test(url)) {
    return { format: 'mp3', mimeType: 'audio/mpeg', extension: '.mp3' };
  }
  if (wavPattern.test(url)) {
    return { format: 'wav', mimeType: 'audio/wav', extension: '.wav' };
  }
  if (oggPattern.test(url)) {
    return { format: 'ogg', mimeType: 'audio/ogg', extension: '.ogg' };
  }
  
  // Default: assume MP3 (most common format)
  return { format: 'unknown', mimeType: 'audio/mpeg', extension: '' };
}

/**
 * Gets MIME type for audio format
 */
export function getAudioMimeType(format: AudioFormat): string {
  const mimeTypes: Record<AudioFormat, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'unknown': 'audio/mpeg', // Default to MP3
  };
  
  return mimeTypes[format];
}

/**
 * Validates if the audio format is supported
 */
export function isSupportedAudioFormat(format: AudioFormat): boolean {
  return format === 'mp3' || format === 'wav' || format === 'ogg';
}

/**
 * Gets browser-compatible audio formats based on user agent
 * Modern browsers support all three formats
 */
export function getSupportedFormats(): AudioFormat[] {
  return ['mp3', 'wav', 'ogg'];
}
