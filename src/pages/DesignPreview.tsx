const designs = [
  {
    num: 1, name: "Tactical Radio", ar: "لاسلكي عسكري", tag: "قوي واحترافي",
    accent: "#7ecf3a", bg: "#080e04", screen: "#0b1508", border: "#1e3810",
    dark: "#060e04", mid: "#0d1a08", pttBg: "#1a3a0a",
    lcd: "TOWER 2", sub: "MESH ACTIVE · 4 PEERS",
    ptt: "PUSH TO TALK",
  },
  {
    num: 2, name: "Aviation Cockpit", ar: "كوكبيت طائرة", tag: "تقني وأنيق",
    accent: "#4a9eff", bg: "#040810", screen: "#060c1a", border: "#102040",
    dark: "#030810", mid: "#040c18", pttBg: "#081428",
    lcd: "TOWER-2", sub: "SQ: ON · PWR: HIGH · CH-02",
    ptt: "TRANSMIT",
  },
  {
    num: 3, name: "UAE Premium Gold", ar: "هوية إماراتية", tag: "ذهبي فاخر",
    accent: "#d4a020", bg: "#0c0a06", screen: "#0e0c08", border: "#3a2808",
    dark: "#100c06", mid: "#140e08", pttBg: "#1a1408",
    lcd: "TOWER 2", sub: "التدريب النشط · 4 متصلين",
    ptt: "اضغط للتحدث",
  },
  {
    num: 4, name: "Neon Cyber", ar: "مستقبلي نيون", tag: "عصري وجريء",
    accent: "#a050ff", bg: "#060410", screen: "#080618", border: "#1e1030",
    dark: "#040210", mid: "#0a0618", pttBg: "#100828",
    lcd: "TOWER 2", sub: "CHANNEL ACTIVE · 4 PEERS",
    ptt: "PUSH TO TALK",
  },
  {
    num: 5, name: "Industrial Pro", ar: "صناعي احترافي", tag: "برتقالي ناري",
    accent: "#ff6018", bg: "#0c0c0c", screen: "#080808", border: "#282828",
    dark: "#000000", mid: "#101010", pttBg: "#101010",
    lcd: "TOWER-2", sub: "SIGNAL STRONG · PTT READY",
    ptt: "PUSH TO TALK",
  },
];

const DesignPreview = () => (
  <div style={{ background: "#111", minHeight: "100vh", padding: "32px 16px", fontFamily: "Arial, sans-serif" }}>
    <h1 style={{ color: "#fff", textAlign: "center", fontSize: 24, marginBottom: 8 }}>🎨 تصاميم Emirates Mobility</h1>
    <p style={{ color: "#555", textAlign: "center", fontSize: 13, marginBottom: 36 }}>اختر رقم التصميم المناسب</p>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
      {designs.map((d) => (
        <div key={d.num} style={{
          width: 230, borderRadius: 28, padding: 14,
          background: d.bg, border: `1px solid ${d.border}`,
          boxShadow: `0 0 40px ${d.accent}22`, position: "relative",
        }}>
          {/* Badge */}
          <div style={{
            position: "absolute", top: 12, right: 12,
            width: 26, height: 26, borderRadius: "50%",
            background: `${d.accent}22`, border: `1px solid ${d.accent}55`,
            color: d.accent, fontWeight: 900, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{d.num}</div>

          {/* Label */}
          <div style={{ textAlign: "center", marginBottom: 14, paddingTop: 4 }}>
            <div style={{ color: d.accent, fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{d.name}</div>
            <div style={{ color: d.accent + "88", fontSize: 10, marginBottom: 6 }}>{d.ar}</div>
            <span style={{
              background: `${d.accent}18`, color: d.accent,
              border: `1px solid ${d.accent}33`,
              padding: "2px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700,
            }}>{d.tag}</span>
          </div>

          {/* Screen */}
          <div style={{ background: d.screen, border: `1px solid ${d.border}`, borderRadius: 18, padding: 14 }}>

            {/* Top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: d.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>EM · COMMS</span>
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                {[5, 9, 13, 17].map((h, i) => (
                  <div key={i} style={{ width: 3, height: h, background: d.accent, borderRadius: 2, opacity: 0.4 + i * 0.2 }} />
                ))}
              </div>
            </div>

            {/* LCD */}
            <div style={{
              background: d.dark, border: `1px solid ${d.border}`,
              borderRadius: 10, padding: "10px 12px", marginBottom: 8,
            }}>
              <div style={{ color: d.accent, fontSize: 18, fontWeight: 900, fontFamily: "monospace" }}>{d.lcd}</div>
              <div style={{ color: d.accent + "55", fontSize: 9, marginTop: 2, letterSpacing: 1 }}>{d.sub}</div>
            </div>

            {/* Chips */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ background: `${d.accent}22`, color: d.accent, border: `1px solid ${d.accent}44`, padding: "2px 8px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>● CONNECTED</span>
              <span style={{ background: d.mid, color: d.accent + "88", padding: "2px 8px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>4 PEERS</span>
            </div>

            {/* Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
              {["🚗 Cars", "👤 Inst.", "# Dial"].map((label) => (
                <div key={label} style={{
                  background: d.mid, border: `1px solid ${d.border}`,
                  borderRadius: 8, padding: "7px 4px", textAlign: "center",
                  color: d.accent + "88", fontSize: 8, fontWeight: 700,
                }}>{label}</div>
              ))}
            </div>

            {/* PTT */}
            <div style={{
              background: d.pttBg, border: `2px solid ${d.accent}44`,
              borderRadius: 12, padding: 14, textAlign: "center",
              color: d.accent, fontSize: 12, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>🎙 {d.ptt}</div>
          </div>
        </div>
      ))}
    </div>

    <p style={{ textAlign: "center", marginTop: 40, color: "#444", fontSize: 13 }}>
      اختر رقماً من 1 إلى 5 — ثم أخبر الذكاء الاصطناعي
    </p>
  </div>
);

export default DesignPreview;
