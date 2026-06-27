import { useRef, useEffect } from 'react';
import './Antigravity.css';

export default function Antigravity({
    count = 300,
    magnetRadius = 10,
    ringRadius = 15,
    waveSpeed = 0.4,
    waveAmplitude = 1.5,
    particleSize = 1.5,
    lerpSpeed = 0.1,
    color = "#3b82f6",
    autoAnimate = true,
    particleVariance = 1,
    rotationSpeed = 0.1,
    depthFactor = 1.5,
    pulseSpeed = 1,
    particleShape = "capsule",
    fieldStrength = 8
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Resize handler
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize Particles
        const particles = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                angle: angle,
                baseSize: (0.5 + Math.random() * particleVariance) * particleSize,
                phase: Math.random() * Math.PI * 2,
                speedMultiplier: 0.5 + Math.random() * 0.5,
                depth: Math.random(), // 3D depth layer
            });
        }

        let globalRotation = 0;
        let time = 0;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            time += 0.01;
            globalRotation += rotationSpeed * 0.005;

            particles.forEach((p) => {
                // 1. Calculate Target Position on the Magnetic Ring
                const currentAngle = p.angle + globalRotation;

                // Dynamic Wave displacement (creates the moving/fluid ring effect)
                const wave = Math.sin(p.phase + time * waveSpeed * 10) * waveAmplitude * 20;

                // Calculate raw target coordinates based on ringRadius and magnetRadius
                const radius = (ringRadius * 15) + wave;
                const targetX = centerX + Math.cos(currentAngle) * radius;
                const targetY = centerY + Math.sin(currentAngle) * radius;

                // 2. Physics & Magnetism (Lerping)
                // If within magnetic field, pull them in tightly using fieldStrength
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let activeLerp = lerpSpeed;
                if (dist < (magnetRadius * 20)) {
                    activeLerp = lerpSpeed * (fieldStrength * 0.5);
                }

                if (autoAnimate) {
                    p.x += dx * activeLerp;
                    p.y += dy * activeLerp;
                }

                // 3. 3D depth and pulsing calculations
                const zScale = 1.0 + Math.sin(currentAngle) * 0.3 * depthFactor;
                const pulse = 1.0 + Math.sin(time * pulseSpeed * 5 + p.phase) * 0.15;
                const finalSize = p.baseSize * zScale * pulse;

                // Fade background particles to create depth
                const alpha = Math.max(0.1, Math.min(0.8, (zScale - 0.5) / 1.5));

                // 4. Drawing shapes (Circle or Tech Capsules)
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(currentAngle + Math.PI / 2); // Rotate capsules along the tangent of the ring

                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.globalAlpha = alpha;

                if (particleShape === "capsule") {
                    // Draw a sci-fi glowing rounded capsule
                    ctx.beginPath();
                    ctx.lineWidth = finalSize;
                    ctx.lineCap = 'round';
                    ctx.moveTo(0, -finalSize * 2.5);
                    ctx.lineTo(0, finalSize * 2.5);
                    ctx.stroke();
                } else {
                    // Fallback to crisp round particles
                    ctx.beginPath();
                    ctx.arc(0, 0, finalSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        // Pause animation when tab is backgrounded to save CPU/GPU
        const handleVisibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(animationFrameId);
            } else {
                render();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [count, magnetRadius, ringRadius, waveSpeed, waveAmplitude, particleSize, lerpSpeed, color, autoAnimate, particleVariance, rotationSpeed, depthFactor, pulseSpeed, particleShape, fieldStrength]);

    return <canvas ref={canvasRef} className="antigravity-canvas" />;
}