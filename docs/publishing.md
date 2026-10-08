# GitHub 发布说明

本项目先提供完整本地候选包。推送仓库与发布 Pages 是不同的动作：前者上传项目文件，后者让网页可从互联网上访问。

当前状态（2026-10-08）：用户已确认创建公开仓库，项目已推送至 [TUANZIDING/clinical-stats-languages-guide](https://github.com/TUANZIDING/clinical-stats-languages-guide)，自动检查首次执行通过。GitHub Pages 尚未启用。

## 1. 确认仓库范围

建议名称：`clinical-stats-languages-guide`。确认账号、名称和**公开 / 私有**可见性；不要把已有同名仓库视为可覆盖目标。

完成确认后，可以用 GitHub 网页创建空仓库，或使用已登录账号的 GitHub CLI 创建并推送。本地代码目录不要包含 `.env`、凭证、患者明细或未获授权第三方材料。

## 2. 查看检查结果

远端 `Check teaching project` 工作流会检查规则关键分支、本地链接、R/Python/C++ 数值对照。需要在实际 GitHub Actions 日志中确认通过；工作流文件存在不表示已经执行。

## 3. 启用 GitHub Pages

在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。再到 Actions，选择 **Publish teaching site (manual)**，在仓库默认分支上手动触发。

Pages 发布的是 `docs/`。不需要构建工具或付费 API。工作流不会因普通推送自动发布。

私有仓库能否使用 Pages、网页访问范围和组织限制取决于当前账号/方案与设置。**私有仓库不自动意味着 Pages 网页私有**；发布前核对 GitHub 当前说明与设置。[GitHub Pages 官方介绍](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)

## 4. 核实完成状态

成功的证据包括：远端仓库与提交可读、检查日志、Pages 部署成功记录，以及返回页面能实际打开。没有这些证据时，状态应写“本地已准备”或“已推送，未发布”，不能写“上线完成”。
