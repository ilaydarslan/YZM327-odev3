// İş akışı motoru (DOM'suz): kutular, bağlantılar, tür denetimi ve çalıştırma.
// IoS'taki dördüncü katman: bileşenleri birbirine bağlar. Editör yalnızca bu sınıfı kullanır.

export class Workflow {
  constructor(components) {
    this.components = components;
    this.nodes = new Map();
    this.edges = []; // { from, to, port }
    this.nextId = 1;
  }

  definition(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Kutu yok: ${id}`);
    return this.components[node.type];
  }

  addNode(type, x = 0, y = 0) {
    const def = this.components[type];
    if (!def) throw new Error(`Bilinmeyen bileşen: ${type}`);
    const id = `n${this.nextId++}`;
    const config = Object.fromEntries(Object.entries(def.config).map(([key, c]) => [key, c.value]));
    this.nodes.set(id, { id, type, x, y, config });
    return id;
  }

  removeNode(id) {
    this.nodes.delete(id);
    this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
  }

  /** from kutusunun çıktısını to kutusunun port girdisine bağlar. Aynı porta önceki bağlantının yerini alır. */
  connect(from, to, port) {
    const out = this.definition(from).output;
    const input = this.definition(to).inputs.find((p) => p.name === port);
    if (!out) throw new Error('Bu kutunun çıktısı yok');
    if (!input) throw new Error(`Girdi yok: ${port}`);
    if (input.type !== 'any' && input.type !== out) {
      throw new Error(`Tür uyumsuz: "${out}" çıktısı "${input.type}" girdisine bağlanamaz`);
    }
    if (from === to || this.reaches(to, from)) throw new Error('Bu bağlantı döngü oluşturur');
    this.edges = this.edges.filter((e) => !(e.to === to && e.port === port));
    this.edges.push({ from, to, port });
  }

  /** a'dan b'ye bağlantılar üzerinden gidilebiliyor mu? */
  reaches(a, b) {
    const stack = [a];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (cur === b) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of this.edges) if (e.from === cur) stack.push(e.to);
    }
    return false;
  }

  /** Bütün kutuları çalıştırır. Dönüş: Map(id → { value } | { error }). ctx.load(dosyaAdı) veri okur. */
  async run(ctx) {
    const results = new Map();
    const evaluate = async (id) => {
      if (results.has(id)) return results.get(id);
      const node = this.nodes.get(id);
      const def = this.components[node.type];
      const inputs = {};
      let result;
      for (const port of def.inputs) {
        const edge = this.edges.find((e) => e.to === id && e.port === port.name);
        if (!edge) {
          result = { error: `"${port.label}" girdisi bağlı değil` };
          break;
        }
        const upstream = await evaluate(edge.from);
        if (upstream.error) {
          result = { error: 'Önceki adım hata verdi' };
          break;
        }
        inputs[port.name] = upstream.value;
      }
      if (!result) {
        const started = Date.now();
        try {
          result = { value: await def.run(inputs, node.config, ctx), ms: Date.now() - started };
        } catch (err) {
          result = { error: err.message };
        }
      }
      results.set(id, result);
      return result;
    };
    for (const id of this.nodes.keys()) await evaluate(id);
    return results;
  }

  toJSON() {
    return { nodes: [...this.nodes.values()], edges: this.edges };
  }
}

/** Hazır akışlar: editörde tek tıkla yüklenir. */
export const PRESETS = {
  'Şartname: explain (lambda)': (wf) => {
    const data = wf.addNode('data.lambda', 40, 60);
    const pats = wf.addNode('patterns.manual', 40, 260);
    const em = wf.addNode('search.exactMatch', 340, 140);
    const view = wf.addNode('view.result', 640, 160);
    wf.connect(data, em, 'docs');
    wf.connect(pats, em, 'patterns');
    wf.connect(em, view, 'value');
  },
  'Kirlenme taraması (GSM8K)': (wf) => {
    const test = wf.addNode('data.gsm8kTest', 40, 60);
    const train = wf.addNode('data.gsm8kTrain', 40, 260);
    const det = wf.addNode('detect.contamination', 340, 140);
    const view = wf.addNode('view.result', 640, 160);
    wf.connect(test, det, 'questions');
    wf.connect(train, det, 'corpus');
    wf.connect(det, view, 'value');
  },
  'Normalize + arama': (wf) => {
    const train = wf.addNode('data.gsm8kTrain', 40, 60);
    const norm = wf.addNode('transform.normalize', 300, 60);
    const pats = wf.addNode('patterns.manual', 300, 260);
    wf.nodes.get(pats).config.patterns = 'how many,in total';
    const em = wf.addNode('search.exactMatch', 560, 140);
    const view = wf.addNode('view.result', 840, 160);
    wf.connect(train, norm, 'docs');
    wf.connect(norm, em, 'docs');
    wf.connect(pats, em, 'patterns');
    wf.connect(em, view, 'value');
  },
};
