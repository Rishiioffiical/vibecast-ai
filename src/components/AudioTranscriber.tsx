import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { getApiHeaders } from '../utils/apiClient';

interface AudioTranscriberProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
}

export const AudioTranscriber: React.FC<AudioTranscriberProps> = ({
  onTranscriptionComplete,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleSendForTranscription(audioBlob, mimeType);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      onError(err.message || 'Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSendForTranscription = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);

      const base64Audio = await base64Promise;

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed on server');
      }

      const data = await response.json();
      if (data.transcription) {
        onTranscriptionComplete(data.transcription);
      } else {
        throw new Error('No speech detected.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      onError(err.message || 'Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
      setRecordSeconds(0);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#B83848] hover:bg-[#9E2A3B] text-white animate-pulse shadow-md cursor-pointer transition-colors"
          title="Stop recording"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span className="font-mono-numbers">{recordSeconds}s</span>
          <span>Stop Voice Input</span>
        </button>
      ) : isTranscribing ? (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#FAF7EF] border border-[#B83848] text-[#B83848] cursor-wait shadow-sm"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B83848]" />
          <span>Transcribing Speech...</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#FAF7EF] hover:bg-[#F2ECE0] border border-[#D5CABB] text-[#2C382E] hover:text-[#18221A] transition-all cursor-pointer shadow-xs"
          title="Dictate with microphone (Gemini 3.5 Transcribe)"
        >
          <Mic className="w-4 h-4 text-[#B83848]" />
          <span>Dictate</span>
        </button>
      )}
    </div>
  );
};
