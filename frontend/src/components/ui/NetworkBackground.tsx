"use client";

import { useEffect, useRef } from "react";

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
}

export function NetworkBackground({ nodeCount = 50, className = "" }: { nodeCount?: number; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef<Node[]>([]);
    const animRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();

        // Initialize nodes
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        nodesRef.current = Array.from({ length: nodeCount }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
        }));

        const maxDist = 150;

        const draw = () => {
            const cw = canvas.offsetWidth;
            const ch = canvas.offsetHeight;
            ctx.clearRect(0, 0, cw, ch);

            const nodes = nodesRef.current;

            // Update positions
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > cw) n.vx *= -1;
                if (n.y < 0 || n.y > ch) n.vy *= -1;
                n.x = Math.max(0, Math.min(cw, n.x));
                n.y = Math.max(0, Math.min(ch, n.y));
            }

            // Draw connections
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${n.opacity})`;
                ctx.fill();

                // Glow effect
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${n.opacity * 0.1})`;
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(draw);
        };

        draw();

        const handleResize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", handleResize);
        };
    }, [nodeCount]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
            style={{ opacity: 0.6 }}
        />
    );
}
