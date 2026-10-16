"use client"

import { useEffect, useState } from "react"

const BAR_COUNT = 24
const SAMPLE_INTERVAL_MS = 80

interface WaveformSample {
  stream: MediaStream
  levels: number[]
}

/** Observe the recorder's stream. This hook never acquires or stops microphone tracks. */
export function useRecordingWaveform(stream: MediaStream | null, reducedMotion: boolean) {
  const [sample, setSample] = useState<WaveformSample | null>(null)

  useEffect(() => {
    if (!stream?.active || reducedMotion || typeof AudioContext === "undefined") return

    let context: AudioContext | undefined
    let source: MediaStreamAudioSourceNode | undefined
    let analyser: AnalyserNode | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    let disposed = false
    const tracks = stream.getAudioTracks()

    const dispose = () => {
      if (disposed) return
      disposed = true
      clearInterval(timer)
      tracks.forEach((track) => track.removeEventListener("ended", end))
      source?.disconnect()
      analyser?.disconnect()
      if (context && context.state !== "closed") void context.close().catch(() => {})
    }
    const end = () => {
      if (disposed) return
      dispose()
      setSample((current) => (current?.stream === stream ? null : current))
    }

    try {
      const audioContext = new AudioContext()
      context = audioContext
      source = audioContext.createMediaStreamSource(stream)
      const audioAnalyser = audioContext.createAnalyser()
      analyser = audioAnalyser
      audioAnalyser.fftSize = 512
      source.connect(audioAnalyser)
      const samples = new Float32Array(audioAnalyser.fftSize)
      let levels = Array<number>(BAR_COUNT).fill(0)

      const measure = () => {
        if (disposed) return
        if (!stream.active || context?.state !== "running") {
          end()
          return
        }
        audioAnalyser.getFloatTimeDomainData(samples)
        const energy = samples.reduce((sum, value) => sum + value * value, 0) / samples.length
        // Silence stays flat; each new bar represents measured microphone amplitude.
        const level = Math.min(1, Math.max(0, Math.sqrt(energy) - 0.008) * 5)
        levels = [...levels.slice(1), level]
        setSample({ stream, levels })
      }

      tracks.forEach((track) => track.addEventListener("ended", end))
      const start = async () => {
        if (audioContext.state === "suspended") await audioContext.resume()
        if (disposed) return
        measure()
        if (!disposed) timer = setInterval(measure, SAMPLE_INTERVAL_MS)
      }
      // Visualization is optional: a denied AudioContext must not interrupt transcription.
      void start().catch(end)
    } catch {
      end()
    }

    return dispose
  }, [stream, reducedMotion])

  return !reducedMotion && sample?.stream === stream ? sample.levels : null
}
