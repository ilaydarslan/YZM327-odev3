"""Rapor şekilleri. Çalıştırma: python3 docs/figures/make_figures.py (önce node bench/report-data.js)."""
import json, math, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "..", "..", "bench", "results")
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8.5})

ATOMS = ["WuManberSearch", "AhoCorasickSearch", "HorspoolSearch", "BoyerMooreSearch",
         "Bm4DnaDsSearch", "Bm4DnaHmbsSearch", "ShiftOrSearch", "KmpSearch"]
SHORT = {"WuManberSearch": "WM", "AhoCorasickSearch": "AC", "HorspoolSearch": "Hp", "BoyerMooreSearch": "BM",
         "Bm4DnaDsSearch": "DS", "Bm4DnaHmbsSearch": "HMbs", "ShiftOrSearch": "SO", "KmpSearch": "KMP"}
COLORS = {"WuManberSearch": "#4C78A8", "AhoCorasickSearch": "#F58518", "HorspoolSearch": "#54A24B",
          "BoyerMooreSearch": "#B279A2", "Bm4DnaDsSearch": "#E45756", "Bm4DnaHmbsSearch": "#72B7B2",
          "ShiftOrSearch": "#EECA3B", "KmpSearch": "#9D755D"}

cells = json.load(open(os.path.join(RES, "figdata.json")))
M = [4, 8, 16, 32, 64]
K = [1, 4, 16, 64]
alphabets = [("dna", "DNA (σ=4)"), ("protein", "Protein (σ=20)"), ("text", "Metin (σ=27)")]
sizes = [(1e4, "n = 10⁴"), (1e5, "n = 10⁵"), (1e6, "n = 10⁶")]

# Şekil 1: m × k ızgarasında ölçülen en hızlı atom; çerçeveli hücre = molekül başka atom seçti
fig, axes = plt.subplots(3, 3, figsize=(7.2, 6.4), sharex=True, sharey=True)
for col, (alpha, alabel) in enumerate(alphabets):
    for row, (n, nlabel) in enumerate(sizes):
        ax = axes[row][col]
        for c in cells:
            if c["alphabet"] != alpha or c["n"] != n:
                continue
            x, y = M.index(c["m"]), K.index(c["k"])
            ax.add_patch(plt.Rectangle((x, y), 1, 1, color=COLORS[c["fastest"]]))
            label = SHORT[c["fastest"]]
            if c["chosen"] != c["fastest"]:
                ax.add_patch(plt.Rectangle((x + 0.06, y + 0.06), 0.88, 0.88, fill=False, lw=1.6, ec="black"))
                label += f"\n→{SHORT[c['chosen']]}\n{c['slowdown']:.2f}×"
            dark = c["fastest"] != "ShiftOrSearch"
            ax.text(x + 0.5, y + 0.5, label, ha="center", va="center", fontsize=5.4 if "\n" in label else 6.4,
                    color="white" if dark else "black", linespacing=0.95)
        ax.set_xlim(0, 5); ax.set_ylim(0, 4)
        ax.set_xticks([i + 0.5 for i in range(5)]); ax.set_xticklabels(M)
        ax.set_yticks([i + 0.5 for i in range(4)]); ax.set_yticklabels(K)
        if row == 0: ax.set_title(alabel, fontsize=9)
        if col == 0: ax.set_ylabel(f"{nlabel}\ndesen sayısı k")
        if row == 2: ax.set_xlabel("desen uzunluğu m")
handles = [Patch(color=COLORS[a], label=f"{SHORT[a]} = {a.replace('Search','')}") for a in ATOMS if any(c["fastest"] == a for c in cells)]
fig.legend(handles=handles, loc="lower center", ncol=4, fontsize=7, frameon=False, bbox_to_anchor=(0.5, -0.005))
fig.tight_layout(rect=(0, 0.06, 1, 1))
fig.savefig(os.path.join(HERE, "sekil1_izgara.png"), dpi=220)
plt.close(fig)

# Şekil 2: doğrulama kümesinde politikaların yavaşlama dağılımı
val = json.load(open(os.path.join(RES, "validation.json")))
results = val["results"]
def slow(c, atom):
    t = c["times"].get(atom, max(c["times"].values()))
    return t / c["times"][c["fastest"]]
policies = [("ExactMatch (auto)", lambda c: c["chosen"]["auto"]),
            ("hep Wu-Manber", lambda c: "WuManberSearch"),
            ("hep Aho-Corasick", lambda c: "AhoCorasickSearch"),
            ("hep bm4DNAHMbs", lambda c: "Bm4DnaHmbsSearch"),
            ("Allmer 2016 kuralı", lambda c: "Bm4DnaDsSearch" if c["shape"]["mAvg"] < 50 else "Bm4DnaHmbsSearch"),
            ("hep Horspool", lambda c: "HorspoolSearch"),
            ("hep KMP", lambda c: "KmpSearch")]
fig, ax = plt.subplots(figsize=(7.2, 2.6))
for i, (name, pick) in enumerate(policies):
    vals = sorted(slow(c, pick(c)) for c in results)
    ys = [(j + 1) / len(vals) for j in range(len(vals))]
    ax.step(vals, ys, where="post", label=name, lw=2.2 if i == 0 else 1.2, color="black" if i == 0 else None)
ax.set_xscale("log"); ax.set_xlim(0.98, 200)
ax.set_xlabel("yavaşlama = seçilen atomun süresi / en hızlı atomun süresi (log)")
ax.set_ylabel("vakaların oranı")
ax.axvline(1.1, ls=":", color="gray"); ax.text(1.13, 0.45, "%10 sınırı", color="gray", fontsize=7)
ax.legend(fontsize=6.8, loc="lower right", ncol=2)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(HERE, "sekil2_dogrulama.png"), dpi=220)
plt.close(fig)
print("şekiller yazıldı")
