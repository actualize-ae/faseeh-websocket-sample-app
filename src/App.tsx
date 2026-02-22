import { useCallback, useEffect, useState } from "react";
import { useTTSWebSocket } from "./hooks/useTtsSocket";
import { pcm16ToFloat32 } from "./lib/audio";
import { StreamingPlayer } from "./components/StreamingPlayer";

const MODEL_OPTIONS = [
  { id: "faseeh-v1-preview", label: "V1 Faseeh Preview" },
  { id: "faseeh-mini-v1-preview", label: "V1 Faseeh Mini Preview" },
];

const WS_BASE_URL =
  typeof import.meta.env.VITE_WS_BASE_URL === "string"
    ? import.meta.env.VITE_WS_BASE_URL
    : "wss://api.faseeh.ai";

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_API_KEY || "");
  const [voiceId, setVoiceId] = useState("");
  const [modelId, setModelId] = useState("faseeh-v1-preview");
  const [text, setText] = useState("Hello, this is a test.");
  const [streamingChunks, setStreamingChunks] = useState<Float32Array[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);

  const {
    connect,
    sendText,
    clear,
    disconnect,
    connected,
    initialized,
    audioChunks,
    error,
  } = useTTSWebSocket(apiKey);

  // Sync WebSocket PCM chunks to float chunks for streaming playback (like main TTS)
  useEffect(() => {
    if (audioChunks.length === 0) {
      setStreamingChunks([]);
      return;
    }
    const floatChunks = audioChunks.map((c) => pcm16ToFloat32(c));
    setStreamingChunks(floatChunks);
  }, [audioChunks]);

  const handleConnect = useCallback(() => {
    if (!apiKey.trim() || !voiceId.trim()) return;
    clear();
    setStreamingChunks([]);
    setShowPlayer(false);
    connect({
      baseUrl: WS_BASE_URL,
      voiceId: voiceId.trim(),
      modelId: modelId || undefined,
    }).catch(() => {});
  }, [apiKey, voiceId, modelId, connect, clear]);

  const handleSend = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    setShowPlayer(true);
    sendText(t, { tryTrigger: true });
  }, [text, sendText]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setShowPlayer(false);
    setStreamingChunks([]);
  }, [disconnect]);

  const handleClosePlayer = useCallback(() => {
    setShowPlayer(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Faseeh TTS</h1>
        <p>WebSocket text-to-speech streaming demo</p>
      </header>

      <section className="card">
        <p className="card-title">Credentials &amp; voice</p>
        <div className="field">
          <label htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your API key"
            autoComplete="off"
          />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="voice-id">Voice ID</label>
            <input
              id="voice-id"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="e.g. voice_abc123"
            />
          </div>
          <div className="field">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="card-title">Text to speak</p>
        <div className="field">
          <label htmlFor="text">Text</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to speak..."
          />
        </div>
        <div className="actions">
          {!initialized ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!apiKey.trim() || !voiceId.trim() || connected}
            >
              {connected ? "Connecting…" : "Connect"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!text.trim()}
              >
                Send &amp; stream
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </section>

      <div className="status-bar">
        <span
          className={`status-pill ${
            initialized ? "connected" : connected ? "connecting" : ""
          }`}
        >
          {initialized
            ? "Connected"
            : connected
              ? "Connecting…"
              : "Not connected"}
        </span>
        {audioChunks.length > 0 && (
          <span className="chunk-count">{audioChunks.length} chunk(s)</span>
        )}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {showPlayer && (
        <StreamingPlayer
          streamingChunks={streamingChunks}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}
