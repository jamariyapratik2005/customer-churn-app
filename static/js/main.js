/* ==========================================================
   RetainIQ - Churn Prediction Frontend Logic
   Vanilla JavaScript | Dynamic Interactivity & API Connection
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('churn-form');
  const btnSubmit = document.getElementById('btn-submit');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnText = btnSubmit.querySelector('.btn-text');
  const modelSelector = document.getElementById('model-selector');
  const modelTag = document.getElementById('model-tag');

  // Sliders and Displays
  const tenureRange = document.getElementById('tenure-range');
  const tenureInput = document.getElementById('tenure');
  const tenureValDisplay = document.getElementById('tenure-val-display');

  const monthlyRange = document.getElementById('monthly-range');
  const monthlyInput = document.getElementById('MonthlyCharges');
  const monthlyValDisplay = document.getElementById('monthly-val-display');

  // Accordion
  const toggleDetails = document.getElementById('toggle-details');
  const detailsContent = document.getElementById('details-content');

  // Results views
  const placeholderView = document.getElementById('placeholder-view');
  const predictionView = document.getElementById('prediction-view');
  const outcomeBanner = document.getElementById('outcome-banner');
  const outcomeIcon = document.getElementById('outcome-icon');
  const outcomeTitle = document.getElementById('outcome-title');
  const riskBadge = document.getElementById('risk-badge');
  const churnProbNum = document.getElementById('churn-prob-num');
  const barChurn = document.getElementById('bar-churn');
  const barStay = document.getElementById('bar-stay');
  const labelChurnProb = document.getElementById('label-churn-prob');
  const labelStayProb = document.getElementById('label-stay-prob');
  const riskFactorsList = document.getElementById('risk-factors-list');
  const recommendationsList = document.getElementById('recommendations-list');
  const metaModelUsed = document.getElementById('meta-model-used');
  const metaModelAcc = document.getElementById('meta-model-acc');
  const metaModelAuc = document.getElementById('meta-model-auc');

  // Presets
  const btnPresetRisky = document.getElementById('preset-risky');
  const btnPresetLoyal = document.getElementById('preset-loyal');
  const btnPresetReset = document.getElementById('preset-reset');

  // Copy cURL
  const btnCopyCurl = document.getElementById('btn-copy-curl');
  const curlCodeSnippet = document.getElementById('curl-code-snippet');

  // Sync Sliders
  tenureRange.addEventListener('input', (e) => {
    const val = e.target.value;
    tenureInput.value = val;
    tenureValDisplay.textContent = `${val} month${val === '1' ? '' : 's'}`;
  });

  monthlyRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(2);
    monthlyInput.value = val;
    monthlyValDisplay.textContent = `$${val}`;
  });

  // Toggle Accordion
  toggleDetails.addEventListener('click', () => {
    const isExpanded = toggleDetails.getAttribute('aria-expanded') === 'true';
    toggleDetails.setAttribute('aria-expanded', !isExpanded);
    detailsContent.classList.toggle('open', !isExpanded);
  });

  // Preset Handlers
  const applyValues = (data) => {
    // Text / Select inputs
    for (const [key, value] of Object.entries(data)) {
      const field = form.elements[key];
      if (field) {
        field.value = value;
      }
    }
    // Update Sliders
    if (data.tenure !== undefined) {
      tenureRange.value = data.tenure;
      tenureInput.value = data.tenure;
      tenureValDisplay.textContent = `${data.tenure} months`;
    }
    if (data.MonthlyCharges !== undefined) {
      monthlyRange.value = data.MonthlyCharges;
      monthlyInput.value = data.MonthlyCharges;
      monthlyValDisplay.textContent = `$${parseFloat(data.MonthlyCharges).toFixed(2)}`;
    }
  };

  btnPresetRisky.addEventListener('click', () => {
    applyValues({
      tenure: 3,
      MonthlyCharges: 85.0,
      Contract: 'Month-to-month',
      InternetService: 'Fiber optic',
      PaymentMethod: 'Electronic check',
      TechSupport: 'No',
      OnlineSecurity: 'No',
      OnlineBackup: 'No',
      DeviceProtection: 'No',
      PaperlessBilling: 'Yes',
      SeniorCitizen: '0',
      Partner: 'No',
      Dependents: 'No',
      PhoneService: 'Yes'
    });
    // Auto trigger prediction
    form.dispatchEvent(new Event('submit'));
  });

  btnPresetLoyal.addEventListener('click', () => {
    applyValues({
      tenure: 55,
      MonthlyCharges: 52.0,
      Contract: 'Two year',
      InternetService: 'DSL',
      PaymentMethod: 'Bank transfer (automatic)',
      TechSupport: 'Yes',
      OnlineSecurity: 'Yes',
      OnlineBackup: 'Yes',
      DeviceProtection: 'Yes',
      PaperlessBilling: 'No',
      SeniorCitizen: '0',
      Partner: 'Yes',
      Dependents: 'Yes',
      PhoneService: 'Yes'
    });
    // Auto trigger prediction
    form.dispatchEvent(new Event('submit'));
  });

  btnPresetReset.addEventListener('click', () => {
    applyValues({
      tenure: 12,
      MonthlyCharges: 70.0,
      Contract: 'Month-to-month',
      InternetService: 'Fiber optic',
      PaymentMethod: 'Electronic check',
      TechSupport: 'No',
      OnlineSecurity: 'No',
      OnlineBackup: 'No',
      DeviceProtection: 'No',
      PaperlessBilling: 'Yes',
      SeniorCitizen: '0',
      Partner: 'No',
      Dependents: 'No',
      PhoneService: 'Yes'
    });
    placeholderView.style.display = 'flex';
    predictionView.style.display = 'none';
    modelTag.textContent = 'Ready';
    modelTag.className = 'status-tag tag-ready';
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading state
    btnSpinner.style.display = 'inline-block';
    btnText.style.opacity = '0.6';
    btnSubmit.disabled = true;

    // Collect payload
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    // Append model selection
    payload.model_name = modelSelector.value;

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      renderPrediction(data);
    } catch (err) {
      alert(`Prediction failed: ${err.message}. Ensure the backend server is running.`);
    } finally {
      btnSpinner.style.display = 'none';
      btnText.style.opacity = '1';
      btnSubmit.disabled = false;
    }
  });

  function renderPrediction(data) {
    // Hide placeholder, display prediction view
    placeholderView.style.display = 'none';
    predictionView.style.display = 'block';

    // Banner styling based on outcome
    outcomeBanner.className = 'outcome-banner';
    riskBadge.className = 'risk-badge';

    if (data.churn) {
      if (data.risk_level === 'Severe') {
        outcomeBanner.classList.add('banner-danger');
        riskBadge.classList.add('badge-danger');
        outcomeIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      } else {
        outcomeBanner.classList.add('banner-warning');
        riskBadge.classList.add('badge-warning');
        outcomeIcon.innerHTML = '<i class="fa-solid fa-bell"></i>';
      }
      outcomeTitle.textContent = 'Customer Will Churn';
      modelTag.textContent = 'High Churn Risk';
      modelTag.className = 'status-tag tag-ready';
    } else {
      outcomeBanner.classList.add('banner-success');
      riskBadge.classList.add('badge-success');
      outcomeIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      outcomeTitle.textContent = 'Customer Will Stay';
      modelTag.textContent = 'Customer Retained';
      modelTag.className = 'status-tag tag-ready';
    }

    riskBadge.textContent = `${data.risk_level} Risk`;
    churnProbNum.textContent = `${data.churn_probability}%`;

    // Progress Bar
    barChurn.style.width = `${data.churn_probability}%`;
    barStay.style.width = `${data.stay_probability}%`;
    labelChurnProb.textContent = `${data.churn_probability}% Churn Risk`;
    labelStayProb.textContent = `${data.stay_probability}% Retention`;

    // Identified Risk Factors
    riskFactorsList.innerHTML = '';
    (data.risk_factors || []).forEach(factor => {
      const li = document.createElement('li');
      li.textContent = factor;
      riskFactorsList.appendChild(li);
    });

    // Recommendations
    recommendationsList.innerHTML = '';
    (data.recommendations || []).forEach(rec => {
      const li = document.createElement('li');
      li.textContent = rec;
      recommendationsList.appendChild(li);
    });

    // Meta details
    metaModelUsed.textContent = data.model_used;
    if (data.model_metrics) {
      metaModelAcc.textContent = data.model_metrics.Accuracy ? `${(data.model_metrics.Accuracy * 100).toFixed(2)}%` : '80.62%';
      metaModelAuc.textContent = data.model_metrics.ROC_AUC || '0.8422';
    }
  }

  // Copy cURL button
  btnCopyCurl.addEventListener('click', () => {
    const code = curlCodeSnippet.textContent;
    navigator.clipboard.writeText(code).then(() => {
      btnCopyCurl.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        btnCopyCurl.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
      }, 2000);
    });
  });
});
