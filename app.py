from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import ViTForImageClassification
from PIL import Image
import torchvision.transforms as transforms
import os
import io

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

# Load the trained model
model_dir = os.path.join('model')  # Using lowercase 'model' as shown in your folder structure
model_path = os.path.join(model_dir, 'data.pkl')  # Using the data.pkl file visible in your structure
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

try:
    # First, try loading the model with the saved state dict
    model = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224", num_labels=5, ignore_mismatched_sizes=True)
    model.classifier = torch.nn.Linear(model.config.hidden_size, 5)
    
    # Check if model file exists
    if os.path.exists(model_path):
        print(f"Loading model from {model_path}")
        # Use a more compatible loading approach
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)
        print("Model loaded successfully")
    else:
        print(f"WARNING: Model file not found at {model_path}")
        print("Using untrained model as fallback")
    
    model.to(device)
    model.eval()
    print("Model prepared and ready")
except Exception as e:
    print(f"Error loading model: {str(e)}")
    raise

# Define transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

@app.route('/predict', methods=['POST'])
def predict():
    # Debug - print what we received
    print("Request received at /predict endpoint")
    print(f"Files in request: {request.files}")
    
    if 'image' not in request.files:
        print("No image file found in request")
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    print(f"Received file: {file.filename}")
    
    try:
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        print(f"Image opened successfully, size: {image.size}")
        
        # Preprocess the image
        input_image = transform(image).unsqueeze(0).to(device)
        print("Image preprocessed and ready for prediction")
        
        # Model prediction
        with torch.no_grad():
            output = model(input_image).logits
            prediction = output.argmax(1).item()
            probabilities = torch.nn.functional.softmax(output, dim=1)[0]
            confidence = probabilities[prediction].item()
        
        result = {
            'class': prediction,
            'confidence': confidence
        }
        print(f"Prediction result: {result}")
        
        return jsonify(result)
    except Exception as e:
        error_message = str(e)
        print(f"Error during prediction: {error_message}")
        return jsonify({'error': error_message}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

if __name__ == '__main__':
    print("Starting server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)