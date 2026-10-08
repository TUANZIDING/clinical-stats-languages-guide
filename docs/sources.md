# 来源、核查状态与适用范围

核查日期：2026-10-08。以下使用原始指南、官方软件文档和官方机构页面，不引用搜索结果摘要作为独立证据。链接的资料可能更新。

## 研究原则与 AI

| 来源 | 本项目使用的范围 | 不代表什么 |
|---|---|---|
| [SAMPL 医学统计报告指南](https://www.equator-network.org/wp-content/uploads/2013/07/SAMPL-Guidelines-6-27-13.pdf) | 具体方法、效应量、CI 与足够复核的信息 | 不是所有研究设计的完整选方法手册 |
| [ASA 2016 P 值声明发布材料](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf) | P 值不能衡量效应大小、重要性或原假设真概率 | 不支持“所有 P 值都没用” |
| [WHO 2024 生成式 AI 指南说明](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models) | 错误、不完整信息和自动化偏见风险 | 没有验证本项目 AI 模板的准确率 |
| [scikit-learn 常见陷阱](https://scikit-learn.org/stable/common_pitfalls.html) | 预处理、训练/测试划分、数据泄漏 | 不是完整的医学预测研究报告指南 |

## 基础方法与模型实现

| 来源 | 支持的内容 |
|---|---|
| [NIST 两样本 t 检验](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm) | 两独立样本、配对、方差与 Welch-Satterthwaite 公式 |
| [NIST 配对观测分析](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm) | 先计算逐对差值再分析的结构 |
| [R t.test](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html) | 默认方差设定、配对与输出 |
| [SciPy ttest_ind](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html) | Welch 参数、默认等方差、CI 与自由度 |
| [R oneway.test](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/oneway.test.html) | 多独立组均值比较与方差选项 |
| [R Wilcoxon](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/wilcox.test.html) | 秩和/符号秩方法、位置解释与额外条件 |
| [R Kruskal–Wallis](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/kruskal.test.html) | 多组秩比较 |
| [R Fisher](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/fisher.test.html) | 列联表精确检验与 2×2 参数 |
| [R McNemar](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/mcnemar.test.html) | 配对分类、对称性与连续性校正 |
| [R GLM](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/glm.html) | 按结局分布与链接函数定义广义线性模型 |
| [R survival Cox](https://stat.ethz.ch/R-manual/R-devel/library/survival/html/coxph.html) | 事件时间回归与相关/稳健方差等实现 |
| [statsmodels GEE](https://www.statsmodels.org/stable/gee.html) | 聚类、重复测量与相关结构建模 |
| [R MASS polr](https://stat.ethz.ch/R-manual/R-devel/library/MASS/html/polr.html) | 有序 Logistic/Probit 与比例优势结构 |
| [R MASS glm.nb](https://stat.ethz.ch/R-manual/R-devel/library/MASS/html/glm.nb.html) | 负二项模型及暴露 offset |
| [R nnet multinom](https://stat.ethz.ch/R-manual/R-devel/library/nnet/html/multinom.html) | 无序多分类的多项模型 |
| [R survival survfit](https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit.html) | 生存曲线描述 |
| [R cor.test](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/cor.test.html) | Pearson/Spearman/Kendall 相关分析 |
| [R chisq.test](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/chisq.test.html) | 列联表卡方与期望频数 |

这些是方法定义与实现依据。向导没有读取数据，也没有检验任何模型假设；简化路径不能覆盖专门的抽样、匹配、竞争风险、复杂因果设计或临床试验方案。

## 软件与代码

| 来源 | 使用范围 |
|---|---|
| [R 官方介绍](https://www.r-project.org/about.html) | 统计计算、图形、免费软件与可扩展环境 |
| [Python 官方介绍](https://www.python.org/doc/essays/blurb/) | 通用高级编程语言的角色 |
| [jamovi 官方介绍](https://www.jamovi.org/) | 图形界面、基于 R、免费开源桌面工具 |
| [IBM SPSS 官方入口](https://www.ibm.com/products/spss-statistics) | 商业统计软件角色；不提供价格比较 |
| [IBM SPSS 界面与语法说明](https://www.ibm.com/docs/en/SSLVMB_28.0.0/pdf/IBM_SPSS_Statistics_Programmability_Extension_Developer_Guide_Windows.pdf) | GUI 与语法并存的基础角色，旧版说明不表示最新版功能全貌 |
| [SAS OnDemand](https://www.sas.com/en_us/software/on-demand-for-academics.html) | 免费学习入口，使用仍受当前条款约束 |
| [SAS PROC TTEST 参数](https://support.sas.com/documentation/cdl/en/statug/63033/HTML/default/statug_ttest_sect002.htm) | ORDER、SIDES、ALPHA 与 Pooled/Satterthwaite 输出；旧版参数手册，无本地 SAS 执行 |
| [Boost Math Student t 分布](https://live.boost.org/doc/libs/1_51_0/libs/math/doc/sf_and_dist/html/math_toolkit/dist/dist_ref/dists/students_t_dist.html) | C++ 可计算 t 分布概率和分位数；版本示例不是最新版本声明 |

“先用菜单入门，再按任务学 R/Python/SAS”的路线是本项目依据工具角色提出的建议。没有软件易用性评分、学习时间试验、语言优越性或“最强”结论。

## 项目事实边界

- 只使用用户提供的 Hark 对话截图作为项目需求背景；没有下载或验证 Hark 声称生成的 ZIP，没有复用其中未见到的图表或代码。
- 已主动修正“R 对所有人最友好”“C++ 算不出 P 值”和固定代码行数排名等不可靠表述。
- 数据为本项目人为构造，图表为原创代码生成。图示流程是概念示意，不是测量的性能。
- AI 提问模板与规则向导是教学设计，没有接入 AI 模型，没有真实数据上传，没有测量选法准确率。
- 实际运行与未运行的项目见 [VALIDATION.md](../VALIDATION.md)。没有远端 CI 或 Pages 成功的证据之前，不声称已发布。
