/* Markdown accessibility companion generated from the same original teaching course. */
const fs=require('node:fs');
const path=require('node:path');
const course=require('../docs/教学课程v2.2.js');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'docs/教学路径v2.2.md');
const intro=`# 三层教学路径 v2.2 · 第 5 步

从项目根目录操作。先能说明问题，再运行模拟案例，最后限定复现论文。网页按钮和本文件使用同一课程源；阅读、勾选或回答练习不等于实际运行分析或学习效果验证。

课程结构参考 [learn-r-with-ai](https://github.com/htlin222/learn-r-with-ai/tree/5d0ac23bf48f6e0666b1681bc55532e6f69fd295)，核查提交 \`5d0ac23bf48f6e0666b1681bc55532e6f69fd295\`（2026-09-14）。该课程按任务推进数据、表格、图与检验，并安排运行与解释。本项目只借鉴组织顺序，未复制上游代码、任务文字或数据；练习、反馈和程序原创。上游 [MIT 许可](https://github.com/htlin222/learn-r-with-ai/blob/5d0ac23bf48f6e0666b1681bc55532e6f69fd295/LICENSE)，Copyright (c) 2025 林協霆 (Hsieh-Ting Lin)；不因此改变论文 / 数据 / 作者代码的各自许可。

## 先做一个小任务

1. 双击 [离线网页](index.html#learning)，选择“零基础理解”。填写问题、人群、结局、目标量和分析单位；未知项保留待补充。
2. 判断配对、OR 与等效的三个错误论断。每个错误选项有解释与下一步，修改选择后需重新核对。
3. 已安装 R 时运行 \`Rscript --vanilla examples/r/welch_demo.R\`，保存输出并解释 A−B 的方向。没有 R 时先读 [已保存计算报告](计算报告示范v2.2.html)，不要记作已运行。

## 环境与执行边界

- 模拟两组和临床核对脚本只用基础 R stats；系统 R 必须另外安装。新计算报告用 Python 标准库，不要求 Quarto。它先实际重算一个小例子，再核对 HTML 与主网页的 4 个数值字段。
- 论文环境与完整命令见 [统一结果 / targets / renv 说明](结果对象与复现v2.2.md)、[NHANES 记录](论文验证v2.1.md)与 [medplot 记录](纵向论文验证v2.2.md)。先恢复锁定 R / Python 包、显式获取冻结公共输入，再执行完整入口；首次可能联网或编译。只使用本项目许可范围内的公共输入。
- \`npm run check:offline\`、统一 / 纵向结果脚本的 \`check\` 和计算报告的 \`check\` 都核对快照，**不会重新拟合模型**。实际重算入口、依赖和输出分开说明；浏览器只显示保存结果。
- 历史作者代码版本、冻结目标 / 容差、数据哈希、原始运行失败与软件算法差异全部保留。四个案例的统计数字来自既有共同结果视图；这个教学层不更改它们。

## 小型可计算报告示范

\`python3 scripts/计算报告v2.2.py run\` 实际调用既有 R 脚本，核对 10 个冻结数值和 4 个主网页来源字段，保存到忽略的 \`build/计算报告示范v2.2/\`。维护者用显式 \`run --export\` 更新本地独立 HTML 与它的运行记录；不修改共同结果、冻结目标或论文记录。\`check\` 无需 R、只审计已交付快照。脚本、数据、参考与网页来源有 SHA-256，运行记录包含 R / stats / BLAS / Python / 系统版本。

这是原创 R + HTML 的小示范，没有迁移整站到 Quarto，也没有验证 Quarto 环境。只重新计算现有 24 例模拟；同主机运行不等于跨系统环境恢复。

## 学习任务与反馈

`;
function exercise(id){
  const q=course.exercises[id];
  return `\n#### 判断练习：${q.title}\n\n${q.scenario}\n\n`+q.options.map((o,i)=>`${i+1}. ${o.text}\n\n   反馈：${i===q.correct?'判断有依据':'需要修正'}。${o.feedback}\n`).join('\n')+`\n下一步：${q.repair}\n`;
}
let output=intro;
for(const [i,level] of course.levels.entries()){
  output+=`\n### ${i+1}. ${level.title}\n\n交付：${level.outcome}\n\n`;
  if(level.tasks)output+=level.tasks.map((t,j)=>`${j+1}. ${t}`).join('\n')+'\n';
  for(const id of level.cases||[]){
    const c=course.cases[id];
    output+=`\n#### ${c.title}\n\n**问题：** ${c.question}\n\n**目标量：** ${c.estimand}\n\n**理由：** ${c.why}\n\n**可运行步骤：**\n\n`;
    output+=c.steps.map((s,j)=>`${j+1}. ${s.text}${s.command?'\n\n\`\`\`sh\n'+s.command+'\n\`\`\`\n':''}`).join('\n')+'\n';
    output+=`**诊断解释：**\n\n`+c.diagnostics.map(d=>`- 已做：${d.done}\n- 解释：${d.meaning}\n- 待查：${d.pending}`).join('\n')+'\n\n';
    output+=`**结果解读：** ${c.interpretation}\n\n统计数字从共同对象生成：[三案例结果](assets/分析结果v2.2.json) / [纵向结果](assets/纵向论文结果v2.2.json)，不在本课程手工转抄。\n\n![${c.figureAlt}](${c.figure})\n\n**常见错误：**\n\n`+c.mistakes.map(x=>'- '+x).join('\n')+'\n';
    output+=exercise(c.exercise)+(c.extraExercise?exercise(c.extraExercise):'');
    output+=`\n[案例细节](${c.link}) · [方法 / 原文来源](${c.source})\n`;
  }
  for(const id of level.exercises||[])output+=exercise(id);
}
output+=`\n## 让 AI 帮你解释，而不是补造信息\n\n使用 [研究卡片](研究卡片说明v2.2.md) 与 [AI 流程](ai-workflow.md)。给 AI 的任务可以是：“依据这张卡片和实际输出，说明目标量、选择理由、分母和诊断。将未执行的检查列为待核查，不补造结果；区分作者原方法复现与当前方法讨论。”先保存代码、运行日志和来源，再逐项核对回答。本项目没有调用 AI 或测量准确率。\n\n## 验收与后续边界\n\n功能、中文、键盘与窄屏的实际记录见 [第 5 步教学验收](教学验收v2.2.md)。自动规则和浏览器操作不能证明初学者学会、任务完成率高或易用性已验证；没有真人试用。完整全论文重跑、未执行诊断、等效 / 新配对方法、其他研究设计及真人 / AI 测评仍属于后续指定步骤或专题，本轮不增加未经验证的分析。\n`;
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8')!==output)throw new Error('Teaching Markdown differs from its course source');
  console.log('PASS snapshot only: teaching tasks and all option feedback match course source');
}else{fs.writeFileSync(target,output);console.log('Generated '+path.relative(root,target));}
