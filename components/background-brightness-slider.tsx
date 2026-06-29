"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { QuestionIcon } from "@phosphor-icons/react";
import { useBackgroundBrightnessFire } from "@/components/use-background-brightness-fire";
import styles from "./background-brightness-slider.module.css";
import type { BackgroundBrightness } from "@/components/providers";

const STEPS: BackgroundBrightness[] = [20, 40, 60, 80, 100];

function toSliderValue(value: BackgroundBrightness): number {
  return Math.max(0, STEPS.indexOf(value)) * 25;
}

function fromSliderValue(value: number): BackgroundBrightness {
  return STEPS[Math.round(value / 25)] ?? 100;
}

export function BackgroundBrightnessSlider({
  value,
  onChange,
  label,
  enabled,
}: {
  value: BackgroundBrightness;
  onChange: (value: BackgroundBrightness) => void;
  label: string;
  enabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawId = useId().replace(/:/g, "");
  const clipId = `brightness-squircle-${rawId}`;
  const clipTrackId = `brightness-squircle-track-${rawId}`;
  const sliderValue = toSliderValue(value);
  const isActive = sliderValue >= 100;
  const isFull = sliderValue === 100;
  const [isAnimating, setIsAnimating] = useState(false);

  const canvasMask = useMemo(() => {
    const p = Math.min(sliderValue + 2, 100);
    return {
      maskImage: `linear-gradient(to right, black 0%, black ${p}%, transparent ${p}%)`,
      WebkitMaskImage: `linear-gradient(to right, black 0%, black ${p}%, transparent ${p}%)`,
    };
  }, [sliderValue]);

  useEffect(() => {
    if (!isActive) {
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    const timer = window.setTimeout(() => setIsAnimating(false), 460);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  useBackgroundBrightnessFire(canvasRef, sliderValue, isActive, enabled);

  return (
    <>
      <svg className={styles.squircleClip} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path
              d="M 0.053,0
                 C 0.029,0 0.012,0.008 0.005,0.02
                 C 0.002,0.028 0,0.038 0,0.053
                 L 0,0.947
                 C 0,0.962 0.002,0.972 0.005,0.98
                 C 0.012,0.992 0.029,1 0.053,1
                 L 0.947,1
                 C 0.971,1 0.988,0.992 0.995,0.98
                 C 0.998,0.972 1,0.962 1,0.947
                 L 1,0.053
                 C 1,0.038 0.998,0.028 0.995,0.02
                 C 0.988,0.008 0.971,0 0.947,0
                 Z"
            />
          </clipPath>
          <clipPath id={clipTrackId} clipPathUnits="objectBoundingBox">
            <path
              d="M 0.033,0
                 C 0.018,0 0.007,0.012 0.003,0.035
                 C 0.001,0.055 0,0.1 0,0.15
                 L 0,0.85
                 C 0,0.9 0.001,0.945 0.003,0.965
                 C 0.007,0.988 0.018,1 0.033,1
                 L 0.967,1
                 C 0.982,1 0.993,0.988 0.997,0.965
                 C 0.999,0.945 1,0.9 1,0.85
                 L 1,0.15
                 C 1,0.1 0.999,0.055 0.997,0.035
                 C 0.993,0.012 0.982,0 0.967,0
                 Z"
            />
          </clipPath>
        </defs>
      </svg>

      <div className={styles.cardShadow}>
        <div className={styles.card} style={{ clipPath: `url(#${clipId})` }}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.labelText}>{label}</span>
              <span
                className={[
                  styles.statusText,
                  isActive ? styles.glowing : "",
                  isAnimating ? styles.animateUp : "",
                ].join(" ")}
              >
                {value}%
              </span>
            </div>
            <div className={styles.helpBtn} aria-hidden>
              <QuestionIcon size={18} />
            </div>
          </div>

          <div className={styles.scaleLabels}>
            <span>Darker</span>
            <span>Original</span>
          </div>

          <div
            className={[
              styles.trackWrapper,
              isActive ? styles.active : "",
              isFull ? styles.full : "",
            ].join(" ")}
            style={{ clipPath: `url(#${clipTrackId})` }}
          >
            <div className={styles.trackBg} />
            <div className={styles.dotsLayer}>
              {STEPS.map((step) => (
                <span className={styles.dot} key={step} />
              ))}
            </div>
            <canvas ref={canvasRef} className={styles.fireCanvas} style={canvasMask} />
            <input
              type="range"
              min="0"
              max="100"
              step="25"
              value={sliderValue}
              className={isActive ? styles.glowing : undefined}
              aria-label={label}
              onChange={(event) => onChange(fromSliderValue(Number(event.target.value)))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
