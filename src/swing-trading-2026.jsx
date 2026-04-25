import { useState, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import * as XLSX from "xlsx";

const MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const MONTHS_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const DEFAULT_GOAL = 750;
const START_YEAR = 2026;
const PIE_COLORS = ["#00e5ff", "#00ff88", "#ffd700", "#4aaeff", "#ff6b6b", "#aa88ff", "#ff8c00", "#ff4da6", "#c8ff00", "#ff9d5c", "#7effb2", "#c084fc"];

const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script — Swing Trading App (Backend)
 *
 * INSTRUCCIONES:
 * 1. Abre tu Google Sheet
 * 2. Ve a Extensiones → Apps Script
 * 3. Borra todo el código existente y pega este archivo completo
 * 4. Guarda (Ctrl+S)
 * 5. Implementar → Nueva implementación → Tipo: App web
 * 6. Ejecutar como: Tu cuenta | Acceso: "Cualquier persona"
 * 7. Copia la URL generada y pégala en la app
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";

  if (action === "get") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("AppData");

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var raw = sheet.getRange("A1").getValue();
    var data = {};

    try {
      data = JSON.parse(raw);
    } catch (err) {
      data = {};
    }

    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: "Acción no reconocida" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.parameter.data;
    var data = JSON.parse(raw);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Crear hoja AppData si no existe
    var sheet = ss.getSheetByName("AppData");
    if (!sheet) {
      sheet = ss.insertSheet("AppData");
    }

    // Guardar JSON completo en A1
    sheet.getRange("A1").setValue(JSON.stringify(data));

    // Escribir vista legible
    writeReadableView(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeReadableView(ss, data) {
  var MONTHS = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
                "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

  // --- Hoja por cada año ---
  if (data.allData) {
    var years = Object.keys(data.allData).sort();
    for (var y = 0; y < years.length; y++) {
      var yr = years[y];
      var sheetName = "Vista_" + yr;
      var vs = ss.getSheetByName(sheetName);
      if (!vs) vs = ss.insertSheet(sheetName);
      vs.clear();

      var rows = [["MES", "G/L TRADING", "CAPITAL", "G/L ACCIONES", "TOTAL"]];
      var months = data.allData[yr];

      for (var m = 0; m < 12; m++) {
        var r = months[m] || {};
        var td = r.tradingDetail || [];
        var tSum = td.length > 0
          ? td.reduce(function(s,d){ return s + d.ganancia; }, 0)
          : (r.trading === "" ? "" : r.trading);
        var cSum = td.length > 0
          ? td.reduce(function(s,d){ return s + d.capital; }, 0)
          : (r.capital === "" ? "" : r.capital);
        var aSum = (r.accionesDetail || [])
          .filter(function(d){ return d.tipo !== "compra"; })
          .reduce(function(s,d){ return s + (d.monto || 0); }, 0);
        var total = (tSum === "" ? 0 : tSum) + aSum;
        rows.push([MONTHS[m], tSum, cSum, aSum || "", total || ""]);
      }

      vs.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // --- Hoja Portafolio ---
  if (data.portfolio && data.portfolio.length > 0) {
    var ps = ss.getSheetByName("Vista_Portafolio");
    if (!ps) ps = ss.insertSheet("Vista_Portafolio");
    ps.clear();

    var pRows = [["TICKER", "ACCIONES", "PRECIO", "VALOR"]];
    for (var p = 0; p < data.portfolio.length; p++) {
      var s = data.portfolio[p];
      pRows.push([s.ticker, s.shares, s.price, (s.shares * s.price)]);
    }
    ps.getRange(1, 1, pRows.length, pRows[0].length).setValues(pRows);
  }

  // --- Cash y Meta ---
  var infoSheet = ss.getSheetByName("Vista_Info");
  if (!infoSheet) infoSheet = ss.insertSheet("Vista_Info");
  infoSheet.clear();
  infoSheet.getRange(1, 1, 2, 2).setValues([
    ["CASH", data.cash || 0],
    ["META", data.goal || 750]
  ]);
}
`;

const downloadScript = () => {
  const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "google-apps-script.js";
  a.click();
  URL.revokeObjectURL(url);
};


const uid = () => Math.random().toString(36).slice(2, 9);

const emptyYear = () =>
  Array(12).fill(null).map(() => ({ trading: "", capital: "", tradingDetail: [], accionesDetail: [] }));

const SEED_2026 = emptyYear();

const fmt = (n) => (n === "" || n === null || isNaN(n)) ? "—" : `$${parseFloat(n).toFixed(2)}`;
const fpct = (n) => (n === "" || n === null || isNaN(n)) ? "—" : `${parseFloat(n).toFixed(2)}%`;
const pctColor = (p) => p === null ? "#9e968f" : p > 5 ? "#00ff88" : p > 0 ? "#ffd700" : "#ff4455";

const badgeColor = (tipo) =>
  tipo === "dividendo" ? "#ffd700" : tipo === "compra" ? "#00ff88" : tipo === "trading" ? "#aa88ff" : "#4aaeff";

const inputSt = { width: "100%", background: "#0a1818", border: "1px solid #1a2a2a", borderRadius: "10px", padding: "12px 14px", fontSize: "15px", color: "#fff", fontFamily: "'Courier New',monospace", outline: "none", boxSizing: "border-box" };
const labelSt = { fontSize: "8px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "6px" };
const selectSt = { ...inputSt, fontSize: "13px", appearance: "none", cursor: "pointer" };

// ══════════════════════════════ MODALS ════════════════════════════════

function InputModal({ label, value, onSave, onClose }) {
  const [val, setVal] = useState(value === "" ? "" : value);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", background: "#111c1c", borderTop: "1px solid #00ff8844", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#00ff88", marginBottom: "14px" }}>EDITAR · {label}</div>
        <input autoFocus type="number" step="0.01" placeholder="0.00" value={val} onChange={e => setVal(e.target.value)}
          style={{ ...inputSt, fontSize: "24px", border: "1px solid #00ff8866", color: "#00ff88" }} />
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "15px", background: "#1a2a2a", border: "none", borderRadius: "12px", color: "#d4ccbf", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => { onSave(val); onClose(); }} style={{ flex: 2, padding: "15px", background: "linear-gradient(135deg,#004d2a,#007a42)", border: "none", borderRadius: "12px", color: "#00ff88", fontSize: "13px", fontFamily: "inherit", cursor: "pointer", fontWeight: "700" }}>GUARDAR</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Stock Modal (with month selector + purchase record) ───────────
function AddStockModal({ onSave, onClose }) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [month, setMonth] = useState(0); // 0 = enero
  const valid = ticker.trim() && parseFloat(shares) > 0 && parseFloat(price) > 0;
  const total = valid ? parseFloat(shares) * parseFloat(price) : 0;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", background: "#111c1c", borderTop: "1px solid #00ff8844", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#00ff88", marginBottom: "18px" }}>AGREGAR POSICIÓN</div>
        <div style={{ marginBottom: "12px" }}>
          <div style={labelSt}>TICKER</div>
          <input type="text" placeholder="AAPL" value={ticker} onChange={e => setTicker(e.target.value)} style={inputSt} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div>
            <div style={labelSt}>ACCIONES</div>
            <input type="number" placeholder="10" value={shares} onChange={e => setShares(e.target.value)} style={inputSt} />
          </div>
          <div>
            <div style={labelSt}>PRECIO / ACCIÓN ($)</div>
            <input type="number" step="0.01" placeholder="150.00" value={price} onChange={e => setPrice(e.target.value)} style={inputSt} />
          </div>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <div style={labelSt}>MES DE COMPRA</div>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={selectSt}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        {valid && (
          <div style={{ background: "#071210", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#c9c0b4" }}>Total invertido</span>
              <span style={{ fontSize: "13px", color: "#00ff88", fontWeight: "700" }}>${total.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#9e968f", marginTop: "4px" }}>
              Se registrará como compra en {MONTHS[month]} y reducirá el cash disponible
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "15px", background: "#1a2a2a", border: "none", borderRadius: "12px", color: "#d4ccbf", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button disabled={!valid} onClick={() => onSave({ ticker: ticker.toUpperCase().trim(), shares: parseFloat(shares), price: parseFloat(price), monthIdx: month, history: [] })}
            style={{ flex: 2, padding: "15px", background: valid ? "linear-gradient(135deg,#004d2a,#007a42)" : "#1a2a2a", border: "none", borderRadius: "12px", color: valid ? "#00ff88" : "#556", fontSize: "13px", fontFamily: "inherit", cursor: valid ? "pointer" : "default", fontWeight: "700" }}>
            AGREGAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Trading Modal ─────────────────────────────────────────────────
function AddTradingModal({ portfolioTickers, onSave, onClose }) {
  const [ticker, setTicker] = useState(portfolioTickers[0] || "");
  const [capital, setCapital] = useState("");
  const [ganancia, setGanancia] = useState("");
  const pct = parseFloat(capital) > 0 && ganancia !== ""
    ? (parseFloat(ganancia) / parseFloat(capital)) * 100 : null;
  const valid = ticker.trim() && parseFloat(capital) > 0 && ganancia !== "";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", background: "#111c1c", borderTop: "1px solid #aa88ff44", borderRadius: "20px 20px 0 0", padding: "22px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#aa88ff", marginBottom: "16px" }}>AGREGAR OPERACIÓN DE TRADING</div>
        <div style={{ marginBottom: "12px" }}>
          <div style={labelSt}>ACCIÓN USADA COMO CAPITAL</div>
          {portfolioTickers.length > 0
            ? <select value={ticker} onChange={e => setTicker(e.target.value)} style={selectSt}>
              {portfolioTickers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            : <input type="text" placeholder="TQQQ" value={ticker} onChange={e => setTicker(e.target.value)} style={inputSt} />
          }
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div>
            <div style={labelSt}>CAPITAL USADO ($)</div>
            <input type="number" step="0.01" placeholder="60.00" value={capital} onChange={e => setCapital(e.target.value)} style={inputSt} />
          </div>
          <div>
            <div style={labelSt}>G/L OBTENIDA ($)</div>
            <input type="number" step="0.01" placeholder="10.00" value={ganancia} onChange={e => setGanancia(e.target.value)} style={inputSt} />
          </div>
        </div>
        {pct !== null && (
          <div style={{ background: parseFloat(ganancia) >= 0 ? "#071210" : "#1a0707", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "8px", color: "#9e968f", letterSpacing: "1px", marginBottom: "2px" }}>RENDIMIENTO</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: parseFloat(ganancia) >= 0 ? "#00ff88" : "#ff4455" }}>{pct.toFixed(2)}%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "8px", color: "#9e968f", letterSpacing: "1px", marginBottom: "2px" }}>CASH + </div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#00e5ff" }}>{fmt(parseFloat(ganancia) || 0)}</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "#1a2a2a", border: "none", borderRadius: "12px", color: "#d4ccbf", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button disabled={!valid} onClick={() => onSave({ id: uid(), tipo: "trading", ticker: ticker.toUpperCase().trim(), capital: parseFloat(capital), ganancia: parseFloat(ganancia) })}
            style={{ flex: 2, padding: "14px", background: valid ? "linear-gradient(135deg,#1a0a2a,#3a1a5a)" : "#1a2a2a", border: valid ? "1px solid #aa88ff55" : "none", borderRadius: "12px", color: valid ? "#aa88ff" : "#556", fontSize: "13px", fontFamily: "inherit", cursor: valid ? "pointer" : "default", fontWeight: "700" }}>
            REGISTRAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Transaction Modal (G/L Acciones) ─────────────────────────────
function AddTransactionModal({ onSave, onClose }) {
  const [tipo, setTipo] = useState("dividendo");
  const [ticker, setTicker] = useState("");
  const [monto, setMonto] = useState("");
  const [sharesV, setSharesV] = useState("");
  const [pCompra, setPCompra] = useState("");
  const [pVenta, setPVenta] = useState("");

  const ganancia = tipo === "venta" && parseFloat(sharesV) > 0 && parseFloat(pVenta) > 0 && parseFloat(pCompra) > 0
    ? (parseFloat(pVenta) - parseFloat(pCompra)) * parseFloat(sharesV) : null;
  const invertido = tipo === "venta" && parseFloat(sharesV) > 0 && parseFloat(pCompra) > 0
    ? parseFloat(sharesV) * parseFloat(pCompra) : null;
  const ganPct = ganancia !== null && invertido > 0 ? (ganancia / invertido) * 100 : null;

  const validDiv = tipo === "dividendo" && ticker.trim() && parseFloat(monto) !== 0;
  const validVent = tipo === "venta" && ticker.trim() && parseFloat(sharesV) > 0 && parseFloat(pCompra) > 0 && parseFloat(pVenta) > 0;
  const valid = validDiv || validVent;

  const handleSave = () => {
    if (tipo === "dividendo") {
      onSave({ id: uid(), tipo: "dividendo", ticker: ticker.toUpperCase().trim(), monto: parseFloat(monto) });
    } else {
      onSave({
        id: uid(), tipo: "venta",
        ticker: ticker.toUpperCase().trim(),
        sharesVendidas: parseFloat(sharesV),
        precioCompra: parseFloat(pCompra),
        precioVenta: parseFloat(pVenta),
        monto: parseFloat(((parseFloat(pVenta) - parseFloat(pCompra)) * parseFloat(sharesV)).toFixed(2)),
        cashRecibido: parseFloat((parseFloat(pVenta) * parseFloat(sharesV)).toFixed(2)),
      });
    }
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", background: "#111c1c", borderTop: "1px solid #ffd70044", borderRadius: "20px 20px 0 0", padding: "22px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#ffd700", marginBottom: "16px" }}>AGREGAR TRANSACCIÓN DE ACCIONES</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["dividendo", "venta"].map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{ flex: 1, padding: "10px", background: tipo === t ? (t === "dividendo" ? "#2a2200" : "#001a2a") : "#0a1010", border: `1px solid ${tipo === t ? badgeColor(t) + "88" : "#1a2a2a"}`, borderRadius: "10px", color: tipo === t ? badgeColor(t) : "#9e968f", fontSize: "11px", fontFamily: "inherit", cursor: "pointer", fontWeight: tipo === t ? "700" : "400", letterSpacing: "1px", textTransform: "uppercase" }}>
              {t === "dividendo" ? "💰 Dividendo" : "📈 Venta"}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: "12px" }}>
          <div style={labelSt}>TICKER</div>
          <input type="text" placeholder="AAPL" value={ticker} onChange={e => setTicker(e.target.value)} style={inputSt} />
        </div>
        {tipo === "dividendo" && (
          <div style={{ marginBottom: "12px" }}>
            <div style={labelSt}>MONTO RECIBIDO ($)</div>
            <input type="number" step="0.01" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} style={inputSt} />
          </div>
        )}
        {tipo === "venta" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div>
                <div style={labelSt}>ACCIONES VENDIDAS</div>
                <input type="number" placeholder="5" value={sharesV} onChange={e => setSharesV(e.target.value)} style={inputSt} />
              </div>
              <div>
                <div style={labelSt}>PRECIO COMPRA ($)</div>
                <input type="number" step="0.01" placeholder="140.00" value={pCompra} onChange={e => setPCompra(e.target.value)} style={inputSt} />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={labelSt}>PRECIO VENTA ($)</div>
              <input type="number" step="0.01" placeholder="155.00" value={pVenta} onChange={e => setPVenta(e.target.value)} style={inputSt} />
            </div>
            {ganancia !== null && (
              <div style={{ background: ganancia >= 0 ? "#071210" : "#1a0707", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px", textAlign: "center" }}>
                  {[
                    { l: "INVERTIDO", v: `$${invertido?.toFixed(2)}`, c: "#c9c0b4" },
                    { l: "CASH REC.", v: `$${(parseFloat(pVenta) * parseFloat(sharesV)).toFixed(2)}`, c: "#00e5ff" },
                    { l: "G/L", v: fmt(ganancia), c: ganancia >= 0 ? "#00ff88" : "#ff4455" },
                    { l: "REND.", v: ganPct !== null ? `${ganPct.toFixed(1)}%` : "—", c: ganPct >= 0 ? "#00ff88" : "#ff4455" },
                  ].map(({ l, v, c }) => (
                    <div key={l}>
                      <div style={{ fontSize: "6px", color: "#9e968f", letterSpacing: "1px", marginBottom: "4px" }}>{l}</div>
                      <div style={{ fontSize: "11px", color: c, fontWeight: "700" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "#1a2a2a", border: "none", borderRadius: "12px", color: "#d4ccbf", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button disabled={!valid} onClick={handleSave}
            style={{ flex: 2, padding: "14px", background: valid ? "linear-gradient(135deg,#2a2000,#4a3800)" : "#1a2a2a", border: valid ? "1px solid #ffd70055" : "none", borderRadius: "12px", color: valid ? "#ffd700" : "#556", fontSize: "13px", fontFamily: "inherit", cursor: valid ? "pointer" : "default", fontWeight: "700" }}>
            REGISTRAR
          </button>
        </div>
      </div>
    </div>
  );
}

const PieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.04) return null;
  const rad = Math.PI / 180;
  const x = cx + (outerRadius + 16) * Math.cos(-midAngle * rad);
  const y = cy + (outerRadius + 16) * Math.sin(-midAngle * rad);
  return <text x={x} y={y} fill="#c9c0b4" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={9}>{name} {(percent * 100).toFixed(1)}%</text>;
};

// ═══════════════════════════════ MAIN APP ═════════════════════════════
export default function App() {
  const [allData, setAllData] = useState({ [START_YEAR]: SEED_2026 });
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [editGoal, setEditGoal] = useState(false);
  const [cash, setCash] = useState(0);
  const [editCash, setEditCash] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [activeYear, setActiveYear] = useState(START_YEAR);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [addStock, setAddStock] = useState(false);
  const [addTx, setAddTx] = useState(null);       // monthIdx for acciones tx
  const [addTrade, setAddTrade] = useState(null);       // monthIdx for trading tx
  const [editPrice, setEditPrice] = useState(null);
  const [editShares, setEditShares] = useState(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState("");
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem("swingScriptUrl") || "");
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | pulling | pushing | ok | error
  const [editScriptUrl, setEditScriptUrl] = useState(false);
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Year ──────────────────────────────────────────────────────────
  const data = allData[activeYear] ?? emptyYear();
  const years = Object.keys(allData).map(Number).sort((a, b) => a - b);

  const goYear = (dir) => {
    const next = activeYear + dir;
    setAllData(prev => prev[next] ? prev : { ...prev, [next]: emptyYear() });
    setActiveYear(next);
    setExpanded(null);
    setAiText("");
  };

  const update = (i, field, val) => {
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r }));
      yd[i][field] = val === "" ? "" : parseFloat(val) || 0;
      return { ...prev, [activeYear]: yd };
    });
  };

  // ── Trading TX ────────────────────────────────────────────────────
  const handleAddTrading = (monthIdx, tx) => {
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r, tradingDetail: [...(r.tradingDetail || [])] }));
      yd[monthIdx].tradingDetail = [...(yd[monthIdx].tradingDetail || []), tx];
      return { ...prev, [activeYear]: yd };
    });
    // G/L Trading gain → cash
    setCash(prev => parseFloat((prev + tx.ganancia).toFixed(2)));
  };

  const removeTradingTx = (monthIdx, txId) => {
    // Find tx to reverse cash
    const tx = (data[monthIdx].tradingDetail || []).find(t => t.id === txId);
    if (tx) setCash(prev => parseFloat((prev - tx.ganancia).toFixed(2)));
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r, tradingDetail: [...(r.tradingDetail || [])] }));
      yd[monthIdx].tradingDetail = yd[monthIdx].tradingDetail.filter(t => t.id !== txId);
      return { ...prev, [activeYear]: yd };
    });
  };

  // ── Acciones TX ───────────────────────────────────────────────────
  const handleAddTransaction = (monthIdx, tx) => {
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r, accionesDetail: [...(r.accionesDetail || [])] }));
      yd[monthIdx].accionesDetail = [...(yd[monthIdx].accionesDetail || []), tx];
      return { ...prev, [activeYear]: yd };
    });
    if (tx.tipo === "venta") {
      const mes = MONTHS[monthIdx];
      const cashRec = tx.cashRecibido ?? (tx.precioVenta * tx.sharesVendidas);
      setPortfolio(prev => prev.map(s => {
        if (s.ticker !== tx.ticker) return s;
        return { ...s, shares: Math.max(0, s.shares - tx.sharesVendidas), history: [...(s.history || []), { tipo: "venta", mes, year: activeYear, sharesVendidas: tx.sharesVendidas, precioVenta: tx.precioVenta, precioCompra: tx.precioCompra, ganancia: tx.monto, cashRecibido: cashRec }] };
      }));
      setCash(prev => parseFloat((prev + cashRec).toFixed(2)));
    }
  };

  const removeTransaction = (monthIdx, txId) => {
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r, accionesDetail: [...(r.accionesDetail || [])] }));
      yd[monthIdx].accionesDetail = yd[monthIdx].accionesDetail.filter(t => t.id !== txId);
      return { ...prev, [activeYear]: yd };
    });
  };

  // ── Add Stock (with purchase record) ─────────────────────────────
  const handleAddStock = ({ ticker, shares, price, monthIdx, history }) => {
    const total = parseFloat((shares * price).toFixed(2));
    const mes = MONTHS[monthIdx];
    // Add to portfolio
    const newStock = { ticker, shares, price, history: [{ tipo: "compra", mes, year: activeYear, shares, precioCompra: price, cashUsado: total }] };
    setPortfolio(prev => [...prev, newStock]);
    // Deduct cash
    setCash(prev => parseFloat((prev - total).toFixed(2)));
    // Register compra in that month's accionesDetail (monto:0 - no G/L impact)
    const compraTx = { id: uid(), tipo: "compra", ticker, shares, precioCompra: price, monto: 0 };
    setAllData(prev => {
      const yd = (prev[activeYear] ?? emptyYear()).map(r => ({ ...r, accionesDetail: [...(r.accionesDetail || [])] }));
      yd[monthIdx].accionesDetail = [...(yd[monthIdx].accionesDetail || []), compraTx];
      return { ...prev, [activeYear]: yd };
    });
    setAddStock(false);
  };

  // ── Computed ──────────────────────────────────────────────────────
  const computed = data.map(row => {
    const td = row.tradingDetail || [];
    // Trading: use detail sum if entries exist, else manual field
    const t = td.length > 0 ? td.reduce((s, d) => s + d.ganancia, 0) : (row.trading === "" ? null : +row.trading);
    // Capital: use detail sum if entries exist, else manual field
    const c = td.length > 0 ? td.reduce((s, d) => s + d.capital, 0) : (row.capital === "" ? null : +row.capital);
    // Acciones: exclude compra from G/L
    const a = (row.accionesDetail || []).filter(d => d.tipo !== "compra").reduce((s, d) => s + (d.monto || 0), 0);
    const hasAcc = (row.accionesDetail || []).filter(d => d.tipo !== "compra").length > 0;
    const hasActivity = t !== null || hasAcc;
    const total = hasActivity ? (t ?? 0) + a : null;
    const rendPct = (t !== null && c && c > 0) ? (t / c) * 100 : null;
    return { ...row, total, rendPct, t, a, c, td };
  });

  const ytd = computed.reduce((s, r) => r.total !== null ? s + r.total : s, 0);
  const faltante = Math.max(0, goal - ytd);
  const progress = Math.min(100, (ytd / goal) * 100);
  const mesesAct = computed.filter(r => r.total !== null).length;
  const promedio = mesesAct > 0 ? ytd / mesesAct : 0;
  const mesesRest = 12 - mesesAct;
  const necesario = mesesRest > 0 ? faltante / mesesRest : 0;

  const chartData = computed.map((r, i) => ({ m: MONTHS_SHORT[i], acum: computed.slice(0, i + 1).reduce((s, x) => s + (x.total ?? 0), 0) }));

  // ── Portfolio ─────────────────────────────────────────────────────
  const stockValue = portfolio.reduce((s, p) => s + p.shares * p.price, 0);
  const totalPortfolioValue = stockValue + cash;
  const cashPct = totalPortfolioValue > 0 ? (cash / totalPortfolioValue) * 100 : 0;
  const stockPct = totalPortfolioValue > 0 ? (stockValue / totalPortfolioValue) * 100 : 0;

  const pieData = [
    ...(cash > 0 ? [{ name: "CASH", value: parseFloat(cash.toFixed(2)) }] : []),
    ...portfolio.filter(s => s.shares > 0).map(s => ({ name: s.ticker, value: parseFloat((s.shares * s.price).toFixed(2)) })),
  ];
  const barData = [
    ...(cash > 0 ? [{ ticker: "CASH", valor: parseFloat(cash.toFixed(2)) }] : []),
    ...portfolio.filter(s => s.shares > 0).map(s => ({ ticker: s.ticker, valor: parseFloat((s.shares * s.price).toFixed(2)) })),
  ];

  const portfolioTickers = portfolio.map(s => s.ticker);
  const removeStock = (idx) => setPortfolio(prev => prev.filter((_, i) => i !== idx));
  const updateStockPrice = (idx, v) => setPortfolio(prev => prev.map((s, i) => i === idx ? { ...s, price: parseFloat(v) || s.price } : s));
  const updateStockShares = (idx, v) => setPortfolio(prev => prev.map((s, i) => i === idx ? { ...s, shares: parseFloat(v) || s.shares } : s));

  const txHistory = computed
    .map((r, i) => ({ mes: MONTHS[i], mesIdx: i, txs: (r.accionesDetail || []), tradeTxs: (r.tradingDetail || []) }))
    .filter(m => m.txs.length > 0 || m.tradeTxs.length > 0);

  // ── Excel Export ──────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(allData).sort().forEach(([yr, rows]) => {
      const sheetData = [["MES", "G/L TRADING", "CAPITAL", "G/L ACCIONES", "DETALLE TRADING", "DETALLE ACCIONES"]];
      rows.forEach((r, i) => {
        const td = r.tradingDetail || [];
        const tSum = td.length > 0 ? td.reduce((s, d) => s + d.ganancia, 0) : (r.trading === "" ? "" : r.trading);
        const cSum = td.length > 0 ? td.reduce((s, d) => s + d.capital, 0) : (r.capital === "" ? "" : r.capital);
        const aSum = (r.accionesDetail || []).filter(d => d.tipo !== "compra").reduce((s, d) => s + (d.monto || 0), 0);
        const tradeDet = td.map(d => `TRADE ${d.ticker} cap$${d.capital} gl$${d.ganancia}`).join(" | ");
        const accDet = (r.accionesDetail || []).map(d =>
          d.tipo === "dividendo" ? `DIVIDENDO ${d.ticker} $${d.monto}` :
            d.tipo === "compra" ? `COMPRA ${d.ticker} x${d.shares} @$${d.precioCompra}` :
              `VENTA ${d.ticker} x${d.sharesVendidas} compra$${d.precioCompra} venta$${d.precioVenta} G/L$${d.monto} cash$${d.cashRecibido || ""}`
        ).join(" | ");
        sheetData.push([MONTHS[i], tSum, cSum, aSum || "", tradeDet, accDet]);
      });
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 50 }, { wch: 70 }];
      XLSX.utils.book_append_sheet(wb, ws, `Trading_${yr}`);
    });
    const portData = [
      ["TICKER", "ACCIONES", "PRECIO", "VALOR TOTAL", "HISTORIAL"],
      ...portfolio.map(s => [s.ticker, s.shares, s.price, parseFloat((s.shares * s.price).toFixed(2)),
      (s.history || []).map(h => h.tipo === "compra" ? `COMPRA ${h.mes}/${h.year} x${h.shares} @$${h.precioCompra}` : `VENTA ${h.mes}/${h.year} x${h.sharesVendidas} @$${h.precioVenta} G/L$${h.ganancia}`).join(" | ")]),
    ];
    const wsP = XLSX.utils.aoa_to_sheet(portData);
    wsP["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsP, "Portafolio");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["CASH"], [cash]]), "Cash");
    XLSX.writeFile(wb, "SwingTrading_Backup.xlsx");
    showToast("✅ Exportado correctamente");
  };

  // ── Excel Import ──────────────────────────────────────────────────
  const importExcel = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary" });
        const newAllData = {}, newPortfolio = []; let newCash = 0;
        wb.SheetNames.forEach(name => {
          if (name.startsWith("Trading_")) {
            const yr = parseInt(name.replace("Trading_", "")); if (isNaN(yr)) return;
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
            const months = [];
            for (let r = 1; r <= 12; r++) {
              const row = rows[r] || [];
              const tradingDetail = [];
              if (row[4]) String(row[4]).split(" | ").forEach(p => {
                const m = p.match(/TRADE (\S+) cap\$([0-9.]+) gl\$([0-9.-]+)/);
                if (m) tradingDetail.push({ id: uid(), tipo: "trading", ticker: m[1], capital: parseFloat(m[2]), ganancia: parseFloat(m[3]) });
              });
              const accionesDetail = [];
              if (row[5]) String(row[5]).split(" | ").forEach(p => {
                if (p.startsWith("DIVIDENDO")) { const m = p.match(/DIVIDENDO (\S+) \$([0-9.]+)/); if (m) accionesDetail.push({ id: uid(), tipo: "dividendo", ticker: m[1], monto: parseFloat(m[2]) }); }
                else if (p.startsWith("COMPRA")) { const m = p.match(/COMPRA (\S+) x([0-9.]+) @\$([0-9.]+)/); if (m) accionesDetail.push({ id: uid(), tipo: "compra", ticker: m[1], shares: parseFloat(m[2]), precioCompra: parseFloat(m[3]), monto: 0 }); }
                else if (p.startsWith("VENTA")) { const m = p.match(/VENTA (\S+) x([0-9.]+) compra\$([0-9.]+) venta\$([0-9.]+) G\/L\$([0-9.-]+)(?: cash\$([0-9.]+))?/); if (m) accionesDetail.push({ id: uid(), tipo: "venta", ticker: m[1], sharesVendidas: parseFloat(m[2]), precioCompra: parseFloat(m[3]), precioVenta: parseFloat(m[4]), monto: parseFloat(m[5]), cashRecibido: m[6] ? parseFloat(m[6]) : 0 }); }
              });
              months.push({ trading: row[1] !== undefined && row[1] !== "" && tradingDetail.length === 0 ? parseFloat(row[1]) : "", capital: row[2] !== undefined && row[2] !== "" && tradingDetail.length === 0 ? parseFloat(row[2]) : "", tradingDetail, accionesDetail });
            }
            newAllData[yr] = months;
          }
          if (name === "Portafolio") {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r]; if (!row[0] || !row[1] || !row[2]) continue;
              const history = [];
              if (row[4]) String(row[4]).split(" | ").forEach(p => {
                const mc = p.match(/COMPRA (\S+)\/(\d+) x([0-9.]+) @\$([0-9.]+)/);
                if (mc) history.push({ tipo: "compra", mes: mc[1], year: parseInt(mc[2]), shares: parseFloat(mc[3]), precioCompra: parseFloat(mc[4]), cashUsado: parseFloat(mc[3]) * parseFloat(mc[4]) });
                const mv = p.match(/VENTA (\S+)\/(\d+) x([0-9.]+) @\$([0-9.]+) G\/L\$([0-9.-]+)/);
                if (mv) history.push({ tipo: "venta", mes: mv[1], year: parseInt(mv[2]), sharesVendidas: parseFloat(mv[3]), precioVenta: parseFloat(mv[4]), ganancia: parseFloat(mv[5]) });
              });
              newPortfolio.push({ ticker: String(row[0]), shares: parseFloat(row[1]), price: parseFloat(row[2]), history });
            }
          }
          if (name === "Cash") { const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }); if (rows[1] && rows[1][0]) newCash = parseFloat(rows[1][0]) || 0; }
        });
        if (!Object.keys(newAllData).length) { showToast("⚠️ Archivo no reconocido"); return; }
        setAllData(newAllData); setPortfolio(newPortfolio); setCash(newCash);
        setActiveYear(Math.min(...Object.keys(newAllData).map(Number)));
        setTab("home");
        showToast(`✅ Importado: ${Object.keys(newAllData).length} año(s)`);
      } catch { showToast("⚠️ Error al leer el archivo"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Google Sheets Sync ────────────────────────────────────────────
  const getAppSnapshot = () => ({ allData, portfolio, cash, goal });

  const loadSnapshot = (snap) => {
    if (snap.allData && Object.keys(snap.allData).length) {
      setAllData(snap.allData);
      setActiveYear(Math.min(...Object.keys(snap.allData).map(Number)));
    }
    if (snap.portfolio) setPortfolio(snap.portfolio);
    if (typeof snap.cash === "number") setCash(snap.cash);
    if (typeof snap.goal === "number") setGoal(snap.goal);
  };

  const pullFromSheet = async () => {
    if (!scriptUrl) { showToast("⚠️ Configura el URL del script primero"); return; }
    setSyncStatus("pulling");
    try {
      const res = await fetch(`${scriptUrl}?action=get`, { method: "GET" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      loadSnapshot(json);
      setSyncStatus("ok");
      showToast("✅ Datos cargados desde Google Sheets");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (e) {
      setSyncStatus("error");
      showToast("⚠️ Error al leer Google Sheets");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const pushToSheet = async () => {
    if (!scriptUrl) { showToast("⚠️ Configura el URL del script primero"); return; }
    setSyncStatus("pushing");
    try {
      const body = "data=" + encodeURIComponent(JSON.stringify(getAppSnapshot()));
      await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setSyncStatus("ok");
      showToast("✅ Guardado en Google Sheets");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("error");
      showToast("⚠️ Error al guardar en Google Sheets");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const saveScriptUrl = (url) => {
    const clean = url.trim();
    setScriptUrl(clean);
    localStorage.setItem("swingScriptUrl", clean);
  };

  // ── AI ────────────────────────────────────────────────────────────
  const askAI = useCallback(async () => {
    setAiLoading(true); setAiText("");
    const resumen = computed.map((r, i) => ({ mes: MONTHS[i], total: r.total, pct: r.rendPct, capital: r.c })).filter(r => r.total !== null);
    const prompt = `Eres un gestor de portafolio experto en swing trading. Datos ${activeYear}:
YTD: $${ytd.toFixed(2)} | Meta: $${goal} | Faltante: $${faltante.toFixed(2)} | Promedio/mes: $${promedio.toFixed(2)} | Necesario/mes: $${necesario.toFixed(2)}
${resumen.map(r => `${r.mes}: $${r.total?.toFixed(2)} (${r.pct?.toFixed(2)}%) cap $${r.capital}`).join(" | ")}
Da análisis crítico en 4 puntos concisos con emoji. Español directo.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] }) });
      const json = await res.json();
      setAiText(json.content?.map(b => b.text || "").join("") || "Sin respuesta.");
    } catch { setAiText("⚠️ Error de conexión."); }
    setAiLoading(false);
  }, [computed, ytd, faltante, promedio, necesario, activeYear, goal]);

  const NAV = [
    { id: "home", icon: "◈", label: "INICIO" },
    { id: "tabla", icon: "⊞", label: "TABLA" },
    { id: "resumen", icon: "◎", label: "RESUMEN" },
    { id: "ai", icon: "⟁", label: "ANÁLISIS" },
  ];

  // ═══════════════════ SHARED COMPONENTS ═══════════════════════════

  const YearSelector = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "10px 20px", background: "#0a1015", borderBottom: "1px solid #0f1a1a", flexShrink: 0 }}>
      <button onClick={() => goYear(-1)} style={{ background: "none", border: "1px solid #1a2a2a", borderRadius: "8px", color: "#c9c0b4", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", letterSpacing: "2px" }}>{activeYear}</div>
        <div style={{ fontSize: "8px", letterSpacing: "2px", color: "#00ff8877", marginTop: "1px" }}>{years.length > 1 ? `${years.length} AÑOS REGISTRADOS` : "AÑO ACTIVO"}</div>
      </div>
      <button onClick={() => goYear(+1)} style={{ background: "none", border: "1px solid #1a2a2a", borderRadius: "8px", color: "#c9c0b4", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
    </div>
  );

  // Shared TxCard for acciones
  const TxCard = ({ tx, onRemove }) => {
    const invertido = tx.tipo === "venta" ? tx.sharesVendidas * tx.precioCompra : null;
    const ganPct = invertido ? (tx.monto / invertido) * 100 : null;
    const bCol = badgeColor(tx.tipo);
    return (
      <div style={{ background: "#080f0f", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px", borderLeft: `2px solid ${bCol}66` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff" }}>{tx.ticker}</span>
            <span style={{ fontSize: "7px", letterSpacing: "1px", color: bCol, background: `${bCol}18`, padding: "2px 6px", borderRadius: "4px" }}>{tx.tipo.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {tx.tipo !== "compra" && <span style={{ fontSize: "13px", fontWeight: "700", color: tx.monto >= 0 ? "#00ff88" : "#ff4455" }}>{fmt(tx.monto)}</span>}
            {tx.tipo === "compra" && <span style={{ fontSize: "11px", color: "#9e968f" }}>{tx.shares}u @ ${tx.precioCompra}</span>}
            {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ff445566", fontSize: "12px", cursor: "pointer", padding: "0 2px" }}>✕</button>}
          </div>
        </div>
        {tx.tipo === "venta" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px", marginTop: "8px" }}>
            {[
              { l: "ACCIONES", v: `${tx.sharesVendidas}` },
              { l: "COMPRA", v: `$${tx.precioCompra}` },
              { l: "VENTA", v: `$${tx.precioVenta}` },
              { l: "REND.", v: ganPct !== null ? `${ganPct.toFixed(1)}%` : "—" },
            ].map(({ l, v }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "6px", color: "#9e968f", letterSpacing: "1px" }}>{l}</div>
                <div style={{ fontSize: "10px", color: "#c9c0b4", fontWeight: "600", marginTop: "2px" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Trading detail card
  const TradeCard = ({ tx, onRemove }) => {
    const pct = (tx.capital > 0) ? (tx.ganancia / tx.capital) * 100 : null;
    return (
      <div style={{ background: "#080f0f", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px", borderLeft: "2px solid #aa88ff66" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff" }}>{tx.ticker}</span>
            <span style={{ fontSize: "7px", letterSpacing: "1px", color: "#aa88ff", background: "#aa88ff18", padding: "2px 6px", borderRadius: "4px" }}>TRADING</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ff445566", fontSize: "12px", cursor: "pointer", padding: "0 2px" }}>✕</button>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4px", marginTop: "8px" }}>
          {[
            { l: "CAPITAL", v: fmt(tx.capital) },
            { l: "G/L", v: fmt(tx.ganancia), c: tx.ganancia >= 0 ? "#00ff88" : "#ff4455" },
            { l: "REND.", v: pct !== null ? `${pct.toFixed(2)}%` : "—", c: pct >= 0 ? "#00ff88" : "#ff4455" },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "6px", color: "#9e968f", letterSpacing: "1px" }}>{l}</div>
              <div style={{ fontSize: "11px", color: c || "#c9c0b4", fontWeight: "600", marginTop: "2px" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ══════════════════════════════ SCREENS ══════════════════════════════

  const HomeScreen = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
      <div style={{ background: "linear-gradient(135deg,#0a1f12,#071a1a)", border: "1px solid #00ff8820", borderRadius: "18px", padding: "20px", marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#00ff8877", marginBottom: "4px" }}>RENDIMIENTO YTD {activeYear}</div>
        <div style={{ fontSize: "40px", fontWeight: "700", color: "#00ff88", lineHeight: 1, letterSpacing: "-1px" }}>${ytd.toFixed(2)}</div>
        <div style={{ fontSize: "10px", color: "#d4ccbf", marginTop: "4px" }}>
          de{" "}<span onClick={() => setEditGoal(true)} style={{ color: "#ffd700", borderBottom: "1px dashed #ffd70066", cursor: "pointer" }}>${goal}</span>{" "}meta anual <span style={{ color: "#ffd70055", fontSize: "8px" }}>✎</span>
        </div>
        <div style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "8px", letterSpacing: "1px", color: "#c9c0b4" }}>PROGRESO META</span>
            <span style={{ fontSize: "9px", color: "#00ff88" }}>{progress.toFixed(1)}%</span>
          </div>
          <div style={{ background: "#0a1a0a", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#003d22,#00ff88)", borderRadius: "6px", boxShadow: "0 0 10px #00ff8866" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        {[
          { label: "FALTANTE", value: `$${faltante.toFixed(2)}`, color: "#ffd700", sub: "para meta" },
          { label: "PROMEDIO/MES", value: `$${promedio.toFixed(2)}`, color: "#4af", sub: "actual" },
          { label: "NECESARIO/MES", value: `$${necesario.toFixed(2)}`, color: "#ff8c00", sub: `${mesesRest} meses rest.` },
          { label: "MESES ACTIVOS", value: `${mesesAct}/12`, color: "#aa88ff", sub: "registrados" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ background: "#0c1318", borderRadius: "14px", padding: "14px", borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "6px" }}>{label}</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "9px", color: "#c9c0b4", marginTop: "4px" }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#c9c0b4", marginBottom: "10px" }}>ACUMULADO {activeYear} vs META</div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 7, fill: "#c9c0b4" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 7, fill: "#9e968f" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0c1318", border: "1px solid #00ff8833", borderRadius: "8px", fontSize: "11px" }} itemStyle={{ color: "#d4ccbf" }} labelStyle={{ color: "#00ff88" }} formatter={v => [`$${v.toFixed(2)}`, "Acum."]} />
            <ReferenceLine y={goal} stroke="#ffd70055" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="acum" stroke="#00ff88" strokeWidth={2} fill="url(#g1)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "16px", padding: "16px" }}>
        <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#c9c0b4", marginBottom: "10px" }}>REND. % POR MES</div>
        <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "55px" }}>
          {computed.map((r, i) => {
            const h = r.rendPct !== null ? Math.max(4, (Math.abs(r.rendPct) / 12) * 55) : 3;
            const col = pctColor(r.rendPct);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "100%", height: `${h}px`, background: col, borderRadius: "3px 3px 0 0", opacity: r.rendPct !== null ? 0.85 : 0.15 }} />
                <div style={{ fontSize: "6px", color: "#c9c0b4" }}>{MONTHS_SHORT[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const TablaScreen = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
      <div style={{ fontSize: "9px", color: "#c9c0b4", letterSpacing: "1px", marginBottom: "12px", textAlign: "center" }}>✎ Toca un mes para expandir y editar</div>
      {computed.map((row, i) => {
        const isOpen = expanded === i;
        const hasData = row.total !== null;
        const col = pctColor(row.rendPct);
        const txs = row.accionesDetail || [];
        const tds = row.tradingDetail || [];
        return (
          <div key={i} style={{ background: "#0c1318", border: `1px solid ${hasData ? col + "33" : "#1a2a2a"}`, borderRadius: "14px", marginBottom: "8px", overflow: "hidden", opacity: hasData ? 1 : 0.55 }}>
            <div onClick={() => setExpanded(isOpen ? null : i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: hasData ? col : "#223", boxShadow: hasData ? `0 0 6px ${col}` : "none" }} />
                <span style={{ fontSize: "12px", letterSpacing: "1px", color: hasData ? "#c0c8cc" : "#9e968f" }}>{MONTHS[i]}</span>
                {(tds.length > 0 || txs.filter(t => t.tipo !== "compra").length > 0) && (
                  <span style={{ fontSize: "7px", color: "#ffd70099", letterSpacing: "1px" }}>
                    {tds.length > 0 ? `${tds.length}t ` : ""}{txs.filter(t => t.tipo !== "compra").length > 0 ? `${txs.filter(t => t.tipo !== "compra").length}a` : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: hasData ? col : "#9e968f" }}>{hasData ? fpct(row.rendPct) : "—"}</span>
                <span style={{ fontSize: "12px", color: hasData ? "#c9c0b4" : "#9e968f" }}>{hasData ? fmt(row.total) : "—"}</span>
                <span style={{ fontSize: "9px", color: "#c9c0b4" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid #1a2a2a", padding: "14px" }}>

                {/* ── G/L TRADING detail section ── */}
                <div style={{ background: "#0a0f18", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "4px" }}>G/L TRADING</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: row.t !== null ? pctColor(row.rendPct) : "#9e968f" }}>
                        {tds.length > 0 ? fmt(row.t) : row.trading !== "" ? `$${parseFloat(row.trading).toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <button onClick={() => setAddTrade(i)} style={{ background: "linear-gradient(135deg,#1a0a2a,#3a1a5a)", border: "1px solid #aa88ff55", borderRadius: "8px", color: "#aa88ff", fontSize: "9px", padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "1px" }}>
                      + AGREGAR
                    </button>
                  </div>

                  {/* Manual fields (only when no detail exists) */}
                  {tds.length === 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                      {[{ field: "trading", label: "G/L ($)" }, { field: "capital", label: "CAPITAL ($)" }].map(({ field, label }) => (
                        <div key={field} onClick={() => setModal({ i, field, label })} style={{ background: "#080d0f", border: "1px solid #1a2a2a", borderRadius: "10px", padding: "10px", cursor: "pointer", textAlign: "center" }}>
                          <div style={{ fontSize: "7px", letterSpacing: "1px", color: "#c9c0b4", marginBottom: "6px" }}>{label}</div>
                          <div style={{ fontSize: "13px", color: row[field] === "" ? "#9e968f" : "#c0c8cc" }}>{row[field] === "" ? "—" : `$${parseFloat(row[field]).toFixed(2)}`}</div>
                          <div style={{ fontSize: "7px", color: "#aa88ff66", marginTop: "4px" }}>✎ editar</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tds.length > 0
                    ? tds.map(tx => <TradeCard key={tx.id} tx={tx} onRemove={() => removeTradingTx(i, tx.id)} />)
                    : tds.length === 0 && row.trading === "" && <div style={{ fontSize: "10px", color: "#9e968f", textAlign: "center", padding: "4px 0" }}>Sin operaciones de trading</div>
                  }

                  {/* Capital display when using detail */}
                  {tds.length > 0 && (
                    <div style={{ fontSize: "9px", color: "#9e968f", textAlign: "right", marginTop: "6px" }}>
                      Capital total: <span style={{ color: "#c9c0b4" }}>{fmt(row.c)}</span>
                    </div>
                  )}
                </div>

                {/* ── G/L ACCIONES detail section ── */}
                <div style={{ background: "#0a1010", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "4px" }}>G/L ACCIONES</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: row.a > 0 ? "#ffd700" : "#9e968f" }}>{row.a > 0 ? fmt(row.a) : "—"}</div>
                    </div>
                    <button onClick={() => setAddTx(i)} style={{ background: "linear-gradient(135deg,#2a2000,#4a3800)", border: "1px solid #ffd70055", borderRadius: "8px", color: "#ffd700", fontSize: "9px", padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "1px" }}>
                      + AGREGAR TX
                    </button>
                  </div>
                  {txs.length === 0
                    ? <div style={{ fontSize: "10px", color: "#9e968f", textAlign: "center", padding: "8px 0" }}>Sin transacciones registradas</div>
                    : txs.map(tx => <TxCard key={tx.id} tx={tx} onRemove={() => removeTransaction(i, tx.id)} />)
                  }
                </div>

                {/* Summary */}
                {row.total !== null && (() => {
                  const tradingPct = (row.t !== null && row.c && row.c > 0) ? (row.t / row.c) * 100 : null;
                  return (
                    <div style={{ background: "#071210", borderRadius: "10px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "8px", color: "#c9c0b4", letterSpacing: "2px" }}>REND. TRADING</span>
                        <span style={{ fontSize: "13px", color: col, fontWeight: "700" }}>{fmt(row.t)} · {tradingPct !== null ? `${tradingPct.toFixed(2)}%` : "—"}</span>
                      </div>
                      <div style={{ borderTop: "1px solid #1a2a2a" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "8px", color: "#c9c0b4", letterSpacing: "2px" }}>TOTAL G/L</span>
                        <span style={{ fontSize: "13px", color: "#ffd700", fontWeight: "700" }}>{fmt(row.total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ background: "#071a10", border: "1px solid #00ff8833", borderRadius: "14px", padding: "16px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "4px" }}>TOTAL REALIZADO</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#00ff88" }}>${ytd.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "4px" }}>FALTANTE</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#ffd700" }}>${faltante.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );

  const ResumenScreen = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

      {/* ── VALOR TOTAL (single card with cash + acciones breakdown) ── */}
      <div style={{ background: "linear-gradient(135deg,#0d1a2e,#071a1a)", border: "1px solid #4af3", borderRadius: "18px", padding: "20px", marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#4aaeff88", marginBottom: "4px" }}>VALOR TOTAL DEL PORTAFOLIO</div>
        <div style={{ fontSize: "36px", fontWeight: "700", color: "#4aaeff", lineHeight: 1 }}>${totalPortfolioValue.toFixed(2)}</div>
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          {/* Cash sub-card (tappable) */}
          <div onClick={() => setEditCash(true)} style={{ flex: 1, background: "#00e5ff10", border: "1px solid #00e5ff33", borderRadius: "12px", padding: "10px", cursor: "pointer" }}>
            <div style={{ fontSize: "7px", color: "#00e5ff88", letterSpacing: "1px", marginBottom: "4px" }}>💵 CASH ✎</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#00e5ff" }}>${cash.toFixed(2)}</div>
            <div style={{ fontSize: "9px", color: "#9e968f", marginTop: "2px" }}>{cashPct.toFixed(1)}%</div>
          </div>
          {/* Acciones sub-card */}
          <div style={{ flex: 1, background: "#4aaeff10", border: "1px solid #4aaeff33", borderRadius: "12px", padding: "10px" }}>
            <div style={{ fontSize: "7px", color: "#4aaeff88", letterSpacing: "1px", marginBottom: "4px" }}>📈 ACCIONES</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#4aaeff" }}>${stockValue.toFixed(2)}</div>
            <div style={{ fontSize: "9px", color: "#9e968f", marginTop: "2px" }}>{stockPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* ── PIE CHART ── */}
      {pieData.length > 0 && (
        <div style={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#c9c0b4", marginBottom: "4px" }}>DISTRIBUCIÓN</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={PieLabel}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "8px", fontSize: "11px" }} itemStyle={{ color: "#d4ccbf" }} labelStyle={{ color: "#00ff88" }} formatter={v => [`$${v.toFixed(2)}`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── BAR CHART ── */}
      {barData.length > 0 && (
        <div style={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#c9c0b4", marginBottom: "10px" }}>VALOR POR ACTIVO ($)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="ticker" tick={{ fontSize: 9, fill: "#c9c0b4" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 7, fill: "#9e968f" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0c1318", border: "1px solid #1a2a2a", borderRadius: "8px", fontSize: "11px" }} itemStyle={{ color: "#d4ccbf" }} labelStyle={{ color: "#00ff88" }} formatter={v => [`$${v.toFixed(2)}`, "Valor"]} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── POSITIONS ── */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "2px", color: "#c9c0b4" }}>MIS POSICIONES</div>
          <button onClick={() => setAddStock(true)} style={{ background: "linear-gradient(135deg,#004d2a,#007a42)", border: "none", borderRadius: "8px", color: "#00ff88", fontSize: "10px", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "1px" }}>+ AGREGAR</button>
        </div>

        {portfolio.length === 0 && (
          <div style={{ background: "#0c1318", border: "1px dashed #1a2a2a", borderRadius: "14px", padding: "28px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>◎</div>
            <div style={{ fontSize: "11px", color: "#c9c0b4" }}>Sin posiciones registradas</div>
          </div>
        )}

        {portfolio.map((s, idx) => {
          const valor = s.shares * s.price;
          const weight = totalPortfolioValue > 0 ? (valor / totalPortfolioValue) * 100 : 0;
          const col = PIE_COLORS[(idx + 1) % PIE_COLORS.length];
          const isEmpty = s.shares === 0;
          const hasHist = (s.history || []).length > 0;
          return (
            <div key={idx} style={{ background: "#0c1318", border: `1px solid ${isEmpty ? "#ff445533" : col + "33"}`, borderRadius: "14px", padding: "14px", marginBottom: "8px", borderLeft: `3px solid ${isEmpty ? "#ff4455" : col}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "700", color: isEmpty ? "#9e968f" : "#fff", letterSpacing: "1px" }}>{s.ticker}</span>
                    {isEmpty && <span style={{ fontSize: "7px", background: "#ff445522", color: "#ff4455", padding: "2px 6px", borderRadius: "4px", letterSpacing: "1px" }}>SIN ACCIONES</span>}
                  </div>
                  <div style={{ fontSize: "10px", color: "#c9c0b4", marginTop: "2px" }}>{s.shares} acciones · ${s.price.toFixed(2)}/u</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: isEmpty ? "#9e968f" : col }}>${valor.toFixed(2)}</div>
                  <div style={{ fontSize: "10px", color: "#c9c0b4", marginTop: "2px" }}>{weight.toFixed(1)}% del total</div>
                </div>
              </div>
              {!isEmpty && (
                <div style={{ background: "#0a1818", borderRadius: "4px", height: "4px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ width: `${weight}%`, height: "100%", background: col, borderRadius: "4px" }} />
                </div>
              )}
              {/* History */}
              {hasHist && (
                <div style={{ background: "#080f0f", borderRadius: "10px", padding: "10px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#9e968f", marginBottom: "8px" }}>HISTORIAL</div>
                  {(s.history || []).map((h, hi) => {
                    const ganPct = h.precioCompra && h.precioVenta ? (((h.precioVenta - h.precioCompra) / h.precioCompra) * 100) : null;
                    return (
                      <div key={hi} style={{ borderLeft: `2px solid ${h.tipo === "compra" ? "#00ff8844" : "#4aaeff44"}`, paddingLeft: "10px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "9px", color: h.tipo === "compra" ? "#00ff88" : "#4aaeff", fontWeight: "700" }}>
                            {h.tipo === "compra" ? "🛒" : "📤"} {h.mes} {h.year}
                          </span>
                          {h.tipo === "venta" && <span style={{ fontSize: "11px", color: h.ganancia >= 0 ? "#00ff88" : "#ff4455", fontWeight: "700" }}>{fmt(h.ganancia)}</span>}
                          {h.tipo === "compra" && <span style={{ fontSize: "10px", color: "#9e968f" }}>-${h.cashUsado?.toFixed(2)}</span>}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px", marginTop: "6px" }}>
                          {(h.tipo === "compra"
                            ? [{ l: "ACCIONES", v: `${h.shares}` }, { l: "PRECIO", v: `$${h.precioCompra}` }, { l: "INVERTIDO", v: `$${h.cashUsado?.toFixed(2)}` }, { l: "TIPO", v: "COMPRA" }]
                            : [{ l: "VENDIDAS", v: `${h.sharesVendidas}` }, { l: "@ VENTA", v: `$${h.precioVenta}` }, { l: "CASH", v: `$${h.cashRecibido?.toFixed(2) || "—"}` }, { l: "REND.", v: ganPct !== null ? `${ganPct.toFixed(1)}%` : "—" }]
                          ).map(({ l, v }) => (
                            <div key={l} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "6px", color: "#9e968f", letterSpacing: "1px" }}>{l}</div>
                              <div style={{ fontSize: "9px", color: "#c9c0b4", fontWeight: "600", marginTop: "1px" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setEditPrice(idx)} style={{ flex: 1, padding: "7px", background: "#0a1818", border: "1px solid #1a2a2a", borderRadius: "8px", color: "#c9c0b4", fontSize: "10px", cursor: "pointer", fontFamily: "inherit" }}>✎ Precio</button>
                <button onClick={() => setEditShares(idx)} style={{ flex: 1, padding: "7px", background: "#0a1818", border: "1px solid #1a2a2a", borderRadius: "8px", color: "#c9c0b4", fontSize: "10px", cursor: "pointer", fontFamily: "inherit" }}>✎ Acciones</button>
                <button onClick={() => removeStock(idx)} style={{ padding: "7px 12px", background: "#1a0a0a", border: "1px solid #ff445533", borderRadius: "8px", color: "#ff4455", fontSize: "10px", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TX HISTORY ── */}
      <div>
        <div style={{ fontSize: "8px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "10px" }}>HISTORIAL DE ACCIONES · {activeYear}</div>
        {txHistory.length === 0
          ? <div style={{ background: "#0c1318", border: "1px dashed #1a2a2a", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#9e968f" }}>Sin transacciones en {activeYear}</div>
            <div style={{ fontSize: "9px", color: "#9e968f", marginTop: "4px" }}>Agrégalas desde la pestaña TABLA</div>
          </div>
          : txHistory.map(({ mes, mesIdx, txs, tradeTxs }) => {
            const totalMes = txs.filter(t => t.tipo !== "compra").reduce((s, t) => s + t.monto, 0) + tradeTxs.reduce((s, t) => s + t.ganancia, 0);
            return (
              <div key={mesIdx} style={{ background: "#0c1318", border: "1px solid #ffd70022", borderRadius: "14px", padding: "14px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#d4ccbf", fontWeight: "700" }}>{mes}</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: totalMes >= 0 ? "#ffd700" : "#ff4455" }}>{fmt(totalMes)}</span>
                </div>
                {tradeTxs.map(tx => <TradeCard key={tx.id} tx={tx} />)}
                {txs.map(tx => <TxCard key={tx.id} tx={tx} />)}
              </div>
            );
          })
        }
      </div>
    </div>
  );

  const AIScreen = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
      <div style={{ background: "linear-gradient(135deg,#0a1628,#071a1a)", border: "1px solid #4af3", borderRadius: "18px", padding: "20px", marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#4af", marginBottom: "8px" }}>⟁ ANÁLISIS AI · {activeYear}</div>
        <p style={{ fontSize: "12px", color: "#c9c0b4", lineHeight: "1.7", margin: "0 0 16px" }}>
          Análisis crítico: rendimiento vs meta, puntos débiles y recomendaciones para los {mesesRest} meses restantes de {activeYear}.
        </p>
        <button onClick={askAI} disabled={aiLoading || mesesAct === 0} style={{ width: "100%", padding: "16px", background: aiLoading ? "#1a2a2a" : "linear-gradient(135deg,#004d2a,#007a42)", border: "none", borderRadius: "12px", color: aiLoading ? "#c9c0b4" : "#00ff88", fontSize: "12px", letterSpacing: "2px", fontFamily: "'Courier New',monospace", cursor: aiLoading ? "wait" : "pointer", fontWeight: "700" }}>
          {aiLoading ? "⟳ ANALIZANDO..." : "◈ GENERAR ANÁLISIS"}
        </button>
      </div>
      {aiText && (
        <div style={{ background: "#0a1820", border: "1px solid #00ff8833", borderRadius: "16px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#00ff88", marginBottom: "12px" }}>◈ RESULTADO</div>
          <div style={{ fontSize: "13px", lineHeight: "1.85", color: "#b0bcc8", whiteSpace: "pre-wrap" }}>{aiText}</div>
        </div>
      )}


      {/* ── Google Sheets Sync ── */}
      <div style={{ background: "#0c1318", border: "1px solid #00ff8822", borderRadius: "16px", padding: "18px", marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#00ff88", marginBottom: "4px" }}>☁ GOOGLE SHEETS · BASE DE DATOS</div>
        <div style={{ fontSize: "10px", color: "#9e968f", marginBottom: "14px", lineHeight: "1.6" }}>
          Sincroniza la app con tu Google Sheet en tiempo real. Puedes cambiar el script URL para apuntar a otra hoja.
        </div>

        {/* Script URL field */}
        <div style={{ marginBottom: "12px" }}>
          <div style={labelSt}>SCRIPT URL (Google Apps Script)</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/..."
              value={scriptUrl}
              onChange={e => setScriptUrl(e.target.value)}
              style={{ ...inputSt, fontSize: "10px", flex: 1 }}
            />
            <button onClick={() => saveScriptUrl(scriptUrl)} style={{ padding: "10px 14px", background: "#004d2a", border: "1px solid #00ff8833", borderRadius: "10px", color: "#00ff88", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ✓ Guardar
            </button>
          </div>
          {scriptUrl && (
            <div style={{ fontSize: "8px", color: "#00ff8866", marginTop: "6px", letterSpacing: "1px" }}>
              ✓ URL configurada
            </div>
          )}
        </div>

        {/* Sync buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={pullFromSheet}
            disabled={!scriptUrl || syncStatus === "pulling" || syncStatus === "pushing"}
            style={{ flex: 1, padding: "14px", background: syncStatus === "pulling" ? "#1a2a1a" : "linear-gradient(135deg,#003d22,#006636)", border: "1px solid #00ff8844", borderRadius: "12px", color: scriptUrl ? "#00ff88" : "#445", fontSize: "11px", letterSpacing: "1px", fontFamily: "inherit", cursor: scriptUrl ? "pointer" : "default", fontWeight: "700" }}>
            {syncStatus === "pulling" ? "⟳ CARGANDO..." : "↓ CARGAR SHEET"}
          </button>
          <button
            onClick={pushToSheet}
            disabled={!scriptUrl || syncStatus === "pulling" || syncStatus === "pushing"}
            style={{ flex: 1, padding: "14px", background: syncStatus === "pushing" ? "#2a1a00" : "linear-gradient(135deg,#2a1a00,#4a3000)", border: "1px solid #ffd70044", borderRadius: "12px", color: scriptUrl ? "#ffd700" : "#445", fontSize: "11px", letterSpacing: "1px", fontFamily: "inherit", cursor: scriptUrl ? "pointer" : "default", fontWeight: "700" }}>
            {syncStatus === "pushing" ? "⟳ GUARDANDO..." : "↑ GUARDAR EN SHEET"}
          </button>
        </div>

        {/* Status indicator */}
        <div style={{ marginTop: "10px", textAlign: "center", fontSize: "9px", color: syncStatus === "ok" ? "#00ff88" : syncStatus === "error" ? "#ff4455" : "#445", letterSpacing: "1px" }}>
          {syncStatus === "ok" && "✓ SINCRONIZADO"}
          {syncStatus === "error" && "✕ ERROR DE CONEXIÓN"}
          {(syncStatus === "idle" || syncStatus === "pulling" || syncStatus === "pushing") && (scriptUrl ? "Base de datos configurada" : "Sin base de datos configurada")}
        </div>

        {/* Instructions */}
        <div style={{ marginTop: "14px", background: "#080d0f", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "2px", color: "#ffd700", marginBottom: "8px" }}>CÓMO CONFIGURAR</div>
          <div style={{ fontSize: "10px", color: "#9e968f", lineHeight: "1.8" }}>
            1. Abre tu Google Sheet<br />
            2. Extensiones → Apps Script<br />
            3. Borra el código existente y pega el contenido del archivo descargado:<br />
          </div>
          <button onClick={downloadScript} style={{ width: "100%", padding: "12px", marginTop: "8px", marginBottom: "8px", background: "linear-gradient(135deg,#004d2a,#007a42)", border: "1px solid #00ff8844", borderRadius: "10px", color: "#00ff88", fontSize: "11px", letterSpacing: "1px", fontFamily: "inherit", cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            📥 DESCARGAR google-apps-script.js
          </button>
          <div style={{ fontSize: "10px", color: "#9e968f", lineHeight: "1.8" }}>
            4. Guarda el script (Ctrl+S)<br />
            5. Implementar → Nueva implementación → App web<br />
            6. Acceso: <span style={{ color: "#ffd700" }}>Cualquier persona</span><br />
            7. Copia la URL y pégala arriba
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: "8px", letterSpacing: "2px", color: "#c9c0b4", marginBottom: "10px" }}>RESUMEN MENSUAL</div>
        {computed.filter(r => r.total !== null).map((r) => {
          const i = computed.indexOf(r); const col = pctColor(r.rendPct);
          return (
            <div key={i} style={{ background: "#0c1318", borderRadius: "12px", padding: "12px 14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${col}` }}>
              <div>
                <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#d4ccbf" }}>{MONTHS[i]}</div>
                <div style={{ fontSize: "10px", color: "#c9c0b4", marginTop: "2px" }}>Cap: {fmt(r.c)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: col }}>{fpct(r.rendPct)}</div>
                <div style={{ fontSize: "11px", color: "#c9c0b4" }}>{fmt(r.total)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Root ──────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", maxWidth: "480px", height: "100dvh", background: "#080d0f", display: "flex", flexDirection: "column", fontFamily: "'Courier New',monospace", overflow: "hidden", margin: "0 auto", position: "relative" }}>
      {toast && (
        <div style={{ position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", background: "#0a1f12", border: "1px solid #00ff8855", borderRadius: "10px", padding: "10px 18px", fontSize: "11px", color: "#00ff88", zIndex: 300, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
      <div style={{ padding: "16px 20px 12px", paddingTop: "calc(16px + env(safe-area-inset-top))", borderBottom: "1px solid #0f1a1a", flexShrink: 0 }}>
        <div style={{ fontSize: "8px", letterSpacing: "4px", color: "#00ff8866" }}>◈ SWING TRADING</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff" }}>
          {tab === "home" ? "Dashboard" : tab === "tabla" ? "Registro Mensual" : tab === "resumen" ? "Portafolio" : "Análisis AI"}
        </div>
      </div>

      <YearSelector />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "home" && <HomeScreen />}
        {tab === "tabla" && <TablaScreen />}
        {tab === "resumen" && <ResumenScreen />}
        {tab === "ai" && <AIScreen />}
      </div>

      <div style={{ display: "flex", background: "#080d0f", borderTop: "1px solid #0f1a1a", paddingBottom: "max(8px, env(safe-area-inset-bottom))", flexShrink: 0 }}>
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", padding: "10px 0 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "17px", color: tab === id ? "#00ff88" : "#2a3a3a", filter: tab === id ? "drop-shadow(0 0 6px #00ff88)" : "none" }}>{icon}</span>
            <span style={{ fontSize: "6px", letterSpacing: "1px", color: tab === id ? "#00ff88" : "#2a3a3a" }}>{label}</span>
            {tab === id && <div style={{ width: "16px", height: "2px", background: "#00ff88", borderRadius: "2px" }} />}
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal && <InputModal label={`${MONTHS[modal.i]} · ${modal.label}`} value={data[modal.i][modal.field]} onSave={val => update(modal.i, modal.field, val)} onClose={() => setModal(null)} />}
      {editGoal && <InputModal label="META ANUAL ($)" value={goal} onSave={val => { if (parseFloat(val) > 0) setGoal(parseFloat(val)); }} onClose={() => setEditGoal(false)} />}
      {editCash && <InputModal label="CASH ($)" value={cash} onSave={val => setCash(parseFloat(val) || 0)} onClose={() => setEditCash(false)} />}
      {addStock && <AddStockModal onSave={handleAddStock} onClose={() => setAddStock(false)} />}
      {addTx !== null && <AddTransactionModal onSave={tx => handleAddTransaction(addTx, tx)} onClose={() => setAddTx(null)} />}
      {addTrade !== null && <AddTradingModal portfolioTickers={portfolioTickers} onSave={tx => handleAddTrading(addTrade, tx)} onClose={() => setAddTrade(null)} />}
      {editPrice !== null && portfolio[editPrice] && <InputModal label={`PRECIO · ${portfolio[editPrice].ticker}`} value={portfolio[editPrice].price} onSave={val => updateStockPrice(editPrice, val)} onClose={() => setEditPrice(null)} />}
      {editShares !== null && portfolio[editShares] && <InputModal label={`ACCIONES · ${portfolio[editShares].ticker}`} value={portfolio[editShares].shares} onSave={val => updateStockShares(editShares, val)} onClose={() => setEditShares(null)} />}
    </div>
  );
}
