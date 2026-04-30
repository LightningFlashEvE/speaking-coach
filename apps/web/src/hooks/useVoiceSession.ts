import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientToServerMessage,
  ServerToClientMessage,
  TranscriptEntry,
  VoiceSessionState,
} from '@speaking-coach/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:7539';

export function useVoiceSession(sessionId: string) {
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || wsRef.current) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}/ws/voice-sessions/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerToClientMessage;

      switch (message.type) {
        case 'state':
          setState(message.state);
          break;
        case 'transcript':
          setTranscript((previous) => {
            if (!message.isFinal && previous.at(-1)?.role === message.role) {
              return [...previous.slice(0, -1), message];
            }
            return [...previous, message];
          });
          break;
        case 'error':
          setError(message.message);
          break;
        case 'session_started':
        case 'ai_audio': {
          const byteCharacters = atob(message.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: message.mimeType });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          void audio.play();
          break;
        }
        case 'session_started':
        case 'correction':
          break;
      }
    };

    ws.onerror = () => {
      setError('WebSocket 连接出错');
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };
  }, [sessionId]);

  const sendMessage = useCallback((message: ClientToServerMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }

    setError('WebSocket 尚未连接，请稍后再试。');
    return false;
  }, []);

  const startSession = useCallback(
    (scenarioId: string, level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1') => {
      sendMessage({ type: 'start_session', scenarioId, level });
    },
    [sendMessage],
  );

  const sendTextMessage = useCallback(
    (text: string) => {
      return sendMessage({ type: 'text_message', text });
    },
    [sendMessage],
  );

  const sendPcmChunk = useCallback(
    (base64Chunk: string) => {
      return sendMessage({
        type: 'audio_chunk',
        data: base64Chunk,
        mimeType: 'audio/pcm', // We are explicitly capturing PCM now
      });
    },
    [sendMessage],
  );

  const requestHint = useCallback(() => {
    sendMessage({ type: 'hint' });
  }, [sendMessage]);

  const endSession = useCallback(() => {
    sendMessage({ type: 'end_session' });
  }, [sendMessage]);

  const close = useCallback(() => {
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    state,
    transcript,
    error,
    isConnected,
    connect,
    startSession,
    sendTextMessage,
    sendPcmChunk,
    requestHint,
    endSession,
    close,
  };
}
