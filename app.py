"""
Employee Attrition Prediction - Flask Backend
"""

from flask import Flask, render_template, request, jsonify
import joblib
import json
import numpy as np
import os

app = Flask(__name__)

# Load model artifacts at startup
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_artifacts():
    model = joblib.load(os.path.join(MODEL_DIR, 'best_model.pkl'))
    le = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
    with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
        metadata = json.load(f)
    return model, le, metadata

try:
    model, label_encoder, metadata = load_artifacts()
    print(f"Loaded model: {metadata['best_model_name']}")
except Exception as e:
    print(f"Error loading model: {e}")
    model, label_encoder, metadata = None, None, {}

@app.route('/')
def index():
    return render_template('index.html', metadata=metadata)

@app.route('/api/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        
        # Encode department
        dept_encoded = label_encoder.transform([data['department']])[0]
        
        # Build feature vector in correct order
        features = [
            int(data['job_satisfaction']),
            float(data['monthly_income']),
            float(data['tenure_years']),
            int(data['performance_rating']),
            float(data['weekly_hours']),
            int(data['promotions_last_5yrs']),
            int(dept_encoded),
            int(data['work_life_balance']),
            int(data['manager_support']),
            float(data['commute_distance']),
            int(data['training_last_year']),
            int(data['num_projects']),
        ]
        
        X = np.array(features).reshape(1, -1)
        
        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0]
        
        leave_prob = float(probability[1]) * 100
        stay_prob = float(probability[0]) * 100
        
        # Risk level
        if leave_prob >= 70:
            risk_level = 'High'
            risk_color = '#ef4444'
        elif leave_prob >= 40:
            risk_level = 'Medium'
            risk_color = '#f59e0b'
        else:
            risk_level = 'Low'
            risk_color = '#10b981'
        
        # Generate insights
        insights = generate_insights(data, leave_prob)
        
        return jsonify({
            'prediction': int(prediction),
            'will_leave': bool(prediction == 1),
            'leave_probability': round(leave_prob, 1),
            'stay_probability': round(stay_prob, 1),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'insights': insights,
            'model_name': metadata.get('best_model_name', 'ML Model')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

def generate_insights(data, leave_prob):
    insights = []
    
    if int(data['job_satisfaction']) <= 2:
        insights.append({'type': 'warning', 'text': 'Very low job satisfaction is a major attrition driver'})
    elif int(data['job_satisfaction']) >= 4:
        insights.append({'type': 'positive', 'text': 'High job satisfaction reduces attrition risk significantly'})
    
    if float(data['weekly_hours']) > 55:
        insights.append({'type': 'warning', 'text': f"Working {data['weekly_hours']}+ hrs/week indicates work overload"})
    
    if int(data['work_life_balance']) <= 2:
        insights.append({'type': 'warning', 'text': 'Poor work-life balance is strongly linked to turnover'})
    
    if int(data['promotions_last_5yrs']) == 0 and float(data['tenure_years']) > 3:
        insights.append({'type': 'warning', 'text': 'No promotions after 3+ years may signal stagnation'})
    
    if float(data['monthly_income']) < 4000:
        insights.append({'type': 'warning', 'text': 'Below-market compensation increases flight risk'})
    
    if int(data['manager_support']) >= 4:
        insights.append({'type': 'positive', 'text': 'Strong manager support is a key retention factor'})
    
    if int(data['training_last_year']) >= 3:
        insights.append({'type': 'positive', 'text': 'Regular training investment improves employee loyalty'})
    
    if not insights:
        if leave_prob < 30:
            insights.append({'type': 'positive', 'text': 'Employee profile shows strong retention indicators'})
        else:
            insights.append({'type': 'info', 'text': 'Multiple moderate factors contributing to attrition risk'})
    
    return insights[:4]

@app.route('/api/model-info')
def model_info():
    return jsonify(metadata)

@app.route('/api/batch-analyze', methods=['POST'])
def batch_analyze():
    """Simulate batch analysis with random-ish data for dashboard."""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        np.random.seed(123)
        n = 150
        depts = metadata.get('departments', ['HR', 'IT', 'Sales'])
        
        results = {
            'total': n,
            'high_risk': 0,
            'medium_risk': 0,
            'low_risk': 0,
            'dept_breakdown': {},
            'avg_attrition_rate': 0
        }
        
        dept_risks = {d: [] for d in depts}
        
        for _ in range(n):
            dept = np.random.choice(depts)
            dept_enc = label_encoder.transform([dept])[0]
            features = [
                np.random.randint(1, 6),
                np.random.randint(2000, 20000),
                np.random.randint(0, 20),
                np.random.randint(1, 6),
                np.random.randint(30, 70),
                np.random.randint(0, 4),
                dept_enc,
                np.random.randint(1, 6),
                np.random.randint(1, 6),
                np.random.randint(1, 40),
                np.random.randint(0, 5),
                np.random.randint(1, 8),
            ]
            X = np.array(features).reshape(1, -1)
            prob = model.predict_proba(X)[0][1] * 100
            dept_risks[dept].append(prob)
            
            if prob >= 70:
                results['high_risk'] += 1
            elif prob >= 40:
                results['medium_risk'] += 1
            else:
                results['low_risk'] += 1
        
        for dept, risks in dept_risks.items():
            if risks:
                results['dept_breakdown'][dept] = round(np.mean(risks), 1)
        
        results['avg_attrition_rate'] = round(
            (results['high_risk'] + results['medium_risk'] * 0.5) / n * 100, 1
        )
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
