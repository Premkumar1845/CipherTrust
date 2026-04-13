"use client";

import { useEffect, useState, useId } from "react";

interface AnimatedLogoProps {
    size?: number;
    className?: string;
    animate?: boolean;
}

export function AnimatedLogo({ size = 40, className = "", animate = true }: AnimatedLogoProps) {
    const [mounted, setMounted] = useState(false);
    const uid = useId().replace(/:/g, "");
    useEffect(() => setMounted(true), []);

    const s = size;
    const is3D = animate && mounted && s >= 64;

    return (
        <div
            className={`relative inline-flex items-center justify-center ${className}`}
            style={{
                width: s,
                height: s,
                perspective: is3D ? `${s * 4}px` : undefined,
            }}
        >
            {/* Outer glow ring - pulses */}
            {is3D && (
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: s * 1.5,
                        height: s * 1.5,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
                        animation: "logo3dGlowPulse 3s ease-in-out infinite",
                    }}
                />
            )}

            {/* 3D rotating container */}
            <div
                style={{
                    width: s,
                    height: s,
                    transformStyle: is3D ? "preserve-3d" : undefined,
                    animation: is3D ? "logo3dRotate 8s ease-in-out infinite" : undefined,
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    width={s}
                    height={s}
                    style={{
                        filter: is3D
                            ? "drop-shadow(0 0 20px rgba(99,102,241,0.5)) drop-shadow(0 0 40px rgba(139,92,246,0.2))"
                            : "drop-shadow(0 0 10px rgba(99,102,241,0.4))",
                    }}
                >
                    <defs>
                        {/* Main gradient */}
                        <linearGradient id={`lg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>

                        {/* Animated gradient */}
                        <linearGradient id={`ag-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
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

                        {/* Heavy glow filter */}
                        <filter id={`gl-${uid}`}>
                            <feGaussianBlur stdDeviation="2.5" result="b1" />
                            <feGaussianBlur stdDeviation="5" result="b2" />
                            <feMerge>
                                <feMergeNode in="b2" />
                                <feMergeNode in="b1" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Orbiting particle glow */}
                        <radialGradient id={`pg-${uid}`}>
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* ── Outer spinning hex ring ── */}
                    <g style={{ transformOrigin: "50px 50px", animation: animate && mounted ? "logo3dHexSpin 10s linear infinite" : undefined }}>
                        <polygon
                            points="50,5 89,25 89,75 50,95 11,75 11,25"
                            fill="none"
                            stroke={`url(#ag-${uid})`}
                            strokeWidth="0.8"
                            opacity="0.25"
                            strokeDasharray="4 3"
                        />
                    </g>

                    {/* ── Second counter-rotating ring ── */}
                    <g style={{ transformOrigin: "50px 50px", animation: animate && mounted ? "logo3dHexSpin 14s linear infinite reverse" : undefined }}>
                        <polygon
                            points="50,10 84,28 84,72 50,90 16,72 16,28"
                            fill="none"
                            stroke={`url(#ag-${uid})`}
                            strokeWidth="0.5"
                            opacity="0.15"
                            strokeDasharray="2 4"
                        />
                    </g>

                    {/* ── Shield body ── */}
                    <path
                        d="M50 14 L80 29 L80 59 C80 74 67 84 50 92 C33 84 20 74 20 59 L20 29 Z"
                        fill="rgba(99, 102, 241, 0.06)"
                        stroke={`url(#lg-${uid})`}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        filter={`url(#gl-${uid})`}
                    >
                        {animate && mounted && (
                            <animate attributeName="fill-opacity" values="0.06;0.12;0.06" dur="3s" repeatCount="indefinite" />
                        )}
                    </path>

                    {/* ── Inner shield highlight ── */}
                    <path
                        d="M50 22 L72 33 L72 56 C72 67 63 75 50 81 C37 75 28 67 28 56 L28 33 Z"
                        fill="none"
                        stroke={`url(#ag-${uid})`}
                        strokeWidth="0.6"
                        opacity="0.2"
                    />

                    {/* ── Blockchain network ── */}
                    {/* Center node - main */}
                    <circle cx="50" cy="50" r="5" fill={`url(#lg-${uid})`} filter={`url(#gl-${uid})`}>
                        {animate && mounted && (
                            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                        )}
                    </circle>
                    {/* Center node inner ring */}
                    <circle cx="50" cy="50" r="7" fill="none" stroke="#818cf8" strokeWidth="0.5" opacity="0.4">
                        {animate && mounted && (
                            <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite" />
                        )}
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* Top node */}
                    <circle cx="50" cy="28" r="3" fill="#818cf8" opacity="0.9">
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* Bottom-left node */}
                    <circle cx="33" cy="65" r="3" fill="#818cf8" opacity="0.9">
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="1s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* Bottom-right node */}
                    <circle cx="67" cy="65" r="3" fill="#818cf8" opacity="0.9">
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="2s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* Left-mid node */}
                    <circle cx="28" cy="42" r="2" fill="#a78bfa" opacity="0.6">
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" begin="0.5s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* Right-mid node */}
                    <circle cx="72" cy="42" r="2" fill="#a78bfa" opacity="0.6">
                        {animate && mounted && (
                            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" begin="1.5s" repeatCount="indefinite" />
                        )}
                    </circle>

                    {/* ── Connecting lines with traveling data packets ── */}
                    {/* Top to center */}
                    <line x1="50" y1="28" x2="50" y2="44" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
                    {animate && mounted && (
                        <circle r="1.2" fill="#22d3ee" opacity="0.9">
                            <animateMotion dur="1.5s" repeatCount="indefinite" path="M50,28 L50,44" />
                        </circle>
                    )}

                    {/* Bottom-left to center */}
                    <line x1="33" y1="65" x2="46" y2="53" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
                    {animate && mounted && (
                        <circle r="1.2" fill="#22d3ee" opacity="0.9">
                            <animateMotion dur="1.8s" repeatCount="indefinite" begin="0.6s" path="M33,65 L46,53" />
                        </circle>
                    )}

                    {/* Bottom-right to center */}
                    <line x1="67" y1="65" x2="54" y2="53" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
                    {animate && mounted && (
                        <circle r="1.2" fill="#22d3ee" opacity="0.9">
                            <animateMotion dur="1.8s" repeatCount="indefinite" begin="1.2s" path="M67,65 L54,53" />
                        </circle>
                    )}

                    {/* Left-mid to center */}
                    <line x1="28" y1="42" x2="44" y2="48" stroke="#a78bfa" strokeWidth="0.6" opacity="0.3" />
                    {animate && mounted && (
                        <circle r="0.8" fill="#a78bfa" opacity="0.7">
                            <animateMotion dur="2s" repeatCount="indefinite" begin="0.3s" path="M28,42 L44,48" />
                        </circle>
                    )}

                    {/* Right-mid to center */}
                    <line x1="72" y1="42" x2="56" y2="48" stroke="#a78bfa" strokeWidth="0.6" opacity="0.3" />
                    {animate && mounted && (
                        <circle r="0.8" fill="#a78bfa" opacity="0.7">
                            <animateMotion dur="2s" repeatCount="indefinite" begin="0.9s" path="M72,42 L56,48" />
                        </circle>
                    )}

                    {/* ── Key / lock emblem in center ── */}
                    <circle cx="50" cy="47" r="6.5" fill="none" stroke={`url(#ag-${uid})`} strokeWidth="1.5" opacity="0.7" />
                    <rect x="48.8" y="53.5" width="2.4" height="9" rx="1.2" fill={`url(#ag-${uid})`} opacity="0.7" />
                    <rect x="51.2" y="57" width="4.5" height="1.8" rx="0.9" fill={`url(#ag-${uid})`} opacity="0.6" />
                    <rect x="51.2" y="60" width="3" height="1.8" rx="0.9" fill={`url(#ag-${uid})`} opacity="0.5" />

                    {/* ── Orbiting particle ── */}
                    {animate && mounted && (
                        <circle r="1.5" fill={`url(#pg-${uid})`}>
                            <animateMotion
                                dur="6s"
                                repeatCount="indefinite"
                                path="M50,5 C89,5 89,95 50,95 C11,95 11,5 50,5"
                            />
                            <animate attributeName="opacity" values="0;1;1;0" dur="6s" repeatCount="indefinite" />
                        </circle>
                    )}
                </svg>
            </div>

            {/* Ambient glow layers */}
            {animate && mounted && (
                <>
                    <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: s * 0.6,
                            height: s * 0.6,
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                            animation: "logo3dGlowPulse 2s ease-in-out infinite",
                        }}
                    />
                </>
            )}

            {/* Inline keyframes */}
            {animate && mounted && (
                <style>{`
                    @keyframes logo3dRotate {
                        0% { transform: rotateY(0deg) rotateX(0deg); }
                        25% { transform: rotateY(15deg) rotateX(5deg); }
                        50% { transform: rotateY(0deg) rotateX(-3deg); }
                        75% { transform: rotateY(-15deg) rotateX(5deg); }
                        100% { transform: rotateY(0deg) rotateX(0deg); }
                    }
                    @keyframes logo3dHexSpin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes logo3dGlowPulse {
                        0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
                        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
                    }
                `}</style>
            )}
        </div>
    );
}
