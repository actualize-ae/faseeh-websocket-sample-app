import { useEffect, useRef, useState } from "react";
import {
  concatFloat32Arrays,
  float32ToWavBlob,
  SAMPLE_RATE,
} from "../lib/audio";

type Props = {
  streamingChunks: Float32Array[];
  onClose?: () => void;
};

export function StreamingPlayer({ streamingChunks, onClose }: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const playedChunksCountRef = useRef(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(true);

  const ensureContext = async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx({ sampleRate: SAMPLE_RATE });
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  };

  const stopPlayback = () => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch (_) {}
    });
    sourcesRef.current = [];
    setIsStreamingActive(false);
  };

  // Play new chunks as they arrive (stream like main TTS)
  useEffect(() => {
    if (streamingChunks.length === 0) return;

    const newChunks = streamingChunks.slice(playedChunksCountRef.current);
    if (newChunks.length === 0) return;

    setIsStreamingActive(true);
    let cancelled = false;

    const run = async () => {
      const ctx = await ensureContext();
      if (!ctx || cancelled) return;

      if (playedChunksCountRef.current === 0) {
        nextPlaybackTimeRef.current = ctx.currentTime + 0.05;
      }

      for (let i = 0; i < newChunks.length; i++) {
        if (cancelled) return;
        const chunk = newChunks[i];
        const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE);
        buffer.copyToChannel(new Float32Array(chunk), 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startAt = Math.max(
          nextPlaybackTimeRef.current,
          ctx.currentTime + 0.05
        );
        source.start(startAt);
        nextPlaybackTimeRef.current = startAt + buffer.duration;
        sourcesRef.current.push(source);
        playedChunksCountRef.current++;
      }

      // All current chunks are now scheduled; build replay URL
      if (playedChunksCountRef.current === streamingChunks.length) {
        const samples = concatFloat32Arrays(streamingChunks);
        if (samples.length > 0) {
          const blob = float32ToWavBlob(samples, SAMPLE_RATE);
          const url = URL.createObjectURL(blob);
          setCompletedUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setIsStreamingActive(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [streamingChunks]);

  // Cleanup when chunks cleared (e.g. new Connect)
  useEffect(() => {
    if (streamingChunks.length === 0) {
      playedChunksCountRef.current = 0;
      nextPlaybackTimeRef.current = 0;
      stopPlayback();
      setCompletedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [streamingChunks.length]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setCompletedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  return (
    <div className="player streaming">
      <div className="player-header">
        <label>Playback</label>
        {onClose && (
          <button type="button" className="close-btn" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      {isStreamingActive && streamingChunks.length > 0 && (
        <p className="streaming-status">
          Streaming… {streamingChunks.length} chunk(s)
        </p>
      )}
      {completedUrl && <audio key={completedUrl} src={completedUrl} controls />}
    </div>
  );
}
