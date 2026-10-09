/* Original teaching layer over the v2.1 design rules. No data analysis or AI call. */
(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./method-engine.js') : root.StatsGuide;
  const fields = {
    question:'研究问题', population:'研究人群', comparator:'比较对象 / 解释变量', outcomeName:'主要结局定义', outcomeUnit:'结局单位 / 编码',
    goal:'研究目标', design:'研究设计', outcome:'结局类型', estimand:'目标量', estimandDetail:'具体目标量说明',
    unit:'分析单位', unitDetail:'单位 / 配对 / 中心的说明', structure:'相关结构', sampling:'抽样设计',
    groups:'组 / 条件数', predictor:'解释变量类型', sampleTotal:'独立对象总数', sampleA:'A 组独立对象数',
    sampleB:'B 组独立对象数', pairs:'完整配对数', events:'结局事件数', discordant:'二分类不一致配对数',
    clusters:'中心 / 聚类数', eventInfo:'稀疏性概况', timeOrigin:'时间起点', outcomeTime:'主要结局时点',
    predictionTime:'预测时点 / 当时可用信息', predictionHorizon:'预测窗口', missing:'缺失情况',
    missingBasis:'缺失数量、原因及拟用处理依据', adjust:'协变量调整', adjustBasisType:'调整依据类型',
    adjustBasis:'调整 / 不调整的具体依据', distribution:'图形与异常值概况', surveyBasis:'权重、分层、PSU 与 domain',
    effectScope:'相关结构模型的效应层次'
  };
  const extraLabels = {
    unit:{person:'患者 / 参与者', animal:'动物', donor:'供者', pair:'匹配对（还需说明对象）', cluster:'中心 / 病区', other:'其他单位', unknown:'待补充'},
    eventInfo:{unknown:'尚未检查频数 / 分离', sparse:'已发现稀疏单元格 / 分离风险', checked:'已查看频数（仍需模型诊断）'},
    adjustBasisType:{plan:'方案预设', knowledge:'领域知识 / 时间顺序 / 因果结构', univariate:'仅按单因素 P 值筛选', unknown:'待补充'},
    effectScope:{marginal:'人群平均效应', conditional:'个体 / 中心条件效应', unknown:'待补充'}
  };
  const estimands = {
    summary:{label:'分布、均值或比例的描述', outcomes:['continuous','binary','ordinal','nominal','count','survival'], goals:['describe']},
    meanDifference:{label:'均值差', outcomes:['continuous'], goals:['compare','causal']},
    medianDifference:{label:'中位数 / 指定分位数差', outcomes:['continuous'], goals:['compare','associate']},
    riskDifference:{label:'固定时点风险 / 比例差', outcomes:['binary'], goals:['compare','associate','causal']},
    riskRatio:{label:'固定时点风险比 RR', outcomes:['binary'], goals:['compare','associate','causal']},
    oddsRatio:{label:'优势比 OR', outcomes:['binary'], goals:['compare','associate','causal']},
    coefficient:{label:'回归系数 / 指定变量变化的均值差', outcomes:['continuous'], goals:['associate','compare']},
    correlation:{label:'相关系数（须区分 Pearson / 秩相关）', outcomes:['continuous'], goals:['associate']},
    distribution:{label:'类别 / 等级 / 分布对比（须进一步定义）', outcomes:['continuous','ordinal','nominal'], goals:['compare','associate']},
    rateRatio:{label:'计数率比（须定义暴露时间）', outcomes:['count'], goals:['compare','associate','causal']},
    hazardRatio:{label:'风险率比 HR', outcomes:['survival'], goals:['compare','associate','causal']},
    survivalProbability:{label:'指定时点生存概率 / 对比', outcomes:['survival'], goals:['describe','compare','associate']},
    prediction:{label:'新对象在指定窗口的预测', outcomes:['continuous','binary','ordinal','nominal','count','survival'], goals:['predict']},
    other:{label:'其他量（请说明）', outcomes:['continuous','binary','ordinal','nominal','count','survival'], goals:['describe','compare','associate','predict','causal']},
    unknown:{label:'尚不清楚 / 待补充', outcomes:[], goals:[]}
  };
  const sources = {...engine.sources, tripod:['TRIPOD+AI：预测模型报告', 'https://www.tripod-statement.org/'],
    glmm:['lme4：广义线性混合模型与条件效应','https://lme4.github.io/lme4/reference/glmer.html']};
  const counts = ['sampleTotal','sampleA','sampleB','pairs','events','discordant','clusters'];
  const blank = value => !value || /^(待补充|未知|尚不清楚|不知道|unknown|n\/?a)$/i.test(value);
  function normalize(input) {
    input = input || {};
    const c = {};
    for (const key of Object.keys(fields)) c[key] = String(input[key] ?? '').replace(/\s+/g,' ').trim().slice(0,1000);
    for (const [key,options] of Object.entries(engine.labels)) if (!Object.hasOwn(options,c[key])) c[key]='';
    // Hidden branches cannot carry a stale decision into a new goal/outcome.
    if (c.goal !== 'compare') c.groups = '';
    if (!(c.goal==='compare' && c.groups==='two' && c.structure==='independent')) { c.sampleA=''; c.sampleB=''; }
    if (c.goal !== 'associate') c.predictor = '';
    if (!['compare','associate','causal'].includes(c.goal)) { c.adjust = ''; c.adjustBasis = ''; c.adjustBasisType = ''; }
    if (c.adjust !== 'yes') c.adjustBasisType='';
    if (!['other','distribution','medianDifference'].includes(c.estimand)) c.estimandDetail='';
    if (!(c.goal === 'compare' && c.outcome === 'continuous')) c.distribution = '';
    if (c.goal !== 'predict') { c.predictionTime = ''; c.predictionHorizon = ''; }
    if (c.outcome !== 'binary') { c.discordant = ''; c.eventInfo = ''; }
    if (!['binary','survival','count'].includes(c.outcome)) c.events = '';
    if (c.structure !== 'paired') { c.pairs = ''; c.discordant = ''; }
    if (c.structure !== 'clustered') c.clusters = '';
    if (!['repeated','clustered'].includes(c.structure)) c.effectScope = '';
    if (c.sampling !== 'survey') c.surveyBasis = '';
    return c;
  }
  function display(key,value) {
    if (blank(value)) return '待补充';
    const options=engine.labels[key] || extraLabels[key];
    return (options && Object.hasOwn(options,value) ? options[value] : '') || (key==='estimand' && Object.hasOwn(estimands,value) ? estimands[value].label : '') || value;
  }
  function recommend(input) {
    const c = normalize(input);
    const legacy = engine.recommend(c);
    const r = {...legacy, card:c, candidates:[], rationale:[], conditions:[], gaps:[], diagnostics:[], sources:[...legacy.sources]};
    let blocked = false;
    const gap = (field,reason,critical = false) => {
      if (!r.gaps.some(x=>x.field===field)) r.gaps.push({field,label:fields[field] || field,reason});
      if (critical) { blocked = true; r.level = 'incomplete'; }
      else if (r.level === 'candidate') r.level = 'review';
    };
    for (const key of ['question','population','outcomeName','outcomeUnit','timeOrigin','outcomeTime'])
      if (blank(c[key])) gap(key,'需由研究者提供定义，不能由软件或 AI 推测。');
    if (['compare','associate','causal'].includes(c.goal) && blank(c.comparator)) gap('comparator','说明组别、参考组或解释变量变化，以及方向。');
    for (const key of ['goal','design','sampling','outcome','structure'])
      if (!engine.labels[key]?.[c[key]] || c[key] === 'unknown') gap(key,'这是方法匹配的关键事实；未知时不采用普通独立样本方案。',true);
    const branchFields = c.goal==='compare' ? ['groups',...(c.outcome==='continuous' ? ['distribution'] : [])] : c.goal==='associate' ? ['predictor'] : [];
    for (const key of branchFields) if (!engine.labels[key]?.[c[key]]) gap(key,'当前目标需要这个分类；不能将留空解释为某种设计。',true);
    if (c.goal==='associate' && c.predictor==='unknown') gap('predictor','解释变量和参考尺度未确定。',true);
    if (!Object.hasOwn(extraLabels.unit,c.unit) || c.unit === 'unknown') gap('unit','明确独立对象；数据行、孔和重复读数不自动等于独立 n。',true);
    if (c.unit === 'other' && blank(c.unitDetail)) gap('unitDetail','说明其他单位及其独立性。',true);
    const target = Object.hasOwn(estimands,c.estimand) ? estimands[c.estimand] : undefined;
    if (!target || c.estimand === 'unknown') gap('estimand','先说明希望估计什么；不能默认均值差或 OR。',true);
    else if (!target.outcomes.includes(c.outcome) || !target.goals.includes(c.goal)) gap('estimand','目标量与研究目标 / 结局类型不匹配，请重新定义。',true);
    if (['other','distribution'].includes(c.estimand) && blank(c.estimandDetail)) gap('estimandDetail','这个选项尚未定义具体尺度、比较与解释。',true);
    if (c.estimand==='medianDifference' && blank(c.estimandDetail)) gap('estimandDetail','说明中位数还是哪个分位数，以及比较方向；不从秩检验推定分位数差。');
    if (!engine.labels.missing[c.missing] || c.missing === 'unknown') gap('missing','缺失尚未核查；不默认无缺失，不自动删行或填 0。',true);
    if (c.missing === 'some' && blank(c.missingBasis)) gap('missingBasis','记录变量级数量、原因、拟用处理与假设；有数据才可审计。');
    if (['compare','associate','causal'].includes(c.goal)) {
      if (!engine.labels.adjust[c.adjust] || c.adjust === 'unknown') gap('adjust','先讨论调整与否，不将未填写解释为不调整。',true);
      if (blank(c.adjustBasis)) gap('adjustBasis','说明方案或领域依据；不调整也需要理由。');
      if (c.adjust === 'yes' && (!Object.hasOwn(extraLabels.adjustBasisType,c.adjustBasisType) || c.adjustBasisType === 'unknown')) gap('adjustBasisType','补充预设方案、领域知识或因果结构依据。');
      if (c.adjustBasisType === 'univariate') gap('adjustBasisType','仅按单因素 P 值筛协变量不足以论证调整集，需重新讨论。');
    }
    const n = {};
    for (const key of counts) {
      if (blank(c[key])) continue;
      if (!/^\d+$/.test(c[key]) || !Number.isSafeInteger(Number(c[key])) || (Number(c[key]) === 0 && !['events','discordant'].includes(key)))
        gap(key,'请输入合理的整数计数；未知请留空，不可写负数、小数或非有限值。',true);
      else n[key] = Number(c[key]);
    }
    if (!n.sampleTotal && !(n.sampleA && n.sampleB) && !n.pairs) gap('sampleTotal','至少补充独立对象数、各组人数或完整配对数；这不是功效计算。');
    if (n.sampleTotal && n.sampleA && n.sampleB && n.sampleTotal !== n.sampleA+n.sampleB) gap('sampleTotal','总数与两组人数不一致；核查是否为同一分析人群。',true);
    const denominator = n.sampleTotal || (n.sampleA && n.sampleB ? n.sampleA+n.sampleB : undefined);
    if (n.events !== undefined && denominator && n.events > denominator && c.outcome !== 'count') gap('events','二分类 / 首次事件人数不能超过同一分析的对象数。',true);
    if (n.discordant !== undefined && n.pairs && n.discordant > n.pairs) gap('discordant','不一致配对数不能超过完整配对数。',true);
    if (c.outcome === 'binary' && c.structure === 'paired' && n.discordant === undefined) gap('discordant','McNemar 需要逐对表及不一致对，前后总阳性人数不能替代。');
    if (c.outcome==='binary' && (!Object.hasOwn(extraLabels.eventInfo,c.eventInfo) || c.eventInfo==='unknown')) gap('eventInfo','仍需查看逐组事件 / 非事件频数和模型分离；不能由总事件数证明不稀疏。');
    if (c.goal==='compare' && c.outcome==='continuous' && c.distribution==='unknown') gap('distribution','尚未查看图形、差值或异常值来源；不能由正态性 P 值独自决定方法。');
    if (['binary','survival'].includes(c.outcome) && n.events === undefined) gap('events','补充事件定义、数量和分母；总事件数也不能替代各单元格或模型信息。');
    if (c.structure === 'clustered' && !n.clusters) gap('clusters','说明中心 / 病区数及大小；对象总数不能替代独立聚类数。');
    if (['repeated','clustered'].includes(c.structure) && (!Object.hasOwn(extraLabels.effectScope,c.effectScope) || c.effectScope==='unknown')) gap('effectScope','混合模型与 GEE 的解释可能不同，先确定条件效应 / 人群平均效应。');
    if (c.sampling === 'survey' && blank(c.surveyBasis)) gap('surveyBasis','记录组件权重、分层、PSU、跨周期与 domain；未填写不代表已核查。');
    if (c.goal === 'predict') {
      if (blank(c.predictionTime)) gap('predictionTime','明确在哪个时点预测及当时能获得哪些信息，避免结局后信息泄漏。',true);
      if (blank(c.predictionHorizon)) gap('predictionHorizon','明确预测未来多长时间及结局定义，不能只挑算法。',true);
      r.sources.push('tripod');
    }
    if (c.design === 'casecontrol' && ['riskDifference','riskRatio'].includes(c.estimand)) gap('estimand','病例对照抽样比例不能直接给总体风险差或 RR；需要额外设计信息与专门估计。',true);
    if (c.structure==='paired' && c.goal==='compare' && c.groups==='multi') gap('structure','配对通常指两个条件；多条件对象内比较请明确重复测量结构、时点和预定对比，不能使用普通独立多组 ANOVA。',true);
    r.target = target && c.estimand !== 'unknown' ? target.label+(c.estimandDetail ? '；'+c.estimandDetail : '') : '待补充';
    r.rationale = [
      {fact:'目标：'+display('goal',c.goal)+'；目标量：'+r.target, implication:'按所要估计的量匹配方法，不以显著性或软件名称代替目标。'},
      {fact:'分析单位：'+display('unit',c.unit)+'；结构：'+display('structure',c.structure), implication:c.structure==='independent' ? '独立性是研究者填写的条件，尚未由数据或本页验证。' : '需要保留配对、对象或中心标识；未知时不采用独立样本计算。'},
      {fact:'抽样：'+display('sampling',c.sampling), implication:c.sampling==='survey' ? '估计和方差需尊重权重、分层、PSU 与 domain；普通检验不能直接替代。' : c.sampling==='simple' ? '这是用户声明；仍需从数据来源核查无复杂抽样。' : '抽样待核查，不默认为常规样本。'},
      ...(['compare','associate','causal'].includes(c.goal) ? [{fact:'调整：'+display('adjust',c.adjust)+'；依据：'+display('adjustBasis',c.adjustBasis), implication:'按预设方案和研究结构论证调整集，不仅按单因素 P 值筛选。'}] : [])
    ];
    r.conditions = ['研究对象、结局定义、时间点及比较方向与目标量一致。','分析单位和抽样结构已由研究者核查，不能靠统计 P 值证明。','说明缺失、样本信息量与模型假设；候选名称不代表条件已满足。'];
    r.diagnostics = ['先核对变量字典、单位、重复 ID、各变量分母、缺失及排除流程。','画出与目标和结构对应的图形，核查极端值来源；不按正态性 P 值自动换方法。'];
    if (c.structure==='paired') r.diagnostics.push('核对一一配对与完整对数；连续结局看逐对差值，二分类看不一致对。');
    if (['repeated','clustered'].includes(c.structure)) r.diagnostics.push('核对对象 / 中心 / 时间标识、相关结构、聚类数与收敛；比较模型假设的敏感性。');
    if (c.structure==='repeated') {
      r.diagnostics.push('独立样本量按对象计，访视行数另列；核查计划访视缺席与已到访记录中的变量缺失，不能把缺席填为结局 0。');
      r.diagnostics.push('核对时间起点、计划时点与实际日期；预设时间按类别还是连续值建模、参考时点与比较方向；多时点 / 多结局需说明多重性。');
      r.report.push('各时点对象数、对象内重复记录数、失访 / 变量缺失处理与假设');
    }
    if (['repeated','clustered'].includes(c.structure) && c.estimand==='oddsRatio') {
      r.diagnostics.push('Logistic 混合模型的条件 OR 与 GEE 的人群平均 OR 不可互换；OR 不是 RR 或 HR。检查分离、随机效应、奇异拟合、梯度与区间算法。');
      r.sources.push('glmm');
    }
    if (c.sampling==='survey') r.diagnostics.push('检查权重适用组件、分层和 PSU、设计自由度、孤立 PSU、domain 与跨周期规则。');
    if (c.outcome==='binary') r.diagnostics.push('查看逐组事件与非事件频数、稀疏单元格、分离和不稳定区间；不以总事件数判定模型充分。');
    if (c.outcome==='continuous' && (c.adjust==='yes' || c.goal==='associate')) r.diagnostics.push('若使用线性模型，检查关系形状、残差、异方差、杠杆与影响点；不要要求所有变量正态。');
    if (c.outcome==='survival') r.diagnostics.push('检查随访起点、删失与在险人数、竞争事件；Cox 需检查比例风险。');
    if (c.outcome==='count') r.diagnostics.push('核查暴露时间 offset、过度离散与零值机制；重复事件不能作为独立患者。');
    if (c.goal==='predict') r.diagnostics.push('先确定按对象 / 中心 / 时间的验证划分；预处理只在训练数据拟合，评价校准、区分度及不确定性。');
    r.report = [...r.report,'研究人群、结局单位 / 时点、目标量、比较方向和参考组','每项分析的人数 / 事件 / 完整对 / 聚类数与缺失依据','候选选择依据、诊断的实际执行状态、敏感性与剩余缺口','代码 / 数据 / 软件版本、AI 使用及研究团队审核状态'];
    const add = (name,targetText = r.target,why = legacy.reason,conditions = []) => r.candidates.push({name,target:targetText,why,conditions:[...r.conditions,...conditions],diagnostics:[...r.diagnostics],sources:[...new Set(r.sources)]});
    if (!blocked && legacy.methods.length) {
      if (['other','distribution'].includes(c.estimand)) {
        add('依据已定义的尺度另设方案；需进一步专业讨论'); r.level='review';
      } else if (c.goal==='predict' || c.goal==='causal') legacy.methods.forEach(x=>add(x));
      else if (c.goal==='describe') {
        legacy.methods.forEach(x=>add(x,r.target,legacy.reason,['描述的区间也需处理抽样与相关结构；不自动转为关联或差异模型。']));
      }
      else if (c.sampling==='survey' && c.structure!=='independent') {
        const scope = ['repeated','clustered'].includes(c.structure) ? '；'+display('effectScope',c.effectScope) : '；配对目标需明确';
        add('同时尊重复杂抽样与'+display('structure',c.structure)+'的专门方案（待论证）',r.target+scope,'普通调查加权模型或普通混合模型都不能自动处理这两种结构；保留指定目标量和效应层次。',['需论证权重进入哪一层、相关结构与方差估计；没有已实现的通用拟合方案。']);
        r.level='review';
      } else if (c.sampling==='survey') {
        const name = c.estimand==='oddsRatio' ? '调查加权 Logistic（OR）；先明确公式与参考组' : ['riskDifference','riskRatio'].includes(c.estimand) ? '尊重调查设计的二项模型 / 标准化风险估计（明确 RD 或 RR）' : c.estimand==='medianDifference' ? '尊重调查设计的分位数方案；需另行论证' : c.estimand==='correlation' ? '尊重调查设计的相关系数估计与方差；先明确 Pearson / 秩相关' : c.estimand==='survivalProbability' ? '调查设计兼容的生存概率估计 / 标准化指定时点对比' : c.estimand==='hazardRatio' ? '调查加权事件时间模型（HR）；检查设计与比例风险' : legacy.methods[0];
        add(name); r.level='review';
      } else if (['repeated','clustered'].includes(c.structure)) {
        if (c.estimand==='medianDifference') add('处理相关结构的分位数方案；需另行论证');
        else if (c.estimand==='correlation') add('处理重复 / 聚类的相关系数方案；须定义对象内或对象间关联',r.target,'不能把所有行当独立，也不能把 GEE 回归系数直接当相关系数。');
        else if (c.outcome==='survival') add(c.estimand==='hazardRatio' ? '处理相关事件时间的 HR 模型；区分 frailty 与稳健方差的解释' : '处理相关结构的生存概率估计 / 指定时点标准化对比',r.target,'HR 模型与固定时点概率不是同一目标；区间还需处理对象或中心相关性。');
        else if (c.outcome==='binary' && c.estimand==='oddsRatio' && c.effectScope==='conditional') {
          add('Logistic 混合模型：条件 OR，指定随机效应',r.target+'；个体 / 中心条件效应','已指定条件 OR；普通 GEE 的人群平均 OR 不能直接回答同一量。',['随机效应分布、收敛、稀疏性和缺失假设需核查。']);
        } else if (c.outcome==='binary' && c.estimand==='oddsRatio' && c.effectScope==='marginal') {
          add('GEE：Logit 链接的人群平均 OR',r.target+'；人群平均效应','已指定边际 OR；需适合对象数的方差及缺失处理。');
          add('Logistic 混合模型后积分 / 标准化的边际对比（需专门论证）',r.target+'；经边际化的对比','不能直接指数化混合模型系数作为边际 OR。',['须明确目标人群、随机效应积分 / 标准化方法与不确定性。']);
        } else {
          add('混合模型：指定分布、链接与随机效应', r.target+'；须定义条件效应或模型对应的边际对比');
          add('GEE：指定分布、链接与工作相关结构', r.target+'；人群平均效应及适合设计的方差');
        }
        r.level='review';
      } else if (c.estimand==='medianDifference') {
        add('指定分位数的估计 / 分位数模型；配对时需保留相关结构',r.target,'中位数差不能用一般秩检验自动替代。',['需另外论证估计、区间与抽样条件；不是已经实现的计算方案。']); r.level='review';
      } else if (c.estimand==='correlation') {
        r.sources.push('correlation');
        add('Pearson 相关', '线性相关系数','需要先明确线性关系、独立性和异常值条件。');
        add('Spearman 秩相关', '秩的单调关联','它与 Pearson 的目标不同，需根据问题确定。'); r.level='review';
      } else if (c.outcome==='binary' && c.structure==='paired' && c.goal==='compare' && c.groups==='two' && c.adjust==='no') {
        if (c.estimand==='riskDifference') {
          add('配对比例差及 CI（使用逐对表）');
          add('McNemar；稀疏不一致对时讨论精确形式','检验配对边际比例相等；比例差和 CI 需另估计');
        } else {
          add('配对 / 条件二项模型；明确所要估计的配对 OR 或 RR',r.target,'相关二分类需要专门定义目标，不能套独立 2×2 表。'); r.level='review';
        }
      } else if (c.outcome==='survival') {
        if (c.estimand==='hazardRatio') add('Cox 或与设计匹配的事件时间模型（HR）',r.target,'目标是风险率比；先核查比例风险、删失及调整依据。',c.structure==='paired' ? ['匹配或配对需适合来源的分层 / 相关结构处理；不能用普通独立 Cox 替代。'] : []);
        else add('Kaplan–Meier / 合适的生存概率模型与指定时点对比',r.target,'目标是生存概率，不把 HR 当成固定时点风险比。',c.structure==='paired' ? ['配对差异的区间需保留配对；普通两独立组区间不能直接替代。'] : []);
        r.level='review';
      } else if (c.outcome==='binary' && c.structure==='paired') {
        add('尊重配对 / 匹配结构的二项方案，按目标量定义参数',r.target,'关联、调整或多条件配对不能直接用两条件 McNemar 或普通独立 Logistic。'); r.level='review';
      } else if (c.outcome==='binary') {
        if (c.estimand==='oddsRatio') {
          if (c.adjust==='no' && c.goal==='compare' && c.groups==='two') add('独立 2×2 优势比与 CI（固定估计和区间方法）');
          add('Logistic 模型（OR）；明确公式、参考组与调整集');
          if (c.eventInfo==='sparse' && c.adjust==='no' && c.goal==='compare' && c.groups==='two') add('Fisher 精确检验与条件 OR 区间','固定边际条件下的 OR / 零关联检验；估计定义可能不同');
        } else {
          add('目标量对应的二项模型 / 标准化风险估计（明确 RD 或 RR）');
          if (c.adjust==='no' && c.goal==='compare' && c.groups==='two') add('直接估计两组风险及风险差 / 风险比与 CI',r.target,'需要固定时点、可解释的分母与相应抽样设计。');
          r.level='review';
        }
      } else if (c.outcome==='continuous' && c.estimand==='meanDifference' && c.goal==='compare' && c.adjust==='no') {
        if (c.groups==='two') {
          add(c.structure==='paired' ? '配对 t 检验及逐对均值差 CI' : '双侧 Welch t 检验及均值差 CI');
          add(c.structure==='paired' ? '保留配对的稳健 / 重采样均值差方案（需论证）' : '稳健 / 重采样均值差方案（需论证）',r.target,'仍以均值差为目标；偏态不自动改成秩或中位数目标。',['小样本、重尾和重采样有效性需另行评估。']);
        } else add('多组均值模型 / ANOVA / Welch ANOVA 与预定均值对比');
      } else legacy.methods.filter(x=> !/秩|Wilcoxon|Kruskal|Pearson|Spearman/.test(x)).forEach(x=>add(x));
    }
    if (c.eventInfo==='sparse' || (['binary','survival'].includes(c.outcome) && n.events===0) || (c.outcome==='binary' && denominator && n.events===denominator) || (c.structure==='paired' && n.discordant===0)) {
      if (r.level!=='incomplete') r.level='review';
      r.conditions.push('存在稀疏 / 零事件 / 无不一致对线索，需检查估计可识别性与区间；不直接套常规 Wald 输出。');
      r.checks.push('稀疏或分离风险：核查单元格和模型，讨论与目标量及设计兼容的精确 / 惩罚方案；不自动认定 Fisher 或 Logistic 合适。');
    }
    if (blocked || !legacy.methods.length) {
      r.candidates=[]; r.methods=[]; r.title='信息不足或目标不匹配：先补充研究卡片';
      r.reason='关键设计或目标未确定，尚不能匹配分析方案。保留待补充，不推测独立性、普通抽样或目标量。';
    } else { r.methods=r.candidates.map(x=>x.name); r.title='候选方案：'+r.target; }
    r.checks=[...r.gaps.map(x=>`待补充：${x.label} — ${x.reason}`),...r.checks];
    r.sources=[...new Set(r.sources)];
    // Update after sparse checks / gaps so every candidate carries the full conditions.
    for (const candidate of r.candidates) { candidate.conditions=[...new Set([...candidate.conditions,...r.conditions])]; candidate.sources=r.sources; }
    return r;
  }
  function activeFields(c) {
    return Object.keys(fields).filter(k=> !(['groups'].includes(k) && c.goal!=='compare') && !(k==='predictor' && c.goal!=='associate') && !(['adjust','adjustBasis','adjustBasisType'].includes(k) && !['compare','associate','causal'].includes(c.goal)) && !(k==='distribution' && !(c.goal==='compare' && c.outcome==='continuous')) && !(['predictionTime','predictionHorizon'].includes(k) && c.goal!=='predict') && !(['pairs','discordant'].includes(k) && c.structure!=='paired') && !(k==='discordant' && c.outcome!=='binary') && !(k==='eventInfo' && c.outcome!=='binary') && !(k==='events' && !['binary','survival','count'].includes(c.outcome)) && !(k==='clusters' && c.structure!=='clustered') && !(k==='effectScope' && !['repeated','clustered'].includes(c.structure)) && !(k==='surveyBasis' && c.sampling!=='survey') && !(k==='estimandDetail' && !['other','distribution','medianDifference'].includes(c.estimand)));
  }
  function cardLines(c) { return activeFields(c).map(k=>`- ${fields[k]}：${display(k,c[k])}`); }
  function toMarkdown(input,result = recommend(input)) {
    const r=result;
    const list=xs=>xs.map(x=>'- '+x).join('\n') || '- 待补充';
    return '# 研究卡片与方法讨论草案 v2.2\n\n状态：用户填写 + 本地教学规则；未分析数据、未核验事实，待研究团队审核。\n\n## 研究卡片\n\n'+cardLines(r.card).join('\n')+'\n\n## 候选及回答的量\n\n'+(r.candidates.map(x=>`### ${x.name}\n\n目标：${x.target}\n\n选择依据：${x.why}\n\n适用条件：\n${list(x.conditions)}`).join('\n\n') || '待补充关键事实，尚无匹配方案。')+'\n\n## 选择依据\n\n'+list(r.rationale.map(x=>x.fact+' → '+x.implication))+'\n\n## 待补充\n\n'+(list(r.gaps.map(x=>x.label+'：'+x.reason)))+'\n\n## 诊断步骤（未执行）\n\n'+list(r.diagnostics)+'\n\n## 报告要求\n\n'+list(r.report)+'\n\n## 来源\n\n'+list(r.sources.map(k=>'['+sources[k][0]+']('+sources[k][1]+')'))+'\n\n工程检查、数值复现、方法学评价、AI 测评和真人试用分别记录；本草案不表示任何一种验证已完成。\n';
  }
  function makePrompt(input,result = recommend(input)) {
    return '请作为医学统计学习助手，只依据以下研究卡片。先核查缺口，不编造事实、文献或数值；不要追逐显著性。\n\n'+toMarkdown(input,result)+'\n请比较候选是否回答所填目标量，保留不同目标的差别；先问待补充信息，解释独立 / 配对 / 抽样结构、缺失和调整依据。给出可核查来源及使用模拟数据的教学代码。不要直接分析真实患者数据，不按正态性 P 值自动换方法，不仅按单因素 P 值筛协变量。标明哪些条件、诊断和结果仍未经核查。';
  }
  const shared={question:'在教学条件下，比较 A 与 B 的固定时点结局。',population:'人为构造对象；无真实患者',comparator:'A 相对于 B，方向 A−B',outcomeName:'教学连续数值（无临床单位）',outcomeUnit:'未赋予临床单位',goal:'compare',design:'other',sampling:'simple',outcome:'continuous',estimand:'meanDifference',unit:'person',structure:'independent',groups:'two',adjust:'no',adjustBasis:'预定未调整均值差，仅用于教学；不是实际试验。',missing:'none',distribution:'approx',sampleA:'12',sampleB:'12',timeOrigin:'模拟起点',outcomeTime:'预定一次测量'};
  const examples={
    means:shared,
    paired:{...shared,question:'同一模拟对象前后阳性比例怎样变化？',comparator:'后相对于前',outcomeName:'阳性 / 阴性',outcomeUnit:'0=阴性，1=阳性（教学）',outcome:'binary',estimand:'riskDifference',structure:'paired',sampleA:'',sampleB:'',pairs:'20',sampleTotal:'20',events:'',discordant:'',distribution:'',adjustBasis:'假设的预设未调整配对比例差，仅用于讨论；仍需逐对资料。',timeOrigin:'干预前（假设）',outcomeTime:''},
    survival:{...shared,question:'模拟两组的事件时间关联如何描述？',comparator:'A 相对于 B 的风险率；非固定时点风险比',outcomeName:'首次事件时间与删失',outcomeUnit:'',outcome:'survival',estimand:'hazardRatio',sampleA:'',sampleB:'',sampleTotal:'',events:'',distribution:'',missing:'unknown',adjust:'yes',adjustBasis:'',timeOrigin:'',outcomeTime:''},
    survey:{...shared,question:'公共调查中的教育水平与屈光度如何关联？',population:'NHANES 1999–2008 分析人群，纳排见原文',comparator:'各教育组相对于未到九年级',outcomeName:'右眼球镜等效，屈光度 D',outcomeUnit:'D（屈光度）',goal:'associate',design:'cross',outcome:'continuous',estimand:'coefficient',sampling:'survey',predictor:'categorical',adjust:'yes',adjustBasisType:'plan',adjustBasis:'按论文选定模型调整年龄、性别、调查周期；不表示调整充分。',missing:'some',missingBasis:'保留论文完整病例与手术排除顺序；详见 v2.1',sampleA:'',sampleB:'',sampleTotal:'19756',timeOrigin:'调查检查',outcomeTime:'横断面检查',surveyBasis:'MEC 跨周期权重；SDMVSTRA / SDMVPSU；domain 差异另存 v2.1'}
  };
  root.StudyCard={fields,estimands,sources,normalize,recommend,toMarkdown,makePrompt,examples,display,activeFields};
  if (typeof module!=='undefined' && module.exports) module.exports=root.StudyCard;
})(typeof globalThis!=='undefined' ? globalThis : this);
