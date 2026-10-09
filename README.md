# 医学科研统计选择指南

**从研究问题出发，选择统计方法、学习工具与 AI 协作方式。**

[公开仓库](https://github.com/TUANZIDING/clinical-stats-languages-guide) · [自动检查记录](https://github.com/TUANZIDING/clinical-stats-languages-guide/actions/workflows/checks.yml)

![医学统计学习实验室：问题、设计、方法、复现](docs/assets/cover.svg)

面向没有编程基础的临床科研人员。你不需要先成为程序员，但需要说清楚：研究对象是谁、比较什么、每一行代表什么、希望估计什么。

本项目包含中文图文教程、离线交互式选择向导、AI 提问模板，以及使用同一份**人为构造教学数据**的 R / Python / SAS / C++ 示例。v2.0 增加含缺失值的模拟临床案例、Table 1、分布诊断、效应与 CI、可复现报告和第三方工具适配。它帮助形成可讨论的统计分析草案；正式研究需要结合完整方案、数据质量与统计专业意见。

**v2.1 加入发表论文验证**：[3 篇 PubMed 论文、全文/作者代码/公共数据入口](docs/论文验证v2.1.md)，以及一篇 NHANES 论文的限定实际复现。72 个选定对照点在原文区间算法与舍入范围内一致；当前软件默认区间的差异单列记录。向导补上复杂抽样设计。不是全论文复现、AI 正确率测评或统计专家认证。

**v2.2（2.2.0）**：研究卡片说明目标量、结构、条件和缺口；统一结果来源连接表、图与结果文字；三层教学路径包含四个案例及八个判断练习。新增 [六列案例验证状态](docs/案例验证状态v2.2.md)与[综合核查、修复和限制](docs/综合核查v2.2.md)。[发布前验收记录](验证记录v2.2.md)保留当时状态；合并与部署进展以[升级 PR](https://github.com/TUANZIDING/clinical-stats-languages-guide/pulls)和[自动检查 / 部署](https://github.com/TUANZIDING/clinical-stats-languages-guide/actions)为准。

- [研究卡片与方法依据](docs/研究卡片说明v2.2.md)：未知项保留待补充；复杂抽样与相关结构交叉时需专门论证。
- [统一结果、targets 流水线与环境恢复](docs/结果对象与复现v2.2.md)：离线快查核对保存对象，实际重跑另有明确入口。
- [medplot 重复随访案例](docs/纵向论文验证v2.2.md)：**22/27 一致、5 项差异**；保留正文 / SI 冲突、原始连续函数失败与兼容运行。不是整篇论文复现。
- [三层教学与八个判断练习](docs/教学路径v2.2.md)：从理解到模拟实操，再到公开论文限定复现；[可计算 HTML 示范](docs/计算报告示范v2.2.html)用实际 R 重算核对网页来源。

## 先用起来

1. 双击 [docs/index.html](docs/index.html)，即可离线浏览和使用选择向导，无需安装依赖。
2. 或在项目根目录运行 `python3 -m http.server 8765 --directory docs`，打开 `http://localhost:8765`。
3. 从网页“学习路径”或[三层任务说明](docs/教学路径v2.2.md)开始；按需参考[统计方法怎么选](docs/method-guide.md)、[软件与语言怎么选](docs/software-guide.md)和[用 AI 辅助选择](docs/ai-workflow.md)。

网页没有数据上传、AI API、追踪脚本或外部字体；“生成提问”生成的是需要手动复制的文本。研究描述仍可能包含敏感信息，使用外部 AI 前请按所在机构要求审查。

## 你会学到什么

| 你的问题 | 在哪里找答案 |
|---|---|
| 我应该用 t 检验、卡方还是回归？ | [方法指南](docs/method-guide.md)及网页交互向导 |
| 零编程基础能做统计吗？ | [软件选择指南](docs/software-guide.md) |
| AI 能替我选统计方法吗？ | [AI 协作流程](docs/ai-workflow.md)和[提问模板](templates/ai-statistics-prompt.md) |
| 同一个分析在不同语言里是什么样？ | [可运行示例说明](examples/README.md) |
| 结果怎么看，怎么写进论文？ | [教学案例](docs/worked-example.md)和[分析计划模板](templates/analysis-plan.md) |
| 如何检查 Table 1、缺失、CI 和图注？ | [v2.0 实操](docs/临床统计实操v2.0.md)及[报告核对](docs/统计报告核对v2.0.md) |
| 用 AI / Codex 核查分析与报告？ | [v2.0 核查提示词](templates/统计核查提示词v2.0.md) |
| 怎样分层练习，判断常见统计错误？ | [v2.2 教学路径与逐选项反馈](docs/教学路径v2.2.md) |
| 怎样真正重算一个小型报告？ | [独立计算示范](docs/计算报告示范v2.2.html)，命令 `npm run replay:teaching-report` |
| 有哪些相关 GitHub 项目可以学习？ | [12 个项目导航与使用边界](docs/相关项目导航v2.0.md) |
| 这些说法有什么依据？ | [来源与适用范围](docs/sources.md) |
| 如何用真实已发表论文检验这个项目？ | [v2.1 论文验证](docs/论文验证v2.1.md)与[论文核查提示词](templates/论文核查提示词v2.1.md) |

## 选方法的五个步骤

![医学统计方法选择流程](docs/assets/method-flow.svg)

1. **确定问题和目标量**：描述、比较、关联、预测还是因果？要估计均值差、风险差、优势比，还是其他量？
2. **看设计和分析单位**：独立患者、同一患者前后、反复测量，还是多中心聚类？数据行数不等于独立样本量。
3. **看结局类型**：连续数值、二分类、无序多分类、有序等级、计数、事件时间。
4. **检查条件和信息缺口**：分布、异常值、缺失、事件数、混杂、删失、模型假设和多重比较。
5. **预先确定并复现**：写下主分析与敏感性分析，报告效应量和置信区间，保存代码、版本与日志。[SAMPL 指南](https://www.equator-network.org/wp-content/uploads/2013/07/SAMPL-Guidelines-6-27-13.pdf)

## 软件选择：按任务和团队条件判断

| 起点或任务 | 可以考虑的工具 | 选择理由 |
|---|---|---|
| 先理解统计、不想写代码 | jamovi / 已有许可的 SPSS | 菜单操作能降低初始操作门槛；仍需理解设计与假设 |
| 愿意学一点代码，做常规医学统计与复现 | R | 免费，围绕统计计算与图形构建的生态 |
| 影像、机器学习、批量处理、自动化 | Python | 通用语言，有统计与机器学习库；传统推断也能完成 |
| 团队使用 SAS，课程或项目需要衔接 | SAS | 跟随团队的程序、验证与交付规范更实用 |
| 开发高性能算法或底层软件 | C++ | 能进行统计计算，通常不是医学初学者的第一站 |

这是**本项目的教学建议**，不是实测软件排行榜。R 并非对所有初学者最容易；Python 不仅能做 AI；SAS 不只支持手写代码；C++ 借助数学库也能计算 P 值。代码行数不能衡量分析是否正确、易学或合规。[R 官方介绍](https://www.r-project.org/about.html)、[jamovi 官方介绍](https://www.jamovi.org/)、[Python 官方介绍](https://www.python.org/doc/essays/blurb/)、[SAS 学习入口](https://www.sas.com/en_us/software/on-demand-for-academics.html)、[Boost Math 文档](https://live.boost.org/doc/libs/1_51_0/libs/math/doc/sf_and_dist/html/math_toolkit/dist/dist_ref/dists/students_t_dist.html)

## AI 可以协助，但输出需要核查

把去标识化的**研究设计和变量字典**交给 AI，要求它先问缺失信息，再给出候选方法、适用条件、效应量、诊断步骤与可核查来源。随后用模拟数据运行代码，核对参数与结果，交由研究团队确认分析计划。WHO 提醒，生成式 AI 可能给出错误、不完整或带偏见的信息；“回答很流畅”不能作为统计正确性的证据。[WHO 指南说明](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models)

## 一个可复现的小案例

![模拟教学数据和均值差置信区间](docs/assets/welch-demo.png)

两组各 12 个独立的**模拟**观测，用双侧 Welch t 检验估计 A−B 均值差。数值由代码实际计算；它们不是患者结果，也不证明任何疗效。见[案例解释](docs/worked-example.md)。

## 项目结构

```text
docs/           离线网页、教程、来源、统计图
examples/       同一教学数据的四种语言示例
data/           人为构造数据、变量字典、发表论文目标及汇总快照
templates/      AI 提问、分析计划和结果报告模板
scripts/        图表重建、项目检查与结果一致性核查
tests/          向导关键分支与信息不足保护检查
.github/        自动检查流程、GitHub Pages 手动发布流程
```

## v2.0：从模拟数据到统计报告

![96 个独立模拟对象的随访结局与原始单位均值差](docs/assets/clinical-effectv2.0.png)

- **Table 1**：96 个独立模拟对象，A / B 各 48 个；每个变量注明已知 n、缺失 n，类别百分比分母明确。基线与随访分开，默认不加 P 值。[离线基线表](docs/assets/table-onev2.0.html)
- **分布与方差检查**：Q–Q 图、偏态 CRP 分布、Shapiro–Wilk 与中位数 Levene 输出，用于诊断讨论，不按 P 值自动切换方法。Welch 不要求等方差。[实操说明](docs/临床统计实操v2.0.md)
- **结果与报告**：主要结局已知 n=45 / 43；实际计算 A−B 均值差 9.03 mmHg，95% CI [2.53, 15.53]。可下载方法、结果、图注和 CSV，附数据 SHA-256 和版本信息。数值只解释模拟计算。[报告草稿](docs/assets/clinical-reportv2.0.md)
- **工具与 AI**：可选 gtsummary 表格、ggstatsplot 注释图；核对第三方图内统计，不把标准化效应 CI 当成原始单位 CI。提供有信息缺口保护的核查提示词和 12 个资源入口。

在项目根目录运行：

```sh
python3 -m pip install -r requirements.txt
python3 scripts/clinical-reportv2.0.py
python3 tests/clinical-reportv2.0.py
```

数值核对需要 R；可选包安装与导出命令见 [实操说明](docs/临床统计实操v2.0.md)。原 24 行四语言示例保留。新增文件遵守“名称 + 版本 + 扩展名、无下划线”规则；既有名称保留。

## 维护与发布

本轮检查使用 Node ≥18、Python **3.12**；完整重跑另需 R **4.5.2** 与锁定依赖。浏览离线网页不要求这些运行时。运行 `npm run check:offline` 检查规则、结果契约、保存产物、本地链接和新增命名；它不拟合模型。实际计算入口分别见 [统一流水线](docs/结果对象与复现v2.2.md)、`npm run replay:longitudinal` 和 `npm run replay:teaching-report`。历史示例与图表命令保留在 [examples/README.md](examples/README.md)。

项目已按仓库所有者确认的范围上传为公开仓库。GitHub Pages 使用手动工作流发布 `docs/`；普通代码推送不自动部署。具体步骤见 [发布说明](docs/publishing.md)。

内容核查日期：**2026-10-09**。已实际重算两篇已发表论文的限定公共数据分析；另两篇仍处于材料 / 方法情境核查。所有论文均未完成整篇重跑，独立统计专家审阅、AI 测评和真人学习效果试验仍待核查。本项目没有分析用户的私人患者或未发表研究数据。当前执行状态见 [v2.2 记录](验证记录v2.2.md)和[案例状态表](docs/案例验证状态v2.2.md)；[v1](VALIDATION.md)与[v2.0](验证记录v2.0.md)记录仅说明当时范围。

代码与本项目原创文字、图表采用 [MIT 许可证](LICENSE)；链接的第三方材料遵循各自条款。欢迎提出带设计背景和可核查依据的改进建议。
