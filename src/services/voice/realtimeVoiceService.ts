/**
 * OpenAI Realtime Voice API Service using WebRTC
 * Connects to OpenAI Realtime API via WebRTC for bidirectional audio streaming
 * Note: WebRTC requires react-native-webrtc for native platforms, or uses browser APIs on web
 */

import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getEphemeralToken } from '../ai/edgeFunctions';

export interface VoiceToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface VoiceResponse {
  transcript?: string;
  toolCalls?: VoiceToolCall[];
  audio?: ArrayBuffer; // Audio data from AI
}

export class RealtimeVoiceService {
  private peerConnection: RTCPeerConnection | null = null;
  private localAudioTrack: MediaStreamTrack | null = null;
  private remoteAudioTrack: MediaStreamTrack | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isConnected: boolean = false;
  private responseCallback: ((response: VoiceResponse) => void) | null = null;
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private recording: Audio.Recording | null = null;
  private playbackSound: Audio.Sound | null = null;

  /**
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<void> {
    try {
      // Get ephemeral token from Supabase Edge Function
      const token = await getEphemeralToken();

      // Create RTCPeerConnection
      const configuration: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };
      this.peerConnection = new RTCPeerConnection(configuration);

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to OpenAI (via Edge Function)
          this.sendIceCandidate(event.candidate, token);
        }
      };

      this.peerConnection.ontrack = (event) => {
        // Handle incoming audio track from OpenAI
        this.remoteAudioTrack = event.track;
        this.playRemoteAudio(event.track);
      };

      // Create data channel for tool calls and session updates
      this.dataChannel = this.peerConnection.createDataChannel('session', {
        ordered: true,
      });

      this.dataChannel.onmessage = (event) => {
        this.handleDataChannelMessage(event.data);
      };

      // Get user's microphone
      if (Platform.OS === 'web') {
        // Web platform - use browser APIs
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localAudioTrack = stream.getAudioTracks()[0];
        this.peerConnection.addTrack(this.localAudioTrack, stream);
      } else {
        // React Native - use expo-av for recording
        // Note: For full WebRTC in React Native, you'd need react-native-webrtc
        // For now, we'll set up audio recording with expo-av
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        // In production, you'd use react-native-webrtc here
        // For now, this is a placeholder that shows the structure
        console.log('WebRTC on native requires react-native-webrtc package');
      }

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      const answer = await this.sendOfferToOpenAI(offer, token);

      // Set remote description
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      this.isConnected = true;
      console.log('Connected to OpenAI Realtime API via WebRTC');
    } catch (error) {
      console.error('Error connecting to voice service:', error);
      throw error;
    }
  }

  /**
   * Disconnect from voice service
   */
  async disconnect(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack = null;
      }

      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      if (this.playbackSound) {
        await this.playbackSound.unloadAsync();
        this.playbackSound = null;
      }

      this.isConnected = false;
      console.log('Disconnected from voice service');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  /**
   * Send audio chunk to OpenAI (via WebRTC)
   */
  async sendAudio(audioChunk: ArrayBuffer): Promise<void> {
    if (!this.isConnected || !this.localAudioTrack) {
      throw new Error('Not connected to voice service');
    }

    // In WebRTC, audio is automatically streamed via the MediaStreamTrack
    // This method is kept for compatibility but audio is sent automatically
    // If you need to send pre-recorded audio chunks, you'd need to use
    // MediaRecorder or process the audio differently
  }

  /**
   * Set callback for voice responses
   */
  onResponse(callback: (response: VoiceResponse) => void): void {
    this.responseCallback = callback;
  }

  /**
   * Inject context (current word, phonemes, level) into the AI session
   * Returns false if voice service is not connected (non-blocking)
   */
  async injectContext(context: {
    currentWord: string;
    phonemes: string[];
    level: number;
  }): Promise<void> {
    if (!this.isConnected) {
      // Voice service not connected, silently return (non-blocking)
      return;
    }
    
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready, cannot inject context');
      return;
    }

    // Send context update via data channel
    this.dataChannel.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are helping a child learn to read. The current word is "${context.currentWord}" with phonemes: ${context.phonemes.join(', ')}. The child is at level ${context.level}. Provide encouraging feedback and help them pronounce the word correctly.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
        },
      })
    );
  }

  /**
   * Send offer SDP to OpenAI Realtime API
   */
  private async sendOfferToOpenAI(
    offer: RTCSessionDescriptionInit,
    token: string
  ): Promise<RTCSessionDescriptionInit> {
    // In production, this would call a Supabase Edge Function
    // that proxies the request to OpenAI Realtime API
    // For now, we'll use a placeholder that shows the structure

    const response = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'webrtc.offer',
          sdp: offer.sdp,
          type: offer.type,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send offer: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      type: 'answer',
      sdp: data.sdp,
    };
  }

  /**
   * Send ICE candidate to OpenAI
   */
  private async sendIceCandidate(
    candidate: RTCIceCandidate,
    token: string
  ): Promise<void> {
    // In production, this would call a Supabase Edge Function
    // For now, we'll log it
    console.log('Sending ICE candidate:', candidate);
  }

  /**
   * Handle messages from data channel
   */
  private handleDataChannelMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'response.audio_transcript.delta') {
        // Handle transcript updates
        if (this.responseCallback) {
          this.responseCallback({
            transcript: message.delta,
          });
        }
      } else if (message.type === 'response.audio_transcript.done') {
        // Handle final transcript
        if (this.responseCallback) {
          this.responseCallback({
            transcript: message.text,
          });
        }
      } else if (message.type === 'response.function_call_arguments.done') {
        // Handle tool calls
        if (this.responseCallback && message.function_call) {
          this.responseCallback({
            toolCalls: [
              {
                name: message.function_call.name,
                arguments: JSON.parse(message.function_call.arguments),
              },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Error handling data channel message:', error);
    }
  }

  /**
   * Play remote audio from OpenAI
   */
  private async playRemoteAudio(track: MediaStreamTrack): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use HTMLAudioElement
        if (typeof window !== 'undefined') {
          const stream = new MediaStream([track]);
          this.audioElement = new Audio();
          this.audioElement.srcObject = stream;
          await this.audioElement.play();
        }
      } else {
        // React Native - use expo-av
        // In production with react-native-webrtc, you'd convert the track to a format
        // that expo-av can play, or use react-native-webrtc's audio playback
        // For now, this is a placeholder
        console.log('Playing remote audio on native requires react-native-webrtc');
      }
    } catch (error) {
      console.error('Error setting up remote audio playback:', error);
    }
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();
