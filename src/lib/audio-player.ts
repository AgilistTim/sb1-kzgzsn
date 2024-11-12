export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  async playAudio(base64Audio: string): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Stop any currently playing audio
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
      }

      const audioData = this.base64ToBuffer(base64Audio);
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.start();
      
      return new Promise((resolve) => {
        if (this.currentSource) {
          this.currentSource.onended = () => {
            this.currentSource?.disconnect();
            this.currentSource = null;
            resolve();
          };
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  cleanup(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}