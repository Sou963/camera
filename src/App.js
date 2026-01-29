import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import Upscaler from "upscaler";

function App() {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State 
  const [upscaler, setUpscaler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' = back, 'user' = selfie
  const [lastImage, setLastImage] = useState(null);
  const [flash, setFlash] = useState(false);

  // 1. Initialize Upscaler once
  useEffect(() => {
    async function initAI() {
      await tf.ready();
      setUpscaler(new Upscaler());
    }
    initAI();
  }, []);

  // 2. Camera Management (Handles Switching & Cleanup)
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      setStatus("Opening Camera...");
      
      // Stop previous tracks to release the hardware lock
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode, // Mobile switching logic
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("Ready");
      } catch (error) {
        console.error("Camera access error:", error);
        setStatus("Camera Error");
      }
    };

    startCamera();

    // Cleanup: Shut down camera when switching modes or closing app
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // 3. UI Actions
  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const saveImage = (dataUrl) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `AI_Snap_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLastImage(dataUrl);
  };

  const captureAndEnhance = async () => {
    if (!upscaler || loading || !videoRef.current) return;

    // Trigger Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    setLoading(true);
    setStatus("AI Enhancing...");

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Match canvas to high-res video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      await tf.nextFrame(); // Let UI update "Enhancing" status
      
      const enhancedImage = await upscaler.upscale(canvas, {
        patchSize: 64, // Crucial for mobile GPU memory
        padding: 5
      });

      saveImage(enhancedImage);
      setStatus("Saved!");
      setTimeout(() => setStatus("Ready"), 2000);
    } catch (err) {
      console.error(err);
      setStatus("GPU Busy - Try Again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      {/* Background Viewfinder */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
      />

      {/* Flash Effect Layer */}
      {flash && <div style={styles.flashOverlay} />}

      {/* Top UI */}
      <div style={styles.header}>
        <div style={styles.statusPill}>{status}</div>
      </div>

      {/* Loading Block */}
      {loading && (
        <div style={styles.loadingScreen}>
          <div className="spinner"></div>
          <p style={{ marginTop: 10, letterSpacing: 1 }}>UPSCALING QUALITY...</p>
        </div>
      )}

      {/* Bottom Controls */}
      <div style={styles.controls}>
        {/* Recent Photo Preview */}
        <div style={styles.previewBox}>
          {lastImage && <img src={lastImage} alt="Last" style={styles.previewImg} />}
        </div>

        {/* Shutter */}
        <button
          onClick={captureAndEnhance}
          disabled={loading}
          style={styles.shutterOuter}
        >
          <div
            style={{
              ...styles.shutterInner,
              background: loading ? "#ff4444" : "#fff"
            }}
          />
        </button>

        {/* Lens Flip */}
        <button onClick={toggleCamera} style={styles.flipBtn}>
          🔄
        </button>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* CSS Animations */}
      <style>{`
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.2);
          border-top: 5px solid #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  app: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#000",
    overflow: "hidden",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover", // Makes it full screen
    zIndex: 1
  },
  flashOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#fff",
    zIndex: 10
  },
  header: {
    position: "absolute",
    top: 50,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    zIndex: 15
  },
  statusPill: {
    padding: "8px 16px",
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(10px)",
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    border: "1px solid rgba(255,255,255,0.2)"
  },
  loadingScreen: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff"
  },
  controls: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 160,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
    zIndex: 20,
    paddingBottom: 30
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: "50%",
    border: "5px solid #fff",
    backgroundColor: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    outline: "none"
  },
  shutterInner: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    transition: "transform 0.1s, background 0.3s",
  },
  previewBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    border: "2px solid rgba(255,255,255,0.4)",
    overflow: "hidden"
  },
  previewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  flipBtn: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    border: "none",
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
    color: "#fff",
    fontSize: 24,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }
};

export default App;
