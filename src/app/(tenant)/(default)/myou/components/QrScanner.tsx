'use client';

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  fps?: number;
  qrbox?: number;
}

export default function QrScanner({
  onScanSuccess,
  onScanError,
  fps = 10,
  qrbox = 250
}: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // スキャナーの初期化
    // id="reader" の要素に描画する
    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      { 
        fps: fps, 
        qrbox: qrbox,
        // 背面カメラを優先
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Html5QrcodeScanType.SCAN_TYPE_CAMERA
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        if (onScanError) onScanError(errorMessage);
      }
    );

    // クリーンアップ
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner", error);
        });
      }
    };
  }, [onScanSuccess, onScanError, fps, qrbox]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-lg shadow-lg bg-black">
      <div id="reader" className="w-full"></div>
    </div>
  );
}
