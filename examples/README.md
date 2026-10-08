# 同一任务，四种实现

任务：读取 `data/synthetic-independent.csv`，方向 A−B，双侧 Welch t 检验，95% CI，不静默删除缺失。CSV 是本项目人为构造的教学数据。

## Python

在项目根目录运行：

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 examples/python/welch_demo.py
```

脚本使用相对自身位置的路径，也可以从其他目录运行。SciPy 需要支持返回自由度与 `confidence_interval` 的版本；本项目依赖锁定到实际验证版本。

## R

安装 R 后，在项目根目录运行，不需要额外 R 包：

```sh
Rscript examples/r/welch_demo.R
```

也可通过第一个参数指定 CSV 路径。不要把重复患者 ID 或缺失数据直接用于这个独立两组示例。

## SAS

在 SAS Studio 等环境打开 `sas/welch_demo.sas`，将 `%let demo_csv=...` 修改为 SAS 执行服务器能访问的教学 CSV 路径。若使用 OnDemand，只上传这份模拟数据，不上传患者数据。

结果中读取 **Satterthwaite** 行及其 CI，避免误读 Pooled 行。核对方向 A−B、双侧和 alpha=0.05。许可适用范围按 SAS 当前条款核对。[PROC TTEST 参数手册](https://support.sas.com/documentation/cdl/en/statug/63033/HTML/default/statug_ttest_sect002.htm)

本机没有 SAS 运行环境，因此此示例仅完成源码与官方参数核对，**未执行**。不能声称四种语言均已运行通过。

## C++

需要 C++17 编译器与 Boost Math 头文件。下面的安装命令由你在需要时选择执行：

```sh
# macOS / Homebrew
brew install boost
mkdir -p build
clang++ -std=c++17 -I"$(brew --prefix boost)/include" examples/cpp/welch_demo.cpp -o build/welch_demo
./build/welch_demo
```

Ubuntu 可用 `libboost-dev`，例如：

```sh
mkdir -p build
g++ -std=c++17 examples/cpp/welch_demo.cpp -o build/welch_demo
./build/welch_demo
```

这里借助 Boost 的 t 分布 CDF 与分位数求 P 值和 CI，说明 C++ 可以完成同样的统计计算。[Boost 文档](https://live.boost.org/doc/libs/1_51_0/libs/math/doc/sf_and_dist/html/math_toolkit/dist/dist_ref/dists/students_t_dist.html)

本地 C++ 验证状态见 [VALIDATION.md](../VALIDATION.md)。CI 配置中有安装 Boost 后编译与数值核对的步骤；配置存在不等于 CI 已运行。

本次本地复核使用官方 Boost Math 源码的 standalone 模式，无系统安装：`clang++ -std=c++17 -DBOOST_MATH_STANDALONE -I<Boost-Math源码>/include examples/cpp/welch_demo.cpp -o build/welch_demo`。实际源码提交记录在验证文件中。

## 交叉核对

```sh
python3 scripts/verify_results.py --r
# 有编译后的 C++ 程序时
python3 scripts/verify_results.py --r --cpp build/welch_demo
```

这检查数值实现的一致性，不检验医学研究的假设或合理性。正式分析还需要预定方案和完整验证。

## 重建图表

```sh
python3 scripts/build_assets.py
```

它从同一 CSV 重建 PNG/SVG、基准 JSON 和网页本地数值文件。macOS 使用已有中文字体；Linux 如需完整中文图表，应提供 Noto CJK 字体。不影响离线网页使用。
