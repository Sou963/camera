import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import Upscaler from "upscaler";
import x2 from "@upscalerjs/esrgan-slim/2x"; // Fastest model for mobile

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [upscaler, setUpscaler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [facingMode, setFacingMode] = useState("environment");
  const [lastImage, setLastImage] = useState(null);
  const [flash, setFlash] = useState(false);

  // --- Init AI (Once) ---
  useEffect(() => {
    const initAI = async () => {
      try {
        await tf.setBackend("webgl"); // Use GPU
        await tf.ready();
        setUpscaler(new Upscaler({ model: x2 })); // Use slim model
        setStatus("Ready");
      } catch (e) {
        setStatus("AI Init Error");
      }
    };
    initAI();
  }, []);

  // --- Camera Logic (Handles Switching) ---
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      // 1. STOP previous camera tracks (CRITICAL for selfie camera)
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode, // Switches between 'user' and 'environment'
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error(error);
        setStatus("Camera Error");
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const saveToGallery = (dataUrl, name) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${name}_${Date.now()}.png`;
    link.click();
    setLastImage(dataUrl);
  };

  const captureAndEnhance = async () => {
    if (!upscaler || loading) return;

    // Instant Feedback
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setLoading(true);
    setStatus("Enhancing...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    // Save Original Immediately (Makes it feel faster)
    const original = canvas.toDataURL("image/png");
    saveToGallery(original, "Original");

    try {
      await tf.nextFrame(); // Don't block UI

      // Fast Upscale (using patchSize for mobile stability)
      const enhanced = await upscaler.upscale(canvas, {
        patchSize: 64,
        padding: 4,
      });

      saveToGallery(enhanced, "AI_Enhanced");
      setStatus("Saved!");
      setTimeout(() => setStatus("Ready"), 2000);
    } catch (err) {
      setStatus("GPU Busy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
      {flash && <div style={styles.flash} />}

      <div style={styles.header}>
        <div style={styles.statusPill}>{status}</div>
      </div>

      {loading && (
        <div style={styles.loadingOverlay}>
          <div className="spinner"></div>
          <p>AI BEAUTIFYING...</p>
        </div>
      )}

      <div style={styles.controls}>
        <div style={styles.preview}>
          {lastImage && (
            <img src={lastImage} alt="Last" style={styles.previewImg} />
          )}
        </div>

        <button
          onClick={captureAndEnhance}
          disabled={loading}
          style={styles.shutterOuter}
        >
          <div
            style={{
              ...styles.shutterInner,
              background: loading ? "#ff9800" : "#fff",
            }}
          />
        </button>

        <button onClick={toggleCamera} style={styles.iconBtn}>
          🔄
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>{`
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.2); border-top: 4px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  app: {
    position: "fixed",
    inset: 0,
    background: "#000",
    overflow: "hidden",
    fontFamily: "sans-serif",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  flash: { position: "absolute", inset: 0, background: "#fff", zIndex: 10 },
  header: {
    position: "absolute",
    top: 40,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    zIndex: 15,
  },
  statusPill: {
    padding: "8px 20px",
    borderRadius: 20,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 12,
    backdropFilter: "blur(5px)",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 140,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
    zIndex: 10,
  },
  shutterOuter: {
    width: 75,
    height: 75,
    borderRadius: "50%",
    border: "4px solid #fff",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    transition: "0.2s",
  },
  preview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    background: "#222",
    overflow: "hidden",
    border: "1px solid #444",
  },
  previewImg: { width: "100%", height: "100%", objectFit: "cover" },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    fontSize: 20,
  },
};

export default App;
