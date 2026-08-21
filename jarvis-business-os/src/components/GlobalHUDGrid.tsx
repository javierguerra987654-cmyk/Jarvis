import React, { useState, useEffect, useRef } from 'react';

interface Coordinates {
  x: number;
  y: number;
  pctX: number;
  pctY: number;
  sector: string;
}

export const GlobalHUDGrid: React.FC = () => {
  // Explicit cursor clientX and clientY position state
  const [cursorPos, setCursorPos] = useState<{ clientX: number; clientY: number }>({
    clientX: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 960,
    clientY: typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 540,
  });

  const [coords, setCoords] = useState<Coordinates>({
    x: 0,
    y: 0,
    pctX: 50,
    pctY: 50,
    sector: 'SEC-MC-55',
  });

  const [winSize, setWinSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  const [missionClock, setMissionClock] = useState<string>('');
  const [fps, setFps] = useState<number>(60);
  const [scanAngle, setScanAngle] = useState<number>(0);
  const [telemetryNoise, setTelemetryNoise] = useState<{ n1: number; n2: number; n3: number; n4: number }>({
    n1: 12.4,
    n2: 88.1,
    n3: 45.9,
    n4: 73.2,
  });

  // Dynamic real-time network & telemetry throughput stream state
  const [throughput, setThroughput] = useState<{
    rxRate: string;
    txRate: string;
    packetRate: string;
    latency: number;
    jitter: number;
    channelLoad: number;
  }>({
    rxRate: '142.8',
    txRate: '38.4',
    packetRate: '4.82',
    latency: 14,
    jitter: 1.2,
    channelLoad: 68.4,
  });

  // Cycling pseudo-random hex data streams for screen corners
  const [hexStreams, setHexStreams] = useState<{
    tl: [string, string, string];
    tr: [string, string, string];
    bl: [string, string, string];
    br: [string, string, string];
  }>({
    tl: ['0xFE8A1', '0x2A9C4', '0x7B0D3'],
    tr: ['0xC19F0', '0x3D7E2', '0xAE44B'],
    bl: ['0x5B8D2', '0x71FA9', '0xE302C'],
    br: ['0x9A4C0', '0x18BFE', '0x62D31'],
  });

  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  // Dedicated setInterval hook to cycle pseudo-random hex telemetry values (e.g., '0x4F2A1') in corners
  useEffect(() => {
    const generateHex = () =>
      `0x${Math.floor(Math.random() * 0xfffff)
        .toString(16)
        .toUpperCase()
        .padStart(5, '0')}`;

    const intervalId = setInterval(() => {
      setHexStreams({
        tl: [generateHex(), generateHex(), generateHex()],
        tr: [generateHex(), generateHex(), generateHex()],
        bl: [generateHex(), generateHex(), generateHex()],
        br: [generateHex(), generateHex(), generateHex()],
      });
    }, 120);

    return () => clearInterval(intervalId);
  }, []);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 'mousemove' event listener on window tracking clientX and clientY
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      setCursorPos({ clientX, clientY });

      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const px = Math.min(100, Math.max(0, Math.round((clientX / w) * 1000) / 10));
      const py = Math.min(100, Math.max(0, Math.round((clientY / h) * 1000) / 10));

      const col = px < 33 ? 'L' : px < 66 ? 'C' : 'R';
      const row = py < 33 ? 'T' : py < 66 ? 'M' : 'B';
      const sec = `SEC-${row}${col}-${Math.floor(px / 10)}${Math.floor(py / 10)}`;

      setCoords({
        x: Math.round(clientX),
        y: Math.round(clientY),
        pctX: px,
        pctY: py,
        sector: sec,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Live UTC high-precision HUD clock, dynamic radar angle, FPS counter & micro-telemetry noise
  useEffect(() => {
    let lastNoiseUpdate = performance.now();

    const updateTimeAndFps = () => {
      const now = new Date();
      const pad = (n: number, d = 2) => String(n).padStart(d, '0');
      const ms = pad(Math.floor(now.getMilliseconds() / 10), 2);
      const timeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${ms} UTC`;
      setMissionClock(timeStr);

      // Radar scan rotation (degrees)
      const curTime = performance.now();
      setScanAngle((prev) => (prev + 1.2) % 360);

      // Jitter telemetry micro-readouts and network throughput every 150ms for realistic sensor feedback
      if (curTime - lastNoiseUpdate > 150) {
        lastNoiseUpdate = curTime;
        const n1Val = +(Math.sin(curTime * 0.003) * 15 + 50).toFixed(1);
        const n2Val = +(Math.cos(curTime * 0.002) * 20 + 75).toFixed(1);
        const n3Val = +(Math.sin(curTime * 0.004 + 1) * 18 + 40).toFixed(1);
        const n4Val = +(Math.cos(curTime * 0.003 + 2) * 12 + 60).toFixed(1);

        setTelemetryNoise({
          n1: n1Val,
          n2: n2Val,
          n3: n3Val,
          n4: n4Val,
        });

        // Real-time fluctuating network & telemetry throughput stream
        const baseRx = 140 + Math.sin(curTime * 0.0025) * 18 + (Math.random() * 4 - 2);
        const baseTx = 36 + Math.cos(curTime * 0.0031) * 8 + (Math.random() * 2 - 1);
        const basePkt = 4.6 + Math.sin(curTime * 0.002) * 0.6 + (Math.random() * 0.1 - 0.05);
        const baseLat = Math.round(13 + Math.sin(curTime * 0.005) * 3);
        const baseJit = +(1.1 + Math.sin(curTime * 0.004) * 0.4).toFixed(1);
        const baseChan = +(65 + Math.sin(curTime * 0.0018) * 10).toFixed(1);

        setThroughput({
          rxRate: baseRx.toFixed(1),
          txRate: baseTx.toFixed(1),
          packetRate: basePkt.toFixed(2),
          latency: baseLat,
          jitter: baseJit,
          channelLoad: baseChan,
        });
      }

      // FPS tracking
      frameCountRef.current++;
      if (curTime - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (curTime - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = curTime;
      }

      rafRef.current = requestAnimationFrame(updateTimeAndFps);
    };

    rafRef.current = requestAnimationFrame(updateTimeAndFps);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Derived Corner Vectors
  // 1. Top-Left Relative Vector from (0,0)
  const tlDeltaX = coords.x;
  const tlDeltaY = coords.y;
  const tlDist = Math.round(Math.hypot(tlDeltaX, tlDeltaY));

  // 2. Top-Right Relative Vector from (winSize.w, 0)
  const trDeltaX = winSize.w - coords.x;
  const trDeltaY = coords.y;
  const trDist = Math.round(Math.hypot(trDeltaX, trDeltaY));
  const trAngle = Math.round((Math.atan2(trDeltaY, trDeltaX || 1) * 180) / Math.PI);

  // 3. Bottom-Left Relative Vector from (0, winSize.h)
  const blDeltaX = coords.x;
  const blDeltaY = winSize.h - coords.y;
  const blDist = Math.round(Math.hypot(blDeltaX, blDeltaY));
  const blAngle = Math.round((Math.atan2(blDeltaY, blDeltaX || 1) * 180) / Math.PI);

  // 4. Bottom-Right Relative Vector from (winSize.w, winSize.h)
  const brDeltaX = winSize.w - coords.x;
  const brDeltaY = winSize.h - coords.y;
  const brDist = Math.round(Math.hypot(brDeltaX, brDeltaY));
  const brAngle = Math.round((Math.atan2(brDeltaY, brDeltaX || 1) * 180) / Math.PI);

  return (
    <div
      id="global_hud_grid_overlay"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* 1. Underlying CSS Matrix Grid Pattern with Mouse-Follow Dynamic Opacity & Distortion */}
      <div
        className="absolute inset-0 hud-grid-background pointer-events-none transition-opacity duration-300"
        style={{
          ['--mouse-x' as string]: `${cursorPos.clientX}px`,
          ['--mouse-y' as string]: `${cursorPos.clientY}px`,
          ['--mouse-pct-x' as string]: `${coords.pctX}%`,
          ['--mouse-pct-y' as string]: `${coords.pctY}%`,
          ['--mouse-px-x' as string]: `${cursorPos.clientX}px`,
          ['--mouse-px-y' as string]: `${cursorPos.clientY}px`,
          opacity: 0.85,
          maskImage: `radial-gradient(circle 500px at ${cursorPos.clientX}px ${cursorPos.clientY}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.65) 100%)`,
          WebkitMaskImage: `radial-gradient(circle 500px at ${cursorPos.clientX}px ${cursorPos.clientY}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.65) 100%)`,
        }}
      >
        {/* Absolute-Positioned Corner Cycling Hex Telemetry Stream Labels */}
        <div className="absolute top-1 left-24 hud-micro-tag text-[7px] text-[#00d5ff]/70 flex items-center gap-1.5 opacity-60">
          <span className="text-[#35d07f] font-bold">HEX.TL:</span>
          <span>{hexStreams.tl[0]}</span>
          <span className="text-[#4e6b82]">&bull;</span>
          <span>{hexStreams.tl[1]}</span>
        </div>
        <div className="absolute top-1 right-24 hud-micro-tag text-[7px] text-[#00d5ff]/70 flex items-center gap-1.5 opacity-60 justify-end">
          <span>{hexStreams.tr[1]}</span>
          <span className="text-[#4e6b82]">&bull;</span>
          <span>{hexStreams.tr[0]}</span>
          <span className="text-[#22e6cc] font-bold">:HEX.TR</span>
        </div>
        <div className="absolute bottom-1 left-24 hud-micro-tag text-[7px] text-[#00d5ff]/70 flex items-center gap-1.5 opacity-60">
          <span className="text-[#ffb84d] font-bold">HEX.BL:</span>
          <span>{hexStreams.bl[0]}</span>
          <span className="text-[#4e6b82]">&bull;</span>
          <span>{hexStreams.bl[1]}</span>
        </div>
        <div className="absolute bottom-1 right-24 hud-micro-tag text-[7px] text-[#00d5ff]/70 flex items-center gap-1.5 opacity-60 justify-end">
          <span>{hexStreams.br[1]}</span>
          <span className="text-[#4e6b82]">&bull;</span>
          <span>{hexStreams.br[0]}</span>
          <span className="text-[#35d07f] font-bold">:HEX.BR</span>
        </div>
      </div>

      {/* 1.1 Retro-Futuristic Subtle CRT Scanline Mesh & Slow Vertical Sweeping Beam */}
      <div className="absolute inset-0 hud-scanline-overlay pointer-events-none opacity-60 mix-blend-screen" />
      <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-[#00d5ff]/[0.035] to-transparent pointer-events-none animate-scan-sweep" />

      {/* Operator Presence Interactive Proximity Reticle */}
      <div
        className="absolute pointer-events-none transition-transform duration-75 ease-out"
        style={{
          left: coords.x,
          top: coords.y,
          transform: 'translate(-50%, -50%)',
          width: '160px',
          height: '160px',
        }}
      >
        <div className="w-full h-full rounded-full border border-[#00d5ff]/20 bg-gradient-to-r from-transparent via-[#00d5ff]/[0.03] to-transparent shadow-[0_0_20px_rgba(0,213,255,0.06)] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d5ff]/40 animate-ping" />
        </div>
      </div>

      {/* 2. ANIMATED SCREEN CORNER X/Y COORDINATE INDICATORS */}

      {/* ========================================================= */}
      {/* CORNER 1: TOP-LEFT (ORIGIN VECTOR + RADAR RETICLE)       */}
      {/* ========================================================= */}
      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 font-mono">
        {/* Optical Frame Corner & Main TL Vector Badge */}
        <div className="flex items-start gap-2">
          {/* Animated Mini Radar Ring */}
          <div className="relative w-7 h-7 rounded-full border border-[#00d5ff]/50 bg-[#040910]/90 flex items-center justify-center shadow-[0_0_12px_rgba(0,213,255,0.3)] shrink-0">
            <div
              style={{ transform: `rotate(${scanAngle}deg)` }}
              className="absolute inset-0 rounded-full border-t border-[#00d5ff] transition-transform"
            />
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d5ff] animate-ping" />
            <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-[#00d5ff]" />
          </div>

          <div className="flex flex-col bg-[#050d18]/90 border border-[#00d5ff]/35 rounded px-2 py-1 shadow-lg shadow-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#00d5ff] tracking-wider animate-pulse">
                TL-ORIGIN // [0,0]
              </span>
              <span className="text-[8px] px-1 rounded bg-[#07192a] text-[#35d07f] border border-[#35d07f]/30">
                LOCKED
              </span>
            </div>
            {/* Animated X/Y Coordinate Stream */}
            <div className="flex items-center gap-2 text-[10px] text-[#f5f9fc] font-bold">
              <span className="text-[#00d5ff]">X:</span>
              <span className="w-12 text-right">{String(tlDeltaX).padStart(4, '0')}px</span>
              <span className="text-[#00d5ff]">Y:</span>
              <span className="w-12 text-right">{String(tlDeltaY).padStart(4, '0')}px</span>
              <span className="text-[8.5px] text-[#7e9bb5] ml-1">
                [DIST: {String(tlDist).padStart(4, '0')}]
              </span>
            </div>
          </div>
        </div>

        {/* Micro-Telemetry Metadata & Cycling Hex Stream */}
        <div className="flex items-center gap-2 text-[8px] text-[#7e9bb5] ml-1 opacity-85">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35d07f]" />
            <span>POLAR.RAD: {(coords.pctX * 3.6).toFixed(1)}°</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span>FLUX: {telemetryNoise.n1}%</span>
          </div>
          <span className="text-[#4e6b82]">&bull;</span>
          <div className="flex items-center gap-1 bg-[#040a14]/80 border border-[#00d5ff]/20 px-1.5 py-0.5 rounded text-[7.5px]">
            <span className="text-[#35d07f] font-bold">HEX.TL:</span>
            <span className="text-[#00d5ff] font-mono tracking-wider font-semibold">{hexStreams.tl[0]}</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span className="text-[#7e9bb5] font-mono">{hexStreams.tl[1]}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CORNER 2: TOP-RIGHT (UTC CLOCK + UPPER-RIGHT VECTOR)     */}
      {/* ========================================================= */}
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 font-mono">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end bg-[#050d18]/90 border border-[#00d5ff]/35 rounded px-2 py-1 shadow-lg shadow-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[8px] px-1 rounded bg-[#07192a] text-[#22e6cc] border border-[#22e6cc]/30">
                CLK: {missionClock || 'SYNCING...'}
              </span>
              <span className="text-[9px] font-bold text-[#00d5ff] tracking-wider">
                TR-AZIMUTH // [{winSize.w},0]
              </span>
            </div>
            {/* Animated Inverted X/Y Coordinate Stream */}
            <div className="flex items-center gap-2 text-[10px] text-[#f5f9fc] font-bold">
              <span className="text-[8.5px] text-[#7e9bb5] mr-1">
                [θ: {String(trAngle).padStart(3, '0')}°]
              </span>
              <span className="text-[#00d5ff]">ΔX:</span>
              <span className="w-12 text-right">-{String(trDeltaX).padStart(4, '0')}</span>
              <span className="text-[#00d5ff]">ΔY:</span>
              <span className="w-12 text-right">+{String(trDeltaY).padStart(4, '0')}</span>
            </div>
          </div>

          {/* Animated Target Reticle */}
          <div className="relative w-7 h-7 rounded-full border border-[#00d5ff]/50 bg-[#040910]/90 flex items-center justify-center shadow-[0_0_12px_rgba(0,213,255,0.3)] shrink-0">
            <div className="w-4 h-4 border border-[#22e6cc]/40 rounded-full animate-ping" />
            <div className="w-1 h-1 rounded-full bg-[#22e6cc]" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-[#00d5ff]" />
          </div>
        </div>

        {/* Micro-Telemetry Metadata & Cycling Hex Stream */}
        <div className="flex items-center gap-2 text-[8px] text-[#7e9bb5] mr-1 opacity-85">
          <div className="flex items-center gap-1 bg-[#040a14]/80 border border-[#00d5ff]/20 px-1.5 py-0.5 rounded text-[7.5px]">
            <span className="text-[#7e9bb5] font-mono">{hexStreams.tr[1]}</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span className="text-[#00d5ff] font-mono tracking-wider font-semibold">{hexStreams.tr[0]}</span>
            <span className="text-[#22e6cc] font-bold">:HEX.TR</span>
          </div>
          <span className="text-[#4e6b82]">&bull;</span>
          <div className="flex items-center gap-1">
            <span>SEC.RAD: LEVEL-4</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span>SIG.Q: {telemetryNoise.n2}%</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22e6cc]" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CORNER 3: BOTTOM-LEFT (SECTOR MATRIX + ELEVATION VECTOR)  */}
      {/* ========================================================= */}
      <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1.5 font-mono">
        {/* Micro-Telemetry Metadata & Cycling Hex Stream */}
        <div className="flex items-center gap-2 text-[8px] text-[#7e9bb5] ml-1 opacity-85">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb84d]" />
            <span>SECTOR: {coords.sector}</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span>ATTN: {telemetryNoise.n3}%</span>
          </div>
          <span className="text-[#4e6b82]">&bull;</span>
          <div className="flex items-center gap-1 bg-[#040a14]/80 border border-[#00d5ff]/20 px-1.5 py-0.5 rounded text-[7.5px]">
            <span className="text-[#ffb84d] font-bold">HEX.BL:</span>
            <span className="text-[#00d5ff] font-mono tracking-wider font-semibold">{hexStreams.bl[0]}</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span className="text-[#7e9bb5] font-mono">{hexStreams.bl[1]}</span>
          </div>
        </div>

        <div className="flex items-end gap-2">
          {/* Animated Scanning Matrix Reticle */}
          <div className="relative w-7 h-7 border border-[#00d5ff]/50 bg-[#040910]/90 flex items-center justify-center shadow-[0_0_12px_rgba(0,213,255,0.3)] shrink-0">
            <div className="w-3 h-3 border border-[#ffb84d]/60 animate-spin" />
            <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-[#00d5ff]" />
          </div>

          <div className="flex flex-col bg-[#050d18]/90 border border-[#00d5ff]/35 rounded px-2 py-1 shadow-lg shadow-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#00d5ff] tracking-wider">
                BL-ELEVATION // [0,{winSize.h}]
              </span>
              <span className="text-[8px] px-1 rounded bg-[#07192a] text-[#ffb84d] border border-[#ffb84d]/30">
                FOV: {coords.pctX.toFixed(0)}%
              </span>
            </div>
            {/* Live X/Y Coordinate Stream */}
            <div className="flex items-center gap-2 text-[10px] text-[#f5f9fc] font-bold">
              <span className="text-[#00d5ff]">ΔX:</span>
              <span className="w-12 text-right">+{String(blDeltaX).padStart(4, '0')}</span>
              <span className="text-[#00d5ff]">ΔY:</span>
              <span className="w-12 text-right">-{String(blDeltaY).padStart(4, '0')}</span>
              <span className="text-[8.5px] text-[#7e9bb5] ml-1">
                [RAD: {String(blAngle).padStart(3, '0')}°]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CORNER 4: BOTTOM-RIGHT (FPS + QUADRANT POLAR VECTORS)    */}
      {/* ========================================================= */}
      <div className="absolute bottom-2.5 right-2.5 flex flex-col items-end gap-1.5 font-mono">
        {/* Micro-Telemetry Metadata & Cycling Hex Stream */}
        <div className="flex items-center gap-2 text-[8px] text-[#7e9bb5] mr-1 opacity-85">
          <div className="flex items-center gap-1 bg-[#040a14]/80 border border-[#00d5ff]/20 px-1.5 py-0.5 rounded text-[7.5px]">
            <span className="text-[#7e9bb5] font-mono">{hexStreams.br[1]}</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span className="text-[#00d5ff] font-mono tracking-wider font-semibold">{hexStreams.br[0]}</span>
            <span className="text-[#35d07f] font-bold">:HEX.BR</span>
          </div>
          <span className="text-[#4e6b82]">&bull;</span>
          <div className="flex items-center gap-1">
            <span>FPS: {fps}.0</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span>AUDIO: 24kHz PCM</span>
            <span className="text-[#4e6b82]">&bull;</span>
            <span>SYNC: {telemetryNoise.n4}%</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#35d07f]" />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-col items-end bg-[#050d18]/90 border border-[#00d5ff]/35 rounded px-2 py-1 shadow-lg shadow-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[8px] px-1 rounded bg-[#07192a] text-[#35d07f] border border-[#35d07f]/30">
                QUAD-IV // ACTIVE
              </span>
              <span className="text-[9px] font-bold text-[#00d5ff] tracking-wider">
                BR-POLAR // [{winSize.w},{winSize.h}]
              </span>
            </div>
            {/* Live X/Y Coordinate Stream */}
            <div className="flex items-center gap-2 text-[10px] text-[#f5f9fc] font-bold">
              <span className="text-[8.5px] text-[#7e9bb5] mr-1">
                [DIST: {String(brDist).padStart(4, '0')}]
              </span>
              <span className="text-[#00d5ff]">X%:</span>
              <span className="w-11 text-right">{coords.pctX.toFixed(1)}%</span>
              <span className="text-[#00d5ff]">Y%:</span>
              <span className="w-11 text-right">{coords.pctY.toFixed(1)}%</span>
            </div>
          </div>

          {/* Animated Polar Vector Reticle */}
          <div className="relative w-7 h-7 rounded border border-[#00d5ff]/50 bg-[#040910]/90 flex items-center justify-center shadow-[0_0_12px_rgba(0,213,255,0.3)] shrink-0">
            <div
              style={{ transform: `rotate(${brAngle}deg)` }}
              className="w-4 h-[1px] bg-[#00d5ff] origin-center transition-transform"
            />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#00d5ff]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-[#00d5ff]" />
          </div>
        </div>
      </div>

      {/* 3. PERIODIC NUMERICAL DATA TICKS & TELEMETRY SCALES ALONG EDGES */}

      {/* TOP EDGE: Periodic Frequency & Throughput Calibration Ticks */}
      <div className="absolute top-1 left-72 right-72 h-4 hidden md:flex items-center justify-between pointer-events-none opacity-40 px-4">
        {[
          { label: '012.8M', val: 'CH.01' },
          { label: '025.6M', val: 'CH.02' },
          { label: '038.4M', val: 'CH.03' },
          { label: '051.2M', val: 'CH.04' },
          { label: '064.0M', val: 'CH.05' },
          { label: '076.8M', val: 'CH.06' },
          { label: '089.6M', val: 'CH.07' },
          { label: '102.4M', val: 'CH.08' },
        ].map((tick, i) => (
          <div key={`top-tick-${i}`} className="flex flex-col items-center gap-0.5">
            <span className="w-[1px] h-1.5 bg-[#00d5ff]/60" />
            <div className="flex items-center gap-1">
              <span className="hud-micro-tag text-[6.5px] tracking-widest text-[#00d5ff]/90">{tick.label}</span>
              <span className="hud-micro-tag text-[5.5px] text-[#7e9bb5]/60 hidden lg:inline">[{tick.val}]</span>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM EDGE: Real-Time Network Throughput & Packet Telemetry Data Ticks */}
      <div className="absolute bottom-1.5 left-72 right-72 h-5 hidden md:flex items-center justify-center gap-6 pointer-events-none opacity-60">
        <div className="flex items-center gap-4 bg-[#050d18]/60 border border-[#00d5ff]/20 px-3 py-0.5 rounded backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#35d07f] animate-pulse" />
            <span className="hud-micro-tag text-[7.5px] text-[#35d07f]/90">
              TX: {throughput.txRate} MB/s
            </span>
          </div>
          <span className="text-[#00d5ff]/30 text-[8px]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#00d5ff] animate-pulse" />
            <span className="hud-micro-tag text-[7.5px] text-[#00d5ff]/90">
              RX: {throughput.rxRate} MB/s
            </span>
          </div>
          <span className="text-[#00d5ff]/30 text-[8px]">|</span>
          <span className="hud-micro-tag text-[7.5px] text-[#7e9bb5]">
            PKT: {throughput.packetRate}k/s
          </span>
          <span className="text-[#00d5ff]/30 text-[8px]">|</span>
          <span className="hud-micro-tag text-[7.5px] text-[#7e9bb5]">
            LAT: {throughput.latency}ms
          </span>
          <span className="text-[#00d5ff]/30 text-[8px] hidden lg:inline">|</span>
          <span className="hud-micro-tag text-[7.5px] text-[#7e9bb5] hidden lg:inline">
            JIT: {throughput.jitter}ms
          </span>
          <span className="text-[#00d5ff]/30 text-[8px] hidden lg:inline">|</span>
          <span className="hud-micro-tag text-[7.5px] text-[#7e9bb5] hidden lg:inline">
            CHAN.LOAD: {throughput.channelLoad}%
          </span>
        </div>
      </div>

      {/* LEFT EDGE: Vertical Decibel / Signal Flux Gauge Ticks */}
      <div className="absolute left-1 top-28 bottom-28 w-4 flex flex-col justify-between items-start opacity-45 pointer-events-none py-2">
        {[
          { label: '+12.0', unit: 'dB' },
          { label: '+09.0', unit: 'dB' },
          { label: '+06.0', unit: 'dB' },
          { label: '+03.0', unit: 'dB' },
          { label: '00.0', unit: 'REF' },
          { label: '-03.0', unit: 'dB' },
          { label: '-06.0', unit: 'dB' },
          { label: '-09.0', unit: 'dB' },
          { label: '-12.0', unit: 'dB' },
        ].map((tick, i) => (
          <div key={`left-tick-${i}`} className="flex items-center gap-1">
            <span className="w-1.5 h-[1px] bg-[#00d5ff]/70" />
            <span className="hud-micro-tag text-[6.5px] leading-none text-[#00d5ff]/80">
              {tick.label}
            </span>
          </div>
        ))}
      </div>

      {/* RIGHT EDGE: Vertical Data Channel & Buffer Ladder Ticks */}
      <div className="absolute right-1 top-28 bottom-28 w-4 flex flex-col justify-between items-end opacity-45 pointer-events-none py-2">
        {[
          { label: 'CH-α', val: '99.8%' },
          { label: 'CH-β', val: '100%' },
          { label: 'CH-γ', val: '98.4%' },
          { label: 'CH-δ', val: '99.1%' },
          { label: 'CH-ε', val: 'NOM' },
          { label: 'CH-ζ', val: '99.5%' },
          { label: 'CH-η', val: '100%' },
          { label: 'CH-θ', val: '97.9%' },
        ].map((tick, i) => (
          <div key={`right-tick-${i}`} className="flex items-center gap-1 justify-end">
            <span className="hud-micro-tag text-[6.5px] leading-none text-[#00d5ff]/80">
              {tick.label}
            </span>
            <span className="w-1.5 h-[1px] bg-[#00d5ff]/70" />
          </div>
        ))}
      </div>

      {/* 4. Quadrant HUD Crosshairs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-4 h-4 hud-reticle-cross opacity-30" />
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-4 h-4 hud-reticle-cross opacity-30" />
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-4 h-4 hud-reticle-cross opacity-30" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-4 h-4 hud-reticle-cross opacity-30" />

      {/* Subtle Horizontal Midline Center Cross */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 hud-reticle-cross opacity-20" />
    </div>
  );
};
