/* Educational rules, not an AI model. Shared by the offline page and tests. */
(function (root) {
  'use strict';
  const labels = {
    goal: { describe: '描述数据', compare: '比较组别或条件', associate: '研究关联', predict: '建立预测', causal: '研究因果' },
    design: { randomized: '随机分组研究', cohort: '队列研究', casecontrol: '病例对照研究', cross: '横断面研究', other: '其他设计', unknown: '尚不清楚' },
    outcome: { continuous: '连续数值', binary: '二分类', ordinal: '有序等级', nominal: '无序多分类', count: '计数', survival: '事件时间（可能删失）' },
    structure: { independent: '独立观测', paired: '同一人/匹配对象两个条件', repeated: '重复测量（三个及以上时间/条件）', clustered: '中心/病区等聚类', unknown: '尚不清楚' },
    groups: { two: '两个组/条件', multi: '三个及以上组/条件' },
    adjust: { no: '不调整（需有依据）', yes: '需要调整协变量', unknown: '尚未确定' },
    missing: { none: '已核查，无缺失', some: '存在缺失，处理待讨论', unknown: '尚未核查' },
    distribution: { approx: '图形近似对称，无明显极端值', skew: '明显偏态或极端值', unknown: '尚未查看图形' },
    predictor: { continuous: '连续数值', binary: '二分类', categorical: '多分类/等级', unknown: '尚未确定' }
  };
  const sources = {
    t: ['R：t.test', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html'],
    ranks: ['R：Wilcoxon', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/wilcox.test.html'],
    anova: ['R：oneway.test', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/oneway.test.html'],
    kw: ['R：Kruskal–Wallis', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/kruskal.test.html'],
    chisq: ['R：卡方检验', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/chisq.test.html'],
    fisher: ['R：Fisher 精确检验', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/fisher.test.html'],
    mcnemar: ['R：McNemar 检验', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/mcnemar.test.html'],
    glm: ['R：广义线性模型', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/glm.html'],
    ordered: ['R MASS：有序回归', 'https://stat.ethz.ch/R-manual/R-devel/library/MASS/html/polr.html'],
    multinom: ['R nnet：多项模型', 'https://stat.ethz.ch/R-manual/R-devel/library/nnet/html/multinom.html'],
    negative: ['R MASS：负二项模型', 'https://stat.ethz.ch/R-manual/R-devel/library/MASS/html/glm.nb.html'],
    correlation: ['R：相关分析', 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/cor.test.html'],
    km: ['R survival：生存曲线', 'https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit.html'],
    gee: ['statsmodels：GEE', 'https://www.statsmodels.org/stable/gee.html'],
    survival: ['R survival：Cox 模型', 'https://stat.ethz.ch/R-manual/R-devel/library/survival/html/coxph.html'],
    prediction: ['scikit-learn：数据泄漏', 'https://scikit-learn.org/stable/common_pitfalls.html'],
    sampl: ['SAMPL 报告指南', 'https://www.equator-network.org/wp-content/uploads/2013/07/SAMPL-Guidelines-6-27-13.pdf']
  };
  function recommend(c) {
    const required = ['goal', 'design', 'outcome', 'structure', 'missing'];
    if (c.goal === 'compare') required.push('groups', 'adjust');
    if (c.goal === 'associate') required.push('predictor', 'adjust');
    if (c.outcome === 'continuous' && c.goal === 'compare') required.push('distribution');
    const missingFields = required.filter(k => !c[k] || !labels[k][c[k]]);
    if (missingFields.length) return {
      level: 'incomplete', title: '先补齐研究描述',
      reason: '还不能进入方法讨论。请选择相关选项；不知道时可以明确选择“尚不清楚”。',
      methods: [], checks: missingFields.map(k => '待填写：' + ({goal:'研究目标',design:'研究设计',outcome:'结局类型',structure:'观测结构',missing:'缺失情况',groups:'组/条件数',adjust:'协变量调整',distribution:'分布概况',predictor:'解释变量类型'}[k])),
      report: ['研究问题、目标量、样本量及变量字典'], sources: ['sampl']
    };
    const result = { level: 'candidate', title: '', reason: '', methods: [],
      checks: ['确认研究人群、主要结局、目标量和分析单位。', '补充各组独立样本量/事件数，审计异常值与数据质量。', '预定主要对比、多重性和敏感性分析。'],
      report: ['效应估计及适合目标量的置信区间', '样本量/事件数、缺失处理、诊断和软件版本'], sources: ['sampl'] };
    const set = (title, reason, methods, refs, review = false) => {
      Object.assign(result, { title, reason, methods });
      result.sources.push(...refs);
      if (review) result.level = 'review';
    };
    if (c.goal === 'predict') {
      set('先设计预测与验证方案', '预测关注新样本表现，不能按结局类型直接挑一个“最优算法”。', ['按结局类型讨论预测模型；先确定验证设计'], ['prediction'], true);
      result.checks.push('定义预测时点、可用特征与预测窗口；避免结局发生后的信息。', '按患者/中心/时间合理划分数据；仅在训练数据拟合预处理。', '讨论校准、区分度、验证及适合目标用途的性能指标。');
      result.report = ['验证设计、样本量/事件数、校准与性能不确定性', '完整预处理与模型流程、独立验证状态'];
    } else if (c.goal === 'causal') {
      set('先明确因果设计与假设', '一个检验或一个调整后的回归系数不会自动产生因果结论。', ['随机研究的预定效应估计，或有明确识别假设的观察性因果方案'], ['sampl'], true);
      result.checks.push('明确干预、对照、时间零点、随访和目标效应。', '讨论分配机制、混杂、选择偏倚、中介与时间顺序。', '说明可识别性假设及对应的敏感性分析。');
    } else if (c.goal === 'describe') {
      set('先描述分布和数据覆盖', '描述问题不一定需要显著性检验。先把分母、单位和缺失写清楚。', c.outcome === 'survival' ? ['Kaplan–Meier 等适合删失结构的生存描述'] : c.outcome === 'continuous' ? ['点图/直方图、均值与 SD 或中位数与 IQR（依分布与目的）'] : ['频数、比例或计数率等与结局相符的描述'], c.outcome === 'survival' ? ['survival'] : []);
      result.report = ['各组/条件的样本量、分母、缺失与合适的区间估计'];
      if (c.outcome === 'survival') { result.sources.push('km'); result.checks.push('核对时间起点、事件、删失、在险人数及竞争事件。'); }
      if (['paired','repeated','clustered'].includes(c.structure)) result.checks.push('区间估计需尊重相关结构；不要把所有行当独立观测。');
    } else if (['repeated', 'clustered'].includes(c.structure)) {
      set('先处理观测之间的相关性', '重复测量和中心聚类会改变有效信息与标准误，逐次独立检验通常不够。', [c.outcome === 'survival' ? '适合相关事件时间的模型（如 frailty / 稳健方差，依设计）' : '混合模型 / GEE 等与结局匹配的方案'], c.outcome === 'survival' ? ['survival'] : ['gee'], true);
      result.checks.push('明确患者 ID、时间、中心与相关结构。', '区分个体条件效应和群体平均效应，检查中心数与缺失机制。');
    } else if (c.outcome === 'survival') {
      set('讨论事件时间分析', '有删失或随访长短不同，需要保留时间信息。', ['Kaplan–Meier 描述', '设计与假设合适时讨论 log-rank / Cox；有竞争风险需另设方案'], ['survival'], true);
      result.checks.push('核对事件定义、删失、随访起点与事件数。', '若使用 Cox，检查比例风险；HR 不等同风险比。');
      result.sources.push('km');
    } else if (c.goal === 'associate' || c.adjust === 'yes') {
      if (c.structure === 'paired') {
        set('讨论尊重配对结构的关联/调整模型', '配对比较的简单检验不能自动完成协变量调整或关联建模。', ['配对/条件模型或混合模型，依配对来源和目标量确定'], ['gee', 'glm'], true);
      } else {
        const models = {continuous:'线性回归或适合分布与目标量的替代模型',binary:'Logistic 或目标量对应的二项模型',ordinal:'有序回归（先核对等级与模型假设）',nominal:'多项回归等与类别结构匹配的模型',count:'Poisson / 负二项等计数模型'};
        set('按结局与目标量讨论模型', '模型选择还取决于设计、关系形状、事件数和协变量依据。', [models[c.outcome]], ['glm'], true);
        if (c.goal === 'associate' && c.outcome === 'continuous' && c.predictor === 'continuous' && c.adjust === 'no') {
          result.methods.push('仅研究两连续变量关系时，也可讨论 Pearson / Spearman（核对线性/单调性）');
          result.sources.push('correlation');
        }
      }
      result.checks.push('说明解释变量、参考组、关系形状和预定调整依据。', '检查模型诊断、事件/参数信息量与不稳定估计。');
      if (c.outcome === 'binary') result.checks.push('Logistic 的 OR 不等同 RR；稀疏事件或分离需专门处理。');
      if (c.outcome === 'ordinal') result.sources.push('ordered');
      if (c.outcome === 'nominal') result.sources.push('multinom');
      if (c.outcome === 'count') result.sources.push('negative');
    } else if (c.structure === 'paired' && c.groups === 'multi') {
      set('配对结构超过两个条件：需进一步设计', '多个匹配组或多个条件不能直接套用两条件配对检验。', ['匹配/重复结构模型；必要时讨论相关非参数方案'], ['gee'], true);
    } else if (c.outcome === 'continuous') {
      if (c.structure === 'paired') {
        set('候选：配对差的分析', '每个前后/匹配观测必须一一对应，关注配对差。', ['配对 t 检验（关注均值差）', '满足条件且目标量适合时，讨论 Wilcoxon 符号秩方法'], ['t', 'ranks']);
        result.checks.push('检查差值分布和异常差值；符号秩的位置解释需要额外条件。');
      } else if (c.groups === 'multi') {
        set('候选：多独立组比较', '先讨论总体差异，再讨论预定组间对比。', ['ANOVA / Welch ANOVA（关注均值）', '适合秩目标时讨论 Kruskal–Wallis'], ['anova', 'kw']);
        result.checks.push('检查方差和残差条件，预定事后对比及多重性控制。');
      } else {
        set('候选：两独立组均值差', '目标若是未调整的均值差，Welch t 检验可作讨论起点。', ['双侧 Welch t 检验（方向需预先规定）', '偏态/极端值时讨论变换、稳健或秩方法，先确认目标量'], ['t', 'ranks']);
        result.checks.push('Welch 不要求等方差，仍需独立观测与合适的分布条件。');
      }
      if (c.distribution !== 'approx') {
        result.level = 'review';
        result.checks.push('尚未核对或存在明显偏态/极端值：先看图与目标量；不按正态性检验 P 值自动切换。');
      }
    } else if (c.outcome === 'binary') {
      if (c.structure === 'paired') {
        set('候选：配对二分类比较', '同一对象两个条件的结果相关，重点是不一致配对。', ['McNemar 检验；不一致对很少时讨论精确形式'], ['mcnemar']);
        result.checks.push('需要逐对 2×2 表，前后总阳性人数不足以计算。');
      } else {
        set('候选：独立分类比例比较', '先明确分母、组数和列联表结构。', c.groups === 'two' ? ['2×2 卡方检验 / Fisher 精确检验'] : ['多组列联表方法；稀疏表需讨论精确/模拟或模型方案'], ['fisher', 'chisq']);
        result.checks.push('检查期望频数和稀疏性；确定风险差、RR 或 OR 哪个符合设计。');
      }
      if (c.design === 'casecontrol') result.checks.push('病例对照抽样：样本比例不能直接用于估计总体风险或 RR。');
    } else {
      const methods = {
        ordinal: c.structure === 'paired' ? ['配对秩方法或有序模型；核对配对与目标量'] : [c.groups === 'two' ? 'Mann–Whitney / 有序模型，依目标量和条件选择' : 'Kruskal–Wallis / 有序模型，依目标量和条件选择'],
        nominal: c.structure === 'paired' ? ['配对分类的边际同质性/对称性或合适模型'] : ['列联表方法 / 多项模型'],
        count: ['Poisson / 负二项等计数模型；需区分计数与暴露时间下的率']
      };
      set('需要更具体的结局与模型说明', '结局编码与模型假设会影响解释，不能只根据“数字”选择 t 检验。', methods[c.outcome], ['glm', 'ranks'], true);
      if (c.outcome === 'count') result.checks.push('核对暴露时间 offset、过度离散和零值机制。');
      if (c.outcome === 'count') result.sources.push('negative');
      if (c.outcome === 'ordinal') result.sources.push('ordered', 'kw');
      if (c.outcome === 'nominal') result.sources.push('multinom', 'chisq');
    }
    if (c.missing === 'some') {
      result.level = 'review';
      result.checks.push('存在缺失：记录数量、原因与时间；完整病例分析或插补均需论证。');
    }
    if (c.missing === 'unknown' || c.structure === 'unknown' || c.design === 'unknown' || c.adjust === 'unknown' || c.predictor === 'unknown') {
      result.level = 'incomplete';
      result.checks.unshift('关键设计/缺失信息未确认：下列候选仅供学习，请补充后再讨论。');
    }
    if (c.design === 'other') {
      if (result.level !== 'incomplete') result.level = 'review';
      result.checks.push('“其他设计”可能涉及匹配病例对照、复杂抽样、交叉或非劣效等，本简化向导需要补充专门方案。');
    }
    if (c.structure === 'paired' && c.outcome === 'survival') result.checks.push('事件时间分析也要处理匹配或相关结构。');
    result.sources = [...new Set(result.sources)];
    return result;
  }
  function makePrompt(c, r) {
    const names = {goal:'目标',design:'研究设计',outcome:'结局类型',structure:'分析单位与相关结构',groups:'组/条件数',adjust:'协变量调整',missing:'缺失',distribution:'分布概况',predictor:'解释变量'};
    const rows = Object.keys(names).filter(k => c[k] && (k !== 'groups' || c.goal === 'compare') && (k !== 'predictor' || c.goal === 'associate') && (k !== 'distribution' || c.outcome === 'continuous')).map(k => `- ${names[k]}：${labels[k][c[k]] || '待补充'}`);
    return `请作为医学统计学习助手，先问缺失信息，再比较候选方法。不要编造数据或文献，不要追逐显著性。\n\n已知设计选项（不是完整研究方案）：\n${rows.join('\n')}\n\n待补充：研究问题与人群、目标量与比较方向、各组独立样本量和事件数、时间点、变量字典、混杂依据、缺失/删失原因、主要结局与多重性安排。\n\n离线规则向导列出的讨论起点：${r.methods.length ? r.methods.join('；') : '信息不足，尚无候选'}。请核查它们是否回答我的实际问题。\n\n请输出：\n1. 先列必须补充的信息，不知道的标“待补充”。\n2. 候选方法、目标量、适用条件、局限与诊断的比较表。\n3. 效应量、置信区间、缺失与敏感性分析方案。\n4. 可打开核查的官方文档或方法学原始来源；不确定引用标“待核查”。\n5. 用人为构造模拟数据的教学代码，说明分组方向、双侧/单侧、方差、配对和版本要求。\n6. 可复核数值与另一实现的对照步骤。\n7. 待研究团队审核的分析草案及不能支持的结论。\n\n不要直接分析真实患者数据；不要自动删缺失、填0或仅按单因素P值筛选调整变量。`;
  }
  root.StatsGuide = { recommend, makePrompt, labels, sources };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.StatsGuide;
})(typeof globalThis !== 'undefined' ? globalThis : this);
