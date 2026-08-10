import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type AudioState = {
  currentUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string;
  play: (url: string) => void;
  pause: () => void;
  toggle: (url: string) => void;
  seek: (url: string, time: number) => void;
};

const Ctx = createContext<AudioState | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof window !== "undefined") audioRef.current = new Audio();

  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setError("We couldn't play this note.");
      setIsLoading(false);
      setIsPlaying(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("error", onError);
    };
  }, []);

  const play = useCallback(
    (url: string) => {
      const a = audioRef.current;
      if (!a) return;
      if (currentUrl !== url) {
        a.src = url;
        setCurrentUrl(url);
        setCurrentTime(0);
        setDuration(0);
        setError("");
      }
      setIsLoading(true);
      a.play()
        .then(() => setIsLoading(false))
        .catch(() => {
          setError("We couldn't play this note.");
          setIsLoading(false);
        });
    },
    [currentUrl]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(
    (url: string) => {
      if (isPlaying && currentUrl === url) pause();
      else play(url);
    },
    [isPlaying, currentUrl, play, pause]
  );

  const seek = useCallback(
    (url: string, time: number) => {
      const a = audioRef.current;
      if (a && currentUrl === url) {
        a.currentTime = time;
        setCurrentTime(time);
      }
    },
    [currentUrl]
  );

  return (
    <Ctx.Provider value={{ currentUrl, isPlaying, currentTime, duration, isLoading, error, play, pause, toggle, seek }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}