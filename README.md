# Food Waste Prediction and Redistribution System

This is a full-stack web application designed to predict food waste (using Machine Learning) and allow redistribution of expiring food using a fun, gravity-based UI (Matter.js).

## Project Structure

- `backend/` - Node.js + Express + MongoDB backend
- `ml_api/` - Python + Flask + Scikit-Learn API for predictions
- `frontend/` - HTML, CSS, JavaScript (Matter.js) frontend client

## Prerequisites
- **Node.js**: installed on your machine
- **Python 3**: installed on your machine
- **MongoDB**: A running local instance of MongoDB (port 27017, database `food_waste` will be created automatically)

---

## Step-by-Step Instructions

You need three terminal windows to run all components separately.

### 1. Start the Machine Learning API (Terminal 1)
Open a new terminal and navigate to the project directory, then to `ml_api`:
```bash
cd ml_api

# (Optional but recommended) Create a virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the Flask API (It will generate synthetic data and train the model automatically the first time)
python app.py
```
*The ML API will run on http://127.0.0.1:5001.*

### 2. Start the Node.js Backend (Terminal 2)
Open a new terminal and navigate to `backend`:
```bash
cd backend

# Install dependencies
npm install

# Start the server (Make sure MongoDB is running on your machine)
npm start
```
*The Backend API will run on http://localhost:5000.*

### 3. Start the Frontend (Terminal 3)
Open a new terminal and navigate to `frontend`:
```bash
cd frontend

# You can serve the static files using a tool like Live Server in VS Code
# OR use Python's built-in HTTP server:
python -m http.server 8000
```
Open your browser and navigate to http://localhost:8000.

---

## How it works:
1. **Add Food**: On the left sidebar, add an item (e.g., Tomatoes, Qty 10, Storage Days: 12, Fridge).
2. **Prediction**: The backend sends the info to the ML Flask API, which uses its Random Forest Classifier to predict the status (`Fresh`, `Expiring`, or `Waste`).
3. **Dashboard display**: The normal table updates. 
4. **AntiGravity Donation Zone**: If an item is classified as `Expiring`, it will fall from the "sky" into the "Donation Zone" canvas!
5. **Redistribution**: Drag the falling food item into the blue "Donate Here!" bin. It will automatically update the backend logic, marking it as Donated, incrementing your donation stats, and removing it from physics processing!
