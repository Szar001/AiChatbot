"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { authFetch } from "./auth";

/**
 * Uploads a pre-recorded audio file to the backend for transcription, as an
 * alternative to live microphone dictation. Returns the transcribed text, or
 * throws with a user-facing message if transcription isn't available.
 */
export async function transcribeAudioFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch("/api/v1/speech/transcribe", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Transcription failed.");
  }
  return data.text;
}

/**
 * Web Speech API dictation hook.
 *
 * `onResult(text)` is called with each finalized speech segment so the caller
 * can append it to an input box. Support is detected after mount (not during
 * SSR, where `window` is undefined) and recognition errors are surfaced via
 * the returned `error` string instead of failing silently.
 */
export function useSpeechToText(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  // Keep the latest onResult so the recognition callback never uses a stale one.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Detect support on the client only, after hydration.
  useEffect(() => {
    const Supported =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(!!Supported);
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }
      const cleaned = finalText.trim();
      if (cleaned) {
        onResultRef.current?.(cleaned);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was denied. Enable it in your browser settings.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setError(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      // start() throws if called while already started; reset state.
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, error, startListening, stopListening };
}
