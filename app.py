import os
import joblib
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Load trained artifacts
ARTIFACT_PATH = os.path.join(os.path.dirname(__file__), 'churn_model_artifacts.joblib')
artifacts = joblib.load(ARTIFACT_PATH)

models = artifacts['models']
scaler = artifacts['scaler']
num_features = artifacts['num_features']
feature_columns = artifacts['feature_columns']
metrics = artifacts['metrics']

DEFAULT_VALUES = {
    'gender': 'Male',
    'SeniorCitizen': 0,
    'Partner': 'No',
    'Dependents': 'No',
    'tenure': 12,
    'PhoneService': 'Yes',
    'MultipleLines': 'No',
    'InternetService': 'Fiber optic',
    'OnlineSecurity': 'No',
    'OnlineBackup': 'No',
    'DeviceProtection': 'No',
    'TechSupport': 'No',
    'StreamingTV': 'No',
    'StreamingMovies': 'No',
    'Contract': 'Month-to-month',
    'PaperlessBilling': 'Yes',
    'PaymentMethod': 'Electronic check',
    'MonthlyCharges': 70.0,
    'TotalCharges': 840.0
}


def process_and_predict(data, model_name='Logistic Regression'):
    # Merge defaults with supplied input
    customer_data = DEFAULT_VALUES.copy()
    for key, value in data.items():
        if key in customer_data:
            if key in ['SeniorCitizen', 'tenure']:
                try:
                    customer_data[key] = int(value)
                except (ValueError, TypeError):
                    pass
            elif key in ['MonthlyCharges', 'TotalCharges']:
                try:
                    customer_data[key] = float(value)
                except (ValueError, TypeError):
                    pass
            else:
                customer_data[key] = str(value)

    # Compute TotalCharges if not provided or zero
    if customer_data.get('TotalCharges', 0) <= 0:
        customer_data['TotalCharges'] = round(customer_data['MonthlyCharges'] * max(customer_data['tenure'], 1), 2)

    # Convert to DataFrame and encode
    input_df = pd.DataFrame([customer_data])
    cat_cols = input_df.select_dtypes(include=['object', 'string', 'str']).columns.tolist()
    encoded_df = pd.get_dummies(input_df, columns=cat_cols, dtype=int)
    
    # Align columns with training feature set
    aligned_df = encoded_df.reindex(columns=feature_columns, fill_value=0)
    
    # Scale numerical features
    scaled_df = aligned_df.copy()
    scaled_df[num_features] = scaler.transform(aligned_df[num_features])

    # Select model
    selected_model = models.get(model_name, models['Logistic Regression'])

    # Predict
    prediction = int(selected_model.predict(scaled_df)[0])
    probabilities = selected_model.predict_proba(scaled_df)[0]
    churn_prob = float(probabilities[1])
    stay_prob = float(probabilities[0])

    # Determine risk category
    if churn_prob >= 0.65:
        risk_level = "Severe"
        badge_class = "danger"
    elif churn_prob >= 0.45:
        risk_level = "High"
        badge_class = "warning"
    elif churn_prob >= 0.25:
        risk_level = "Moderate"
        badge_class = "info"
    else:
        risk_level = "Low"
        badge_class = "success"

    # Identify contributing risk factors
    risk_factors = []
    recommendations = []

    if customer_data['Contract'] == 'Month-to-month':
        risk_factors.append("Month-to-month contracts have the highest churn frequency.")
        recommendations.append("Offer a 1-year or 2-year contract discount to lock in commitment.")

    if customer_data['tenure'] <= 6:
        risk_factors.append(f"Short tenure ({customer_data['tenure']} months) indicates early customer lifecycle vulnerability.")
        recommendations.append("Provide onboarding support and check-in assistance within the first 90 days.")

    if customer_data['InternetService'] == 'Fiber optic' and customer_data['TechSupport'] == 'No':
        risk_factors.append("Fiber optic users without Tech Support experience higher dissatisfaction.")
        recommendations.append("Bundle complimentary or discounted Tech Support & Device Protection.")

    if customer_data['PaymentMethod'] == 'Electronic check':
        risk_factors.append("Electronic check payment is strongly correlated with churn behavior.")
        recommendations.append("Encourage automated bank transfer or credit card auto-pay with a bill credit.")

    if customer_data['MonthlyCharges'] > 75:
        risk_factors.append(f"High monthly charges (${customer_data['MonthlyCharges']:.2f}) increase price sensitivity.")
        recommendations.append("Review usage patterns and suggest an optimized, value-focused plan.")

    if not risk_factors:
        risk_factors.append("Customer shows strong loyalty signals and stable engagement.")
        recommendations.append("Maintain satisfaction with loyalty perks and early access to upgrades.")

    return {
        "churn": bool(prediction == 1),
        "prediction_label": "Will Churn" if prediction == 1 else "Will Stay",
        "churn_probability": round(churn_prob * 100, 2),
        "stay_probability": round(stay_prob * 100, 2),
        "risk_level": risk_level,
        "badge_class": badge_class,
        "model_used": model_name,
        "model_metrics": metrics.get(model_name, {}),
        "risk_factors": risk_factors,
        "recommendations": recommendations,
        "input_summary": customer_data
    }


@app.route('/')
def home():
    return render_template('index.html', models=list(models.keys()), metrics=metrics)


@app.route('/api/predict', methods=['POST'])
def api_predict():
    payload = request.get_json(silent=True) or request.form.to_dict()
    if not payload:
        return jsonify({"error": "No input data provided. Send JSON body or form data."}), 400

    model_name = payload.get('model_name', 'Logistic Regression')
    if model_name not in models:
        model_name = 'Logistic Regression'

    result = process_and_predict(payload, model_name=model_name)
    return jsonify(result)


@app.route('/api/models', methods=['GET'])
def api_models():
    return jsonify({
        "available_models": list(models.keys()),
        "metrics": metrics,
        "default_model": artifacts.get('default_model', 'Logistic Regression')
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Customer Churn Prediction API", "version": "1.0.0"})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Customer Churn Prediction Server on http://0.0.0.0:{port} ...")
    app.run(host='0.0.0.0', port=port, debug=False)
