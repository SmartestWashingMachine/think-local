// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ttsInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadPromise: Promise<any> | null = null;

async function detectWebGPU(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const adapter = await (navigator.gpu as GPU).requestAdapter();
      return !!adapter;
    }
  } catch {
    // ignore
  }
  return false;
}

async function getOrLoadTTS(): Promise<unknown> {
  if (ttsInstance) return ttsInstance;

  if (!loadPromise) {
    loadPromise = (async () => {
      const { KokoroTTS } = await import('kokoro-js');
      const hasWebGPU = await detectWebGPU();
      const device = hasWebGPU ? 'webgpu' : 'wasm';
      const dtype = hasWebGPU ? 'fp32' : 'q8';

      ttsInstance = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        { dtype, device },
      );
      return ttsInstance;
    })();
  }

  return loadPromise;
}

export async function speakText(text: string, voice: string): Promise<void> {
  const tts = await getOrLoadTTS();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await (tts as any).generate(text, { voice });

  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const buffer = audioCtx.createBuffer(1, result.audio.length, result.sampling_rate);
  buffer.getChannelData(0).set(result.audio);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();

  return new Promise((resolve) => {
    source.onended = () => {
      audioCtx.close();
      resolve();
    };
  });
}
