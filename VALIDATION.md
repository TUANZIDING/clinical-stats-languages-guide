# 验证记录

日期：2026-10-08。对象：本地教学项目，不涉及真实患者数据。

| 项目 | 状态 | 证据 / 限制 |
|---|---|---|
| 向导关键分支与信息不足保护 | 已执行，13 项通过 | `npm test`；覆盖配对、聚类、重复测量、缺失、预测、因果等 |
| Python 模拟 Welch 示例 | 已执行 | Python 3.12 / NumPy 2.2.2 / SciPy 1.15.1 |
| R 模拟 Welch 示例 | 已执行 | R 4.5.2；基础 stats |
| Python、R、C++ 数值交叉核对 | 已执行，一致 | 每种实现 10 个输出，浮点比较相对容差 1e-9 |
| 原创教学图表 | 已生成并查看 PNG | Matplotlib 3.10.0，从同一 CSV 重建；非临床结果 |
| 本地链接、SVG、离线资产与网页结果一致性 | 已执行，通过 | 37 个本地引用，HTML ID、SVG XML、24 行模拟数据及网页/JSON一致性 |
| JavaScript 语法检查 | 已执行，通过 | `node --check docs/app.js` 与 `docs/method-engine.js` |
| C++ / Boost 示例 | 已编译并执行 | Apple Clang，C++17；临时目录中的官方 Boost Math 源码，standalone 模式，无系统安装；提交 `56bec1a6e230b9c401585eed4d0c7348ad2afe2c` |
| SAS 示例 | 未执行 | 本机无 SAS；核查官方 TTEST 参数及 Satterthwaite 输出选择 |
| 浏览器跨视口/视觉回归验收 | 未执行 | 已提供响应式规则和轻量静态自检，不声称完成浏览器验收 |
| 本地页面人工预览 | 已查看 | 当前面板视口显示正常；两独立组示例和 AI 提问生成均已查看；非全面浏览器验收 |
| GitHub Actions | 已执行，通过 | [首次检查日志](https://github.com/TUANZIDING/clinical-stats-languages-guide/actions/runs/37715736970)，教学代码提交 `9410bc855d7d54129f309a8d3f03d6d18a643bfe`；涵盖向导、链接、JS 语法及 R/Python/C++ 数值核对 |
| 公开仓库上传 | 已执行，已核对远端文件 | 用户明确确认公开；[TUANZIDING/clinical-stats-languages-guide](https://github.com/TUANZIDING/clinical-stats-languages-guide) |
| GitHub Pages | 未启用 / 未发布 | 已备好手动工作流；本次授权范围为公开仓库创建与推送 |

首次远端检查提示部分 Action 的 Node 20 运行时已弃用；后续配置已改为官方 Node 24 Action，并固定 Ubuntu 24.04。工作流的后续执行状态可在仓库 Actions 页面查看。

这些检查证明特定教学计算和代码分支的一致性，不证明选法覆盖所有医学问题，也不验证真实研究的模型假设或 AI 决策正确性。
