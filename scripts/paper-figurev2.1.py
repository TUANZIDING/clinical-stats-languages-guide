"""Draw the recorded linear-model comparison; never uses invented observations."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
target = json.loads((ROOT/"data"/"paper-targetsv2.1.json").read_text())
replay = json.loads((ROOT/"data"/"paper-replayv2.1.json").read_text())
rows = [x for x in replay["estimates"] if x["model"] == "linear_adjusted"]
published = np.array(target["models"]["linear_adjusted"])
plt.rcParams.update({"font.family":"DejaVu Sans", "font.size":11})
fig, ax = plt.subplots(figsize=(10,5.3),facecolor="#0b1220")
ax.set_facecolor("#0b1220")
colors = ["#ffffff", "#7cf29c", "#00d4ff"]
for offset, color, label, keys in [(0.2,colors[0],"Published (rounded normal Wald)",None),
                                  (0,colors[1],"Replay: normal Wald",("estimate","normal_lower","normal_upper")),
                                  (-0.2,colors[2],"Replay: current default t",("estimate","lower","upper"))]:
    values = published if keys is None else np.array([[x[k] for k in keys] for x in rows])
    ax.errorbar(values[:,0],np.arange(4)+offset,xerr=np.vstack([values[:,0]-values[:,1],values[:,2]-values[:,0]]),
                fmt="o",color=color,markersize=5,capsize=3,linewidth=1.6,label=label)
ax.axvline(0,color="#556577",linestyle="--",linewidth=1)
ax.set_yticks(range(4),["9-11th grade","High school / GED","Some college / AA","College graduate +"])
ax.invert_yaxis()
ax.set_xlabel("Adjusted spherical-equivalent difference (D), with 95% CI",color="white",labelpad=14)
ax.set_title("Published data replay | NHANES 1999-2008",loc="left",color="white",pad=38,fontweight="bold",fontsize=16)
ax.text(0,1.06,"n = 19,756 | Reference: less than 9th grade | Age, sex, cycle adjusted",transform=ax.transAxes,color="#a8b8cb",fontsize=10)
ax.tick_params(colors="#d8e4f0")
for spine in ax.spines.values(): spine.set_color("#334155")
ax.grid(axis="x",color="#334155",alpha=.5)
fig.legend(*ax.get_legend_handles_labels(),loc="upper left",bbox_to_anchor=(.25,.20),frameon=False,labelcolor="#d8e4f0",fontsize=9,ncol=1)
fig.text(.985,.035,"Nickels et al. (2019), PMID 30695049 | Selected model comparison",color="#a8b8cb",ha="right",fontsize=8)
fig.subplots_adjust(left=.25,right=.96,top=.76,bottom=.34)
for extension in ["png","svg"]:
    output = ROOT/"docs"/"assets"/f"paper-comparisonv2.1.{extension}"
    fig.savefig(output,dpi=180,facecolor=fig.get_facecolor())
    if extension == "svg":
        output.write_text("\n".join(line.rstrip() for line in output.read_text().splitlines())+"\n")
plt.close(fig)
