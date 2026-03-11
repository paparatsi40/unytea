"use client";

import { useEffect, useRef, useState } from "react";

export function CameraDebug() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function run() {
      try {
        setError("");

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices);

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("CameraDebug error:", err);
        setError(err instanceof Error ? `${err.name}: ${err.message}` : "Error desconocido");
      }
    }

    run();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-white">
      <div className="rounded-xl bg-black p-2">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-[320px] w-full rounded-lg object-cover"
        />
      </div>

      {error ? (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Cámara abierta correctamente con getUserMedia.
        </div>
      )}

      <div className="rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
        <div className="mb-2 font-semibold text-white">Dispositivos detectados</div>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(
            devices.map((d) => ({
              kind: d.kind,
              label: d.label,
              deviceId: d.deviceId,
            })),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}