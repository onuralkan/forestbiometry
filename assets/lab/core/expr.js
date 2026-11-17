// Formula expressions for the nonlinear regression tool (PLATFORM_PLAN SM-02; user decision 17 Nov 2026: free formulas
// next to the ready-made forms). No DOM, no eval(): a small recursive-descent parser builds a tree that is evaluated
// directly, with exact first derivatives by forward-mode differentiation (dual numbers), for the Jacobian of nonlinear
// least squares. Grammar (usual precedence; ^ binds tighter than unary minus and is right-associative: −x^2 = −(x^2),
// 2^3^2 = 2^9):
//   expr  = term {(+|−) term}      term = unary {(*|/) unary}      unary = (+|−) unary | power
//   power = primary [^ unary]      primary = number | name | name(expr) | (expr)
// Functions: exp, ln, log10, sqrt, abs. Constant: pi. "log" is refused (ln or log10 must be written). · × and −
// are read as * and −. Names: a letter or _ then letters, digits, _. Limits: 500 characters, nesting depth 60.

export const FUNCS = ['exp', 'ln', 'log10', 'sqrt', 'abs'];
const MAXLEN = 500, MAXDEPTH = 60;

class ExprError extends Error { constructor(code, pos, extra = {}) { super(code); this.code = code; this.pos = pos; Object.assign(this, extra); } }

function tokenize(src) {
  const s = String(src).replace(/[·×]/g, '*').replace(/[−–]/g, '-'), out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
    if (m) { out.push({ t: 'num', v: Number(m[0]), pos: i }); i += m[0].length; continue; }
    const n = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (n) { out.push({ t: 'name', v: n[0], pos: i }); i += n[0].length; continue; }
    if ('+-*/^(),'.includes(c)) { out.push({ t: c, pos: i }); i++; continue; }
    throw new ExprError('char', i, { char: c });
  }
  out.push({ t: 'end', pos: s.length });
  return out;
}

/** Parses a formula. → { ok: true, ast, names: [identifiers in first-use order] } | { ok: false, code, pos, … } */
export function parse(src) {
  try {
    if (typeof src !== 'string' || !src.trim()) throw new ExprError('empty', 0);
    if (src.length > MAXLEN) throw new ExprError('long', MAXLEN);
    const tk = tokenize(src), names = [];
    let k = 0, depth = 0;
    const peek = () => tk[k], take = t => { if (tk[k].t !== t) throw new ExprError(tk[k].t === 'end' ? 'end' : 'expected', tk[k].pos, { want: t }); return tk[k++]; };
    const enter = () => { if (++depth > MAXDEPTH) throw new ExprError('deep', peek().pos); };
    function expr() { enter(); let a = term(); while (peek().t === '+' || peek().t === '-') { const op = tk[k++].t; a = { k: op, a, b: term() }; } depth--; return a; }
    function term() { let a = unary(); while (peek().t === '*' || peek().t === '/') { const op = tk[k++].t; a = { k: op, a, b: unary() }; } return a; }
    function unary() { if (peek().t === '-') { k++; enter(); const u = { k: 'neg', a: unary() }; depth--; return u; } if (peek().t === '+') { k++; return unary(); } return power(); }
    function power() { const a = primary(); if (peek().t === '^') { k++; enter(); const p = { k: '^', a, b: unary() }; depth--; return p; } return a; }
    function primary() {
      const t = peek();
      if (t.t === 'num') { k++; return { k: 'num', v: t.v }; }
      if (t.t === '(') { k++; const e = expr(); take(')'); return e; }
      if (t.t === 'name') {
        k++;
        if (peek().t === '(') {
          if (t.v === 'log') throw new ExprError('log', t.pos);
          if (!FUNCS.includes(t.v)) throw new ExprError('func', t.pos, { name: t.v });
          k++; const e = expr(); if (peek().t === ',') throw new ExprError('args', peek().pos, { name: t.v }); take(')'); return { k: 'fn', f: t.v, a: e };
        }
        if (FUNCS.includes(t.v) || t.v === 'log') throw new ExprError('funcname', t.pos, { name: t.v });
        if (t.v === 'pi') return { k: 'num', v: Math.PI, pi: true };
        if (!names.includes(t.v)) names.push(t.v);
        return { k: 'name', v: t.v };
      }
      throw new ExprError(t.t === 'end' ? 'end' : 'token', t.pos, { token: t.t });
    }
    const ast = expr();
    if (peek().t !== 'end') throw new ExprError('trailing', peek().pos);
    return { ok: true, ast, names };
  } catch (e) {
    if (e instanceof ExprError) { const { message, stack, ...rest } = e; return { ok: false, code: e.code, pos: e.pos, ...rest }; }
    throw e;
  }
}

/** Value of a parsed tree; env maps names to numbers. Non-finite results come back as NaN/±Infinity. */
export function evaluate(ast, env) {
  switch (ast.k) {
    case 'num': return ast.v;
    case 'name': return env[ast.v];
    case 'neg': return -evaluate(ast.a, env);
    case '+': return evaluate(ast.a, env) + evaluate(ast.b, env);
    case '-': return evaluate(ast.a, env) - evaluate(ast.b, env);
    case '*': return evaluate(ast.a, env) * evaluate(ast.b, env);
    case '/': return evaluate(ast.a, env) / evaluate(ast.b, env);
    case '^': return evaluate(ast.a, env) ** evaluate(ast.b, env);
    case 'fn': { const u = evaluate(ast.a, env); return ast.f === 'exp' ? Math.exp(u) : ast.f === 'ln' ? Math.log(u) : ast.f === 'log10' ? Math.log10(u) : ast.f === 'sqrt' ? Math.sqrt(u) : Math.abs(u); }
    default: return NaN;
  }
}

/**
 * Value and gradient with respect to the names in `wrt` (forward mode). env maps every name to a number.
 * → { v, d: [∂/∂wrt_j] }
 */
export function evalGrad(ast, env, wrt) {
  const p = wrt.length, idx = new Map(wrt.map((n, j) => [n, j])), zero = () => new Array(p).fill(0);
  const go = n => {
    switch (n.k) {
      case 'num': return { v: n.v, d: zero() };
      case 'name': { const d = zero(); if (idx.has(n.v)) d[idx.get(n.v)] = 1; return { v: env[n.v], d }; }
      case 'neg': { const a = go(n.a); return { v: -a.v, d: a.d.map(x => -x) }; }
      case '+': case '-': { const a = go(n.a), b = go(n.b), s = n.k === '+' ? 1 : -1; return { v: a.v + s * b.v, d: a.d.map((x, j) => x + s * b.d[j]) }; }
      case '*': { const a = go(n.a), b = go(n.b); return { v: a.v * b.v, d: a.d.map((x, j) => x * b.v + a.v * b.d[j]) }; }
      case '/': { const a = go(n.a), b = go(n.b), v = a.v / b.v; return { v, d: a.d.map((x, j) => (x - v * b.d[j]) / b.v) }; }
      case '^': {
        const a = go(n.a), b = go(n.b), v = a.v ** b.v, bConst = b.d.every(x => x === 0);
        // u^w: w·u^(w−1)·u' when w does not depend on the parameters (avoids ln u for u ≤ 0), else u^w·(w'·ln u + w·u'/u)
        if (bConst) { const c = b.v === 0 ? 0 : b.v * a.v ** (b.v - 1); return { v, d: a.d.map(x => x === 0 ? 0 : c * x) }; }
        const lu = Math.log(a.v); return { v, d: a.d.map((x, j) => v * (b.d[j] * lu + (x === 0 ? 0 : b.v * x / a.v))) };
      }
      case 'fn': {
        const a = go(n.a), u = a.v;
        const [v, du] = n.f === 'exp' ? [Math.exp(u), Math.exp(u)] : n.f === 'ln' ? [Math.log(u), 1 / u] : n.f === 'log10' ? [Math.log10(u), 1 / (u * Math.LN10)]
          : n.f === 'sqrt' ? [Math.sqrt(u), 0.5 / Math.sqrt(u)] : [Math.abs(u), Math.sign(u)];
        return { v, d: a.d.map(x => x === 0 ? 0 : du * x) };
      }
      default: return { v: NaN, d: zero() };
    }
  };
  return go(ast);
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
/** Canonical text of a tree (minimal parentheses, ASCII operators): the same formula always prints the same. */
export function toText(n) {
  const wrap = (c, need) => need ? `(${toText(c)})` : toText(c), pr = c => c.k in PREC ? PREC[c.k] : 9;
  switch (n.k) {
    case 'num': return n.pi ? 'pi' : String(n.v);
    case 'name': return n.v;
    case 'fn': return `${n.f}(${toText(n.a)})`;
    case 'neg': return '-' + wrap(n.a, pr(n.a) < PREC.neg || n.a.k === 'neg');
    case '^': return wrap(n.a, pr(n.a) <= PREC['^']) + '^' + wrap(n.b, pr(n.b) < PREC.neg);
    default: { const p = PREC[n.k], right = n.k === '-' || n.k === '/'; return wrap(n.a, pr(n.a) < p) + n.k + wrap(n.b, right ? pr(n.b) <= p : pr(n.b) < p); }
  }
}
