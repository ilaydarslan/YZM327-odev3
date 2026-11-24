"""Rapor şekilleri. Çalıştırma: python docs/figures/make_figures.py (önce node bench/report-data.js)."""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch, FancyArrowPatch, Rectangle

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
LIGHT = {"ShiftOrSearch", "Bm4DnaHmbsSearch"}  # açık renkli hücrelerde siyah yazı

cells = json.load(open(os.path.join(RES, "figdata.json"), encoding="utf-8"))
M = [4, 8, 16, 32, 64]
K = [1, 8, 64, 512]
alphabets = [("labels", "Etiket dizisi (σ=4)"), ("normalized", "Normalize metin (σ=37)"), ("printable", "Ham metin / kod (σ=95)")]
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
            ax.text(x + 0.5, y + 0.5, label, ha="center", va="center", fontsize=5.4 if "\n" in label else 6.4,
                    color="black" if c["fastest"] in LIGHT else "white", linespacing=0.95)
        ax.set_xlim(0, 5); ax.set_ylim(0, 4)
        ax.set_xticks([i + 0.5 for i in range(5)]); ax.set_xticklabels(M)
        ax.set_yticks([i + 0.5 for i in range(4)]); ax.set_yticklabels(K)
        if row == 0: ax.set_title(alabel, fontsize=8.6)
        if col == 0: ax.set_ylabel(f"{nlabel}\ndesen sayısı k")
        if row == 2: ax.set_xlabel("desen uzunluğu m")
handles = [Patch(color=COLORS[a], label=f"{SHORT[a]} = {a.replace('Search','')}") for a in ATOMS if any(c["fastest"] == a for c in cells)]
fig.legend(handles=handles, loc="lower center", ncol=4, fontsize=7, frameon=False, bbox_to_anchor=(0.5, -0.005))
fig.tight_layout(rect=(0, 0.06, 1, 1))
fig.savefig(os.path.join(HERE, "sekil1_izgara.png"), dpi=220)
plt.close(fig)

# Şekil 2: doğrulama kümesinde politikaların yavaşlama dağılımı
val = json.load(open(os.path.join(RES, "validation.json"), encoding="utf-8"))
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
worst = 1
for i, (name, pick) in enumerate(policies):
    vals = sorted(slow(c, pick(c)) for c in results)
    worst = max(worst, vals[-1])
    ys = [(j + 1) / len(vals) for j in range(len(vals))]
    ax.step(vals, ys, where="post", label=name, lw=2.2 if i == 0 else 1.2, color="black" if i == 0 else None)
ax.set_xscale("log"); ax.set_xlim(0.98, worst * 1.3)
ax.set_xlabel("yavaşlama = seçilen atomun süresi / en hızlı atomun süresi (log)")
ax.set_ylabel("vakaların oranı")
ax.axvline(1.1, ls=":", color="gray"); ax.text(1.13, 0.45, "%10 sınırı", color="gray", fontsize=7)
ax.legend(fontsize=6.8, loc="lower right", ncol=2)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(HERE, "sekil2_dogrulama.png"), dpi=220)
plt.close(fig)

# Şekil 3: sınıf diyagramı (docs/figures/sinif_diyagrami.mmd'nin çizimi)
INK, LINE, FILL, HEAD = "#1d2b36", "#5b6b78", "#f7f9fb", "#e6edf3"

def box(ax, x, y, w, title, members, stereo=None, head=HEAD, title_size=8.4):
    """Sol üst köşesi (x, y) olan UML kutusu; yüksekliği satır sayısından. Dönüş: (x, y, w, h)."""
    lh = 0.032
    top_lines = (1 if stereo else 0) + 1
    h = top_lines * lh + 0.012 + max(1, len(members)) * lh + 0.012
    ax.add_patch(Rectangle((x, y - h), w, h, fc=FILL, ec=LINE, lw=1))
    head_h = top_lines * lh + 0.012
    ax.add_patch(Rectangle((x, y - head_h), w, head_h, fc=head, ec=LINE, lw=1))
    ty = y - 0.006
    if stereo:
        ax.text(x + w / 2, ty, f"«{stereo}»", ha="center", va="top", fontsize=6.8, color=LINE, style="italic")
        ty -= lh
    ax.text(x + w / 2, ty - (0 if stereo else 0.004), title, ha="center", va="top", fontsize=title_size, weight="bold", color=INK)
    my = y - head_h - 0.006
    for m in members:
        ax.text(x + 0.008, my, m, ha="left", va="top", fontsize=6.9, family="DejaVu Sans Mono", color=INK)
        my -= lh
    return (x, y, w, h)

def anchor(b, side):
    x, y, w, h = b
    return {"top": (x + w / 2, y), "bottom": (x + w / 2, y - h), "left": (x, y - h / 2), "right": (x + w, y - h / 2)}[side]

def arrow(ax, p, q, style="->", dashed=False, hollow=False, label=None, lpos=0.5, rad=0.0):
    a = FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=11, lw=1, color=LINE,
                        linestyle="--" if dashed else "-", connectionstyle=f"arc3,rad={rad}",
                        fc="white" if hollow else LINE, shrinkA=1, shrinkB=1)
    ax.add_patch(a)
    if label:
        lx, ly = p[0] + (q[0] - p[0]) * lpos, p[1] + (q[1] - p[1]) * lpos
        ax.text(lx, ly, label, fontsize=6.6, color=LINE, ha="center", va="center",
                bbox=dict(fc="white", ec="none", pad=0.6))

fig = plt.figure(figsize=(11, 6.6))
ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
FAC, CTX, STR = "#fdf0e1", "#e3eefa", "#e8f4e8"
cli = box(ax, 0.01, 0.96, 0.15, "Cli", ["contamination", "run ExactMatch", "explain"], "Facade: bin/ios.js", FAC)
det = box(ax, 0.22, 0.96, 0.25, "ContaminationDetector", ["-extractor: PatternExtractor", "+detect(benchmark, corpus)", "+buildPatterns(benchmark)"], "Facade", FAC)
pex = box(ax, 0.55, 0.96, 0.19, "PatternExtractor", ["+extract(text): string[]", "+describe(): string"], "interface · Strategy", STR)
ngr = box(ax, 0.81, 0.98, 0.18, "NgramExtractor", ["+n = 13   (GPT-3)"], None, STR)
sub = box(ax, 0.81, 0.82, 0.18, "SubstringSampleExtractor", ["+length = 50, samples = 3", "(GPT-4)"], None, STR)
em = box(ax, 0.22, 0.66, 0.25, "ExactMatch", ["+strategy, +record", "+estimate(shape)", "+decide(firstDoc): Record", "+run(docs)*: Match"], "Context · molekül", CTX)
reg = box(ax, 0.55, 0.62, 0.19, "Registry", ["+register(AtomClass)", "+create(name, params)", "+atoms(task)"], "Registry · Factory Method", CTX)
sel = box(ax, 0.81, 0.56, 0.18, "Selection", ["+features(shape)", "+defaults", "+applicable(shape)"], "interface", CTX)
atom = box(ax, 0.30, 0.34, 0.34, "ExactSearchAtom", ["+process(doc)*: Match   ← şablon metot", "#prepare()   #search()   #searchOne()"], "abstract · Template Method", CTX)

arrow(ax, anchor(cli, "right"), anchor(det, "left"))
arrow(ax, (0.12, cli[1] - cli[3]), anchor(em, "left"), rad=0.25)
arrow(ax, anchor(det, "right"), anchor(pex, "left"), label="Strategy", lpos=0.5)
arrow(ax, anchor(det, "bottom"), anchor(em, "top"), label="arama", lpos=0.5)
arrow(ax, anchor(ngr, "left"), (pex[0] + pex[2], pex[1] - 0.03), style="-|>", dashed=True, hollow=True)
arrow(ax, anchor(sub, "left"), (pex[0] + pex[2], pex[1] - pex[3] + 0.01), style="-|>", dashed=True, hollow=True)
arrow(ax, anchor(em, "right"), anchor(reg, "left"), label="create()", lpos=0.5)
arrow(ax, (0.30, em[1] - em[3]), (0.36, atom[1]), label="seçilen strateji", lpos=0.55)
arrow(ax, anchor(reg, "bottom"), (0.60, atom[1]), style="-", label="kayıtlı sınıflar", lpos=0.45)
ax.plot([reg[0] + reg[2] / 2], [reg[1] - reg[3] - 0.008], marker="D", ms=6, mfc="white", mec=LINE)
arrow(ax, anchor(atom, "right"), anchor(sel, "bottom"), dashed=True, label="static selection", lpos=0.5, rad=0.15)

names = ["HorspoolSearch", "ShiftOrSearch", "Bm4DnaDsSearch", "Bm4DnaHmbsSearch", "KmpSearch",
         "AhoCorasickSearch", "WuManberSearch", "BoyerMooreSearch", "NaiveSearch"]
groups = ["A grubu", "A grubu", "A grubu", "A grubu", "B grubu", "C grubu", "C grubu", "örnek atom", "test referansı"]
w, gap = 0.104, 0.006
x0 = (1 - (len(names) * w + (len(names) - 1) * gap)) / 2
for i, (name, g) in enumerate(zip(names, groups)):
    x = x0 + i * (w + gap)
    b = box(ax, x, 0.13, w, name, [g], None, "#eef2f6", title_size=6.9)
    arrow(ax, anchor(b, "top"), (atom[0] + 0.02 + i * (atom[2] - 0.04) / (len(names) - 1), atom[1] - atom[3]), style="-|>", hollow=True)
ax.text(0.01, 0.015, "Strategy: atomlar ConcreteStrategy, ExactMatch Context · Template Method: ExactSearchAtom.process() · "
        "Factory Method + Registry: Registry.create(), createExtractor() · Facade: ContaminationDetector, bin/ios.js",
        fontsize=6.8, color=LINE)
fig.savefig(os.path.join(HERE, "sinif_diyagrami.png"), dpi=200)
plt.close(fig)
print("şekiller yazıldı")
