"""
Employee Attrition Prediction - Model Training Script
Trains multiple classifiers and saves the best one.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, roc_auc_score)
from sklearn.pipeline import Pipeline
import joblib
import json
import os

np.random.seed(42)

def generate_synthetic_data(n_samples=2000):
    """Generate realistic synthetic employee attrition data."""
    departments = ['HR', 'IT', 'Sales', 'Finance', 'Operations', 'Marketing', 'Engineering']
    
    data = {
        'job_satisfaction': np.random.randint(1, 6, n_samples),           # 1-5
        'monthly_income': np.random.randint(2000, 20000, n_samples),       # USD
        'tenure_years': np.random.randint(0, 30, n_samples),               # years
        'performance_rating': np.random.randint(1, 6, n_samples),          # 1-5
        'weekly_hours': np.random.randint(30, 80, n_samples),              # hours
        'promotions_last_5yrs': np.random.randint(0, 4, n_samples),       # count
        'department': np.random.choice(departments, n_samples),
        'work_life_balance': np.random.randint(1, 6, n_samples),          # 1-5
        'manager_support': np.random.randint(1, 6, n_samples),            # 1-5
        'commute_distance': np.random.randint(1, 50, n_samples),          # km
        'training_last_year': np.random.randint(0, 6, n_samples),         # sessions
        'num_projects': np.random.randint(1, 10, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Simulate realistic attrition logic
    attrition_score = (
        (5 - df['job_satisfaction']) * 0.25 +
        (5 - df['work_life_balance']) * 0.20 +
        (df['weekly_hours'] > 55).astype(int) * 0.20 +
        (df['promotions_last_5yrs'] == 0).astype(int) * 0.15 +
        (df['monthly_income'] < 5000).astype(int) * 0.10 +
        (5 - df['manager_support']) * 0.10 +
        np.random.normal(0, 0.3, n_samples)
    )
    
    # Convert to binary with ~23% attrition rate (realistic)
    threshold = np.percentile(attrition_score, 77)
    df['attrition'] = (attrition_score > threshold).astype(int)
    
    return df

def train_all_models(df):
    """Train multiple models and return results."""
    # Encode department
    le = LabelEncoder()
    df['department_encoded'] = le.fit_transform(df['department'])
    
    feature_cols = [
        'job_satisfaction', 'monthly_income', 'tenure_years',
        'performance_rating', 'weekly_hours', 'promotions_last_5yrs',
        'department_encoded', 'work_life_balance', 'manager_support',
        'commute_distance', 'training_last_year', 'num_projects'
    ]
    
    X = df[feature_cols]
    y = df['attrition']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=150, random_state=42),
        'Logistic Regression': Pipeline([
            ('scaler', StandardScaler()),
            ('clf', LogisticRegression(max_iter=1000, random_state=42))
        ]),
        'Decision Tree': DecisionTreeClassifier(max_depth=8, random_state=42),
        'SVM': Pipeline([
            ('scaler', StandardScaler()),
            ('clf', SVC(probability=True, random_state=42))
        ]),
    }
    
    results = {}
    best_model = None
    best_score = 0
    best_name = ""
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
        
        results[name] = {
            'accuracy': round(acc * 100, 2),
            'auc_roc': round(auc * 100, 2),
            'cv_mean': round(cv_scores.mean() * 100, 2),
            'cv_std': round(cv_scores.std() * 100, 2),
        }
        
        if auc > best_score:
            best_score = auc
            best_model = model
            best_name = name
        
        print(f"{name}: Accuracy={acc:.3f}, AUC={auc:.3f}")
    
    print(f"\nBest Model: {best_name} (AUC={best_score:.3f})")
    
    # Feature importance from best RF model
    rf_model = models['Random Forest']
    feature_importance = dict(zip(feature_cols, 
                                   rf_model.feature_importances_.tolist()))
    
    return best_model, best_name, results, feature_importance, le, feature_cols

def main():
    print("Generating synthetic employee data...")
    df = generate_synthetic_data(2000)
    print(f"Dataset: {len(df)} records, {df['attrition'].mean():.1%} attrition rate")
    
    print("\nTraining models...")
    best_model, best_name, results, feature_importance, le, feature_cols = train_all_models(df)
    
    # Save artifacts
    os.makedirs('models', exist_ok=True)
    
    joblib.dump(best_model, 'models/best_model.pkl')
    joblib.dump(le, 'models/label_encoder.pkl')
    
    metadata = {
        'best_model_name': best_name,
        'feature_cols': feature_cols,
        'departments': le.classes_.tolist(),
        'model_results': results,
        'feature_importance': feature_importance,
        'attrition_rate': round(df['attrition'].mean() * 100, 1)
    }
    
    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("\nModel artifacts saved to /models/")
    print("Training complete!")
    return metadata

if __name__ == '__main__':
    main()
