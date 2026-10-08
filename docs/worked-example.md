# 可复现教学案例：两独立组均值差

## 问题与假设

用人为构造的 A、B 两组数据演示：如何估计 **A−B 总体均值差**并进行双侧 Welch t 检验。每组各 12 个模拟观测，无缺失，按独立观测处理。

这些是假设的教学条件，没有患者、真实干预或随机分配。本案例没有检验或证明真实研究的独立性和分布假设。

## 实际计算结果

![模拟数据和效应区间](assets/welch-demo.png)

| 项目 | 结果 |
|---|---:|
| A 组均值 | 128.7500 |
| B 组均值 | 120.6667 |
| A−B 均值差 | 8.0833 |
| 95% CI | [2.8084, 13.3583] |
| Welch t | 3.1837 |
| 近似自由度 | 21.3405 |
| 双侧 P | 0.0044071 |

基准由 SciPy 1.15.1 实际运行得到；R 4.5.2 和 C++ / Boost Math 在相同参数下交叉核对，数值在浮点误差范围内一致。完整精度保存在 [expected-results.json](../data/expected-results.json)。SAS 未在本地执行。详细记录见 [VALIDATION.md](../VALIDATION.md)。

## 为什么讨论 Welch？

教学目标是两独立组的未调整均值差，Welch 不要求等方差。它仍需要独立性与适当的分布条件；小样本时严重偏态或极端值需要进一步讨论。这是本案例的预定演示方法，不能仅因为计算出较小的 P 值就认定它适合你的研究。[NIST](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm)

## R 的几行指令在说什么？

```r
d <- read.csv("data/synthetic-independent.csv")
a <- d$value[d$group == "A"]
b <- d$value[d$group == "B"]
t.test(a, b, var.equal = FALSE, alternative = "two.sided")
```

1. 读取表格；这是一个数据框。
2. 根据 `group` 筛选 A 组数值。
3. 根据 `group` 筛选 B 组数值。
4. 明确双侧、不假设等方差。第一个向量减第二个向量，因此方向为 A−B。

上面用于讲语法；[完整脚本](../examples/r/welch_demo.R)还检查 ID、分组、缺失和非有限数值。

## Python 默认参数不同

```python
result = stats.ttest_ind(a, b, equal_var=False,
                        alternative="two-sided", nan_policy="raise")
interval = result.confidence_interval(0.95)
```

SciPy 默认 `equal_var=True`，R 默认 `var.equal=FALSE`，所以“两个软件都用了默认 t 检验”不保证分析相同。[SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html)、[R](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html)

## 怎样解释？

可以说：“在这份模拟数据及演示条件下，A−B 的均值差估计为 8.08，95% CI 为 2.81–13.36，双侧 Welch 检验 P=0.0044。”

不能说：“干预有效”“具有临床意义”“AI 证明了方法正确”或“有 99.56% 概率两组不同”。这些结论需要真实设计、临床意义界值或其他信息，P 值不能给出。[ASA](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)

## 转换到真实研究前还缺什么？

完整研究方案、目标人群、干预与对照、样本量依据、结局单位、基线/协变量调整、实际数据质量与分布、缺失/失访、多重性、模型诊断及人工审核。不能直接把这里的脚本作为真实研究的分析授权。
