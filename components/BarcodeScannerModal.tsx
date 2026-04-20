"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { invoke } from "@tauri-apps/api/tauri";
import { X, Camera, AlertCircle } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkCameraAndStart();
    } else {
      stopScanning();
    }

    return () => stopScanning();
  }, [isOpen]);

  const checkCameraAndStart = async () => {
    try {
      // Check camera availability via Tauri command
      const result = await invoke<{ available: boolean }>("check_camera_availability");
      setCameraAvailable(result.available);
      
      if (result.available) {
        startScanning();
      } else {
        setError("Camera not available on this device");
      }
    } catch (err) {
      // Fallback to webview camera
      setCameraAvailable(true);
      startScanning();
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const codeReader = new BrowserMultiFormatReader();
      setScanning(true);
      setError(null);

      codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          onScan(result.getText());
          stopScanning();
          onClose();
        }
        if (err && !(err instanceof NotFoundException)) {
          setError("Scanning error: " + err.message);
        }
      });
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions in system settings.");
    }
  };

  const stopScanning = () => {
    setScanning(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="card p-6 w-full max-w-md fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Scan Barcode</h2>
          <button onClick={onClose} className="btn-ghost py-1 px-3">
            <X size={16} />
          </button>
        </div>
        
        {cameraAvailable === false && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <p className="text-sm text-red-400">
              No camera detected. Connect a camera or use manual entry.
            </p>
          </div>
        )}

        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg"
            playsInline
            muted
            style={{ display: cameraAvailable === false ? 'none' : 'block' }}
          />
          {cameraAvailable !== false && scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 border-2 border-[#F5C842] rounded-lg animate-pulse" />
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button 
            onClick={startScanning} 
            disabled={scanning || cameraAvailable === false}
            className="btn-accent flex-1"
          >
            <Camera size={16} className="mr-2" />
            {scanning ? "Scanning..." : cameraAvailable ? "Start Scan" : "Camera Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}