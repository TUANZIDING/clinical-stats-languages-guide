# GitHub 发布说明

本项目提供可离线使用的教学项目。推送仓库与发布 Pages 是不同的动作：前者上传项目文件，后者让网页可从互联网上访问。

本次复核（2026-10-10）：现有公开仓库是 `TUANZIDING/clinical-stats-languages-guide`，实际默认分支为 `codex/clinical-stats-guide`。升级分支通过 PR 并入该分支，再手动部署 Pages。实际合并、检查和部署结果以 [PR](https://github.com/TUANZIDING/clinical-stats-languages-guide/pulls)、[Actions](https://github.com/TUANZIDING/clinical-stats-languages-guide/actions)及[收尾记录](../发布记录v2.3.md)为准；第2–6步的本地验收是发布前历史记录。论文原文、SI、公共个体缓存、包库及运行日志继续留在忽略的 `build/`，不进入公共仓库或网页。

## 1. 确认仓库范围

本项目使用上述现有仓库，不另建仓库。提交前核查当前分支、远程与文件范围；通过升级 PR 保留历史，不强推或绕过保护。本地代码目录不要包含 `.env`、凭证、患者明细或未获授权第三方材料。

## 2. 查看检查结果

远端 `Check teaching project` 工作流会检查规则关键分支、本地链接、R/Python/C++ 数值对照及 v2.3 固定输出的离线工程断言。需要在实际 GitHub Actions 日志中确认通过；工作流文件存在不表示已经执行。原生 Promptfoo 是另行可选核查，不在 CI 中安装；预设断言失败与执行错误须分开报告。

## 3. 启用 GitHub Pages

在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。再到 Actions，选择 **Publish teaching site (manual)**，在仓库默认分支上手动触发。

Pages 发布的是 `docs/`。不需要构建工具或付费 API。工作流不会因普通推送自动发布。

私有仓库能否使用 Pages、网页访问范围和组织限制取决于当前账号/方案与设置。**私有仓库不自动意味着 Pages 网页私有**；发布前核对 GitHub 当前说明与设置。[GitHub Pages 官方介绍](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)

## 4. 核实完成状态

成功的证据包括：远端仓库与提交可读、检查日志、Pages 部署成功记录，以及返回页面能实际打开。没有这些证据时，状态应写“本地已准备”或“已推送，未发布”，不能写“上线完成”。
