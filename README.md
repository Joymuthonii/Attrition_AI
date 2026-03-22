# AttritionAI — Employee Attrition Prediction System

A full-stack ML web application that predicts employee attrition using multiple classification algorithms.

## Features

- **Predict Panel**: Input 12 employee features and get real-time attrition risk predictions
- **Dashboard**: Batch workforce analysis with interactive charts
- **Models Panel**: Compare performance of 5 ML algorithms

## ML Models Included

| Model | Type |
|-------|------|
| Logistic Regression | Linear classifier |
| Random Forest | Ensemble |
| Gradient Boosting | Ensemble |
| Decision Tree | Tree-based |
| SVM | Support Vector Machine |

## Input Features (12)

1. Job Satisfaction (1–5)
2. Monthly Income (USD)
3. Tenure (years)
4. Performance Rating (1–5)
5. Weekly Work Hours
6. Promotions in last 5 years
7. Department
8. Work-Life Balance (1–5)
9. Manager Support (1–5)
10. Commute Distance (km)
11. Training sessions last year
12. Active projects

## Output

- **Binary Prediction**: Will Leave (1) / Will Stay (0)
- **Probability Score**: 0–100% attrition likelihood
- **Risk Level**: Low / Medium / High
- **Actionable Insights**: Key factors driving the prediction

## Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Train the model
```bash
python train_model.py
```

### 3. Start the application
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

## Project Structure

```
attrition_app/
├── app.py                  # Flask backend & API routes
├── train_model.py          # ML model training script
├── requirements.txt        # Python dependencies
├── models/
│   ├── best_model.pkl      # Trained model (auto-generated)
│   ├── label_encoder.pkl   # Department encoder
│   └── metadata.json       # Model metrics & feature info
├── static/
│   ├── css/style.css       # Application styles
│   └── js/app.js           # Frontend JavaScript
└── templates/
    └── index.html          # Main HTML template
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main web interface |
| `/api/predict` | POST | Single employee prediction |
| `/api/model-info` | GET | Model metadata & performance |
| `/api/batch-analyze` | POST | Batch workforce analysis |

## Technology Stack

- **Backend**: Python, Flask, Scikit-learn
- **Frontend**: HTML5, CSS3, JavaScript, Chart.js
- **ML**: Supervised Binary Classification
