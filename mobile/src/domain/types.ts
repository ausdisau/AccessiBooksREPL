export interface Book {
  id: string;
  title: string;
  author: string;
  narrator?: string | null;
  description?: string | null;
  duration: number;
  coverImage?: string | null;
  audioUrl: string;
  genre?: string | null;
  publishedYear?: number | null;
  source: string;
  sourceId?: string | null;
  totalTime?: string | null;
  language?: string | null;
}

export type ReadingMode = 'listen' | 'read' | 'read-along' | 'transcript-first';

export interface ExperienceProfile {
  schemaVersion: 1;
  visual: {
    textScale: number;
    contrast: 'system' | 'enhanced';
    theme: 'system' | 'light' | 'dark' | 'sepia';
    motion: 'system' | 'reduced';
    density: 'standard' | 'reduced';
    typography: 'standard' | 'reading-support';
  };
  interaction: {
    preferredInput: 'touch' | 'keyboard' | 'switch' | 'voice' | 'pointer' | 'system';
    targetSize: 'standard' | 'enhanced';
    confirmations: 'standard' | 'extra';
  };
  reading: {
    mode: ReadingMode;
    highlightMode: 'off' | 'sentence' | 'phrase';
    playbackRate: number;
  };
  didactic: {
    explanationDepth: 0 | 1 | 2 | 3;
    vocabularySupport: boolean;
    historicalContext: boolean;
    authorContext: boolean;
    pronunciationSupport: boolean;
    knowledgeChecks: boolean;
  };
  autonomy: {
    allowSuggestions: boolean;
    allowAutomaticChanges: false;
    explainAdaptations: true;
  };
}

export interface ExperienceProfilePatch {
  visual?: Partial<ExperienceProfile['visual']>;
  interaction?: Partial<ExperienceProfile['interaction']>;
  reading?: Partial<ExperienceProfile['reading']>;
  didactic?: Partial<ExperienceProfile['didactic']>;
  autonomy?: Partial<ExperienceProfile['autonomy']>;
}

export type ExperienceAction =
  | { type: 'PROPOSE_PROFILE_CHANGE'; patch: ExperienceProfilePatch }
  | { type: 'OPEN_CONTEXT'; contextType: 'author' | 'history' | 'vocabulary' }
  | { type: 'START_READ_ALONG' }
  | { type: 'RESTORE_PROFILE'; profileId: string }
  | { type: 'NO_UI_CHANGE' };

export interface BookCapabilities {
  canListen: boolean;
  canOpenExternalText: boolean;
  canReadNatively: boolean;
  canReadAlong: boolean;
  canLearn: boolean;
}
