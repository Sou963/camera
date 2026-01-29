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
  const [facingMode, setFacingMode] = useState("environment");
  const [lastImage, setLastImage] = useState(null);
  const [flash, setFlash] = useState(false);

  // Init AI + Camera
  useEffect(() => {
    const initApp = async () => {
      await tf.ready();
      setUpscaler(new Upscaler());
      startCamera();
    };

    initApp();
  }, [facingMode]);

  // Camera Logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStatus("Ready");
    } catch (error) {
      console.error(error);
      setStatus("Camera Error");
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev =>
      prev === "user" ? "environment" : "user"
    );
  };

  // Save Image
  const saveImage = (dataUrl) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `AI_Snap_${Date.now()}.png`;
    link.click();

    setLastImage(dataUrl);
  };

  // Capture + Enhance
  const captureAndEnhance = async () => {
    if (!upscaler || loading) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    setLoading(true);
    setStatus("AI Enhancing...");

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      await tf.nextFrame();

      const enhancedImage = await upscaler.upscale(canvas, {
        patchSize: 64,
        padding: 5
      });

      saveImage(enhancedImage);
      setStatus("Saved!");

      setTimeout(() => setStatus("Ready"), 2000);
    } catch (err) {
      console.error(err);
      setStatus("GPU Error");
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div style={styles.app}>
      {/* Camera Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
      />

      {/* Flash Overlay */}
      {flash && <div style={styles.flash} />}

      {/* Top Status */}
      <div style={styles.header}>
        <div style={styles.statusPill}>{status}</div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loading}>
          <div className="spinner"></div>
          <p>Sharpening pixels...</p>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        {/* Preview */}
        <div style={styles.preview}>
          {lastImage && (
            <img src={lastImage} alt="Last" style={styles.previewImg} />
          )}
        </div>

        {/* Capture */}
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

        {/* Flip Camera */}
        <button onClick={toggleCamera} style={styles.iconBtn}>
          🔄
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Spinner CSS */}
      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.2);
          border-top: 4px solid #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Styles
const styles = {
  app: {
    position: "fixed",
    inset: 0,
    background: "#000",
    overflow: "hidden",
    fontFamily: "sans-serif"
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  flash: {
    position: "absolute",
    inset: 0,
    background: "#fff",
    zIndex: 5
  },
  header: {
    position: "absolute",
    top: 40,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    zIndex: 10
  },
  statusPill: {
    padding: "8px 20px",
    borderRadius: 20,
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    fontSize: 14
  },
  loading: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 20,
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
    height: 150,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
    zIndex: 10
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "4px solid #fff",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  shutterInner: {
    width: 65,
    height: 65,
    borderRadius: "50%",
    transition: "0.2s"
  },
  preview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    background: "#222",
    overflow: "hidden"
  },
  previewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    fontSize: 20
  }
};

export default App;
