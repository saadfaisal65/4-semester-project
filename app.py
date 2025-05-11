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
model_path = os.path.join('Model', 'model.pth')  # Adjust path if needed

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224", num_labels=5, ignore_mismatched_sizes=True)
model.classifier = torch.nn.Linear(model.config.hidden_size, 5)
model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
model.to(device)
model.eval()

# Define transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    try:
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Preprocess the image
        input_image = transform(image).unsqueeze(0).to(device)
        
        # Model prediction
        with torch.no_grad():
            output = model(input_image).logits
            prediction = output.argmax(1).item()
            probabilities = torch.nn.functional.softmax(output, dim=1)[0]
            confidence = probabilities[prediction].item()
        
        return jsonify({
            'class': prediction,
            'confidence': confidence
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)w