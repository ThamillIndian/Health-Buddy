'use client';

import { useRef, useState } from 'react';
import { apiClient } from '@/app/utils/api';

interface VoiceInputProps {
  userId: string;
  onComplete?: () => void;
}

export default function VoiceInput({ userId, onComplete }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [transcription, setTranscription] = useState('');
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('en-IN');

  const startRecording = async () => {
    try {
      setMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        chunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        sendToBackend();
      });

      mediaRecorder.start();
      setRecording(true);
      setMessage('🎤 Recording... Speak now!');
    } catch (error) {
      setMessage('❌ Microphone access denied. Please allow microphone access.');
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      setMessage('⏳ Processing audio...');
    }
  };

  const sendToBackend = async () => {
    try {
      setTranscribing(true);
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('language', language);

      // Send to backend for transcription via Sarvam
      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe');
      }

      const result = await response.json();
      setTranscription(result.transcript || '');
      setMessage('✅ Transcription complete! Review and confirm.');
      
      // Auto-parse and suggest logging
      await parseAndSuggestLogging(result.transcript);
    } catch (error) {
      setMessage('❌ Transcription failed. Please try again.');
      console.error('Transcription error:', error);
    } finally {
      setTranscribing(false);
    }
  };

  const parseAndSuggestLogging = async (text: string) => {
    // Simple parsing for vitals
    const glucoseMatch = text.match(/(\d+)\s*(glucose|sugar)/i);
    const bpMatch = text.match(/(\d+)\s*[/-]\s*(\d+)\s*(bp|blood pressure)/i);
    const symptomMatch = text.match(/(headache|fever|cough|nausea|dizziness)/i);

    let eventType = 'note';
    let payload: any = { raw_text: text };

    if (glucoseMatch) {
      eventType = 'vital';
      payload.glucose = parseInt(glucoseMatch[1]);
    } else if (bpMatch) {
      eventType = 'vital';
      payload.bp = `${bpMatch[1]}/${bpMatch[2]}`;
    } else if (symptomMatch) {
      eventType = 'symptom';
      payload.name = symptomMatch[1];
      payload.severity = 2; // Default to moderate
    }

    // Ask for confirmation
    const confirmed = confirm(
      `Parsed as: ${eventType.toUpperCase()}\n${JSON.stringify(payload, null, 2)}\n\nLog this?`
    );

    if (confirmed) {
      try {
        await apiClient.logEvent(userId, {
          type: eventType,
          payload,
          source: 'voice',
          language: language,
          raw_text: text,
        });
        setMessage('✅ Event logged successfully!');
        setTranscription('');
        setTimeout(() => onComplete?.(), 1500);
      } catch (error) {
        setMessage('❌ Failed to log event');
        console.error('Logging error:', error);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="font-bold text-lg text-gray-800 mb-4">🎤 Voice Input</h3>

      {/* Language Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        >
          <option value="en-IN">🇮🇳 English (India)</option>
          <option value="hi-IN">🇮🇳 हिंदी (Hindi)</option>
          <option value="ta-IN">🇮🇳 தமிழ் (Tamil)</option>
          <option value="te-IN">🇮🇳 తెలుగు (Telugu)</option>
          <option value="kn-IN">🇮🇳 ಕನ್ನಡ (Kannada)</option>
          <option value="ml-IN">🇮🇳 മലയാളം (Malayalam)</option>
          <option value="mr-IN">🇮🇳 मराठी (Marathi)</option>
          <option value="gu-IN">🇮🇳 ગુજરાતી (Gujarati)</option>
        </select>
      </div>

      {/* Recording Button */}
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={transcribing}
        className={`w-full py-4 rounded-lg font-bold text-white transition mb-4 ${
          recording
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700'
        } disabled:bg-gray-400`}
      >
        {recording ? (
          <>
            <span className="text-2xl">⏹️</span> Stop Recording
          </>
        ) : (
          <>
            <span className="text-2xl">🎤</span> {transcribing ? 'Processing...' : 'Start Recording'}
          </>
        )}
      </button>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded mb-4 text-center ${
          message.includes('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : message.includes('❌')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="p-4 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">📝 Transcription:</p>
          <p className="text-gray-800 font-medium">{transcription}</p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-900 font-semibold mb-2">💡 Tips for best results:</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• "My blood pressure is 140 over 90"</li>
          <li>• "Glucose level 120"</li>
          <li>• "I have a headache"</li>
          <li>• "Took my metformin"</li>
        </ul>
      </div>
    </div>
  );
}
