import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_AUDIO_CHUNK_INTERVAL_MS = 500;

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'error';

type StartRecordingOptions = {
  timesliceMs?: number;
  onChunk: (blob: Blob) => void;
};

function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    '',
  ];

  return (
    candidates.find((mimeType) => {
      return mimeType === '' || MediaRecorder.isTypeSupported(mimeType);
    }) ?? ''
  );
}

function getPermissionErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return '麦克风权限被拒绝，请在浏览器地址栏开启麦克风权限。';
    }

    if (error.name === 'NotFoundError') {
      return '没有检测到可用麦克风。';
    }
  }

  return '无法访问麦克风，请检查浏览器权限和设备。';
}

export function useMediaRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [lastChunkSize, setLastChunkSize] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setRecordingState('idle');
  }, []);

  const startRecording = useCallback(
    async ({ onChunk, timesliceMs = DEFAULT_AUDIO_CHUNK_INTERVAL_MS }: StartRecordingOptions) => {
      if (mediaRecorderRef.current?.state === 'recording') {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器不支持麦克风录音。');
        setRecordingState('error');
        return;
      }

      try {
        setError(null);
        setRecordingState('requesting_permission');
        setChunkCount(0);
        setLastChunkSize(0);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        setHasPermission(true);

        const selectedMimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(
          stream,
          selectedMimeType ? { mimeType: selectedMimeType } : undefined,
        );
        mediaRecorderRef.current = mediaRecorder;
        setMimeType(mediaRecorder.mimeType || selectedMimeType || 'audio/webm');

        mediaRecorder.ondataavailable = (event) => {
          if (!event.data || event.data.size === 0) {
            return;
          }

          setChunkCount((count) => count + 1);
          setLastChunkSize(event.data.size);
          onChunk(event.data);
        };

        mediaRecorder.onerror = () => {
          setError('录音过程中出现错误，请重新开始。');
          setRecordingState('error');
          stopRecording();
        };

        mediaRecorder.start(timesliceMs);
        setRecordingState('recording');
      } catch (recordingError) {
        setError(getPermissionErrorMessage(recordingError));
        setHasPermission(false);
        setRecordingState('error');
        stopRecording();
      }
    },
    [stopRecording],
  );

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    recordingState,
    isRecording: recordingState === 'recording',
    isRequestingPermission: recordingState === 'requesting_permission',
    hasPermission,
    error,
    mimeType,
    chunkCount,
    lastChunkSize,
    startRecording,
    stopRecording,
  };
}
