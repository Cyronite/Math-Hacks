import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface HandTrackerProps {
  onYChange: (y: number) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onYChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);

  useEffect(() => {
    const setupLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/hand_landmarker.task", 
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      setLandmarker(handLandmarker);
    };

    setupLandmarker();
  }, []);

  const startWebcam = async () => {
    if (videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predict);
    }
  };

  const predict = async () => {
    if (landmarker && videoRef.current) {
      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
      
      if (results.landmarks.length > 0) {
        console.log("Index Tip Y:", results.landmarks[0][8].y);
        const indexTipY = results.landmarks[0][8].y; // Y position of the index fingertip
        onYChange(indexTipY);
      }
    }
    requestAnimationFrame(predict);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg shadow-lg" />
      <button 
        onClick={startWebcam}
        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
      >
        Start Conductors Camera
      </button>
    </div>
  );
};

export default HandTracker;