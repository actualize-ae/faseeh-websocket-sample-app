import { useCallback, useRef, useState } from "react";

export function useTTSWebSocket(apiKey: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Uint8Array[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sampleRateRef = useRef(24000);

  const connect = useCallback(
    async (options: {
      modelId?: string;
      voiceId: string;
      stability?: number;
      similarityBoost?: number;
      speed?: number;
      baseUrl?: string;
    }) => {
      const baseUrl = (options.baseUrl || "wss://api.faseeh.ai").replace(/\/$/, "");
      const path = `${baseUrl}/api/v1/websocket/text-to-speech`;
      const wsUrl = `${path}${path.includes("?") ? "&" : "?"}x-api-key=${encodeURIComponent(apiKey)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      return new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          setConnected(true);
          setError(null);
          ws.send(
            JSON.stringify({
              type: "initConnection",
              model_id: options.modelId || "faseeh-mini-v1-preview",
              voice_id: options.voiceId,
              voice_settings: {
                stability: options.stability ?? 0.5,
                similarity_boost: options.similarityBoost ?? 0.75,
                speed: options.speed ?? 1.0,
              },
              output_format: "pcm_24000",
              x_api_key: apiKey,
            })
          );
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "connectionInitialized") {
            setInitialized(true);
            resolve();
          } else if (data.type === "error") {
            setError(data.message || data.errorMessage);
            reject(new Error(data.message || data.errorMessage));
          } else if (data.audio !== undefined && data.audio) {
            const binaryString = atob(data.audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            sampleRateRef.current = data.sampleRate || 24000;
            setAudioChunks((prev) => [...prev, bytes]);
          }
        };

        ws.onerror = () => reject(new Error("WebSocket connection failed"));
        ws.onclose = () => {
          setConnected(false);
          setInitialized(false);
          wsRef.current = null;
        };
      });
    },
    [apiKey]
  );

  const sendText = useCallback(
    (text: string, options?: { flush?: boolean; tryTrigger?: boolean }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "text",
          text,
          flush: options?.flush ?? false,
          try_trigger_generation: options?.tryTrigger ?? false,
        })
      );
    },
    []
  );

  const clear = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "clear" }));
    setAudioChunks([]);
  }, []);

  const close = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "closeConnection" }));
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setInitialized(false);
  }, []);

  return {
    connect,
    sendText,
    clear,
    close,
    disconnect,
    connected,
    initialized,
    audioChunks,
    error,
    sampleRate: sampleRateRef.current,
  };
}
