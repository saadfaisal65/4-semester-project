// DRClassification.js
import React, { useState } from "react";
import "./DRClassification.css";
import { Upload } from "lucide-react";

function DRClassification() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPrediction(null); // Reset prediction when new file is selected
      setError(null); // Reset any errors
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPrediction(null); // Reset prediction when new file is selected
      setError(null); // Reset any errors
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setLoading(true);
    setPrediction(null);
    setError(null);

    // Create a FormData object to send the file to the backend
    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      // Send the request to your Flask backend
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
        // Add these headers to ensure CORS works properly
        headers: {
          Accept: "application/json",
          // Don't set Content-Type when using FormData - browser will set it automatically with boundary
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! Status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Prediction result:", result);
      setPrediction(result);
    } catch (err) {
      console.error("Error during prediction:", err);
      setError("Failed to get prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Map prediction values to human-readable labels
  const getDRLabel = (prediction) => {
    const labels = {
      0: "No DR (No diabetic retinopathy)",
      1: "Mild DR (Mild diabetic retinopathy)",
      2: "Moderate DR (Moderate diabetic retinopathy)",
      3: "Severe DR (Severe diabetic retinopathy)",
      4: "Proliferative DR (Proliferative diabetic retinopathy)",
    };

    return labels[prediction.class] || `Unknown (${prediction.class})`;
  };

  return (
    <div className="dr-container">
      <div className="dr-card">
        <h1 className="dr-title">DR Classification with Transfer Learning</h1>

        <div
          className="upload-area"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <div className="upload-icon">
            {typeof Upload !== "undefined" ? (
              <Upload size={48} />
            ) : (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          <p className="upload-title">Drag and drop retinal image here</p>
          <p className="upload-subtitle">
            Limit 200 MB per file - JPG, JPEG, PNG
          </p>
          <input
            type="file"
            id="fileInput"
            className="hidden-input"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

          <button className="browse-button">Browse files</button>
        </div>

        {selectedFile && (
          <div className="selected-file-container">
            <p className="file-selected">Selected: {selectedFile.name}</p>
            {previewUrl && (
              <div className="image-preview">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="preview-image"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="predict-button-container">
          <button
            className="predict-button"
            onClick={handlePredict}
            disabled={loading || !selectedFile}
          >
            {loading ? "Processing..." : "Predict"}
          </button>
        </div>

        {loading && (
          <div
            className="loading-container"
            style={{ textAlign: "center", margin: "20px 0" }}
          >
            <div
              className="loading-spinner"
              style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #006d77",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                animation: "spin 2s linear infinite",
                margin: "0 auto 10px auto",
              }}
            ></div>
            <p>Analyzing image...</p>
          </div>
        )}

        {error && (
          <div
            className="error-message"
            style={{
              color: "#e63946",
              textAlign: "center",
              margin: "20px 0",
              padding: "10px",
              backgroundColor: "#ffccd5",
              borderRadius: "5px",
            }}
          >
            {error}
          </div>
        )}

        {prediction && (
          <div
            className="prediction-result"
            style={{
              margin: "20px 0",
              padding: "15px",
              backgroundColor: "#edf6f9",
              borderRadius: "5px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ color: "#006d77", marginBottom: "10px" }}>
              Prediction Result
            </h2>
            <p className="prediction-class">
              <strong>Classification:</strong> {getDRLabel(prediction)}
            </p>
            <p className="prediction-confidence">
              <strong>Confidence:</strong>{" "}
              {(prediction.confidence * 100).toFixed(2)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DRClassification;
