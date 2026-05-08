import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import pickle

def train_and_save_model():
    print("Generating synthetic data...")
    # Generate synthetic data
    # Features:
    # - days: storage days (0 to 30)
    # - quantity: (1 to 100)
    # - storage: Room (0), Fridge (1)
    
    data = []
    for _ in range(1000):
        days = np.random.randint(0, 30)
        quantity = np.random.randint(1, 100)
        storage_choice = np.random.choice(['Room', 'Fridge'])
        storage = 0 if storage_choice == 'Room' else 1
        
        # Rule-based synthetic logic for dataset:
        # If Room temperature, expires quickly
        if storage == 0:
            if days <= 2: status = 0 # Fresh
            elif days <= 5: status = 1 # Expiring
            else: status = 2 # Waste
        # If Fridge, expires slower
        else:
            if days <= 7: status = 0 # Fresh
            elif days <= 14: status = 1 # Expiring
            else: status = 2 # Waste
            
        # Add some noise
        if np.random.rand() > 0.9:
            status = np.random.choice([0, 1, 2])
            
        data.append([days, quantity, storage, status])

    df = pd.DataFrame(data, columns=['days', 'quantity', 'storage', 'status'])
    
    X = df[['days', 'quantity', 'storage']]
    y = df['status']

    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    
    print("Saving model to food_model.pkl...")
    with open('food_model.pkl', 'wb') as f:
        pickle.dump(clf, f)
        
    print("Model trained and saved successfully.")

if __name__ == "__main__":
    train_and_save_model()
