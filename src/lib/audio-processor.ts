export class AudioProcessor {
  private audioContext: AudioContext;
  private mediaStreamSource: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private isProcessing: boolean = false;

  constructor(stream: MediaStream, onAudioData: (data: string) => void) {
    this.audioContext = new AudioContext();
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isProcessing) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const audioData = this.processAudioData(inputData);
      onAudioData(audioData);
    };

    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isProcessing = true;
  }

  private processAudioData(inputData: Float32Array): string {
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
    }

    // Convert to base64
    return btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
  }

  stop(): void {
    this.isProcessing = false;
    if (this.processor) {
      this.processor.disconnect();
      this.mediaStreamSource.disconnect();
    }
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}