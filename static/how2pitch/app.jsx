// Главное приложение глоссария — точная копия climatewords.org
const { useState, useMemo, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "font": "inter",
  "accent": "#00c25a"
}/*EDITMODE-END*/;

const collator = new Intl.Collator("ru", { sensitivity: "base" });
const firstLetter = (s) => (s || "").trim().charAt(0).toUpperCase() || "#";

// слово считается "готовым" если оно явно ready ИЛИ имеет полное русское определение.
// На старте: ready: true => отображается чёрным, иначе серое
function isReady(item) {
  return !!item.ready;
}

function groupByLetter(items) {
  const map = new Map();
  for (const it of items) {
    const l = firstLetter(it.ru);
    if (!map.has(l)) map.set(l, []);
    map.get(l).push(it);
  }
  for (const arr of map.values()) arr.sort((a, b) => collator.compare(a.ru, b.ru));
  return [...map.entries()].sort((a, b) => collator.compare(a[0], b[0]));
}

function matches(item, q) {
  if (!q) return true;
  const n = q.toLowerCase().trim();
  if (!n) return true;
  if (item.ru.toLowerCase().includes(n)) return true;
  if (item.en && item.en.toLowerCase().includes(n)) return true;
  if (item.aliases && item.aliases.some(a => a.toLowerCase().includes(n))) return true;
  if (item.definition && item.definition.toLowerCase().includes(n)) return true;
  return false;
}

// ---------- TOPBAR ----------
function TopBar({ onOpenMenu }) {
  return (
    <div className="cw-topbar">
      <div className="cw-topbar-left">
        <nav className="cw-topnav">
          <a className="is-active">Словарь</a>
          <a>Читать</a>
          <a>Писать</a>
          <a>Сдавать</a>
        </nav>
      </div>
      <div className="cw-logo">СЛОВАРЬ<sup>®</sup></div>
      <div className="cw-burger-wrap">
        <button className="cw-burger" onClick={onOpenMenu} aria-label="Меню">+</button>
      </div>
    </div>
  );
}

function MobileNav({ onClose }) {
  return (
    <div className="cw-mobile-nav">
      <div className="cw-mobile-nav-top">
        <span></span>
        <div className="cw-logo">СЛОВАРЬ<sup>®</sup></div>
        <button className="cw-mobile-nav-close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <nav className="cw-mobile-nav-main">
        <a onClick={onClose}>Словарь</a>
        <a onClick={onClose}>Читать</a>
        <a onClick={onClose}>Писать</a>
        <a onClick={onClose}>Сдавать</a>
      </nav>
      <nav className="cw-mobile-nav-secondary">
        <a onClick={onClose}>О ПРОЕКТЕ</a>
        <a onClick={onClose}>КОНТАКТЫ</a>
      </nav>
    </div>
  );
}

// ---------- SEARCH ----------
function Search({ value, onChange }) {
  return (
    <div className="cw-search-wrap">
      <input
        type="text"
        className="cw-search"
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
      />
      <svg className="cw-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---------- SUBNAV ----------
function SubNav({ tab, onChange }) {
  const tabs = [
    { id: "list", label: "Список" },
    { id: "az", label: "А-Я" },
    { id: "categories", label: "Категории" },
  ];
  return (
    <nav className="cw-subnav">
      {tabs.map(t => (
        <a
          key={t.id}
          className={tab === t.id ? "is-active" : ""}
          onClick={() => onChange(t.id)}
        >{t.label}</a>
      ))}
    </nav>
  );
}

// ---------- VIEWS ----------
function ListView({ items, onOpen }) {
  // Только готовые
  const ready = items.filter(isReady);
  if (ready.length === 0) return <div className="cw-empty">Пока нет готовых статей</div>;
  const groups = groupByLetter(ready);
  return (
    <div className="cw-list">
      {groups.map(([letter, arr]) => (
        <React.Fragment key={letter}>
          <div className="cw-list-letter">{letter}</div>
          {arr.map(it => (
            <a key={it.ru} className="cw-list-word" onClick={() => onOpen(it)}>{it.ru}</a>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function AzView({ items, onOpen }) {
  if (items.length === 0) return <div className="cw-empty">Ничего не найдено</div>;
  const groups = groupByLetter(items);
  return (
    <div className="cw-az">
      {groups.map(([letter, arr]) => (
        <div key={letter} className="cw-az-section">
          <div className="cw-az-letter">{letter}</div>
          {arr.map(it => {
            const ready = isReady(it);
            return (
              <a
                key={it.ru}
                className={"cw-az-word" + (ready ? "" : " is-stub")}
                onClick={() => onOpen(it)}
              >{it.ru}</a>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CategoriesView({ items, clusters, active, onPick, onOpen }) {
  // Собираем используемые категории
  const used = new Map();
  for (const [k, title] of Object.entries(clusters)) {
    const has = items.some(it => it.clusters.includes(k));
    if (has) used.set(k, title);
  }
  const cats = [...used.entries()];
  cats.sort((a, b) => collator.compare(a[1], b[1]));

  // Если активна категория — только слова из неё чёрные, остальные серые
  return (
    <>
      <div className="cw-categories-flow">
        {cats.map(([k, title], i) => (
          <React.Fragment key={k}>
            <a
              className={"cw-cat-link" + (active === k ? " is-active" : "")}
              onClick={() => onPick(active === k ? null : k)}
            >{title}</a>
            {i < cats.length - 1 && <span>, </span>}
          </React.Fragment>
        ))}
      </div>

      {active && <div className="cw-cat-words">
        {[...items].sort((a, b) => collator.compare(a.ru, b.ru)).map((it, i, arr) => {
          const dim = !it.clusters.includes(active);
          return (
            <React.Fragment key={it.ru}>
              <a
                className={"cw-cat-word" + (dim ? " is-dim" : "")}
                onClick={() => onOpen(it)}
              >{it.ru}</a>
              {i < arr.length - 1 ? "\u200B" : null}
            </React.Fragment>
          );
        })}
      </div>}
    </>
  );
}

// ---------- WORD MODAL ----------
function renderBody(text, allMap, onOpen) {
  const parts = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const linkText = m[1];
    const stem = linkText.toLowerCase().replace(/[ыоейаяи]+$/, "");
    const target = allMap.get(linkText.toLowerCase()) ||
      [...allMap.values()].find(t => t.ru.toLowerCase().startsWith(stem) ||
        (t.aliases && t.aliases.some(a => a.toLowerCase() === linkText.toLowerCase())));
    if (target && isReady(target)) {
      parts.push(
        <a key={k++} className="cw-inline-link"
           onClick={() => onOpen(target)}>{linkText}</a>
      );
    } else {
      parts.push(<span key={k++} className="cw-inline-link cw-inline-link--dead">{linkText}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

function WordModal({ item, items, clusters, onOpen, onPickCategory, onClose }) {
  const allMap = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      m.set(it.ru.toLowerCase(), it);
      if (it.en) m.set(it.en.toLowerCase(), it);
      if (it.aliases) for (const a of it.aliases) m.set(a.toLowerCase(), it);
    }
    return m;
  }, [items]);

  // Для каждого кластера термина — список остальных слов из этого кластера
  const byCluster = useMemo(() => {
    return item.clusters.map(c => ({
      key: c,
      title: clusters[c] || c,
      words: items
        .filter(x => x !== item && x.clusters.includes(c))
        .sort((a, b) => collator.compare(a.ru, b.ru)),
    }));
  }, [item, items, clusters]);

  // Incoming wikilinks: кто упоминает [[item.ru]] или [[item.en]] или один из алиасов в своём definition
  const incoming = useMemo(() => {
    const targets = new Set([
      item.ru.toLowerCase(),
      ...(item.en ? [item.en.toLowerCase()] : []),
      ...(item.aliases || []).map(a => a.toLowerCase()),
    ]);
    const out = [];
    for (const x of items) {
      if (x === item || !x.definition) continue;
      const re = /\[\[([^\]]+)\]\]/g;
      let m;
      while ((m = re.exec(x.definition)) !== null) {
        const linkText = m[1].toLowerCase();
        // прямое совпадение
        if (targets.has(linkText)) { out.push(x); break; }
        // ссылка указывает на term который через allMap резолвится в наш item
        const resolved = allMap.get(linkText);
        if (resolved === item) { out.push(x); break; }
      }
    }
    return out.sort((a, b) => collator.compare(a.ru, b.ru));
  }, [item, items, allMap]);

  const ready = isReady(item);
  const paragraphs = ready ? (item.definition || "").split(/\n\n+/) : [];

  // Esc → закрыть
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // фиксируем скролл фона + при смене термина модалку прокрутить наверх
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // прокрутить наверх когда меняется term
  useEffect(() => {
    // скроллим backdrop (он у нас overflow-y: auto)
    const bd = document.querySelector(".cw-modal-backdrop");
    if (bd) bd.scrollTop = 0;
    // на всякий случай и window — на мобиле модалка часть document flow
    window.scrollTo(0, 0);
  }, [item]);

  const hasRelated = byCluster.some(b => b.words.length > 0) || incoming.length > 0;

  return (
    <div className="cw-modal-backdrop" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-top">
          <div className="cw-modal-brand">{item.ru}</div>
          <button className="cw-modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <h1 className="cw-modal-title">{item.ru}</h1>

        <div className="cw-modal-body-wrap">
          <div className="cw-modal-body">
            {ready ? paragraphs.map((p, i) => (
              <p key={i}>{renderBody(p, allMap, onOpen)}</p>
            )) : (
              <div className="cw-coming-soon">Определение скоро появится.</div>
            )}
          </div>
        </div>

        {hasRelated && (
          <div className="cw-related-grid">
            {byCluster.map(b => b.words.length > 0 && (
              <section key={b.key} className="cw-related-section">
                <div className="cw-related-label">
                  Другие термины из категории «{b.title}»
                </div>
                <div className="cw-related-list">
                  {b.words.map(it => (
                    <a
                      key={it.ru}
                      className="cw-related-link"
                      onClick={() => onOpen(it)}
                    >{it.ru}</a>
                  ))}
                </div>
              </section>
            ))}
            {incoming.length > 0 && (
              <section className="cw-related-section">
                <div className="cw-related-label">На этот термин ссылаются</div>
                <div className="cw-related-list">
                  {incoming.map(it => (
                    <a key={it.ru} className="cw-related-link" onClick={() => onOpen(it)}>{it.ru}</a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- APP ----------
function App() {
  const items = window.GLOSSARY;
  const clusters = window.CLUSTERS;

  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // применяем шрифт и цвет акцента
  useEffect(() => {
    document.documentElement.setAttribute("data-font", t.font);
    document.documentElement.style.setProperty("--green", t.accent);
  }, [t.font, t.accent]);

  const filtered = useMemo(() => items.filter(it => matches(it, query)), [items, query]);

  return (
    <div className="cw">
      <TopBar onOpenMenu={() => setMenuOpen(true)} />

      <Search value={query} onChange={setQuery} />
      <SubNav tab={tab} onChange={(t) => { setTab(t); setActiveCat(null); }} />

      {tab === "list" && <ListView items={filtered} onOpen={setOpenItem} />}
      {tab === "az" && <AzView items={filtered} onOpen={setOpenItem} />}
      {tab === "categories" && (
        <CategoriesView
          items={filtered}
          clusters={clusters}
          active={activeCat}
          onPick={setActiveCat}
          onOpen={setOpenItem}
        />
      )}

      <div className="cw-footer-spacer" />

      {openItem && (
        <WordModal
          item={openItem}
          items={items}
          clusters={clusters}
          onOpen={setOpenItem}
          onPickCategory={(c) => {
            setOpenItem(null);
            setTab("categories");
            setActiveCat(c);
          }}
          onClose={() => setOpenItem(null)}
        />
      )}

      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}

      <TweaksPanel>
        <TweakSection label="Шрифт" />
        <TweakSelect
          label="Семейство"
          value={t.font}
          options={[
            { value: "inter",     label: "Inter Tight" },
            { value: "manrope",   label: "Manrope" },
            { value: "geologica", label: "Geologica" },
            { value: "onest",     label: "Onest" },
            { value: "unbounded", label: "Unbounded" },
            { value: "golos",     label: "Golos Text" },
          ]}
          onChange={(v) => setTweak("font", v)}
        />
        <TweakSection label="Акцент" />
        <TweakColor
          label="Цвет ссылок"
          value={t.accent}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
