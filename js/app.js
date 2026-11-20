/* ==========================================================================
 * 胸心共病风险评估与预警平台 —— 交互与图表逻辑
 * ========================================================================== */

/* ---------------- 全局状态 ---------------- */
const state = {
  view: 'dashboard',          // dashboard | patients | records
  compCode: 'AF',             // 当前选中的并发症
  currentPatient: null,       // 详情抽屉中的患者
  detailComp: 'AF',           // 详情中选中的并发症
  filters: {
    keyword: '', risk: 'all', dept: 'all', surgery: 'all',
    gender: 'all', type: 'all', sort: 'risk_desc'
  },
  recordPatientId: null,      // 患者预测记录当前选中的患者
  rePredictPatientId: null    // 重新预测弹窗当前操作的患者
};

/* 兼容 ECharts 未加载的情况 */
const hasECharts = typeof echarts !== 'undefined';
const charts = {}; // 缓存图表实例

/* ---------------- 工具函数 ---------------- */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function compByCode(code) { return COMPLICATIONS.find(c => c.code === code); }
function fmtPct(p) { return (p * 100).toFixed(2) + '%'; }
function riskBadge(level) {
  return level === 'HIGH_RISK'
    ? '<span class="badge high">🔴 高危</span>'
    : '<span class="badge low">🔵 低危</span>';
}

/* 患者类型标签（住院/门诊） */
function typeTag(type) {
  return type === '住院'
    ? '<span class="type-tag in">🏥 住院</span>'
    : '<span class="type-tag out">🏠 门诊</span>';
}

/* 生成稳定的头像配色 */
function avatarColor(seedStr) {
  const palette = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#4f46e5', '#c026d3'];
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/* ---------------- 视图切换 ---------------- */
function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  $('#view-dashboard').classList.toggle('hidden', view !== 'dashboard');
  $('#view-patients').classList.toggle('hidden', view !== 'patients');
  $('#view-records').classList.toggle('hidden', view !== 'records');
  if (view === 'dashboard') {
    $('#pageTitle').textContent = '统计看板';
    $('#pageSub').textContent = '四大并发症风险全景与趋势洞察';
    renderDashboard();
  } else if (view === 'patients') {
    $('#pageTitle').textContent = '患者列表与预警';
    $('#pageSub').textContent = '按四大并发症分块展示模型预警结果';
    renderPatients();
  } else {
    $('#pageTitle').textContent = '模型评估记录';
    $('#pageSub').textContent = '按患者查看各模型的单次评估记录';
    renderRecords();
  }
}

/* ============================================================
 *  统计看板
 * ============================================================ */
function renderDashboard() {
  renderStatCards();
  renderRiskDistribution();
  renderTrend();
  renderFeatureChart();
  renderCurveChart();
  renderDeptChart();
  // 重绘后自适应
  setTimeout(() => Object.values(charts).forEach(c => c && c.resize()), 60);
}

function renderStatCards() {
  const highCount = PATIENTS.filter(p =>
    Object.values(p.predictions).some(pr => pr.risk_level === 'HIGH_RISK')
  ).length;
  const allProbs = PATIENTS.flatMap(p => Object.values(p.predictions).map(pr => pr.predicted_risk_probability));
  const avg = (allProbs.reduce((a, b) => a + b, 0) / allProbs.length * 100).toFixed(1);
  // 高脂血症 & VTE 仍在建设，作为"待完善"项
  const cards = [
    { icon: '👥', label: '在院患者总数', value: TOTAL_PATIENTS, color: '#eff6ff', extra: '覆盖 6 个病区', cls: 'down' },
    { icon: '🚨', label: '高危预警患者', value: highCount, color: '#fef2f2', extra: '需临床干预', cls: 'up' },
    { icon: '📊', label: '全人群平均风险', value: avg + '%', color: '#f0fdf4', extra: '较上周 +2.1%', cls: 'up' },
    { icon: '🧪', label: '监测并发症', value: '4 项', color: '#f5f3ff', extra: '2 项指标建设中', cls: 'down' }
  ];
  $('#statCards').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${c.color}">${c.icon}</div>
      <div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
        <div class="stat-extra ${c.cls}">${c.extra}</div>
      </div>
    </div>`).join('');
}

function renderRiskDistribution() {
  const el = $('#riskDistribution');
  el.innerHTML = COMPLICATIONS.map(c => {
    const pts = PATIENTS.map(p => p.predictions[c.code]);
    const high = pts.filter(x => x.risk_level === 'HIGH_RISK').length;
    const low = pts.length - high;
    const avg = (pts.reduce((a, b) => a + b.predicted_risk_probability, 0) / pts.length * 100).toFixed(1);
    return `
    <div class="dist-card" style="--c:${c.color}">
      <div class="dist-head">
        <div>
          <div class="dist-name">${c.icon} ${c.short}</div>
          <div class="dist-sub">${c.name}</div>
        </div>
        <div class="dist-icon" style="opacity:.9">${c.icon}</div>
      </div>
      <div class="mini-chart" id="dist-chart-${c.code}"></div>
      <div class="dist-stats">
        <div class="dist-stat danger"><div class="dist-stat-val">${high}</div><div class="dist-stat-label">高危</div></div>
        <div class="dist-stat safe"><div class="dist-stat-val">${low}</div><div class="dist-stat-label">低危</div></div>
        <div class="dist-stat"><div class="dist-stat-val">${avg}%</div><div class="dist-stat-label">均风险</div></div>
      </div>
    </div>`;
  }).join('');

  COMPLICATIONS.forEach(c => {
    if (!hasECharts) return;
    const pts = PATIENTS.map(p => p.predictions[c.code]);
    const high = pts.filter(x => x.risk_level === 'HIGH_RISK').length;
    const low = pts.length - high;
    const chart = echarts.init($('#dist-chart-' + c.code));
    charts['dist-' + c.code] = chart;
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 例 ({d}%)' },
      series: [{
        type: 'pie', radius: ['58%', '78%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: high, name: '高危', itemStyle: { color: '#ef4444' } },
          { value: low, name: '低危', itemStyle: { color: c.color } }
        ]
      }]
    });
  });
}

function renderTrend() {
  $('#trendLegend').innerHTML = COMPLICATIONS.map(c =>
    `<span class="legend-dot"><i style="background:${c.color}"></i>${c.short}</span>`).join('');
  if (!hasECharts) { $('#trendChart').innerHTML = '<div class="empty">图表组件加载失败，请检查网络</div>'; return; }
  const chart = echarts.init($('#trendChart'));
  charts.trend = chart;
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: COMPLICATIONS[0].trend.dates, boundaryGap: false, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b' } },
    yAxis: { type: 'value', name: '高危率 (%)', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: COMPLICATIONS.map(c => ({
      name: c.short, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { width: 2.5, color: c.color },
      itemStyle: { color: c.color },
      areaStyle: { opacity: 0.06, color: c.color },
      data: c.trend.highRate
    }))
  });
}

function buildFeatureOption() {
  const c = compByCode(state.compCode);
  const gf = [...c.globalFeatures].sort((a, b) => a.importance_score - b.importance_score);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/>重要性得分：<b>${p[0].value.toFixed(4)}</b>` },
    grid: { left: 8, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { type: 'category', data: gf.map(x => x.feature_name), axisLabel: { color: '#64748b', fontSize: 11, width: 170, overflow: 'truncate' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    series: [{
      type: 'bar', data: gf.map(x => x.importance_score), barWidth: 14,
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: c.gradient[1] }, { offset: 1, color: c.color }]), borderRadius: [0, 7, 7, 0] },
      label: { show: true, position: 'right', color: '#64748b', fontSize: 11, formatter: p => p.value.toFixed(3) }
    }]
  };
}
function renderFeatureChart() {
  // 填充下拉
  const sel = $('#featureCompSelect');
  sel.innerHTML = COMPLICATIONS.map(c => `<option value="${c.code}">${c.short}</option>`).join('');
  sel.value = state.compCode;
  if (!hasECharts) { $('#featureChart').innerHTML = '<div class="empty">图表组件加载失败</div>'; return; }
  const chart = echarts.init($('#featureChart'));
  charts.feature = chart;
  chart.setOption(buildFeatureOption());
}
function switchFeatureComp() {
  state.compCode = $('#featureCompSelect').value;
  if (charts.feature) charts.feature.setOption(buildFeatureOption(), true);
}

function buildCurveOption() {
  const c = compByCode(state.compCode);
  const rc = c.riskCurve;
  return {
    tooltip: { trigger: 'axis', formatter: p => `${rc.feature_name}<br/>${rc.unit ? p[0].axisValue + ' ' + rc.unit : p[0].axisValue}<br/>风险得分：<b>${p[0].value.toFixed(2)}</b>` },
    grid: { left: 44, right: 24, top: 30, bottom: 34 },
    xAxis: { type: 'category', data: rc.x_axis_values, boundaryGap: false, name: rc.unit, nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b' } },
    yAxis: { type: 'value', name: '风险得分', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [{
      type: 'line', data: rc.y_axis_risk_scores, smooth: true, symbol: 'circle', symbolSize: 7,
      lineStyle: { width: 3, color: c.color },
      itemStyle: { color: c.color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: { opacity: 0.12, color: c.color },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: '#ef4444', type: 'dashed' },
        label: { formatter: '风险阈值 0', color: '#ef4444', position: 'insideEndTop' },
        data: [{ yAxis: 0 }]
      }
    }]
  };
}
function renderCurveChart() {
  const sel = $('#curveCompSelect');
  sel.innerHTML = COMPLICATIONS.map(c => `<option value="${c.code}">${c.short}</option>`).join('');
  sel.value = state.compCode;
  if (!hasECharts) { $('#curveChart').innerHTML = '<div class="empty">图表组件加载失败</div>'; return; }
  const chart = echarts.init($('#curveChart'));
  charts.curve = chart;
  chart.setOption(buildCurveOption());
}
function switchCurveComp() {
  state.compCode = $('#curveCompSelect').value;
  if (charts.curve) charts.curve.setOption(buildCurveOption(), true);
}

function renderDeptChart() {
  if (!hasECharts) { $('#deptChart').innerHTML = '<div class="empty">图表组件加载失败</div>'; return; }
  const chart = echarts.init($('#deptChart'));
  charts.dept = chart;
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: COMPLICATIONS.map(c => c.short), top: 0, textStyle: { color: '#64748b' } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: DEPARTMENTS, axisLabel: { color: '#64748b', interval: 0, rotate: 15 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', name: '高危人数', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: COMPLICATIONS.map(c => ({
      name: c.short, type: 'bar', barWidth: 14,
      itemStyle: { color: c.color, borderRadius: [4, 4, 0, 0] },
      data: DEPARTMENTS.map(d => PATIENTS.filter(p => p.department === d && p.predictions[c.code].risk_level === 'HIGH_RISK').length)
    }))
  });
}

/* ============================================================
 *  患者列表
 * ============================================================ */
function renderPatients() {
  renderCompTabs();
  renderFilterSelects();
  applyFilters();
}

function renderCompTabs() {
  const el = $('#compTabs');
  el.innerHTML = COMPLICATIONS.map(c => {
    const pts = PATIENTS.map(p => p.predictions[c.code]);
    const high = pts.filter(x => x.risk_level === 'HIGH_RISK').length;
    return `
    <div class="comp-tab ${state.compCode === c.code ? 'active' : ''}" style="--c:${c.color}" onclick="setComp('${c.code}')">
      <div class="comp-tab-name">${c.icon} ${c.short}</div>
      <div class="comp-tab-sub">${c.name}</div>
      <div class="comp-tab-count">${high}<span class="high">/ ${pts.length} 高危</span></div>
    </div>`;
  }).join('');
}

function renderFilterSelects() {
  const depts = ['all', ...DEPARTMENTS];
  $('#filterDept').innerHTML = depts.map(d => `<option value="${d}">${d === 'all' ? '全部科室' : d}</option>`).join('');
  $('#filterSurgery').innerHTML = ['all', ...SURGERIES].map(s => `<option value="${s}">${s === 'all' ? '全部手术' : s}</option>`).join('');
}

function setComp(code) {
  state.compCode = code;
  renderCompTabs();
  applyFilters();
}

function getFilteredPatients() {
  const c = compByCode(state.compCode);
  const f = state.filters;
  let list = PATIENTS.filter(p => {
    const pred = p.predictions[c.code];
    if (f.risk !== 'all' && pred.risk_level !== f.risk) return false;
    if (f.dept !== 'all' && p.department !== f.dept) return false;
    if (f.surgery !== 'all' && p.surgery !== f.surgery) return false;
    if (f.gender !== 'all' && p.gender !== f.gender) return false;
    if (f.type !== 'all' && p.patient_type !== f.type) return false;
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      const match = [p.name, p.patient_id, p.patient_id.replace('P_', ''), p.bed].some(v => String(v).toLowerCase().includes(kw));
      if (!match) return false;
    }
    return true;
  });
  list.sort((a, b) => {
    const pa = a.predictions[c.code], pb = b.predictions[c.code];
    switch (f.sort) {
      case 'risk_asc': return pa.predicted_risk_probability - pb.predicted_risk_probability;
      case 'age_desc': return b.age - a.age;
      case 'admit_desc': return a.admit_date < b.admit_date ? 1 : -1;
      default: return pb.predicted_risk_probability - pa.predicted_risk_probability;
    }
  });
  return list;
}

function applyFilters() {
  state.filters.keyword = $('#filterKeyword').value.trim();
  state.filters.risk = $('#filterRisk').value;
  state.filters.dept = $('#filterDept').value;
  state.filters.surgery = $('#filterSurgery').value;
  state.filters.gender = $('#filterGender').value;
  state.filters.type = $('#filterType').value;
  state.filters.sort = $('#filterSort').value;
  const c = compByCode(state.compCode);
  const list = getFilteredPatients();
  const high = list.filter(p => p.predictions[c.code].risk_level === 'HIGH_RISK').length;

  $('#listSummary').innerHTML = `
    <span>当前：<b>${c.icon} ${c.short}</b></span>
    <span class="sep"></span>
    <span>共 <b>${list.length}</b> 例患者</span>
    <span class="sep"></span>
    <span>高危 <b style="color:var(--danger)">${high}</b> 例</span>
    <span class="sep"></span>
    <span>低危 <b style="color:var(--safe)">${list.length - high}</b> 例</span>`;

  renderPatientTable(list, c);
}

function renderPatientTable(list, c) {
  const head = $('#patientTableHead');
  const body = $('#patientTableBody');
  head.innerHTML = `
    <tr>
      <th>患者</th><th>类型</th><th>科室/病区</th><th>主治医师</th><th>性别/年龄</th>
      <th>就诊/入院日期</th><th>风险概率</th>
      <th>风险阈值</th><th>风险等级</th><th>操作</th>
    </tr>`;
  if (list.length === 0) {
    body.innerHTML = '';
    $('#tableEmpty').style.display = 'block';
    return;
  }
  $('#tableEmpty').style.display = 'none';
  body.innerHTML = list.map(p => {
    const pred = p.predictions[c.code];
    const pct = pred.predicted_risk_probability * 100;
    const over = pct >= pred.optimal_threshold * 100;
    const barColor = over ? '#ef4444' : c.color;
    const color = avatarColor(p.patient_id);
    return `
    <tr onclick="openDetail('${p.patient_id}', '${c.code}')">
      <td>
        <div class="cell-patient">
          <div class="cell-avatar" style="background:${color}">${esc(p.name[0])}</div>
          <div>
            <div class="cell-name">${esc(p.name)}</div>
            <div class="cell-id">${esc(p.patient_id)}</div>
          </div>
        </div>
      </td>
      <td>${typeTag(p.patient_type)}</td>
      <td>${esc(p.department)}<div class="threshold-hint">${esc(p.bed)}</div></td>
      <td>${esc(p.doctor)}</td>
      <td>${p.gender} / ${p.age}岁</td>
      <td>${p.admit_date}</td>
      <td>
        <div class="prob-cell">
          <div class="prob-bar"><div class="prob-bar-fill" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div></div>
          <span class="prob-val" style="color:${barColor}">${pred.predicted_risk_percent}</span>
        </div>
      </td>
      <td class="threshold-hint">${pred.threshold_percent}</td>
      <td>${riskBadge(pred.risk_level)}</td>
      <td>
        <button class="btn-view" onclick="event.stopPropagation();openDetail('${p.patient_id}', '${c.code}')">查看详情</button>
        <button class="btn-view warn" onclick="event.stopPropagation();openRePredict('${p.patient_id}')">重新评估</button>
      </td>
    </tr>`;
  }).join('');
}

function resetFilters() {
  $('#filterKeyword').value = '';
  $('#filterRisk').value = 'all';
  $('#filterDept').value = 'all';
  $('#filterSurgery').value = 'all';
  $('#filterGender').value = 'all';
  $('#filterType').value = 'all';
  $('#filterSort').value = 'risk_desc';
  applyFilters();
}

/* ============================================================
 *  详情抽屉
 * ============================================================ */
function openDetail(patientId, compCode) {
  state.currentPatient = PATIENTS.find(p => p.patient_id === patientId);
  state.detailComp = compCode || 'AF';
  renderDetail();
  $('#drawerMask').classList.add('show');
  $('#detailDrawer').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  $('#drawerMask').classList.remove('show');
  $('#detailDrawer').classList.remove('show');
  document.body.style.overflow = '';
}

function renderDetail() {
  const p = state.currentPatient;
  const color = avatarColor(p.patient_id);
  const dateLabel = p.patient_type === '住院' ? '入院' : '就诊';
  // 头部
  $('#drawerPatient').innerHTML = `
    <div class="drawer-avatar" style="background:${color}">${esc(p.name[0])}</div>
    <div>
      <div style="font-size:18px;font-weight:700">${esc(p.name)}
        <span class="badge high" style="margin-left:8px">${p.gender}</span>
        <span class="badge low" style="margin-left:4px">${p.age}岁</span>
        ${typeTag(p.patient_type)}
      </div>
      <div class="patient-meta">
        <span class="meta-chip">病历号 <b>${esc(p.patient_id)}</b></span>
        <span class="meta-chip">科室 <b>${esc(p.department)}</b></span>
        <span class="meta-chip">主治医师 <b>${esc(p.doctor)}</b></span>
        <span class="meta-chip">${dateLabel} <b>${p.admit_date}</b></span>
      </div>
    </div>`;

  renderDetailBody(p);
}

function renderDetailBody(p) {
  // 并发症切换按钮
  const switchHtml = COMPLICATIONS.map(c => {
    const pred = p.predictions[c.code];
    const high = pred.risk_level === 'HIGH_RISK';
    return `
    <div class="dc-btn ${state.detailComp === c.code ? 'active' : ''}" style="--c:${c.color}" onclick="switchDetailComp('${c.code}')">
      <div class="dc-btn-name">${c.icon} ${c.short}</div>
      <div class="dc-btn-prob" style="color:${high ? '#ef4444' : c.color}">${pred.predicted_risk_percent}</div>
      <div class="dc-badge" style="color:${high ? '#ef4444' : '#22c55e'}">${high ? '● 高危预警' : '● 低危安全'}</div>
    </div>`;
  }).join('');

  const c = compByCode(state.detailComp);
  const pred = p.predictions[c.code];
  const attr = p.attributions[c.code];
  const high = pred.risk_level === 'HIGH_RISK';
  const maxDriver = Math.max(...attr.top_risk_drivers.map(d => d.risk_contribution_score), 0.01);
  const maxProt = Math.max(...attr.top_protective_factors.map(d => Math.abs(d.risk_contribution_score)), 0.01);

  const driverHtml = attr.top_risk_drivers.map(d => `
    <div class="attr-item">
      <div class="attr-item-top">
        <span class="attr-name">${esc(d.feature_name)}</span>
        <span class="attr-score driver">+${d.risk_contribution_score.toFixed(4)}</span>
      </div>
      <div class="attr-val">测量值：${d.measured_value}</div>
      <div class="attr-bar"><div class="attr-bar-fill driver" style="width:${Math.min(d.risk_contribution_score / maxDriver * 100, 100)}%"></div></div>
    </div>`).join('');

  const protHtml = attr.top_protective_factors.map(d => `
    <div class="attr-item">
      <div class="attr-item-top">
        <span class="attr-name">${esc(d.feature_name)}</span>
        <span class="attr-score protective">${d.risk_contribution_score.toFixed(4)}</span>
      </div>
      <div class="attr-val">测量值：${d.measured_value}</div>
      <div class="attr-bar"><div class="attr-bar-fill protective" style="width:${Math.min(Math.abs(d.risk_contribution_score) / maxProt * 100, 100)}%"></div></div>
    </div>`).join('');

  // 检验检查表
  const labRows = p.lab_items[c.code].map(l => {
    const statusCls = l.status;
    const statusTxt = statusCls === 'high' ? '↑ 偏高' : statusCls === 'low' ? '↓ 偏低' : '正常';
    return `
    <tr>
      <td><span class="lab-cat">${esc(l.category)}</span></td>
      <td>${esc(l.name)}</td>
      <td class="lab-value ${statusCls}">${l.value}${l.unit && l.unit !== '—' ? ' ' + esc(l.unit) : ''}</td>
      <td class="threshold-hint">${esc(l.ref)}</td>
      <td class="lab-status ${statusCls}">${statusTxt}</td>
    </tr>`;
  }).join('');

  $('#drawerBody').innerHTML = `
    <div class="detail-comp-switch">${switchHtml}</div>

    ${buildPatientProfile(p)}

    <!-- 风险概览 -->
    <div class="risk-overview">
      <div class="risk-gauge-panel"><div class="chart" id="riskGauge" style="height:230px"></div></div>
      <div class="risk-info-panel">
        <div>
          <div class="risk-row-label">模型评估结论</div>
          <div class="risk-level-big ${high ? 'high' : 'low'}">${pred.risk_level_cn}</div>
        </div>
        <div class="risk-rows">
          <div class="risk-row">
            <div class="risk-row-label">评估发病概率</div>
            <div class="risk-row-val ${high ? 'danger' : 'safe'}">${pred.predicted_risk_percent}</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">临床决策阈值</div>
            <div class="risk-row-val" style="color:var(--warn)">${pred.threshold_percent}</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">概率差值</div>
            <div class="risk-row-val ${high ? 'danger' : 'safe'}">${((pred.predicted_risk_probability - pred.optimal_threshold) * 100).toFixed(2) >= 0 ? '+' : ''}${((pred.predicted_risk_probability - pred.optimal_threshold) * 100).toFixed(2)}%</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">任务标识</div>
            <div class="risk-row-val" style="font-size:15px">${c.code} · ${c.featureCount} 特征</div>
          </div>
        </div>
        <div class="threshold-hint">💡 评估概率 ≥ 阈值即触发高危预警，需结合临床实际情况进行个体化干预。</div>
      </div>
    </div>

    <!-- 归因解释 -->
    <div class="section-title">🧬 个体归因解释 <span class="panel-tag">导致该患者风险升高/降低的关键因素</span></div>
    <div class="attr-grid">
      <div class="attr-card driver">
        <div class="attr-card-title">▲ 前三大致病推手（Risk Drivers）</div>
        ${driverHtml}
      </div>
      <div class="attr-card protective">
        <div class="attr-card-title">▼ 主要保护因素（Protective Factors）</div>
        ${protHtml}
      </div>
    </div>

    <!-- 检验检查信息 -->
    <div class="section-title">🔬 相关检验检查信息 <span class="panel-tag">与本次预警相关的指标着重展示，异常值已标色</span></div>
    <table class="lab-table">
      <thead><tr><th>类别</th><th>检验检查项目</th><th>测量值</th><th>参考范围</th><th>状态</th></tr></thead>
      <tbody>${labRows}</tbody>
    </table>
  `;

  // 渲染详情图表
  renderGauge(c, pred);
}

function buildPatientProfile(p) {
  const dateLabel = p.patient_type === '住院' ? '入院日期' : '就诊日期';
  const pastHistoryTags = p.past_history.map(h => `<span class="profile-tag">${esc(h)}</span>`).join('');
  const pastSurgeryRows = p.past_surgeries.map(s => `
    <div class="profile-row">
      <span class="profile-row-label">既往手术</span>
      <span class="profile-row-val">${esc(s)}</span>
    </div>`).join('');
  return `
    <div class="section-title">🧾 患者基本信息 <span class="panel-tag">${p.patient_type}患者</span></div>
    <div class="profile-card">
      <div class="profile-metrics">
        <div class="profile-metric">
          <div class="profile-metric-val">${p.height}<span class="profile-metric-unit">cm</span></div>
          <div class="profile-metric-label">身高</div>
        </div>
        <div class="profile-metric">
          <div class="profile-metric-val">${p.weight}<span class="profile-metric-unit">kg</span></div>
          <div class="profile-metric-label">体重</div>
        </div>
        <div class="profile-metric">
          <div class="profile-metric-val">${p.bmi}<span class="profile-metric-unit">kg/m²</span></div>
          <div class="profile-metric-label">BMI</div>
        </div>
        <div class="profile-metric">
          <div class="profile-metric-val" style="font-size:16px;padding-top:5px">${p.admit_date}</div>
          <div class="profile-metric-label">${dateLabel}</div>
        </div>
      </div>
      <div class="profile-block">
        <div class="profile-block-title">既往病史</div>
        <div class="profile-tags">${pastHistoryTags}</div>
      </div>
      <div class="profile-block">
        <div class="profile-block-title">既往手术记录</div>
        <div class="profile-list">${pastSurgeryRows}</div>
      </div>
    </div>`;
}

function switchDetailComp(code) {
  state.detailComp = code;
  renderDetailBody(state.currentPatient);
}

function renderGaugeTo(domId, c, prob, threshold, high) {
  if (!hasECharts) return;
  const pct = prob * 100;
  const thr = threshold * 100;
  const chart = echarts.init($('#' + domId));
  chart.setOption({
    series: [{
      type: 'gauge', min: 0, max: 100, startAngle: 210, endAngle: -30,
      radius: '92%', center: ['50%', '58%'],
      axisLine: { lineStyle: { width: 16, color: [[0.5, '#22c55e'], [1, '#ef4444']] } },
      pointer: { itemStyle: { color: high ? '#ef4444' : c.color }, width: 5, length: '62%' },
      axisTick: { distance: -16, length: 5, lineStyle: { color: '#fff', width: 1 } },
      splitLine: { distance: -16, length: 16, lineStyle: { color: '#fff', width: 2 } },
      axisLabel: { distance: 22, color: '#94a3b8', fontSize: 10 },
      detail: { valueAnimation: true, formatter: '{value}%', color: high ? '#ef4444' : '#0f172a', fontSize: 26, fontWeight: 800, offsetCenter: [0, '68%'] },
      title: { offsetCenter: [0, '92%'], fontSize: 12, color: '#64748b' },
      data: [{ value: +pct.toFixed(2), name: '评估风险概率' }]
    }]
  });
  // 阈值标记用 graphic 添加文字
  chart.setOption({
    graphic: [{
      type: 'text', left: '50%', top: '66%',
      style: { text: '阈值 ' + thr.toFixed(2) + '%', fill: '#f59e0b', fontSize: 11, fontWeight: 600 },
    }]
  });
}

function renderGauge(c, pred) {
  renderGaugeTo('riskGauge', c, pred.predicted_risk_probability, pred.optimal_threshold, pred.risk_level === 'HIGH_RISK');
}

/* 归因解释卡片（复用） */
function buildAttrCards(attr) {
  const maxDriver = Math.max(...attr.top_risk_drivers.map(d => d.risk_contribution_score), 0.01);
  const maxProt = Math.max(...attr.top_protective_factors.map(d => Math.abs(d.risk_contribution_score)), 0.01);
  const driverHtml = attr.top_risk_drivers.map(d => `
    <div class="attr-item">
      <div class="attr-item-top">
        <span class="attr-name">${esc(d.feature_name)}</span>
        <span class="attr-score driver">+${d.risk_contribution_score.toFixed(4)}</span>
      </div>
      <div class="attr-val">测量值：${d.measured_value}</div>
      <div class="attr-bar"><div class="attr-bar-fill driver" style="width:${Math.min(d.risk_contribution_score / maxDriver * 100, 100)}%"></div></div>
    </div>`).join('');
  const protHtml = attr.top_protective_factors.map(d => `
    <div class="attr-item">
      <div class="attr-item-top">
        <span class="attr-name">${esc(d.feature_name)}</span>
        <span class="attr-score protective">${d.risk_contribution_score.toFixed(4)}</span>
      </div>
      <div class="attr-val">测量值：${d.measured_value}</div>
      <div class="attr-bar"><div class="attr-bar-fill protective" style="width:${Math.min(Math.abs(d.risk_contribution_score) / maxProt * 100, 100)}%"></div></div>
    </div>`).join('');
  return `
    <div class="attr-grid">
      <div class="attr-card driver">
        <div class="attr-card-title">▲ 前三大致病推手（Risk Drivers）</div>
        ${driverHtml}
      </div>
      <div class="attr-card protective">
        <div class="attr-card-title">▼ 主要保护因素（Protective Factors）</div>
        ${protHtml}
      </div>
    </div>`;
}

/* 检验检查表（复用） */
function buildLabTable(labItems) {
  const labRows = labItems.map(l => {
    const statusCls = l.status;
    const statusTxt = statusCls === 'high' ? '↑ 偏高' : statusCls === 'low' ? '↓ 偏低' : '正常';
    return `
    <tr>
      <td><span class="lab-cat">${esc(l.category)}</span></td>
      <td>${esc(l.name)}</td>
      <td class="lab-value ${statusCls}">${l.value}${l.unit && l.unit !== '—' ? ' ' + esc(l.unit) : ''}</td>
      <td class="threshold-hint">${esc(l.ref)}</td>
      <td class="lab-status ${statusCls}">${statusTxt}</td>
    </tr>`;
  }).join('');
  return `
    <table class="lab-table">
      <thead><tr><th>类别</th><th>检验检查项目</th><th>测量值</th><th>参考范围</th><th>状态</th></tr></thead>
      <tbody>${labRows}</tbody>
    </table>`;
}

/* ============================================================
 *  模型预测记录
 * ============================================================ */
function renderRecords() {
  renderRecordPatientOptions();
}

/* ---------- 患者单次预测记录 ---------- */
function renderRecordPatientOptions() {
  const kw = ($('#recPatientKeyword') || {}).value ? $('#recPatientKeyword').value.trim().toLowerCase() : '';
  const list = PATIENTS.filter(p =>
    !kw || [p.name, p.patient_id].some(v => String(v).toLowerCase().includes(kw))
  );
  const sel = $('#recPatientSelect');
  sel.innerHTML = list.map(p =>
    `<option value="${p.patient_id}">${esc(p.name)} · ${esc(p.patient_id)} · ${p.age}岁 ${p.gender}</option>`
  ).join('');
  if (!state.recordPatientId || !list.some(p => p.patient_id === state.recordPatientId)) {
    state.recordPatientId = list.length ? list[0].patient_id : null;
  }
  sel.value = state.recordPatientId || '';
  if (state.recordPatientId) renderPatientRecords(state.recordPatientId);
  else $('#patientRecordsWrap').innerHTML = '<div class="empty">暂无患者</div>';
}

function onRecordPatientChange(id) {
  state.recordPatientId = id;
  renderPatientRecords(id);
}

function renderPatientRecords(patientId) {
  const p = PATIENTS.find(x => x.patient_id === patientId);
  if (!p) return;
  const recs = PATIENT_RECORDS[patientId] || [];
  const color = avatarColor(patientId);
  const highCount = recs.filter(r => r.level === 'HIGH_RISK').length;

  const rows = recs.map(r => {
    const comp = compByCode(r.task_code);
    const high = r.level === 'HIGH_RISK';
    const pct = r.prob * 100;
    const trigIcon = r.trigger === '手动触发' ? '👨‍⚕️' : (r.trigger === '定时任务' ? '⏰' : '🤖');
    return `
    <tr onclick="openPredictionDetail('${p.patient_id}', '${r.record_id}')">
      <td class="threshold-hint">${esc(r.predict_time)}</td>
      <td><span class="rec-comp-tag" style="--c:${comp.color}">${comp.icon} ${esc(r.task_short)}</span></td>
      <td><span class="tag">${esc(r.model_version)}</span></td>
      <td>${trigIcon} ${esc(r.trigger)}</td>
      <td>${esc(r.operator)}</td>
      <td>
        <div class="prob-cell">
          <div class="prob-bar"><div class="prob-bar-fill" style="width:${Math.min(pct, 100)}%;background:${high ? '#ef4444' : comp.color}"></div></div>
          <span class="prob-val" style="color:${high ? '#ef4444' : comp.color}">${r.percent}</span>
        </div>
      </td>
      <td class="threshold-hint">${(r.threshold * 100).toFixed(2)}%</td>
      <td>${riskBadge(r.level)}</td>
      <td><button class="btn-view" onclick="event.stopPropagation();openPredictionDetail('${p.patient_id}', '${r.record_id}')">查看详情</button></td>
    </tr>`;
  }).join('');

  $('#patientRecordsWrap').innerHTML = `
    <div class="panel pr-patient-card">
      <div class="cell-patient">
        <div class="cell-avatar" style="background:${color}">${esc(p.name[0])}</div>
        <div>
          <div class="cell-name" style="font-size:16px">${esc(p.name)}</div>
          <div class="cell-id">${esc(p.patient_id)} · ${p.gender} · ${p.age}岁</div>
        </div>
        <div class="pr-patient-meta">
          <span class="meta-chip">科室 <b>${esc(p.department)}</b></span>
          <span class="meta-chip">主治医师 <b>${esc(p.doctor)}</b></span>
          <span class="meta-chip">手术 <b>${esc(p.surgery_type)}</b></span>
          <span class="meta-chip">入院 <b>${p.admit_date}</b></span>
        </div>
      </div>
    </div>
    <div class="list-summary">
      <span>共 <b>${recs.length}</b> 条评估记录</span>
      <span class="sep"></span>
      <span>高危 <b style="color:var(--danger)">${highCount}</b> 条</span>
      <span class="sep"></span>
      <span>低危 <b style="color:var(--safe)">${recs.length - highCount}</b> 条</span>
      <span class="sep"></span>
      <span>最新评估 <b>${recs.length ? esc(recs[0].predict_time) : '—'}</b></span>
    </div>
    <div class="panel table-panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>评估时间</th><th>并发症任务</th><th>模型版本</th><th>触发方式</th>
              <th>操作人</th><th>评估概率</th><th>决策阈值</th><th>风险等级</th><th>操作</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="empty" style="${recs.length ? 'display:none' : ''}">该患者暂无评估记录</div>
      </div>
    </div>`;
}

/* ---------- 单次评估记录详情 ---------- */
function openPredictionDetail(patientId, recordId) {
  const rec = (PATIENT_RECORDS[patientId] || []).find(r => r.record_id === recordId);
  if (!rec) return;
  renderPredictionDetail(rec);
  $('#predDetailMask').classList.add('show');
  $('#predDetailDrawer').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closePredictionDetail() {
  $('#predDetailMask').classList.remove('show');
  $('#predDetailDrawer').classList.remove('show');
  document.body.style.overflow = '';
}

function renderPredictionDetail(rec) {
  const p = PATIENTS.find(x => x.patient_id === rec.patient_id);
  const c = compByCode(rec.task_code);
  const high = rec.level === 'HIGH_RISK';
  const trigIcon = rec.trigger === '手动触发' ? '👨‍⚕️' : (rec.trigger === '定时任务' ? '⏰' : '🤖');

  $('#predDetailHead').innerHTML = `
    <div class="drawer-avatar" style="background:${c.color}">${c.icon}</div>
    <div>
      <div style="font-size:18px;font-weight:700">${esc(p.name)} · ${esc(c.short)}评估 ${riskBadge(rec.level)}</div>
      <div class="patient-meta">
        <span class="meta-chip">评估时间 <b>${esc(rec.predict_time)}</b></span>
        <span class="meta-chip">模型版本 <b>${esc(rec.model_version)}</b></span>
        <span class="meta-chip">触发方式 <b>${trigIcon} ${esc(rec.trigger)}</b></span>
        <span class="meta-chip">操作人 <b>${esc(rec.operator)}</b></span>
      </div>
    </div>`;

  $('#predDetailBody').innerHTML = `
    <div class="risk-overview">
      <div class="risk-gauge-panel"><div class="chart" id="predDetailGauge" style="height:230px"></div></div>
      <div class="risk-info-panel">
        <div>
          <div class="risk-row-label">本次评估结论</div>
          <div class="risk-level-big ${high ? 'high' : 'low'}">${high ? '🔴 高危预警 (需临床干预)' : '🔵 低危安全 (常规术后护理)'}</div>
        </div>
        <div class="risk-rows">
          <div class="risk-row">
            <div class="risk-row-label">评估发病概率</div>
            <div class="risk-row-val ${high ? 'danger' : 'safe'}">${rec.percent}</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">临床决策阈值</div>
            <div class="risk-row-val" style="color:var(--warn)">${(rec.threshold * 100).toFixed(2)}%</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">概率差值</div>
            <div class="risk-row-val ${high ? 'danger' : 'safe'}">${((rec.prob - rec.threshold) * 100).toFixed(2) >= 0 ? '+' : ''}${((rec.prob - rec.threshold) * 100).toFixed(2)}%</div>
          </div>
          <div class="risk-row">
            <div class="risk-row-label">任务标识</div>
            <div class="risk-row-val" style="font-size:15px">${c.code} · ${c.featureCount} 特征</div>
          </div>
        </div>
        <div class="patient-meta" style="margin-top:12px">
          <span class="meta-chip">病历号 <b>${esc(p.patient_id)}</b></span>
          <span class="meta-chip">科室 <b>${esc(p.department)}</b></span>
          <span class="meta-chip">主治医师 <b>${esc(p.doctor)}</b></span>
        </div>
      </div>
    </div>

    <!-- 归因解释 -->
    <div class="section-title">🧬 个体归因解释 <span class="panel-tag">本次评估的风险驱动因素</span></div>
    ${buildAttrCards(p.attributions[c.code])}

    <!-- 检验检查信息 -->
    <div class="section-title">🔬 相关检验检查信息 <span class="panel-tag">与本次评估相关的指标，异常值已标色</span></div>
    ${buildLabTable(p.lab_items[c.code])}
  `;

  renderGaugeTo('predDetailGauge', c, rec.prob, rec.threshold, high);
}

/* ============================================================
 *  重新预测
 * ============================================================ */
function openRePredict(patientId) {
  state.rePredictPatientId = patientId;
  const p = PATIENTS.find(x => x.patient_id === patientId);
  if (!p) return;
  const color = avatarColor(patientId);
  $('#rePredictPatientInfo').innerHTML = `
    <div class="cell-patient">
      <div class="cell-avatar" style="background:${color}">${esc(p.name[0])}</div>
      <div>
        <div class="cell-name" style="font-size:15px">${esc(p.name)}</div>
        <div class="cell-id">${esc(p.patient_id)} · ${p.gender} · ${p.age}岁 · ${esc(p.department)}</div>
      </div>
    </div>`;
  $('#rePredictModelList').innerHTML = COMPLICATIONS.map(c => {
    const pred = p.predictions[c.code];
    return `
    <label class="re-model-item" style="--c:${c.color}">
      <input type="checkbox" class="re-model-check" value="${c.code}" />
      <span class="re-model-icon">${c.icon}</span>
      <span class="re-model-info">
        <span class="re-model-name">${esc(c.short)}</span>
        <span class="re-model-sub">${esc(c.name)}</span>
      </span>
      <span class="re-model-cur">当前 ${pred.predicted_risk_percent}</span>
    </label>`;
  }).join('');
  $('#rePredictMask').classList.add('show');
  $('#rePredictModal').classList.add('show');
}

function closeRePredict() {
  $('#rePredictMask').classList.remove('show');
  $('#rePredictModal').classList.remove('show');
}

function confirmRePredict() {
  const p = PATIENTS.find(x => x.patient_id === state.rePredictPatientId);
  if (!p) return;
  const checked = [...document.querySelectorAll('.re-model-check:checked')].map(el => el.value);
  if (!checked.length) { showToast('请至少选择一个模型'); return; }

  const now = new Date();
  checked.forEach(code => {
    const c = compByCode(code);
    const base = p.predictions[code];
    // 重新预测：在当前结果基础上小幅波动，可能改变风险等级
    const delta = (Math.random() * 2 - 1) * 0.05;
    const prob = Math.max(0.02, Math.min(0.95, base.predicted_risk_probability + delta));
    const newLevel = prob >= c.threshold ? 'HIGH_RISK' : 'LOW_RISK';
    // 更新患者当前预测结果
    p.predictions[code] = {
      ...base,
      predicted_risk_probability: round4(prob),
      predicted_risk_percent: (prob * 100).toFixed(2) + '%',
      risk_level: newLevel,
      risk_level_cn: newLevel === 'HIGH_RISK' ? '🔴 高危预警 (需临床干预)' : '🔵 低危安全 (常规术后护理)'
    };
    // 追加一条独立预测记录
    PATIENT_RECORDS[p.patient_id].unshift({
      record_id: 'PR' + Date.now() + '_' + code,
      patient_id: p.patient_id,
      patient_name: p.name,
      task_code: code,
      task_name: c.name,
      task_short: c.short,
      predict_time: fmtDateTime(now),
      model_version: 'v2.3.1',
      trigger: '手动触发',
      operator: '张医生',
      prob: round4(prob),
      percent: (prob * 100).toFixed(2) + '%',
      level: newLevel,
      threshold: c.threshold
    });
  });

  closeRePredict();
  // 若在患者预测记录页且选中的是该患者，刷新记录展示
  if (state.view === 'records' && state.recordPatientId === p.patient_id) {
    renderPatientRecords(p.patient_id);
  }
  // 若在患者列表页，刷新列表
  if (state.view === 'patients') {
    applyFilters();
  }
  showToast(`已为 ${p.name} 重新评估 ${checked.length} 个模型，生成 ${checked.length} 条独立记录`);
}

/* ---------- 轻提示 ---------- */
let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- 窗口自适应 ---------------- */
window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize()));

/* ---------------- 导航事件 ---------------- */
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', () => switchView(n.dataset.view));
});

/* ---------------- 初始化 ---------------- */
(function init() {
  switchView('dashboard');
})();
