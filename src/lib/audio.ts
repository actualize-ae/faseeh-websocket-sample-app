export const SAMPLE_RATE = 24000;

export function pcm16ToFloat32(pcm16Data: Uint8Array): Float32Array {
  const samples = pcm16Data.length / 2;
  const float32Array = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const int16 = (pcm16Data[i * 2 + 1] << 8) | pcm16Data[i * 2];
    const signedInt16 = int16 > 32767 ? int16 - 65536 : int16;
    float32Array[i] = signedInt16 / 32768.0;
  }
  return float32Array;
}

export function concatFloat32Arrays(arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function float32ToWavBlob(
  float32Array: Float32Array,
  sampleRate: number
): Blob {
  const length = float32Array.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
