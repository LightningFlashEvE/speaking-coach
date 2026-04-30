import { useCallback, useEffect, useRef, useState } from 'react';

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'error';

type StartRecordingOptions = {
  onChunk: (base64Chunk: string) => void;
};

export function usePcmRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecordingState('idle');
  }, []);

  const startRecording = useCallback(
    async ({ onChunk }: StartRecordingOptions) => {
      if (recordingState === 'recording') return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器不支持麦克风录音。');
        setRecordingState('error');
        return;
      }

      try {
        setError(null);
        setRecordingState('requesting_permission');

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        setHasPermission(true);

        // For Aliyun Bailian DashScope qwen realtime, we usually need 16kHz PCM.
        // We set the AudioContext sampleRate to 16000.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        await audioContext.audioWorklet.addModule('/pcm-worker.js');

        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        const workletNode = new AudioWorkletNode(audioContext, 'pcm-worker');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          // Convert ArrayBuffer to Base64
          const bytes = new Uint8Array(event.data);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          onChunk(base64);
        };

        sourceNode.connect(workletNode);
        workletNode.connect(audioContext.destination);

        setRecordingState('recording');
      } catch (err) {
        setError('无法访问麦克风，请检查浏览器权限和设备。');
        setHasPermission(false);
        setRecordingState('error');
        stopRecording();
      }
    },
    [recordingState, stopRecording],
  );

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    recordingState,
    isRecording: recordingState === 'recording',
    hasPermission,
    error,
    startRecording,
    stopRecording,
  };
}
