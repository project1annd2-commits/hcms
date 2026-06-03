// Voice preference helper for speech synthesis

const VOICE_STORAGE_KEY = 'preferred_voice_uri';

export function getPreferredVoice(): Promise<SpeechSynthesisVoice | null> {
    return new Promise((resolve) => {
        const savedUri = localStorage.getItem(VOICE_STORAGE_KEY);

        const tryGetVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                resolve(null);
                return;
            }

            if (savedUri) {
                const found = voices.find(v => v.voiceURI === savedUri);
                if (found) {
                    resolve(found);
                    return;
                }
            }

            // Default to a good English voice
            const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('en'))
                || voices[0];
            resolve(englishVoice || null);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            tryGetVoice();
        } else {
            window.speechSynthesis.onvoiceschanged = tryGetVoice;
            // Timeout fallback
            setTimeout(() => resolve(null), 1000);
        }
    });
}

export function setPreferredVoice(voiceUri: string) {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceUri);
}

export function getAllVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices();
}

export default function VoiceSummary() {
    return null;
}
