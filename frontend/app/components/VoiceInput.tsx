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
    
    try {
      // Convert Blob to File for upload
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Transcribe using Sarvam AI
      const response = await apiClient.transcribeAudio(audioFile, language, mode);
      const transcribedText = response.data.transcript;
      
      setTranscript(transcribedText);
      onTranscribe(transcribedText);
      
      // Auto-normalize if callback provided
      if (onNormalize) {
        try {
          const normalizeResponse = await apiClient.normalizeText(
            transcribedText, 
            language.split('-')[0] // Extract language code (e.g., 'en' from 'en-IN')
          );
          onNormalize(normalizeResponse.data.normalized_event);
        } catch (err) {
          console.error('Normalization error:', err);
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
    
    try {
      // Transcribe using Sarvam AI
      const response = await apiClient.transcribeAudio(selectedFile, language, mode);
      const transcribedText = response.data.transcript;
      
      setTranscript(transcribedText);
      onTranscribe(transcribedText);
      
      // Auto-normalize if callback provided
      if (onNormalize) {
        try {
          const normalizeResponse = await apiClient.normalizeText(
            transcribedText, 
            language.split('-')[0]
          );
          onNormalize(normalizeResponse.data.normalized_event);
        } catch (err) {
          console.error('Normalization error:', err);
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

      {/* Transcript Display */}
      {transcript && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-1">
            <strong>✅ Transcribed:</strong>
          </p>
          <p className="text-green-800 font-medium">{transcript}</p>
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
