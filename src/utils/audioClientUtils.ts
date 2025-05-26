// src/utils/audioClientUtils.ts
"use client";

import { AUDIO_SAMPLE_RATE } from "@/constants";

/**
 * Decodes a Base64 encoded string into a Uint8Array.
 * Runs on the client.
 */
export function decodeBase64_client(base64: string): Uint8Array {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Error in client-side decodeBase64:", e);
        throw e;
    }
}

/**
 * Decodes raw PCM audio data into a Web Audio API AudioBuffer.
 * IMPORTANT: This function uses AudioContext and is BROWSER-ONLY.
 */
export async function decodePcmToAudioBuffer_client(
    pcmData: Uint8Array,
    audioContext: AudioContext, // Client provides this
    sampleRate: number = AUDIO_SAMPLE_RATE,
    numChannels: number = 1
): Promise<AudioBuffer> {
    const numSamples = pcmData.length / 2 / numChannels;
    const audioBuffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
    const pcmInt16View = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
    const pcmFloat32 = new Float32Array(pcmInt16View.length);
    for (let i = 0; i < pcmInt16View.length; i++) {
        pcmFloat32[i] = pcmInt16View[i] / 32768.0;
    }
    if (numChannels === 1) {
        audioBuffer.copyToChannel(pcmFloat32, 0);
    } else {
        for (let i = 0; i < numChannels; i++) {
            const channelData = new Float32Array(numSamples);
            for (let j = 0; j < numSamples; j++) {
                channelData[j] = pcmFloat32[j * numChannels + i];
            }
            audioBuffer.copyToChannel(channelData, i);
        }
    }
    return audioBuffer;
}
