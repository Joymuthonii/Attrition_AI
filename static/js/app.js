/* ============================================
   AttritionAI — Frontend JavaScript
   ============================================ */

// ---- Tab Navigation ----
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const panel = tab.dataset.panel;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${panel}`).classList.add('active');

    if (panel === 'dashboard') loadDashboard();
    if (panel === 'models') loadModels();
  });
});

// ---- Slider Value Displays ----
const sliders = [
  'job_satisfaction', 'work_life_balance', 'manager_support',
  'performance_rating', 'weekly_hours', 'promotions_last_5yrs',
  'training_last_year', 'num_projects'
];

sliders.forEach(id => {
  const slider = document.getElementById(id);
  const valEl = document.getElementById(`${id}_val`);
  if (slider && valEl) {
    slider.addEventListener('input', () => { valEl.textContent = slider.value; });
  }
});

// ---- Chart instances ----
let probChartInstance = null;
let riskDistChart = null;
let deptChart = null;
let featureChart = null;

// ---- Prediction ----
async function runPrediction() {
  const btn = document.getElementById('predict-btn');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="btn-icon">⏳</span> Analyzing...';

  const payload = {
    job_satisfaction: document.getElementById('job_satisfaction').value,
    monthly_income: document.getElementById('monthly_income').value,
    tenure_years: document.getElementById('tenure_years').value,
    performance_rating: document.getElementById('performance_rating').value,
    weekly_hours: document.getElementById('weekly_hours').value,
    promotions_last_5yrs: document.getElementById('promotions_last_5yrs').value,
    department: document.getElementById('department').value,
    work_life_balance: document.getElementById('work_life_balance').value,
    manager_support: document.getElementById('manager_support').value,
    commute_distance: document.getElementById('commute_distance').value,
    training_last_year: document.getElementById('training_last_year').value,
    num_projects: document.getElementById('num_projects').value,
  };

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    displayResult(data);
  } catch (err) {
    alert('Prediction failed: ' + err.message);
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = '<span class="btn-icon">◈</span> Analyze Attrition Risk';
  }
}

function displayResult(data) {
  document.getElementById('result-placeholder').classList.add('hidden');
  const content = document.getElementById('result-content');
  content.classList.remove('hidden');

  // Verdict badge
  const badge = document.getElementById('verdict-badge');
  badge.className = 'verdict-badge ' + (data.will_leave ? 'leave-yes' : 'leave-no');
  document.getElementById('verdict-icon').textContent = data.will_leave ? '▲' : '●';
  document.getElementById('verdict-text').textContent = data.will_leave
    ? 'Likely to Leave' : 'Likely to Stay';

  document.getElementById('result-model-tag').textContent = data.model_name;

  // Probability ring chart
  const ctx = document.getElementById('prob-chart').getContext('2d');
  if (probChartInstance) probChartInstance.destroy();

  const leaveColor = data.leave_probability >= 70 ? '#ef4444'
    : data.leave_probability >= 40 ? '#f59e0b' : '#10b981';

  probChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [data.leave_probability, data.stay_probability],
        backgroundColor: [leaveColor, '#1c2333'],
        borderWidth: 0,
        hoverOffset: 4,
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { animateRotate: true, duration: 800 }
    }
  });

  // Center text
  document.getElementById('prob-number').textContent = data.leave_probability + '%';
  document.getElementById('prob-number').style.color = leaveColor;

  // Risk bar
  const riskBadge = document.getElementById('risk-badge');
  riskBadge.textContent = data.risk_level;
  riskBadge.className = 'risk-badge ' + data.risk_level;
  document.getElementById('risk-bar-fill').style.width = data.leave_probability + '%';

  // Probabilities
  document.getElementById('stay-prob').textContent = data.stay_probability + '%';
  document.getElementById('leave-prob').textContent = data.leave_probability + '%';

  // Insights
  const insightsList = document.getElementById('insights-list');
  insightsList.innerHTML = '';
  data.insights.forEach(ins => {
    const icon = ins.type === 'warning' ? '⚠' : ins.type === 'positive' ? '✓' : 'ℹ';
    insightsList.innerHTML += `
      <div class="insight-item ${ins.type}">
        <span class="insight-icon">${icon}</span>
        <span>${ins.text}</span>
      </div>`;
  });

  // Recommendation
  let rec = '';
  if (data.risk_level === 'High') {
    rec = '🔴 <strong>Immediate Action Required:</strong> This employee shows critical attrition signals. Consider urgent 1-on-1 meetings, compensation review, and career growth discussions.';
  } else if (data.risk_level === 'Medium') {
    rec = '🟡 <strong>Monitor Closely:</strong> Notable risk factors present. Schedule regular check-ins, explore development opportunities, and address workload concerns proactively.';
  } else {
    rec = '🟢 <strong>Stable Profile:</strong> This employee shows positive retention indicators. Continue regular engagement and ensure ongoing satisfaction.';
  }
  document.getElementById('recommendation-box').innerHTML = rec;
}

function resetForm() {
  sliders.forEach(id => {
    const slider = document.getElementById(id);
    const valEl = document.getElementById(`${id}_val`);
    if (slider) {
      slider.value = slider.defaultValue;
      if (valEl) valEl.textContent = slider.defaultValue;
    }
  });
  ['monthly_income', 'tenure_years', 'commute_distance'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.defaultValue;
  });
  document.getElementById('result-placeholder').classList.remove('hidden');
  document.getElementById('result-content').classList.add('hidden');
}

// ---- Dashboard ----
async function loadDashboard() {
  try {
    const res = await fetch('/api/batch-analyze', { method: 'POST' });
    const data = await res.json();

    document.getElementById('kpi-total').textContent = data.total;
    document.getElementById('kpi-high').textContent = data.high_risk;
    document.getElementById('kpi-medium').textContent = data.medium_risk;
    document.getElementById('kpi-low').textContent = data.low_risk;
    document.getElementById('kpi-rate').textContent = data.avg_attrition_rate + '%';

    renderRiskDistChart(data);
    renderDeptChart(data);
    renderFeatureChart();
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderRiskDistChart(data) {
  const ctx = document.getElementById('risk-dist-chart').getContext('2d');
  if (riskDistChart) riskDistChart.destroy();
  riskDistChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [data.high_risk, data.medium_risk, data.low_risk],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 2,
        borderColor: '#161b22',
        hoverOffset: 6,
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8b949e', font: { size: 12 }, padding: 16, boxWidth: 14 }
        }
      },
      animation: { animateRotate: true, duration: 700 }
    }
  });
}

function renderDeptChart(data) {
  const ctx = document.getElementById('dept-chart').getContext('2d');
  if (deptChart) deptChart.destroy();

  const labels = Object.keys(data.dept_breakdown);
  const values = Object.values(data.dept_breakdown);
  const colors = values.map(v => v >= 60 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#10b981');

  deptChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Attrition Risk (%)',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.x}% avg risk` }
        }
      },
      scales: {
        x: {
          grid: { color: '#30363d' },
          ticks: { color: '#8b949e' },
          max: 100,
        },
        y: { grid: { display: false }, ticks: { color: '#8b949e' } }
      }
    }
  });
}

function renderFeatureChart() {
  const ctx = document.getElementById('feature-chart').getContext('2d');
  if (featureChart) featureChart.destroy();

  const featureNames = [
    'Job Satisfaction', 'Work-Life Balance', 'Weekly Hours', 'Manager Support',
    'Monthly Income', 'Promotions', 'Tenure', 'Performance Rating',
    'Commute Distance', 'Training', 'Dept.', 'Projects'
  ];

  fetch('/api/model-info').then(r => r.json()).then(meta => {
    const fi = meta.feature_importance || {};
    const keys = Object.keys(fi);
    const vals = keys.map(k => Math.round(fi[k] * 100));
    const displayNames = keys.map(k => featureNames[
      ['job_satisfaction','work_life_balance','weekly_hours','manager_support',
       'monthly_income','promotions_last_5yrs','tenure_years','performance_rating',
       'commute_distance','training_last_year','department_encoded','num_projects']
        .indexOf(k)] || k);

    const sorted = displayNames.map((n,i) => ({name:n,val:vals[i]}))
      .sort((a,b) => b.val - a.val);

    featureChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(x=>x.name),
        datasets: [{
          data: sorted.map(x=>x.val),
          backgroundColor: sorted.map((_,i) =>
            `rgba(240,165,0,${1 - i * 0.06})`),
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}% importance` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b949e', font:{size:11} } },
          y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }
        }
      }
    });
  });
}

// ---- Models Panel ----
async function loadModels() {
  try {
    const res = await fetch('/api/model-info');
    const meta = await res.json();
    const grid = document.getElementById('models-grid');
    grid.innerHTML = '';

    const results = meta.model_results || {};
    const bestName = meta.best_model_name || '';

    Object.entries(results).forEach(([name, scores]) => {
      const isBest = name === bestName;
      grid.innerHTML += `
        <div class="model-card ${isBest ? 'best' : ''}">
          ${isBest ? '<span class="best-tag">★ Best</span>' : ''}
          <div class="model-name">${name}</div>
          <div class="model-metrics">
            <div class="metric-row">
              <div class="metric-labels">
                <span>Accuracy</span>
                <span class="metric-val">${scores.accuracy}%</span>
              </div>
              <div class="metric-bar-bg">
                <div class="metric-bar-fill" style="width:${scores.accuracy}%"></div>
              </div>
            </div>
            <div class="metric-row">
              <div class="metric-labels">
                <span>AUC-ROC</span>
                <span class="metric-val">${scores.auc_roc}%</span>
              </div>
              <div class="metric-bar-bg">
                <div class="metric-bar-fill auc" style="width:${scores.auc_roc}%"></div>
              </div>
            </div>
            <div class="metric-row">
              <div class="metric-labels">
                <span>CV Score</span>
                <span class="metric-val">${scores.cv_mean}% ±${scores.cv_std}%</span>
              </div>
              <div class="metric-bar-bg">
                <div class="metric-bar-fill" style="width:${scores.cv_mean}%;opacity:0.6"></div>
              </div>
            </div>
          </div>
        </div>`;
    });
  } catch (err) {
    console.error('Models load error:', err);
  }
}

// Init
loadModels();
