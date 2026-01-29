import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import Upscaler from "upscaler";
import x2 from "@upscalerjs/esrgan-slim/2x"; // ✅ Faster model for mobile

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [upscaler, setUpscaler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [facingMode, setFacingMode] = useState("environment");
  const [lastImage, setLastImage] = useState(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        setStatus("Loading AI Model...");
        await tf.setBackend('webgl');
        await tf.ready();
        
        // ✅ Pass the imported model definition here
        const upscalerInstance = new Upscaler({
          model: x2 
        });
        
        setUpscaler(upscalerInstance);
        startCamera();
      } catch (err) {
        console.error("Init Error:", err);
        setStatus("AI Load Failed");
      }
    };
    initApp();
  }, [facingMode]);

  const startCamera = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("Ready");
    } catch (error) {
      setStatus("Camera Error");
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const download = (url, name) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  };

  const captureAndProcess = async () => {
    if (!upscaler || loading) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    // 1. Instant Save (Original)
    const originalData = canvas.toDataURL("image/png");
    setLastImage(originalData);
    download(originalData, `Original_${Date.now()}.png`);

    setLoading(true);
    setStatus("Enhancing Beautifully...");

    try {
      await tf.nextFrame();

      // 2. AI Upscale
      const enhancedImage = await upscaler.upscale(canvas, {
        patchSize: 64, 
        padding: 5
      });

      // 3. Save Enhanced
      download(enhancedImage, `AI_Enhanced_${Date.now()}.png`);
      setLastImage(enhancedImage);
      setStatus("Beautiful Image Saved!");
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
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
      {flash && <div style={styles.flash} />}

      <div style={styles.header}>
        <div style={styles.statusPill}>{status}</div>
      </div>

      <div style={styles.controls}>
        <div style={styles.preview}>
          {lastImage && <img src={lastImage} alt="Last" style={styles.previewImg} />}
        </div>
        <button onClick={captureAndProcess} disabled={loading} style={styles.shutterOuter}>
          <div style={{ ...styles.shutterInner, background: loading ? "#ff9800" : "#fff" }} />
        </button>
        <button onClick={toggleCamera} style={styles.iconBtn}>🔄</button>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  app: { position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "sans-serif" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  flash: { position: "absolute", inset: 0, background: "#fff", zIndex: 10 },
  header: { position: "absolute", top: 40, width: "100%", display: "flex", justifyContent: "center", zIndex: 15 },
  statusPill: { padding: "8px 20px", borderRadius: 20, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, backdropFilter: "blur(5px)" },
  controls: { position: "absolute", bottom: 0, width: "100%", height: 140, display: "flex", justifyContent: "space-around", alignItems: "center", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", zIndex: 10 },
  shutterOuter: { width: 75, height: 75, borderRadius: "50%", border: "4px solid #fff", background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", padding: 0 },
  shutterInner: { width: 60, height: 60, borderRadius: "50%", transition: "0.2s" },
  preview: { width: 50, height: 50, borderRadius: 8, background: "#222", overflow: "hidden", border: "1px solid #444" },
  previewImg: { width: "100%", height: "100%", objectFit: "cover" },
  iconBtn: { width: 50, height: 50, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 20 }
};

export default App;
