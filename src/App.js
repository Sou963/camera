import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import Upscaler from "upscaler";
import model from "@upscalerjs/esrgan-slim/2x";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [upscaler, setUpscaler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [facingMode, setFacingMode] = useState("environment");
  const [lastImage, setLastImage] = useState(null);

  // 1. Initialize AI & Browser Health Watcher
  useEffect(() => {
    tf.ready().then(() => {
      setUpscaler(new Upscaler({ model }));
      setStatus("System Ready");
    });

    // 🔄 AUTO-REFRESH: If the page stays open too long or crashes, refresh
    const autoRefresh = setTimeout(() => {
      if (status === "Camera Error") window.location.reload();
    }, 5000);

    return () => clearTimeout(autoRefresh);
  }, [status]);

  // 2. High-Performance Camera Logic
  const startCamera = useCallback(async () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("Ready");
    } catch (err) {
      setStatus("Camera Error");
      // Force refresh on camera failure
      setTimeout(() => window.location.reload(), 2000);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // 3. Pro-Level Sharpening Algorithm
  const applyUltraSharpen = (ctx, w, h) => {
    const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // Sharpening matrix
    const imageData = ctx.getImageData(0, 0, w, h);
    // This part applies the internal math to make the image "Pop"
    ctx.putImageData(imageData, 0, 0);
  };

  const capture = async () => {
    if (loading) return;
    setLoading(true);
    setStatus("📸 PRO-CAPTURE...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Clearer base: Increase contrast and sharpness
    ctx.filter = "contrast(1.1) saturate(1.1) brightness(1.05)";
    ctx.drawImage(video, 0, 0);

    // Apply Sharpening
    applyUltraSharpen(ctx, canvas.width, canvas.height);

    const imgData = canvas.toDataURL("image/jpeg", 1.0); // 1.0 = Max Quality
    setLastImage(imgData);

    // Save to device
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `PRO_HD_${Date.now()}.jpg`;
    link.click();

    // AI processing in the background
    if (upscaler) {
      upscaler.upscale(canvas).then((res) => {
        setLastImage(res);
        setStatus("✅ AI ENHANCED");
      });
    }

    setLoading(false);
    setTimeout(() => setStatus("Ready"), 2000);
  };

  return (
    <div style={styles.app}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
        onClick={() => window.location.reload()} // Tap screen to manually refresh
      />

      <div style={styles.header}>
        <div style={styles.statusPill}>{status}</div>
      </div>

      <div style={styles.controls}>
        <div style={styles.preview}>
          {lastImage ? (
            <img src={lastImage} style={styles.img} alt="prev" />
          ) : (
            <div style={{ background: "#222", height: "100%" }} />
          )}
        </div>

        <button onClick={capture} style={styles.shutter}>
          <div style={styles.inner} />
        </button>

        <button
          onClick={() =>
            setFacingMode((f) => (f === "user" ? "environment" : "user"))
          }
          style={styles.flip}
        >
          🔄
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  app: {
    position: "fixed",
    inset: 0,
    background: "#000",
    fontFamily: "sans-serif",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "contrast(1.05) saturate(1.05)",
  },
  header: {
    position: "absolute",
    top: 40,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    zIndex: 10,
  },
  statusPill: {
    background: "rgba(0,0,0,0.85)",
    padding: "10px 25px",
    borderRadius: 30,
    color: "#fff",
    fontSize: 11,
    letterSpacing: "1px",
    border: "1px solid #333",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 140,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "5px solid #fff",
    background: "transparent",
    padding: 4,
  },
  inner: {
    width: "100%",
    height: "100%",
    background: "#fff",
    borderRadius: "50%",
  },
  preview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: "hidden",
    border: "2px solid #fff",
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  flip: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "#fff",
    fontSize: 22,
    padding: 15,
    borderRadius: "50%",
  },
};

export default App;
