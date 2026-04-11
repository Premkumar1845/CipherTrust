"use client";

import { useEffect, useState } from "react";

interface AnimatedLogoProps {
    size?: number;
    className?: string;
    animate?: boolean;
}

export function AnimatedLogo({ size = 40, className = "", animate = true }: AnimatedLogoProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const s = size;
    const half = s / 2;
    const strokeW = s * 0.04;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
            <svg
                viewBox="0 0 100 100"
                width={s}
                height={s}
                className="drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]"
            >
                <defs>
                    {/* Main gradient */}
                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Animated gradient */}
                    <linearGradient id="animGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1">
                            {animate && mounted && (
                                <animate attributeName="stop-color" values="#6366f1;#8b5cf6;#22d3ee;#6366f1" dur="4s" repeatCount="indefinite" />
                            )}
                        </stop>
                        <stop offset="100%" stopColor="#a78bfa">
                            {animate && mounted && (
                                <animate attributeName="stop-color" values="#a78bfa;#22d3ee;#6366f1;#a78bfa" dur="4s" repeatCount="indefinite" />
                            )}
                        </stop>
                    </linearGradient>
                </defs>

                {/* Outer hex ring - spins slowly */}
                <g className={animate && mounted ? "crypto-loader" : ""} style={{ transformOrigin: "50px 50px" }}>
                    <polygon
                        points="50,8 85,27 85,73 50,92 15,73 15,27"
                        fill="none"
                        stroke="url(#animGrad)"
                        strokeWidth="1"
                        opacity="0.3"
                    />
                </g>

                {/* Shield shape */}
                <path
                    d="M50 16 L78 30 L78 58 C78 72 66 82 50 90 C34 82 22 72 22 58 L22 30 Z"
                    fill="rgba(99, 102, 241, 0.08)"
                    stroke="url(#logoGrad)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    className={animate && mounted ? "animate-pulse-slow" : ""}
                />

                {/* Blockchain nodes */}
                {/* Center node */}
                <circle cx="50" cy="50" r="4" fill="url(#logoGrad)" filter="url(#glow)">
                    {animate && mounted && (
                        <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
                    )}
                </circle>

                {/* Top node */}
                <circle cx="50" cy="32" r="2.5" fill="#818cf8" opacity="0.8">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                    )}
                </circle>

                {/* Bottom-left node */}
                <circle cx="36" cy="62" r="2.5" fill="#818cf8" opacity="0.8">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="1s" repeatCount="indefinite" />
                    )}
                </circle>

                {/* Bottom-right node */}
                <circle cx="64" cy="62" r="2.5" fill="#818cf8" opacity="0.8">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="2s" repeatCount="indefinite" />
                    )}
                </circle>

                {/* Connecting lines (blockchain links) */}
                <line x1="50" y1="32" x2="50" y2="46" stroke="#818cf8" strokeWidth="1" opacity="0.5">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
                    )}
                </line>
                <line x1="36" y1="62" x2="46" y2="52" stroke="#818cf8" strokeWidth="1" opacity="0.5">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" begin="0.7s" repeatCount="indefinite" />
                    )}
                </line>
                <line x1="64" y1="62" x2="54" y2="52" stroke="#818cf8" strokeWidth="1" opacity="0.5">
                    {animate && mounted && (
                        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" begin="1.4s" repeatCount="indefinite" />
                    )}
                </line>

                {/* Key shape in center (lock/crypto key) */}
                <circle cx="50" cy="48" r="6" fill="none" stroke="url(#animGrad)" strokeWidth="1.5" opacity="0.6" />
                <rect x="49" y="54" width="2" height="8" rx="1" fill="url(#animGrad)" opacity="0.6" />
                <rect x="51" y="58" width="4" height="1.5" rx="0.75" fill="url(#animGrad)" opacity="0.5" />
            </svg>

            {/* Ambient glow */}
            {animate && mounted && (
                <div
                    className="absolute inset-0 rounded-full animate-pulse-slow pointer-events-none"
                    style={{
                        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
                    }}
                />
            )}
        </div>
    );
}
