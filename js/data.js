/* ==========================================================================
 * 胸心共病风险评估与预警平台 —— 模拟数据层
 * 说明：本层严格按照后端模型接口的返回结构构造 mock 数据，
 *       便于前端页面直接对接，后续接入真实接口时仅需替换本文件的取数函数。
 * ========================================================================== */

/* ---------- 确定性随机数生成器（保证每次刷新数据稳定） ---------- */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 四大并发症配置 ---------- */
const COMPLICATIONS = [
  {
    code: 'AF',
    name: '围术期心房颤动',
    short: '房颤',
    icon: '🫀',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#c4b5fd'],
    threshold: 0.25,
    featureCount: 19,
    // 全人群核心预测特征排行榜（用于看板柱状图）
    globalFeatures: [
      { feature_name: '基本信息_就诊年龄', importance_score: 0.4521 },
      { feature_name: '既往病史_心房颤动', importance_score: 0.3317 },
      { feature_name: '手术记录__手术时长(min)', importance_score: 0.2846 },
      { feature_name: '实验室检查_血清_白蛋白', importance_score: 0.2413 },
      { feature_name: '实验室检查_肝素抗凝血_钠离子', importance_score: 0.1987 },
      { feature_name: '实验室检查_血浆_心型脂肪酸结合蛋白', importance_score: 0.1762 },
      { feature_name: '实验室检查_枸橼酸钠抗凝血_D二聚体', importance_score: 0.1549 },
      { feature_name: '实验室检查_血清_超氧化物歧化酶', importance_score: 0.1321 },
      { feature_name: '手术记录_是否为胸腔镜辅助手术', importance_score: 0.1185 },
      { feature_name: '实验室检查_血清_癌胚抗原', importance_score: 0.0962 }
    ],
    // 核心指标非线性风险走势曲线（用于折线图）
    riskCurve: {
      feature_name: '基本信息_就诊年龄',
      x_axis_values: [45.0, 55.0, 65.0, 75.0, 85.0],
      y_axis_risk_scores: [-0.38, -0.16, 0.08, 0.41, 0.86],
      unit: '岁'
    },
    // 近 14 日高危率趋势（%）
    trend: {
      dates: ['11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19'],
      highRate: [18.2, 19.5, 21.1, 20.3, 22.8, 24.6, 23.9, 26.2, 25.4, 27.8, 29.1, 28.3, 30.5, 31.2]
    }
  },
  {
    code: 'MINS',
    name: '围术期心肌损伤 (MINS)',
    short: '心肌损伤',
    icon: '❤️',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#93c5fd'],
    threshold: 0.2315,
    featureCount: 46,
    globalFeatures: [
      { feature_name: '基本信息_就诊年龄', importance_score: 0.4128 },
      { feature_name: '手术记录__手术时长(min)', importance_score: 0.2814 },
      { feature_name: '生命体征_收缩压_末次值', importance_score: 0.1983 },
      { feature_name: '实验室检查_血清_肌钙蛋白I(cTnI)', importance_score: 0.1765 },
      { feature_name: '心脏超声__LVEF_末次值', importance_score: 0.1542 },
      { feature_name: '实验室检查_血清_肌酐', importance_score: 0.1387 },
      { feature_name: '实验室检查_枸橼酸钠抗凝血_D二聚体', importance_score: 0.1216 },
      { feature_name: '实验室检查_血清_白蛋白', importance_score: 0.1094 },
      { feature_name: '手术记录_是否为胸腔镜辅助手术', importance_score: 0.0982 },
      { feature_name: '实验室检查_血清_C反应蛋白', importance_score: 0.0861 }
    ],
    riskCurve: {
      feature_name: '手术记录__手术时长(min)',
      x_axis_values: [60.0, 90.0, 120.0, 150.0, 180.0, 210.0],
      y_axis_risk_scores: [-0.45, -0.22, 0.05, 0.30, 0.58, 0.91],
      unit: 'min'
    },
    trend: {
      dates: ['11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19'],
      highRate: [22.4, 23.1, 25.3, 24.8, 26.9, 28.2, 27.5, 30.1, 31.6, 30.8, 33.4, 34.2, 35.8, 36.5]
    }
  },
  {
    code: 'HLIP',
    name: '高脂血症',
    short: '高脂血症',
    icon: '🩸',
    color: '#f59e0b',
    gradient: ['#f59e0b', '#fcd34d'],
    threshold: 0.30,
    featureCount: 22,
    globalFeatures: [
      { feature_name: '实验室检查_血清_低密度脂蛋白胆固醇(LDL-C)', importance_score: 0.3964 },
      { feature_name: '实验室检查_血清_总胆固醇', importance_score: 0.2847 },
      { feature_name: '实验室检查_血清_甘油三酯', importance_score: 0.2358 },
      { feature_name: '基本信息_就诊年龄', importance_score: 0.2019 },
      { feature_name: '基本信息_BMI', importance_score: 0.1824 },
      { feature_name: '实验室检查_血清_高密度脂蛋白胆固醇(HDL-C)', importance_score: 0.1647 },
      { feature_name: '实验室检查_血清_载脂蛋白B', importance_score: 0.1432 },
      { feature_name: '实验室检查_血清_脂蛋白(a)', importance_score: 0.1286 },
      { feature_name: '实验室检查_血清_空腹血糖', importance_score: 0.1145 },
      { feature_name: '既往病史_高血压', importance_score: 0.0973 }
    ],
    riskCurve: {
      feature_name: '实验室检查_血清_低密度脂蛋白胆固醇(LDL-C)',
      x_axis_values: [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5],
      y_axis_risk_scores: [-0.52, -0.31, -0.08, 0.18, 0.46, 0.72, 0.95],
      unit: 'mmol/L'
    },
    trend: {
      dates: ['11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19'],
      highRate: [15.8, 16.4, 17.2, 18.1, 19.3, 18.9, 20.4, 21.6, 22.8, 23.5, 24.7, 25.9, 27.1, 28.4]
    }
  },
  {
    code: 'VTE',
    name: '静脉血栓栓塞症 (VTE)',
    short: 'VTE',
    icon: '🩺',
    color: '#14b8a6',
    gradient: ['#14b8a6', '#5eead4'],
    threshold: 0.20,
    featureCount: 25,
    globalFeatures: [
      { feature_name: '实验室检查_枸橼酸钠抗凝血_D二聚体', importance_score: 0.3842 },
      { feature_name: '手术记录__手术时长(min)', importance_score: 0.2569 },
      { feature_name: '基本信息_就诊年龄', importance_score: 0.2247 },
      { feature_name: '实验室检查_枸橼酸钠抗凝血_纤维蛋白原', importance_score: 0.1983 },
      { feature_name: '实验室检查_枸橼酸钠抗凝血_抗凝血酶活性测定', importance_score: 0.1725 },
      { feature_name: '手术记录_术后卧床时间(h)', importance_score: 0.1561 },
      { feature_name: '既往病史_深静脉血栓', importance_score: 0.1384 },
      { feature_name: '实验室检查_EDTA抗凝血_血小板计数', importance_score: 0.1217 },
      { feature_name: '生命体征_心率(次/分)', importance_score: 0.1049 },
      { feature_name: '基本信息_BMI', importance_score: 0.0926 }
    ],
    riskCurve: {
      feature_name: '实验室检查_枸橼酸钠抗凝血_D二聚体',
      x_axis_values: [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0],
      y_axis_risk_scores: [-0.48, -0.26, 0.04, 0.31, 0.55, 0.79, 0.94],
      unit: 'mg/L'
    },
    trend: {
      dates: ['11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19'],
      highRate: [10.5, 11.2, 12.3, 11.8, 13.6, 14.2, 13.9, 15.4, 16.8, 16.2, 17.6, 18.9, 20.1, 21.3]
    }
  }
];

/* ---------- 各并发症相关检验检查项定义（详情页着重展示，含参考范围） ---------- */
const LAB_DEFINITIONS = {
  AF: [
    { name: '心电图_心率', unit: '次/分', ref: '60-100', low: 60, high: 100, category: '心电图' },
    { name: '血清_白蛋白', unit: 'g/L', ref: '40-55', low: 40, high: 55, category: '实验室检查' },
    { name: '肝素抗凝血_钠离子', unit: 'mmol/L', ref: '135-145', low: 135, high: 145, category: '实验室检查' },
    { name: '血清_钾离子', unit: 'mmol/L', ref: '3.5-5.3', low: 3.5, high: 5.3, category: '实验室检查' },
    { name: '血浆_心型脂肪酸结合蛋白', unit: 'ng/mL', ref: '0-6.2', low: 0, high: 6.2, category: '实验室检查' },
    { name: '血清_超氧化物歧化酶', unit: 'U/mL', ref: '110-215', low: 110, high: 215, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_纤维蛋白原', unit: 'g/L', ref: '2-4', low: 2, high: 4, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_D二聚体', unit: 'mg/L', ref: '0-0.5', low: 0, high: 0.5, category: '实验室检查' },
    { name: '血清_癌胚抗原', unit: 'ng/mL', ref: '0-5', low: 0, high: 5, category: '实验室检查' },
    { name: '血清_白球蛋白比', unit: '—', ref: '1.2-2.5', low: 1.2, high: 2.5, category: '实验室检查' },
    { name: '既往病史_心房颤动', unit: '—', ref: '无', low: null, high: null, category: '既往病史' }
  ],
  MINS: [
    { name: '血清_肌钙蛋白I(cTnI)', unit: 'ng/mL', ref: '0-0.04', low: 0, high: 0.04, category: '实验室检查' },
    { name: '血清_CK-MB', unit: 'U/L', ref: '0-24', low: 0, high: 24, category: '实验室检查' },
    { name: '血清_白蛋白', unit: 'g/L', ref: '40-55', low: 40, high: 55, category: '实验室检查' },
    { name: '血清_肌酐', unit: 'μmol/L', ref: '57-97', low: 57, high: 97, category: '实验室检查' },
    { name: '血清_尿素', unit: 'mmol/L', ref: '3.1-8.0', low: 3.1, high: 8.0, category: '实验室检查' },
    { name: '血清_C反应蛋白', unit: 'mg/L', ref: '0-8', low: 0, high: 8, category: '实验室检查' },
    { name: '血清_前白蛋白', unit: 'mg/L', ref: '180-400', low: 180, high: 400, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_D二聚体', unit: 'mg/L', ref: '0-0.5', low: 0, high: 0.5, category: '实验室检查' },
    { name: '血清_超氧化物歧化酶', unit: 'U/mL', ref: '110-215', low: 110, high: 215, category: '实验室检查' },
    { name: '心脏超声__LVEF_末次值', unit: '%', ref: '50-75', low: 50, high: 75, category: '影像/超声' },
    { name: '生命体征_收缩压_末次值', unit: 'mmHg', ref: '90-140', low: 90, high: 140, category: '生命体征' },
    { name: '手术记录__手术时长', unit: 'min', ref: '60-180', low: 60, high: 180, category: '手术记录' }
  ],
  HLIP: [
    { name: '血清_总胆固醇', unit: 'mmol/L', ref: '3.1-5.2', low: 3.1, high: 5.2, category: '实验室检查' },
    { name: '血清_甘油三酯', unit: 'mmol/L', ref: '0.56-1.7', low: 0.56, high: 1.7, category: '实验室检查' },
    { name: '血清_低密度脂蛋白胆固醇(LDL-C)', unit: 'mmol/L', ref: '1.8-3.4', low: 1.8, high: 3.4, category: '实验室检查' },
    { name: '血清_高密度脂蛋白胆固醇(HDL-C)', unit: 'mmol/L', ref: '1.0-1.6', low: 1.0, high: 1.6, category: '实验室检查' },
    { name: '血清_载脂蛋白A1', unit: 'g/L', ref: '1.0-1.6', low: 1.0, high: 1.6, category: '实验室检查' },
    { name: '血清_载脂蛋白B', unit: 'g/L', ref: '0.6-1.1', low: 0.6, high: 1.1, category: '实验室检查' },
    { name: '血清_脂蛋白(a)', unit: 'mg/L', ref: '0-300', low: 0, high: 300, category: '实验室检查' },
    { name: '血清_空腹血糖', unit: 'mmol/L', ref: '3.9-6.1', low: 3.9, high: 6.1, category: '实验室检查' },
    { name: '基本信息_BMI', unit: 'kg/m²', ref: '18.5-24.0', low: 18.5, high: 24.0, category: '基本信息' },
    { name: '既往病史_高血压', unit: '—', ref: '无', low: null, high: null, category: '既往病史' }
  ],
  VTE: [
    { name: '枸橼酸钠抗凝血_D二聚体', unit: 'mg/L', ref: '0-0.5', low: 0, high: 0.5, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_纤维蛋白原', unit: 'g/L', ref: '2-4', low: 2, high: 4, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_抗凝血酶活性测定', unit: '%', ref: '80-120', low: 80, high: 120, category: '实验室检查' },
    { name: 'EDTA抗凝血_血小板计数', unit: '×10⁹/L', ref: '125-350', low: 125, high: 350, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_凝血酶原时间', unit: 's', ref: '9.6-12.8', low: 9.6, high: 12.8, category: '实验室检查' },
    { name: '枸橼酸钠抗凝血_活化部分凝血活酶时间', unit: 's', ref: '25-40', low: 25, high: 40, category: '实验室检查' },
    { name: '血清_C反应蛋白', unit: 'mg/L', ref: '0-8', low: 0, high: 8, category: '实验室检查' },
    { name: '手术记录__手术时长', unit: 'min', ref: '60-180', low: 60, high: 180, category: '手术记录' },
    { name: '手术记录_术后卧床时间', unit: 'h', ref: '0-24', low: 0, high: 24, category: '手术记录' },
    { name: '生命体征_心率', unit: '次/分', ref: '60-100', low: 60, high: 100, category: '生命体征' },
    { name: '既往病史_深静脉血栓', unit: '—', ref: '无', low: null, high: null, category: '既往病史' }
  ]
};

/* ---------- 患者基础信息池 ---------- */
const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林'];
const GIVEN_NAMES = ['建国', '秀英', '志强', '玉兰', '国栋', '秀兰', '伟民', '桂芳', '文博', '淑珍', '德明', '丽华', '永强', '美玲', '海峰', '秀珍', '春生', '玉珍', '国庆', '爱华'];
const DEPARTMENTS = ['胸外科一病区', '胸外科二病区', '心内科', '肿瘤内科', '呼吸与危重症医学科', '重症医学科'];
const DOCTORS = {
  '胸外科一病区': '张建国 · 主任医师',
  '胸外科二病区': '李明辉 · 副主任医师',
  '心内科': '王秀兰 · 主任医师',
  '肿瘤内科': '刘志强 · 副主任医师',
  '呼吸与危重症医学科': '陈国栋 · 主治医师',
  '重症医学科': '杨海峰 · 副主任医师'
};
const SURGERIES = ['胸腔镜肺段切除术(段切)', '胸腔镜肺叶切除术(叶切)', '胸腔镜全肺切除术', '开胸肺叶切除术', '微创食管癌根治术', '纵隔肿瘤切除术', '胸腔镜肺楔形切除术'];
const SURGERY_TYPES = {
  '胸腔镜肺段切除术(段切)': '段切',
  '胸腔镜肺叶切除术(叶切)': '叶切',
  '胸腔镜全肺切除术': '全切',
  '开胸肺叶切除术': '开胸',
  '微创食管癌根治术': '食管癌根治',
  '纵隔肿瘤切除术': '纵隔切除',
  '胸腔镜肺楔形切除术': '楔形切'
};

/* ---------- 个人史 / 既往病史 / 既往手术 数据池 ---------- */
const CURRENT_YEAR = 2026;
/* 吸烟史：男性胸外科患者吸烟比例更高 */
const SMOKE_HISTORY_MALE = ['不吸烟', '已戒烟 8 年', '吸烟 30 余年（日均 20 支）', '吸烟 20 余年（日均 15 支）', '吸烟 10 余年（日均 10 支）'];
const SMOKE_HISTORY_FEMALE = ['不吸烟', '不吸烟', '不吸烟', '已戒烟 5 年', '吸烟 15 年（日均 8 支）'];
const DRINK_HISTORY = ['不饮酒', '不饮酒', '偶尔饮酒', '饮酒 15 余年'];

/* 既往病史：按最小好发年龄 + 基础患病率加权，避免年轻人得老年病 */
const PAST_HISTORY_POOL = [
  { name: '高血压', minAge: 40, p: 0.40 },
  { name: '高脂血症', minAge: 40, p: 0.28 },
  { name: '2型糖尿病', minAge: 45, p: 0.26 },
  { name: '冠心病', minAge: 50, p: 0.24 },
  { name: '心律失常', minAge: 45, p: 0.12 },
  { name: '心房颤动', minAge: 55, p: 0.14 },
  { name: '心脏瓣膜病', minAge: 45, p: 0.10 },
  { name: '陈旧性心肌梗死', minAge: 55, p: 0.10 },
  { name: '慢性阻塞性肺疾病', minAge: 50, p: 0.16 },
  { name: '慢性肾病', minAge: 55, p: 0.09 },
  { name: '脑卒中', minAge: 60, p: 0.08 },
  { name: '深静脉血栓', minAge: 45, p: 0.06 }
];

/* 既往手术：全部为心胸专科术式；lo/hi 为施术年龄区间，w 为抽取权重，maleBias 表示男性更常见 */
const PAST_SURGERY_POOL = [
  { name: '冠状动脉支架植入术(PCI)', lo: 45, hi: 85, w: 1.8, maleBias: true },
  { name: '冠状动脉旁路移植术(CABG)', lo: 45, hi: 82, w: 1.2, maleBias: true },
  { name: '心脏瓣膜置换术', lo: 40, hi: 85, w: 1.0 },
  { name: '二尖瓣球囊扩张术', lo: 32, hi: 72, w: 0.8, only: '女' },
  { name: '心脏永久起搏器植入术', lo: 50, hi: 88, w: 1.0 },
  { name: '房颤射频消融术', lo: 40, hi: 80, w: 1.1 },
  { name: '胸腔闭式引流术', lo: 20, hi: 85, w: 1.3 },
  { name: '肺大疱切除术', lo: 18, hi: 70, w: 1.0, maleBias: true },
  { name: '肺楔形切除术', lo: 30, hi: 80, w: 0.8 },
  { name: '纵隔肿瘤切除术', lo: 20, hi: 75, w: 0.7 },
  { name: '食管裂孔疝修补术', lo: 35, hi: 80, w: 0.6 },
  { name: '先天性心脏病修补术(ASD/VSD)', lo: 6, hi: 32, w: 0.6 },
  { name: '心包开窗引流术', lo: 30, hi: 80, w: 0.5 },
  { name: '胸壁肿瘤切除术', lo: 25, hi: 78, w: 0.4 }
];

/* 按性别 + 年龄生成合理的心胸既往手术记录（加权抽取，不重复） */
function buildPastSurgeries(rnd, gender, age) {
  // 台数分布：0 台 32%、1 台 36%、2 台 26%、3 台 6%（重大心胸手术叠加多台较少见）
  const roll = rnd();
  const count = roll < 0.32 ? 0 : roll < 0.68 ? 1 : roll < 0.94 ? 2 : 3;
  if (count === 0) return ['无'];

  // 按性别过滤（only）并计算性别修正后的权重
  const avail = PAST_SURGERY_POOL
    .filter(it => !it.only || it.only === gender)
    .map(it => ({ ...it, w: it.maleBias && gender === '女' ? it.w * 0.35 : it.w }));

  const list = [];
  while (list.length < count && avail.length) {
    const total = avail.reduce((a, b) => a + b.w, 0);
    let r = rnd() * total, idx = 0;
    for (let i = 0; i < avail.length; i++) {
      r -= avail[i].w;
      if (r <= 0) { idx = i; break; }
    }
    const item = avail.splice(idx, 1)[0]; // 取出后即移除，避免同一术式重复
    // 施术年龄上限不能超过当前年龄，且手术至少发生在 1 年前
    const hi = Math.min(item.hi, age - 1);
    if (hi < item.lo) continue; // 当前年龄不适用该术式
    const ageThen = item.lo + Math.floor(rnd() * (hi - item.lo + 1));
    list.push({ name: item.name, year: CURRENT_YEAR - (age - ageThen) });
  }

  if (!list.length) return ['无'];
  list.sort((a, b) => b.year - a.year); // 按时间由近及远
  return list.map(x => `${x.name}（${x.year} 年）`);
}

/* ---------- 生成单个患者的预测结果与归因 ---------- */
function buildPrediction(code, rnd, age, surgeryHours) {
  const comp = COMPLICATIONS.find(c => c.code === code);
  // 概率在阈值附近波动，制造高危/低危分布
  const span = comp.threshold * 0.9;
  let prob = comp.threshold + (rnd() * 2 - 1) * span;
  // 让高龄、长手术患者风险偏高，制造合理性
  prob += (age - 60) * 0.004 + (surgeryHours - 2) * 0.02;
  prob = Math.max(0.02, Math.min(0.95, prob));
  const riskLevel = prob >= comp.threshold ? 'HIGH_RISK' : 'LOW_RISK';

  // 归因驱动因子（从 globalFeatures 取前几个，结合测量值）
  const drivers = [];
  const protective = [];
  const gfs = comp.globalFeatures.slice(0, 6);
  for (let i = 0; i < 3; i++) {
    const gf = gfs[i];
    drivers.push({
      feature_name: gf.feature_name,
      measured_value: round2(measureValue(gf.feature_name, age, surgeryHours, rnd)),
      risk_contribution_score: round4(gf.importance_score * (0.6 + rnd() * 0.5)),
      direction: 'RISK_INCREASING'
    });
  }
  for (let i = 0; i < 2; i++) {
    const gf = gfs[i + 3];
    protective.push({
      feature_name: gf.feature_name,
      measured_value: round2(measureValue(gf.feature_name, age, surgeryHours, rnd)),
      risk_contribution_score: -round4(gf.importance_score * (0.3 + rnd() * 0.4)),
      direction: 'RISK_DECREASING'
    });
  }

  return {
    task_code: code,
    task_name: comp.name,
    predicted_risk_probability: round4(prob),
    predicted_risk_percent: (prob * 100).toFixed(2) + '%',
    risk_level: riskLevel,
    risk_level_cn: riskLevel === 'HIGH_RISK' ? '🔴 高危预警 (需临床干预)' : '🔵 低危安全 (常规术后护理)',
    optimal_threshold: comp.threshold,
    threshold_percent: (comp.threshold * 100).toFixed(2) + '%'
  };
}

function measureValue(featureName, age, surgeryHours, rnd) {
  const n = featureName;
  if (n.includes('就诊年龄')) return age;
  if (n.includes('手术时长')) return round2(60 + surgeryHours * 60);
  if (n.includes('心房颤动') || n.includes('高血压') || n.includes('深静脉血栓')) return rnd() > 0.7 ? 1 : 0;
  if (n.includes('LVEF')) return round2(45 + rnd() * 25);
  if (n.includes('收缩压')) return round2(95 + rnd() * 55);
  if (n.includes('BMI')) return round2(20 + rnd() * 8);
  if (n.includes('心率')) return round2(65 + rnd() * 50);
  if (n.includes('D二聚体')) return round2(rnd() * 4);
  if (n.includes('LDL-C')) return round2(2.0 + rnd() * 2.5);
  if (n.includes('总胆固醇')) return round2(3.5 + rnd() * 2.5);
  if (n.includes('甘油三酯')) return round2(0.8 + rnd() * 2.2);
  if (n.includes('白蛋白')) return round2(35 + rnd() * 18);
  if (n.includes('肌酐')) return round2(60 + rnd() * 60);
  if (n.includes('肌钙蛋白')) return round2(rnd() * 0.2);
  if (n.includes('C反应蛋白')) return round2(rnd() * 30);
  if (n.includes('纤维蛋白原')) return round2(2 + rnd() * 3);
  if (n.includes('钠离子')) return round2(132 + rnd() * 15);
  if (n.includes('脂肪酸结合蛋白')) return round2(rnd() * 10);
  if (n.includes('超氧化物歧化酶')) return round2(90 + rnd() * 140);
  if (n.includes('癌胚抗原')) return round2(rnd() * 8);
  if (n.includes('抗凝血酶')) return round2(70 + rnd() * 55);
  if (n.includes('血小板')) return round2(120 + rnd() * 260);
  if (n.includes('卧床时间')) return round2(rnd() * 48);
  if (n.includes('胸腔镜')) return rnd() > 0.3 ? 1 : 0;
  return round2(rnd() * 10);
}

/* ---------- 生成患者检验检查明细（结合风险高低决定异常项） ---------- */
function buildLabItems(code, rnd, pred) {
  const defs = LAB_DEFINITIONS[code];
  const isHigh = pred.risk_level === 'HIGH_RISK';
  return defs.map(d => {
    let value, status = 'normal';
    const roll = rnd();
    if (d.low === null && d.high === null) {
      // 布尔型（有无病史等）
      value = roll > 0.75 ? '有' : '无';
      status = value === '有' ? 'high' : 'normal';
    } else {
      const range = d.high - d.low;
      const center = (d.high + d.low) / 2;
      // 高危患者更易出现异常
      const abnormalChance = isHigh ? 0.45 : 0.2;
      if (roll < abnormalChance) {
        if (rnd() > 0.5) {
          value = round2(d.high + range * (0.1 + rnd() * 0.8));
          status = 'high';
        } else {
          value = round2(d.low - range * (0.1 + rnd() * 0.8));
          status = 'low';
        }
      } else {
        value = round2(d.low + range * (0.15 + rnd() * 0.7));
      }
    }
    return { name: d.name, value, unit: d.unit, ref: d.ref, status, category: d.category };
  });
}

/* ---------- 患者生成 ---------- */
function generatePatients() {
  const rnd = mulberry32(20261119);
  const patients = [];
  const total = 32;
  for (let i = 0; i < total; i++) {
    const gender = rnd() > 0.55 ? '男' : '女';
    const age = Math.floor(55 + rnd() * 30); // 55-85
    const surgeryHours = 1 + rnd() * 3.5; // 1-4.5 小时
    const surgery = SURGERIES[Math.floor(rnd() * SURGERIES.length)];
    const dept = DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)];
    const admitDay = 6 + Math.floor(rnd() * 14); // 11-06 ~ 11-19 就诊/入院
    const patientId = 'P_' + (20260904 + i * 13).toString() + '_' + String(i + 1).padStart(3, '0');
    const name = SURNAMES[Math.floor(rnd() * SURNAMES.length)] + GIVEN_NAMES[Math.floor(rnd() * GIVEN_NAMES.length)];

    // 患者类型：约 28% 为门诊患者，其余为住院患者
    const isOutpatient = rnd() < 0.28;
    const patientType = isOutpatient ? '门诊' : '住院';
    const bed = isOutpatient ? '—' : (1 + Math.floor(rnd() * 30)) + '床';

    // 身高 / 体重 / BMI（按性别区分身高区间，体重由 BMI 反推，避免出现不合理的组合）
    const height = gender === '男'
      ? Math.round(163 + rnd() * 22)   // 男 163 ~ 185 cm
      : Math.round(150 + rnd() * 22);  // 女 150 ~ 172 cm
    const bmiTarget = Math.max(17.5, Math.min(31.5, 20.5 + (age - 55) * 0.075 + rnd() * 5.5));
    const weight = Math.round(bmiTarget * Math.pow(height / 100, 2));
    const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);

    // 个人史（吸烟、饮酒）：男性吸烟比例明显高于女性
    const smokeList = gender === '男' ? SMOKE_HISTORY_MALE : SMOKE_HISTORY_FEMALE;
    const smokeHistory = smokeList[Math.floor(rnd() * smokeList.length)];
    const drinkHistory = DRINK_HISTORY[Math.floor(rnd() * DRINK_HISTORY.length)];

    // 既往手术记录：全部为心胸相关术式，按性别筛选术式、按年龄倒推施术年份
    const pastSurgeries = buildPastSurgeries(rnd, gender, age);

    // 既往病史：按好发年龄 + 患病率加权，年龄越大慢性合并症越多
    const pastHistory = [];
    PAST_HISTORY_POOL.forEach(h => {
      if (age >= h.minAge && rnd() < h.p) pastHistory.push(h.name);
    });
    // 与既往手术联动，保证"诊断"与"术式"自洽
    const surgTxt = pastSurgeries.join(' ');
    const ensureDx = (dx, re) => { if (re.test(surgTxt) && !pastHistory.includes(dx)) pastHistory.push(dx); };
    ensureDx('冠心病', /PCI|旁路移植/);
    ensureDx('心房颤动', /射频消融/);
    ensureDx('心脏瓣膜病', /瓣膜置换|球囊扩张/);
    ensureDx('心律失常', /起搏器/);
    ensureDx('陈旧性心肌梗死', /旁路移植/);
    if (pastHistory.length === 0) pastHistory.push('无特殊既往病史');

    const predictions = {};
    const attributions = {};
    const labItems = {};
    COMPLICATIONS.forEach(c => {
      const pred = buildPrediction(c.code, rnd, age, surgeryHours);
      predictions[c.code] = pred;
      attributions[c.code] = {
        task_code: c.code,
        top_risk_drivers: [],
        top_protective_factors: []
      };
      // 复用 buildPrediction 中的归因逻辑 —— 这里重新生成归因
      const drivers = [], protective = [];
      const gfs = c.globalFeatures.slice(0, 6);
      for (let j = 0; j < 3; j++) {
        const gf = gfs[j];
        drivers.push({
          feature_name: gf.feature_name,
          measured_value: round2(measureValue(gf.feature_name, age, surgeryHours, rnd)),
          risk_contribution_score: round4(gf.importance_score * (0.6 + rnd() * 0.5)),
          direction: 'RISK_INCREASING'
        });
      }
      for (let j = 0; j < 2; j++) {
        const gf = gfs[j + 3];
        protective.push({
          feature_name: gf.feature_name,
          measured_value: round2(measureValue(gf.feature_name, age, surgeryHours, rnd)),
          risk_contribution_score: -round4(gf.importance_score * (0.3 + rnd() * 0.4)),
          direction: 'RISK_DECREASING'
        });
      }
      attributions[c.code].top_risk_drivers = drivers;
      attributions[c.code].top_protective_factors = protective;
      labItems[c.code] = buildLabItems(c.code, rnd, pred);
    });

    patients.push({
      patient_id: patientId,
      name,
      gender,
      age,
      patient_type: patientType,
      bed,
      department: dept,
      doctor: DOCTORS[dept],
      surgery,
      surgery_type: SURGERY_TYPES[surgery],
      surgery_hours: round2(surgeryHours),
      admit_date: '2026-11-' + String(admitDay).padStart(2, '0'),
      height,
      weight,
      bmi,
      smoke_history: smokeHistory,
      drink_history: drinkHistory,
      past_history: pastHistory,
      past_surgeries: pastSurgeries,
      predictions,
      attributions,
      lab_items: labItems
    });
  }
  // 按入院日期排序
  patients.sort((a, b) => (a.admit_date < b.admit_date ? 1 : -1));
  return patients;
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

/* ---------- 导出 ---------- */
const PATIENTS = generatePatients();
const TOTAL_PATIENTS = PATIENTS.length;

/* ==========================================================================
 * 模型预测记录数据
 * ========================================================================== */

function fmtDateTime(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
/* ---------- 患者单次预测记录 ---------- */
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* 每次预测 = 单个患者 + 单个并发症模型的单次触发记录 */
function generatePatientRecords(patient) {
  const rnd = mulberry32(hashCode(patient.patient_id));
  const versions = ['v2.1.2', 'v2.2.0', 'v2.3.0', 'v2.3.1'];
  const triggers = ['系统触发', '定时任务', '手动触发', '系统触发', '定时任务', '手动触发'];
  const operators = ['张医生', '李医生', '系统调度'];
  const records = [];
  COMPLICATIONS.forEach(c => {
    const base = patient.predictions[c.code];
    const n = 2 + Math.floor(rnd() * 3); // 每个模型 2-4 次历史预测
    for (let i = 0; i < n; i++) {
      const delta = (rnd() * 2 - 1) * 0.06;
      const prob = Math.max(0.02, Math.min(0.95, base.predicted_risk_probability + delta));
      const dt = new Date(2026, 10, 19 - (i * 2 + Math.floor(rnd() * 2)), 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
      records.push({
        record_id: 'PR' + hashCode(patient.patient_id + c.code + '_' + i),
        patient_id: patient.patient_id,
        patient_name: patient.name,
        task_code: c.code,
        task_name: c.name,
        task_short: c.short,
        predict_time: fmtDateTime(dt),
        model_version: versions[Math.floor(rnd() * versions.length)],
        trigger: triggers[Math.floor(rnd() * triggers.length)],
        operator: operators[Math.floor(rnd() * operators.length)],
        prob: round4(prob),
        percent: (prob * 100).toFixed(2) + '%',
        level: prob >= c.threshold ? 'HIGH_RISK' : 'LOW_RISK',
        threshold: c.threshold
      });
    }
  });
  records.sort((a, b) => (a.predict_time < b.predict_time ? 1 : -1));
  return records;
}

const PATIENT_RECORDS = {};
PATIENTS.forEach(p => { PATIENT_RECORDS[p.patient_id] = generatePatientRecords(p); });
