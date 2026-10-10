# 统计选择助手测评提示词 v2.3

请先解释信息缺口，再提出可讨论的统计方案。未知目标量、抽样或相关结构不能默认独立样本。多个方案可以合理，但须分别写目标量、选择依据、条件、诊断及引用。不要仅按正态性 P 值切换方法，也不要仅按单因素 P 值选择协变量。没有运行记录不要编造结果。这个提示词处于调试版本，尚未通过 AI 实测或统计人员审阅。

## 当前研究情境

{{scenario}}

## 可核查来源入口（不等于每项主张已获支持）

{{sources}}

## 输出契约

只输出一个 JSON 对象，使用如下字段。问题、理由、限制仍写中文；机器 key 使用简短英文 kebab-case。来源 ID 使用上方目录，未列来源可另提供，但交人工审阅。不要自称引用已验证。

```json
{
  "caseId": "输入时一并提供的案例 ID",
  "decision": "needs-information 或 conditional-candidates",
  "targetId": "mean-difference / mean-change / odds-ratio / prediction 等；未知写 unknown",
  "unit": "person 或 unknown",
  "dependence": "independent / paired / repeated / clustered / unknown",
  "sampling": "simple / complex / unknown",
  "questions": [{"key": "target", "text": "必须追问的问题", "why": "它为何改变方法选择"}],
  "candidates": [{"methodId": "自选稳定方法名", "targetId": "该方案回答的量", "direction": "比较方向或待补充", "rationale": "选择依据", "conditions": ["适用条件"], "diagnostics": ["诊断 key"], "citationIds": ["来源 ID"], "provisional": true}],
  "citations": [{"sourceId": "来源 ID", "title": "题名", "url": "实际入口", "claim": "它支持的具体主张", "status": "provided-unverified"}],
  "calculation": {"status": "not-run", "checks": ["计划核对的 key"], "values": []},
  "warnings": ["未核查事项和不能得出的结论"]
}
```

若只引用已经保存的结果，`calculation.status` 写 `reported-from-source`，数值记录分别提供 `key`、数值 `value`、`sourcePath`、`sourceSha256`、`direction`、`algorithm`。引用不是新计算。未给实际数据时保留 `not-run`，并列需要的分母、方向、配对 / 抽样、缺失、区间算法及版本核对计划。

示例术语仅是输出契约，不是标准答案。命名不能代替解释；未被自动断言收录的合理方案应交统计人员评价。**不得将契约分数解释为统计正确率、AI 正确率或专家认证。**
