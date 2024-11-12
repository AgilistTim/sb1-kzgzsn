import { CONFIG } from './config';
import { RealtimeClient } from './realtime-client';
import { EventEmitter } from './event-emitter';

export class AudioService extends EventEmitter {
  private client: RealtimeClient;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor() {
    super();
    this.client = new RealtimeClient();
    this.setupClientHandlers();
  }

  private setupClientHandlers() {
    this.client.on('error', (error) => {
      console.error('Audio service error:', error);
      this.emit('error', error);
    });

    this.client.on('response.audio.delta', (event) => {
      this.emit('audioData', event.delta);
    });

    this.client.on('response.text.delta', (event) => {
      this.emit('transcript', event.delta);
    });
  }

  public async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: CONFIG.audio.sampleRate,
          channelCount: CONFIG.audio.channelCount,
          echoCancellation: CONFIG.audio.echoCancellation,
          noiseSuppression: CONFIG.audio.noiseSuppression
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.processAudioChunk(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.emit('recordingStarted');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.emit('error', error);
    }
  }

  private async processAudioChunk(chunk: Blob) {
    try {
      const buffer = await chunk.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(buffer))
      );

      this.client.send({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      });
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      this.emit('error', error);
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.emit('recordingStopped');
    }
  }

  public disconnect() {
    this.stopRecording();
    this.client.disconnect();
  }
}