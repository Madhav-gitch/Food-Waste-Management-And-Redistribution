from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
from train_model import train_and_save_model
import pandas as pd

app = Flask(__name__)
CORS(app)

MODEL_PATH = 'food_model.pkl'

# Ensure model exists
if not os.path.exists(MODEL_PATH):
    print("Model not found. Training a new model now...")
    train_and_save_model()

with open(MODEL_PATH, 'rb') as f:
    model = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        days = float(data.get('days', 0))
        quantity = float(data.get('quantity', 0))
        storage_str = data.get('storage', 'Room')
        
        # Room -> 0, Fridge -> 1
        storage = 0 if storage_str == 'Room' else 1
        
        # Create dataframe with valid feature names
        features = pd.DataFrame([[days, quantity, storage]], columns=['days', 'quantity', 'storage'])
        
        # Prediction
        pred = model.predict(features)[0]
        
        status_map = {
            0: "Fresh",
            1: "Expiring",
            2: "Waste"
        }
        
        return jsonify({"status": status_map.get(pred, "Fresh")})
        
    except Exception as e:
        print("Prediction Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
