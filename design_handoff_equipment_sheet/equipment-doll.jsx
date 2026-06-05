// equipment-doll.jsx — the full equipment sheet, theme-agnostic.
// Layout is fixed-size (820 x 1180). Themes restyle via a wrapper class.
// All fields are real, uncontrolled <input>s so they're directly fillable
// and easy for a dev to wire up later.

const Silhouette = window.Silhouette;

const ZONE_W = 820;
const ZONE_H = 760;      // figure zone height
const BOX_W = 220;
const L_X = 28, L_INNER = 28 + BOX_W;     // 248
const R_X = ZONE_W - 28 - BOX_W;          // 572
const R_INNER = R_X;                       // 572
const FIG_X = 260, FIG_Y = 120;            // silhouette offset inside zone

// slot = { key, label, top, h, anchor:[x,y] }
const LEFT = [
  { key: "head",   label: "Head",      top: 120, h: 76, anchor: [410, 162] },
  { key: "eyes",   label: "Eyes",      top: 214, h: 76, anchor: [400, 206] },
  { key: "neck",   label: "Neck",      top: 308, h: 76, anchor: [404, 240] },
  { key: "should", label: "Shoulders", top: 402, h: 76, anchor: [360, 286] },
  { key: "hands",  label: "Hands",     top: 496, h: 76, anchor: [388, 436] },
  { key: "ring1",  label: "Ring \u2160", top: 590, h: 76, anchor: [380, 448] },
];
const RIGHT = [
  { key: "back",   label: "Back",        top: 120, h: 70, anchor: [442, 322] },
  { key: "torso",  label: "Torso / Body",top: 206, h: 70, anchor: [410, 352] },
  { key: "arms",   label: "Arms / Wrists",top: 292, h: 70, anchor: [508, 376] },
  { key: "waist",  label: "Waist",       top: 378, h: 70, anchor: [412, 424] },
  { key: "legs",   label: "Legs",        top: 464, h: 70, anchor: [440, 588] },
  { key: "feet",   label: "Feet",        top: 550, h: 70, anchor: [452, 726] },
  { key: "ring2",  label: "Ring \u2161", top: 636, h: 70, anchor: [432, 440] },
];

function SlotBox({ slot, side }) {
  const x = side === "L" ? L_X : R_X;
  return (
    <div className="slot" style={{ left: x, top: slot.top, width: BOX_W, height: slot.h }}>
      <div className="slot-head">
        <span className="slot-dot" />
        <span className="slot-label">{slot.label}</span>
      </div>
      <input className="slot-input" type="text" placeholder="—" aria-label={slot.label} />
    </div>
  );
}

function Connectors({ gender }) {
  const lines = [];
  LEFT.forEach((s) => {
    const cy = s.top + s.h / 2;
    lines.push({ k: s.key, sx: L_INNER, sy: cy, mx: L_INNER + 16, my: cy, ax: s.anchor[0], ay: s.anchor[1] });
  });
  RIGHT.forEach((s) => {
    const cy = s.top + s.h / 2;
    lines.push({ k: s.key, sx: R_INNER, sy: cy, mx: R_INNER - 16, my: cy, ax: s.anchor[0], ay: s.anchor[1] });
  });
  return (
    <svg className="connectors" viewBox={`0 0 ${ZONE_W} ${ZONE_H}`} width={ZONE_W} height={ZONE_H} aria-hidden="true">
      {lines.map((l) => (
        <g key={l.k} className="conn">
          <polyline points={`${l.sx},${l.sy} ${l.mx},${l.my} ${l.ax},${l.ay}`}
                    fill="none" className="conn-line" />
          <circle cx={l.sx} cy={l.sy} r="3.5" className="conn-stub" />
          <circle cx={l.ax} cy={l.ay} r="5.5" className="conn-node" />
        </g>
      ))}
    </svg>
  );
}

function ArsenalRow({ label, name }) {
  return (
    <div className="ars-row">
      <span className="ars-label">{label}</span>
      <input className="ars-input" type="text" placeholder="—" aria-label={label} />
    </div>
  );
}

function Footer() {
  return (
    <div className="sheet-foot">
      <section className="foot-col arsenal">
        <h3 className="foot-title">Arsenal</h3>
        <ArsenalRow label="Melee Weapon" />
        <ArsenalRow label="Ranged Weapon" />
        <ArsenalRow label="Shield / Off-hand" />
        <div className="coins">
          <span className="ars-label">Coin Purse</span>
          <div className="coin-fields">
            <label className="coin gp"><input type="text" placeholder="0" aria-label="Gold" /><span>GP</span></label>
            <label className="coin sp"><input type="text" placeholder="0" aria-label="Silver" /><span>SP</span></label>
            <label className="coin cp"><input type="text" placeholder="0" aria-label="Copper" /><span>CP</span></label>
          </div>
        </div>
      </section>
      <section className="foot-col pack">
        <h3 className="foot-title">Backpack &amp; Carried</h3>
        <div className="pack-list">
          {Array.from({ length: 7 }).map((_, i) => (
            <div className="pack-row" key={i}>
              <input className="pack-item" type="text" placeholder={i === 0 ? "Item\u2026" : ""} aria-label={`Item ${i + 1}`} />
              <input className="pack-qty" type="text" placeholder={i === 0 ? "x" : ""} aria-label={`Qty ${i + 1}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EquipmentDoll({ gender = "male" }) {
  return (
    <div className={`sheet gender-${gender}`}>
      <header className="sheet-head">
        <label className="field name">
          <span className="field-label">Character</span>
          <input type="text" placeholder="Name your adventurer" aria-label="Character name" />
        </label>
        <label className="field cls">
          <span className="field-label">Class</span>
          <input type="text" placeholder="—" aria-label="Class" />
        </label>
        <label className="field lvl">
          <span className="field-label">Lv</span>
          <input type="text" placeholder="1" aria-label="Level" />
        </label>
      </header>

      <div className="figure-zone" style={{ height: ZONE_H }}>
        <Connectors gender={gender} />
        <div className="figure" style={{ left: FIG_X, top: FIG_Y, width: 300, height: 640 }}>
          <Silhouette gender={gender} />
        </div>
        {LEFT.map((s) => <SlotBox key={s.key} slot={s} side="L" />)}
        {RIGHT.map((s) => <SlotBox key={s.key} slot={s} side="R" />)}
      </div>

      <Footer />
    </div>
  );
}

window.EquipmentDoll = EquipmentDoll;
