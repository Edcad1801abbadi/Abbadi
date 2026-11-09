import { useState, useRef, useEffect, useCallback } from "react";

interface GateScreenProps {
  onSuccess: () => void;
}

const PIN_HASH = import.meta.env.VITE_GATE_PIN_HASH as string;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getStoredLockoutEnd(): number {
  const stored = parseInt(localStorage.getItem("gate_lockout_until") || "0");
  return Date.now() < stored ? stored : 0;
}

const GateScreen = ({ onSuccess }: GateScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [stage, setStage] = useState<"gate" | "terminal">("gate");
  const [lockoutEnd, setLockoutEnd] = useState<number>(getStoredLockoutEnd);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const ramadanRef = useRef<HTMLDivElement>(null);

  // Show countdown while locked out
  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      if (Date.now() >= lockoutEnd) {
        setLockoutEnd(0);
        setError("");
      } else {
        const mins = Math.ceil((lockoutEnd - Date.now()) / 60000);
        setError(`محجوب — انتظر ${mins} دقيقة`);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [lockoutEnd]);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.style.display = "block";
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "01アイウエオカキクケコ".split("");
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00d5c7";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Terminal typing animation
  const startTerminal = useCallback(() => {
    setStage("terminal");

    const lines = [
      "$ connecting to secure server...",
      "✓ Connection established",
      "$ verifying credentials...",
      "✓ Access granted",
      "$ loading modules...",
      "✓ All systems ready",
    ];

    let lineIndex = 0;
    let charIndex = 0;
    const codeEl = codeRef.current;
    if (!codeEl) return;
    codeEl.textContent = "";

    const loaderBox = document.getElementById("gateLoaderBox");

    const typeNext = () => {
      if (lineIndex >= lines.length) {
        if (loaderBox) loaderBox.style.display = "none";
        if (ramadanRef.current) ramadanRef.current.style.display = "block";
        setTimeout(() => onSuccess(), 2000);
        return;
      }

      if (charIndex === 0 && loaderBox) {
        loaderBox.style.display = "none";
      }

      const line = lines[lineIndex];
      if (charIndex < line.length) {
        codeEl.textContent += line[charIndex];
        charIndex++;
        setTimeout(typeNext, 25 + Math.random() * 20);
      } else {
        codeEl.textContent += "\n";
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 300);
      }
    };

    setTimeout(() => typeNext(), 1500);
  }, [onSuccess]);

  const handleSubmit = async () => {
    if (lockoutEnd && Date.now() < lockoutEnd) return;
    if (pin.length < 4) return;

    const hash = await hashPin(pin);
    if (hash === PIN_HASH) {
      localStorage.removeItem("gate_fail_count");
      localStorage.removeItem("gate_lockout_until");
      setError("");
      startTerminal();
    } else {
      const fails = parseInt(localStorage.getItem("gate_fail_count") || "0") + 1;
      if (fails >= MAX_ATTEMPTS) {
        const end = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem("gate_lockout_until", String(end));
        localStorage.removeItem("gate_fail_count");
        setLockoutEnd(end);
      } else {
        localStorage.setItem("gate_fail_count", String(fails));
        const left = MAX_ATTEMPTS - fails;
        setError(`الرقم السري غير صحيح — ${left} محاولة متبقية`);
      }
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      setPin("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 4) handleSubmit();
  };

  const isLocked = lockoutEnd > 0 && Date.now() < lockoutEnd;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#000",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Animated BG */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            radial-gradient(circle at 15% 20%, rgba(0,213,199,.22), transparent 26%),
            radial-gradient(circle at 85% 18%, rgba(0,183,255,.18), transparent 24%),
            radial-gradient(circle at 50% 78%, rgba(111,255,233,.15), transparent 28%),
            linear-gradient(135deg, #020304, #031318, #06242b, #031920, #021012)
          `,
          backgroundSize: "180% 180%",
          animation: "gateGradientMove 14s ease-in-out infinite",
          transform: "scale(1.08)",
        }}
      />

      {/* Matrix Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.18,
          mixBlendMode: "screen",
        }}
      />

      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.70)),
            radial-gradient(circle at center, transparent 20%, rgba(0,0,0,.25) 100%)
          `,
        }}
      />

      {/* Glow Flow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `linear-gradient(120deg, transparent 15%, rgba(111,255,233,.08) 30%, rgba(0,183,255,.07) 40%, transparent 58%)`,
          animation: "gateShine 6.5s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Gate Screen */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: stage === "gate" ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "395px",
            padding: "30px 22px 24px",
            borderRadius: "30px",
            background: "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.05))",
            border: "1px solid rgba(140,255,245,.20)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: "0 24px 70px rgba(0,0,0,.50), inset 0 1px 0 rgba(255,255,255,.12)",
            color: "#ffffff",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            animation: shaking ? "gateShake 0.5s ease" : undefined,
          }}
        >
          {/* Card inner glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(circle at top left, rgba(111,255,233,.10), transparent 34%),
                radial-gradient(circle at bottom right, rgba(0,183,255,.08), transparent 30%)
              `,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(111,255,233,.14)",
                color: "#efffff",
                fontSize: "13px",
                marginBottom: "14px",
                letterSpacing: "0.3px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isLocked ? "#ff5f57" : "#6fffe9",
                  boxShadow: isLocked ? "0 0 14px #ff5f57" : "0 0 14px #6fffe9",
                  animation: "gatePulse 1.6s infinite",
                  display: "inline-block",
                }}
              />
              {isLocked ? "Access Locked" : "Secure Access"}
            </div>

            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "33px",
                lineHeight: 1.2,
                fontWeight: 800,
                textShadow: "0 0 18px rgba(111,255,233,.12)",
              }}
            >
              الامارات للتنقل
            </h1>

            <p
              style={{
                margin: "0 0 18px",
                color: "#d7ebee",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              أدخل الرقم السري للمتابعة إلى التطبيق
            </p>

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              disabled={isLocked}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPin(val);
                if (!isLocked) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              autoFocus
              style={{
                width: "100%",
                border: `1px solid ${error ? "rgba(255,100,100,.5)" : "rgba(111,255,233,.16)"}`,
                outline: "none",
                color: "#fff",
                background: isLocked ? "rgba(255,80,80,.06)" : "rgba(255,255,255,.08)",
                borderRadius: "18px",
                padding: "16px",
                fontSize: "22px",
                textAlign: "center",
                letterSpacing: "7px",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)",
                boxSizing: "border-box",
                cursor: isLocked ? "not-allowed" : "text",
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={pin.length < 4 || isLocked}
              style={{
                marginTop: "14px",
                width: "100%",
                border: "none",
                cursor: pin.length >= 4 && !isLocked ? "pointer" : "not-allowed",
                borderRadius: "18px",
                padding: "15px 16px",
                fontSize: "17px",
                fontWeight: 700,
                color: "#021112",
                background: isLocked
                  ? "linear-gradient(135deg, #888, #555)"
                  : "linear-gradient(135deg, #8efff0, #00d5c7 52%, #00b7ff)",
                boxShadow: "0 12px 30px rgba(0,213,199,.22)",
                transition: ".25s ease",
                opacity: pin.length >= 4 && !isLocked ? 1 : 0.5,
              }}
            >
              {isLocked ? "محجوب" : "دخول"}
            </button>

            <div
              style={{
                minHeight: "20px",
                fontSize: "13px",
                color: "#ffbfbf",
                marginTop: "10px",
              }}
              dir="rtl"
            >
              {error}
            </div>

            <div
              style={{
                marginTop: "14px",
                fontSize: "12px",
                color: "#d8eef2",
                lineHeight: 1.8,
                opacity: 0.95,
              }}
            >
              ABDALLA ABBADI
              <br />
              connect@3bbadi.com
            </div>
          </div>

          {/* Footer Glow */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "-95px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              transform: "translateX(-50%)",
              background: "radial-gradient(circle, rgba(0,213,199,.20), rgba(0,183,255,.12), transparent 65%)",
              filter: "blur(18px)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Stage / Terminal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: stage === "terminal" ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          color: "#bffff8",
          fontFamily: "Consolas, monospace",
        }}
      >
        <div
          style={{
            width: "min(94vw, 760px)",
            minHeight: "275px",
            borderRadius: "28px",
            padding: "18px",
            background: "linear-gradient(180deg, rgba(6,18,22,.74), rgba(0,0,0,.50))",
            border: "1px solid rgba(111,255,233,.16)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.52), 0 0 32px rgba(0,213,199,.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Terminal top bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "44px",
              background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.01))",
              borderBottom: "1px solid rgba(255,255,255,.07)",
            }}
          />

          {/* Terminal dots */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "28px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "18px",
              paddingLeft: "6px",
            }}
          >
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2f", display: "inline-block" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
          </div>

          {/* Loader */}
          <div id="gateLoaderBox" style={{ textAlign: "center", padding: "28px 10px 6px" }}>
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                margin: "0 auto 16px",
                border: "4px solid rgba(255,255,255,.12)",
                borderTopColor: "#00d5c7",
                borderRightColor: "#6fffe9",
                animation: "gateSpin .9s linear infinite",
                boxShadow: "0 0 22px rgba(0,213,199,.18)",
              }}
            />
            <div style={{ color: "#efffff", fontSize: "16px", letterSpacing: "0.5px" }}>
              Loading secure experience...
            </div>
          </div>

          {/* Code typing area */}
          <div
            ref={codeRef}
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              fontSize: "19px",
              padding: "8px 4px 0",
              minHeight: "120px",
              color: "#aafef0",
              textShadow: "0 0 10px rgba(111,255,233,.10)",
            }}
          />

          {/* Ramadan */}
          <div
            ref={ramadanRef}
            style={{
              display: "none",
              textAlign: "center",
              marginTop: "18px",
              fontSize: "46px",
              fontWeight: 800,
              color: "#ffffff",
              textShadow: "0 0 10px rgba(255,255,255,.16), 0 0 18px rgba(0,213,199,.22), 0 0 38px rgba(0,183,255,.16)",
              animation: "gateFadeInUp .8s ease forwards",
              direction: "rtl",
            }}
          >
            رمضان كريم
          </div>

          <div
            style={{
              textAlign: "center",
              color: "#eaffff",
              fontSize: "13px",
              marginTop: "10px",
              opacity: 0.92,
              letterSpacing: "0.4px",
            }}
          >
            Opening application...
          </div>
        </div>
      </div>
    </div>
  );
};

export default GateScreen;
