window.CLINICAL_RESULT = {
  "schemaVersion": "2.0",
  "simulation": true,
  "seed": 20261008,
  "sourceSha256": "30d4b726e955a285e6231fe43d4909f5c30d0ea1caaadcae2c57826fd440b88b",
  "units": "Independent synthetic records; not real patients",
  "groupN": {
    "A": 48,
    "B": 48
  },
  "plan": {
    "outcome": "day28-sbp",
    "time": "day 28",
    "contrast": "A-B",
    "unit": "mmHg",
    "method": "Welch t, two-sided, 95% CI",
    "adjustment": "none; teaching only",
    "missing": "observed outcome only; no imputation; baseline missingness does not exclude outcome",
    "multiplicity": "one teaching primary contrast; diagnostics are not outcome tests",
    "exclusions": "no outlier deletion",
    "sampleSize": "96 illustrative records; no power calculation"
  },
  "table1": {
    "age": {
      "A": {
        "n": 46,
        "missing": 2,
        "mean": 62.14782608695653,
        "sd": 12.043951716395243,
        "median": 61.849999999999994,
        "q1": 53.95,
        "q3": 69.875
      },
      "B": {
        "n": 45,
        "missing": 3,
        "mean": 60.715555555555554,
        "sd": 11.399181700207407,
        "median": 61.1,
        "q1": 52.1,
        "q3": 69.5
      }
    },
    "sex": {
      "A": {
        "n": 47,
        "missing": 1,
        "levels": {
          "F": {
            "n": 28,
            "percent": 59.57446808510638
          },
          "M": {
            "n": 19,
            "percent": 40.42553191489362
          }
        }
      },
      "B": {
        "n": 46,
        "missing": 2,
        "levels": {
          "F": {
            "n": 21,
            "percent": 45.65217391304348
          },
          "M": {
            "n": 25,
            "percent": 54.34782608695652
          }
        }
      }
    },
    "baseline-sbp": {
      "A": {
        "n": 46,
        "missing": 2,
        "mean": 141.6217391304348,
        "sd": 10.861285232798766,
        "median": 140.95,
        "q1": 135.05,
        "q3": 149.075
      },
      "B": {
        "n": 47,
        "missing": 1,
        "mean": 137.8276595744681,
        "sd": 15.092320277540232,
        "median": 135.6,
        "q1": 128.64999999999998,
        "q3": 147.89999999999998
      }
    },
    "baseline-crp": {
      "A": {
        "n": 44,
        "missing": 4,
        "mean": 6.846363636363637,
        "sd": 9.399127889011607,
        "median": 3.54,
        "q1": 2.2125,
        "q3": 6.85
      },
      "B": {
        "n": 45,
        "missing": 3,
        "mean": 5.5024444444444445,
        "sd": 6.0227387893924575,
        "median": 3.28,
        "q1": 1.85,
        "q3": 6.46
      }
    }
  },
  "primary": {
    "nA": 45,
    "nB": 43,
    "meanA": 137.32666666666665,
    "meanB": 128.29767441860466,
    "sdA": 12.93812899217587,
    "sdB": 17.286706816456963,
    "missingA": 3,
    "missingB": 5,
    "difference": 9.028992248061996,
    "ciLow": 2.525722225949939,
    "ciHigh": 15.532262270174055,
    "t": 2.7641945436833995,
    "df": 77.73622758302501,
    "p": 0.007122449826520556
  },
  "diagnostics": {
    "A": {
      "shapiroW": 0.9822261577343476,
      "shapiroP": 0.7104936927214047
    },
    "B": {
      "shapiroW": 0.9526950262054635,
      "shapiroP": 0.07479948449742387
    },
    "levene": {
      "center": "median",
      "F": 2.812415283847312,
      "p": 0.09716882670882415
    }
  },
  "versions": {
    "Python": "3.12.4",
    "NumPy": "2.2.2",
    "SciPy": "1.15.1",
    "Matplotlib": "3.10.0"
  },
  "report": {
    "methods": "本教学案例含 96 个独立模拟对象，A、B 组各 48 个；数据不对应真实患者。预设教学比较为第 28 天收缩压的 A−B 均值差（mmHg），采用双侧 Welch t 检验与 95% 置信区间，不假设等方差、不调整协变量。仅纳入主要结局已观测者（A=45，B=43），不因基线变量缺失额外排除、不插补、不删除异常值。缺失掩码在每组内独立于变量取值随机生成；这种生成机制不能替代真实研究缺失机制评估。基线表为描述性汇总，不加 P 值。Q–Q 图、Shapiro–Wilk 和以中位数为中心的 Levene 检验用于诊断讨论，不据其 P 值切换主分析。仅演示一个主要对比；未进行结局多重检验。软件：Python 3.12.4; NumPy 2.2.2; SciPy 1.15.1; Matplotlib 3.10.0。",
    "results": "A 组第 28 天收缩压为 137.33 (SD 12.94) mmHg，B 组为 128.30 (SD 17.29) mmHg；缺失分别为 3 和 5。A−B 均值差为 9.03 mmHg，95% CI [2.53, 15.53]；t=2.764，df=77.736，双侧 P=0.007122。这些数值仅解释模拟计算，不提供临床疗效、临床重要性或真实研究因果证据。",
    "legend": "图：独立模拟对象第 28 天收缩压及 A−B 均值差。每个散点代表一个有结局记录的独立模拟对象，A n=45，B n=43；缺失 3 / 5 不绘制且未插补。左图横线为组均值，不是 CI。右图点为均值差、横线为双侧 Welch 95% CI，虚线为零差异。未删除极端点。分析单位、方向、检验与软件同方法段。"
  }
};
