<p align="center"><img src="docs/assets/cover.svg" width="100%" alt="医学统计学习实验室：研究问题、设计、方法与复现的概念图"></p>

<h1 align="center">医学科研统计选择指南 · Clinical Statistics Guide</h1>

<p align="center"><strong>说明选择依据，复算结果，识别待核查信息。</strong><br>Explain method choices, reproduce results, and identify what still needs checking.</p>

<p align="center">面向零编程基础临床科研人员的中文离线图文教学与统计选择草案工具。</p>

<p align="center"><a href="README.md">简体中文</a> · <a href="英文首页v2.3.md">English</a></p>

<p align="center"><a href="https://github.com/TUANZIDING/clinical-stats-languages-guide/actions/workflows/checks.yml"><img src="https://github.com/TUANZIDING/clinical-stats-languages-guide/actions/workflows/checks.yml/badge.svg?branch=codex%2Fclinical-stats-guide" alt="实际默认分支工程检查"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a></p>

<p align="center"><code>中文离线网页</code> · <code>模拟实操</code> · <code>论文限定复现</code> · <code>离线 AI 断言</code></p>

<p align="center"><a href="#use-cases">使用场景</a> ｜ <a href="#showcase">成果展示</a> ｜ <a href="#quick-start">快速开始</a> ｜ <a href="#capabilities">能力状态</a> ｜ <a href="#contribute">文档索引</a></p>

<p align="center"><sub>封面为本项目原创概念图，不是界面截图或验证证据。当前版本 2.3.0；发布证据见<a href="发布记录v2.3.md">收尾与发布记录</a>。</sub></p>

---

<a id="use-cases"></a>

## 从你的研究问题开始

你不必先成为程序员，但需要说明人群、比较对象、结局、每一行代表什么，以及希望估计什么。项目帮助形成可讨论的统计草案；正式研究仍需完整方案、数据质量核查与统计专业意见。

| 你想做什么 | 从这里开始 |
|---|---|
| 不知道该用哪种方法 | [中文网页方法向导](https://tuanziding.github.io/clinical-stats-languages-guide/#navigator)与[研究卡片](docs/研究卡片说明v2.2.md)，信息不足保留待补充 |
| 比较 SAS、R、Python、C++ 或菜单软件 | [工具指南](docs/software-guide.md)与[四语言示例](examples/README.md) |
| 学会解释均值差、CI、Table 1 和缺失 | [三层教学与八个判断练习](docs/教学路径v2.2.md)及[临床实操](docs/临床统计实操v2.0.md) |
| 用已发表论文核查计算与方法边界 | [NHANES 案例](docs/论文验证v2.1.md)与[medplot 重复随访](docs/纵向论文验证v2.2.md) |
| 用 AI 帮助选择，并核查它的回答 | [AI 流程](docs/ai-workflow.md)与[v2.3 离线测评框架](docs/AI测评框架v2.3.md) |

软件按任务与团队条件选择：菜单入门可考虑 jamovi / 已有许可的 SPSS；常规统计与复现可学 R；自动化、影像和机器学习可用 Python；SAS 适合衔接团队规范；C++ 通常用于算法开发。这是教学建议，没有实测易用性排名。代码行数不能证明分析正确，C++ 借助数学库也能计算 P 值。[官方来源与适用范围](docs/sources.md)

<a id="showcase"></a>

## 看见结果，也看见边界

| 模拟临床教学 | 已发表重复随访的限定复现 |
|---|---|
| [![96例模拟数据的均值差与区间](docs/assets/临床模拟效应图v2.2.png)](docs/临床统计实操v2.0.md) | [![medplot原文与SI对照，保留差异](docs/assets/纵向论文效应图v2.2.png)](docs/纵向论文对照v2.2.md) |
| A/B 各48；结局已知45/43；A−B=9.03 mmHg，95% CI [2.53, 15.53]。人为构造数据，无疗效结论。 | 225患者、812访视、88缺席；27个冻结对照中22一致、5差异。不是全论文复现。 |

表、图注与结果文字来自[统一结果对象](docs/结果对象与复现v2.2.md)。NHANES 2019 的72个选定对照在原文算法与舍入范围内一致；当前默认 t 区间仅16/32端点一致，另16保留。[逐项数值与软件差异](docs/论文验证v2.1.md)

<a id="quick-start"></a>

## 先用起来

下载仓库后双击 [docs/index.html](docs/index.html) 可离线浏览。推荐用本地 HTTP 完成核心交互；`file://` 全流程尚未验收：

```sh
python3 -m http.server 8765 --directory docs
```

打开 `http://localhost:8765`；端口被占用时改用其他空闲端口。也可打开[已发布中文网页](https://tuanziding.github.io/clinical-stats-languages-guide/)。从“学习路径”开始，随后填写基础研究卡片，按需展开进阶项，再查看候选与待补充信息。

浏览网页无需安装统计依赖，没有上传、AI API、追踪脚本或外部字体；“生成提问”只产生需手动复制的文本。英文首页完整说明项目，交互网页与教程仍以中文为主。研究描述也可能敏感，交给外部 AI 前按机构要求审查。

| 桌面学习界面 | 窄屏学习界面 |
|---|---|
| ![v2.2本地桌面历史验收截图](docs/assets/综合桌面核查v2.2.jpg) | ![v2.2本地390像素历史验收截图](docs/assets/综合窄屏核查v2.2.jpg) |

<sub>以上为 v2.2 本地功能验收的真实历史截图，不替代本次线上视觉核查，也不证明真人学习效果。</sub>

<a id="workflow"></a>

## 从选择依据到复算记录

**问题与目标量 → 设计与分析单位 → 条件和信息缺口 → 预定分析 → 复算与诊断 → 报告并保留限制**

![统计方法选择流程，原创教学示意](docs/assets/method-flow.svg)

| 任务 | 支持与边界 |
|---|---|
| 明确研究设计 | 研究卡片记录配对、重复、聚类、调查抽样、数量、时间、缺失和调整依据；允许多个有条件候选 |
| 选择与解释 | 不只凭正态性 P 值换方法，不只凭单因素 P 值选协变量；报告效应与 CI，区别 OR / RR / HR |
| 学习和练习 | 零基础理解 → 模拟数据实操 → 公共论文限定复现；包含配对遗漏、权重遗漏和不显著误解等反馈 |
| 核查 AI 输出 | 10个调试与8个保留情境按研究分组隔离；引用、计算、严重错误与人工审阅单列，保留集公开可见 |
| 复现与报告 | 同一结果对象生成表图文字；快速核查保存快照，实际重跑使用单独入口 |

<a id="capabilities"></a>

## 当前做到哪一步

| 证据层次 | 已有成果 | 仍需核查 |
|---|---|---|
| 工程 | 本地测试、离线契约、链接、命名及 CI；具体本轮结果见[发布记录](发布记录v2.3.md) | 工程通过不证明科学适用性 |
| 数值 | 两个模拟案例及两篇公共论文限定实算；冻结值、分母、方向、哈希、作者版本与差异保留 | 所有论文均未整篇重跑；出生体重与暴露组模型未运行 |
| 方法学 | 设计、目标量、缺失和部分诊断有记录 | 完整诊断、缺失敏感性与方法充分性仍待核查 |
| AI 测评 | 18情境、多个合理参考方案、离线断言、成对比较、Promptfoo 固定输出兼容 | 18条参考答案均待统计人员审阅；没有真实模型调用或 AI 正确率 |
| 独立专家 / 真人 | 有审阅模板和八个判断练习 | 无独立统计专家签字，无真人学习试用；AI 辅助审阅不算专家审阅 |
| 界面与发布 | 中文静态网页与现有手动 Pages 流程 | 远程文件、页面可访问、浏览器视觉检查分别报告 |

[六列案例验证状态](docs/案例验证状态v2.2.md)逐案例记录材料、代码、数值、诊断、专家及真人；v2.3 工程框架不升级其科学验证状态。

<details>
<summary><strong>检查、环境与实际重跑</strong></summary>

完整离线检查使用 Node ≥18、Python 3.12 及 `requirements.txt`；浏览网页无需这些依赖。

```sh
python3 -m pip install -r requirements.txt
npm run check:offline
npm run eval:offline
```

`check:offline` 核对保存对象、哈希和产物，**不拟合模型**。`eval:offline` 核查7条手写固定输出、3个研究情境：3条契约满足、4条预设错误被识别。这些不是模型输出或 AI 正确率。可选 Promptfoo 0.124.1 需要 Node ≥22.22.0，首次安装需联网；[原生离线说明](docs/AI测评框架v2.3.md)保留预设失败与执行错误的区别。

完整限定重跑另需 R 4.5.2 与锁定包：[targets / renv 自定义路径](docs/结果对象与复现v2.2.md)、`npm run replay:longitudinal`、`npm run replay:teaching-report`。macOS 同主机新隔离包库恢复已有历史验证，不是跨 OS 或作者历史环境复建。[可计算报告示范](docs/计算报告示范v2.2.html)

项目没有 `npm build` 前端打包入口；现有 Pages 工作流手动发布 `docs/`，普通推送不自动部署。[发布流程](docs/publishing.md)

</details>

<a id="contribute"></a>

## 文档、核查与共创

| 内容 | 入口 |
|---|---|
| 基础方法 / 工具 / 完整示例 | [方法](docs/method-guide.md) · [工具](docs/software-guide.md) · [示例](examples/README.md) · [教学案例](docs/worked-example.md) |
| 卡片、来源与复现 | [研究卡片](docs/研究卡片说明v2.2.md) · [共同结果](docs/结果对象与复现v2.2.md) · [统计报告核对](docs/统计报告核对v2.0.md) |
| 教学 / AI | [教学路径](docs/教学路径v2.2.md) · [AI 流程](docs/ai-workflow.md) · [测评框架](docs/AI测评框架v2.3.md) |
| 模板 | [分析计划](templates/analysis-plan.md) · [AI 提问](templates/ai-statistics-prompt.md) · [AI 测评提示词](templates/AI测评提示词v2.3.md) · [统计人员审阅](templates/统计人员审阅v2.3.md) |
| 论文、许可与来源 | [论文验证](docs/论文验证v2.1.md) · [纵向候选及许可](docs/纵向论文候选v2.2.md) · [相关开源项目](docs/相关项目导航v2.0.md) · [来源](docs/sources.md) |
| 验收与发布 | [本次收尾发布](发布记录v2.3.md) · [v2.3 本地历史](验证记录v2.3.md) · [v2.2 历史](验证记录v2.2.md) · [v2.0](验证记录v2.0.md) · [v1](VALIDATION.md) |
| English / 反馈 | [完整英文首页](英文首页v2.3.md) · [GitHub Issues](https://github.com/TUANZIDING/clinical-stats-languages-guide/issues) |

欢迎提供具体设计情境、可核查来源和带理由的统计审阅。新自主命名文件采用自然名称、版本号与扩展名，不含下划线；旧名称保留。历史未执行 / 未发布记录不倒填，检查通过的层次需要明确。

---

<p align="center"><strong>医学科研统计选择指南 · Clinical Statistics Guide</strong><br><a href="https://github.com/TUANZIDING">TUANZIDING</a> · <a href="LICENSE">MIT</a> · <a href="docs/sources.md">来源与适用范围</a></p>

本项目原创代码、文字和图表采用 MIT。第三方工具与材料遵循各自许可并保留署名；原始论文、SI、公共个体数据、作者代码、依赖缓存、凭据和运行日志不随此公共项目发布。本项目未扫描或分析用户的私人患者及未发表研究数据。
