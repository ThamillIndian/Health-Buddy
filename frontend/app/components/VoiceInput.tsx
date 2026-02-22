'use client';

import { useState, useRef } from 'react';
import { useVoiceRecorder } from '@/app/hooks/useVoiceRecorder';
import { apiClient } from '@/app/utils/api';

interface VoiceInputProps {
  userId: string;
  language?: string;
  mode?: 'transcribe' | 'translate';
  onTranscribe: (text: string) => void;
  onNormalize?: (event: any) => void;
}

/**
 * VoiceInput Component
 * 
 * Allows users to record audio and transcribe it using Sarvam AI.
 * Supports multiple languages and modes (transcribe/translate).
 * Automatically normalizes transcribed text into structured health events.
 */
export default function VoiceInput({ 
  userId, 
  language = 'en-IN',
  mode = 'transcribe',
  onTranscribe,
  onNormalize 
}: VoiceInputProps) {
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [normalizedEvent, setNormalizedEvent] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isRecording,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
    supported,
  } = useVoiceRecorder();

  const handleRecord = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    setUploading(true);
    setError(null);
    setTranscript(''); // Clear previous transcript
    
    try {
      // Convert Blob to File for upload
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Transcribe using Sarvam AI
      const response = await apiClient.transcribeAudio(audioFile, language, mode);
      const transcribedText = response.data.transcript;
      
      // Show transcript immediately for testing
      setTranscript(transcribedText);
      onTranscribe(transcribedText);
      
      // Auto-normalize if callback provided (after showing transcript)
      if (onNormalize) {
        try {
          // Auto-detect language from transcript
          let detectedLanguage = language.split('-')[0]; // Default to provided language
          
          // Check for Tamil characters (Tamil Unicode range: 0B80-0BFF)
          if (/[\u0B80-\u0BFF]/.test(transcribedText)) {
            detectedLanguage = 'ta';
          }
          // Check for Hindi/Devanagari characters (Devanagari Unicode range: 0900-097F)
          else if (/[\u0900-\u097F]/.test(transcribedText)) {
            detectedLanguage = 'hi';
          }
          // Check for Hinglish patterns (Hindi words + English)
          else if (/\b(mera|meri|mujhe|maine|hai|li|le)\b/i.test(transcribedText)) {
            detectedLanguage = 'en'; // Hinglish uses English patterns
          }
          
          console.log(`Detected language: ${detectedLanguage} for transcript: "${transcribedText}"`);
          
          const normalizeResponse = await apiClient.normalizeText(
            transcribedText, 
            detectedLanguage
          );
          
          // Check if normalization was successful
          if (normalizeResponse.data && normalizeResponse.data.normalized_event) {
            const normalized = normalizeResponse.data.normalized_event;
            console.log('✅ Normalized event:', normalized);
            setNormalizedEvent(normalized); // Store for display
            onNormalize(normalized);
          } else {
            console.warn('⚠️ Normalization returned no event data');
            setNormalizedEvent(null);
          }
        } catch (err) {
          console.error('Normalization error:', err);
          setNormalizedEvent(null);
          // Don't show error to user - normalization is optional
        }
      }
      
      // Clear recording after successful transcription
      clearRecording();
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to transcribe audio';
      setError(errorMessage);
      console.error('Transcription error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/webm',
      'audio/m4a', 'audio/aac', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.includes(fileType) || 
      fileName.endsWith('.mp3') || fileName.endsWith('.mp4') || 
      fileName.endsWith('.wav') || fileName.endsWith('.m4a') ||
      fileName.endsWith('.webm') || fileName.endsWith('.aac') ||
      fileName.endsWith('.ogg') || fileName.endsWith('.mov');

    if (!isValidType) {
      setError('❌ Invalid file type. Please upload MP3, MP4, WAV, M4A, or WebM files.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('❌ File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  // Handle file upload and transcription
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    setTranscript(''); // Clear previous transcript
    
    try {
      // Transcribe using Sarvam AI
      const response = await apiClient.transcribeAudio(selectedFile, language, mode);
      const transcribedText = response.data.transcript;
      
      // Show transcript immediately for testing
      setTranscript(transcribedText);
      onTranscribe(transcribedText);
      
      // Auto-normalize if callback provided (after showing transcript)
      if (onNormalize) {
        try {
          // Auto-detect language from transcript
          let detectedLanguage = language.split('-')[0]; // Default to provided language
          
          // Check for Tamil characters (Tamil Unicode range: 0B80-0BFF)
          if (/[\u0B80-\u0BFF]/.test(transcribedText)) {
            detectedLanguage = 'ta';
          }
          // Check for Hindi/Devanagari characters (Devanagari Unicode range: 0900-097F)
          else if (/[\u0900-\u097F]/.test(transcribedText)) {
            detectedLanguage = 'hi';
          }
          // Check for Hinglish patterns (Hindi words + English)
          else if (/\b(mera|meri|mujhe|maine|hai|li|le)\b/i.test(transcribedText)) {
            detectedLanguage = 'en'; // Hinglish uses English patterns
          }
          
          console.log(`Detected language: ${detectedLanguage} for transcript: "${transcribedText}"`);
          
          const normalizeResponse = await apiClient.normalizeText(
            transcribedText, 
            detectedLanguage
          );
          
          // Check if normalization was successful
          if (normalizeResponse.data && normalizeResponse.data.normalized_event) {
            const normalized = normalizeResponse.data.normalized_event;
            console.log('✅ Normalized event:', normalized);
            setNormalizedEvent(normalized); // Store for display
            onNormalize(normalized);
          } else {
            console.warn('⚠️ Normalization returned no event data');
            setNormalizedEvent(null);
          }
        } catch (err) {
          console.error('Normalization error:', err);
          setNormalizedEvent(null);
        }
      }
      
      // Clear selected file after successful transcription
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to transcribe audio';
      setError(errorMessage);
      console.error('Transcription error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Show error if browser doesn't support recording
  if (!supported) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ Audio recording not supported in this browser. Please use file upload instead.
          </p>
        </div>
        
        {/* File Upload Section */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.aac,.ogg,.mov"
            onChange={handleFileSelect}
            className="hidden"
            id="audio-file-upload"
          />
          
          <label
            htmlFor="audio-file-upload"
            className="block w-full py-3 rounded-lg font-semibold text-center cursor-pointer transition bg-green-600 text-white hover:bg-green-700"
          >
            📁 Upload Audio/Video File
          </label>
          
          {selectedFile && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Selected:</strong> {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                Size: {formatFileSize(selectedFile.size)}
              </p>
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className={`w-full mt-2 py-2 rounded-lg font-semibold transition ${
                  uploading
                    ? 'bg-gray-400 text-white cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploading ? '⏳ Transcribing...' : '📤 Transcribe File'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recording Button */}
      <button
        onClick={handleRecord}
        disabled={uploading}
        className={`w-full py-4 rounded-lg font-semibold transition ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isRecording ? (
          <>🔴 Recording... Click to Stop</>
        ) : (
          <>🎤 Start Voice Recording</>
        )}
      </button>

      {/* File Upload Option - Right Below Recording Button */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.aac,.ogg,.mov"
          onChange={handleFileSelect}
          className="hidden"
          id="audio-file-upload"
        />
        
        <label
          htmlFor="audio-file-upload"
          className={`block w-full py-3 rounded-lg font-semibold text-center cursor-pointer transition ${
            uploading || isRecording
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          📁 Or Upload Audio/Video File (MP3, MP4, WAV, etc.)
        </label>
        
        {selectedFile && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">
                  📄 {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-red-500 hover:text-red-700 text-sm"
                disabled={uploading}
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={uploading}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                uploading
                  ? 'bg-gray-400 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <>⏳ Transcribing with Sarvam AI...</>
              ) : (
                <>📤 Transcribe File</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Audio Preview & Upload */}
      {audioBlob && !isRecording && (
        <div className="space-y-2">
          {audioUrl && (
            <audio 
              src={audioUrl} 
              controls 
              className="w-full"
            />
          )}
          
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              uploading
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {uploading ? (
              <>⏳ Transcribing with Sarvam AI...</>
            ) : (
              <>📤 Transcribe Audio</>
            )}
          </button>
          
          <button
            onClick={clearRecording}
            disabled={uploading}
            className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            🗑️ Clear Recording
          </button>
        </div>
      )}

      {/* Show loading state during transcription */}
      {uploading && !transcript && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            <p className="text-yellow-800 font-medium">
              ⏳ Transcribing audio with Sarvam AI...
            </p>
          </div>
        </div>
      )}

      {/* Transcript Display - Enhanced for Testing */}
      {transcript && (
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📝</span>
            <h4 className="font-bold text-lg text-blue-900">Transcription Result (Testing)</h4>
          </div>
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="text-base font-semibold text-gray-800 break-words">
              "{transcript}"
            </p>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            ✅ Raw transcript from Sarvam AI • Length: {transcript.length} characters
          </p>
        </div>
      )}

      {/* Normalized Event Display - For Debugging */}
      {normalizedEvent && (
        <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔍</span>
            <h4 className="font-bold text-lg text-purple-900">Normalized Event (Debug)</h4>
          </div>
          <div className="bg-white p-3 rounded border border-purple-200">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Type:</strong> <span className="font-semibold text-purple-700">{normalizedEvent.type}</span>
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Payload:</strong>
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(normalizedEvent.payload, null, 2)}
            </pre>
            {normalizedEvent.confidence && (
              <p className="text-xs text-gray-600 mt-2">
                Confidence: {(normalizedEvent.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || recorderError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            ❌ {error || recorderError}
          </p>
        </div>
      )}

      {/* Info Footer */}
      <p className="text-xs text-gray-500 text-center">
        Using Sarvam AI Saaras v3 • Mode: {mode} • Language: {language}
      </p>
    </div>
  );
}
