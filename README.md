# Faseeh WebSocket TTS Demo

Minimal demo for Faseeh text-to-speech over WebSocket: textarea, model select, voice ID input, and a simple audio player.

## Setup

```bash
npm install
```

## Configure

Copy `.env.example` to `.env` and set:

- `VITE_WS_BASE_URL` – WebSocket base URL (default: `wss://api.faseeh.ai`)
- `VITE_API_KEY` – Optional default API key (can also be entered in the UI)

## Run

```bash
npm run dev
```

Then open the app, enter your **API key** and **Voice ID**, click **Connect**, then type text and click **Send to WebSocket**. Playback appears when chunks are received.

## Build

```bash
npm run build
npm run preview
```

## Structure

- `src/hooks/useTtsSocket.ts` – WebSocket TTS hook (connect, sendText, clear, disconnect)
- `src/lib/audio.ts` – PCM16 → Float32, concat, Float32 → WAV blob
- `src/App.tsx` – UI: API key, voice ID, model select, textarea, connect/send, simple `<audio>` player

No voice list, no modals—just the essentials to test the WebSocket TTS flow.
# faseeh-websokcet-sample-app
