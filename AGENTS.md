# Swing Trading Portfolio App — Resumen del Proyecto

> **Archivo para agentes AI.** Lee este archivo en lugar de escanear todo el código fuente.
> Última actualización: 2026-09-02

---

## 🔧 Tecnologías Utilizadas

| Categoría | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Framework UI** | React | ^18.3.1 | Renderizado de componentes |
| **Build Tool** | Vite | ^5.3.4 | Bundling, dev server, HMR |
| **Plugin React** | @vitejs/plugin-react | ^4.3.1 | JSX transform, Fast Refresh |
| **PWA** | vite-plugin-pwa | ^0.20.1 | Service Worker, manifest, offline |
| **Gráficos** | Recharts | ^2.12.7 | AreaChart, PieChart, BarChart |
| **Excel** | xlsx (SheetJS) | ^0.18.5 | Import/export de archivos .xlsx |
| **AI** | Anthropic API | claude-sonnet-4 | Análisis de portafolio vía API REST |
| **Precios** | Yahoo Finance API | v8 chart | Precios de mercado (vía allorigins proxy) |
| **Backend** | Google Apps Script | — | Persistencia en Google Sheets |
| **Deploy** | GitHub Pages | Actions v4 | CI/CD automático en push a `main` |
| **Tipado** | @types/react, @types/react-dom | ^18.3.x | Tipos para IDE (no se usa TypeScript) |

### Scripts NPM

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

---

## 📁 Estructura de Carpetas

```
swing-trading-app/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD → GitHub Pages (Node 22)
├── dist/                           # Build de producción (generado)
│   ├── assets/                     # JS/CSS bundleados
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js                       # Service Worker (Workbox)
│   └── registerSW.js
├── public/
│   └── favicon.svg                 # Favicon SVG
├── src/
│   ├── main.jsx                    # Entry point — monta <App /> en #root
│   └── swing-trading-2026.jsx      # ★ COMPONENTE MONOLÍTICO (~3196 líneas, ~190KB)
├── index.html                      # HTML shell (PWA meta tags, base CSS)
├── vite.config.js                  # Config Vite + PWA manifest + Workbox
├── package.json
├── URL-BD-PORTAFOLIO.txt           # URL del Google Apps Script deployment
├── .gitignore                      # Solo ignora node_modules/
└── README.md
```

> **IMPORTANTE:** Toda la lógica de la app vive en un solo archivo: `src/swing-trading-2026.jsx`.
> No hay CSS externo, routing, ni state management externo. Todo es inline styles + useState.

---

## 🏗️ Arquitectura del Componente Principal

### `src/swing-trading-2026.jsx` — Mapa de Secciones por Línea

```
Líneas   1–6      → Imports (React, Recharts, xlsx)
Líneas   8–16     → Constantes globales (MONTHS, CATEGORIAS, colores, íconos)
Líneas   18–154   → Google Apps Script embebido (string template para backend)
Líneas   156–183  → Utilidades (downloadScript, uid, emptyYear, fmt, pctColor, estilos base)
Líneas   185–600  → MODALS (componentes independientes fuera de App):
                     ├── InputModal         (L187)  — Editar valor numérico genérico
                     ├── EditPlazoModal      (L206)  — Configurar plazo por categoría
                     ├── AddStockModal       (L254)  — Agregar posición al portafolio
                     ├── EditCompraModal     (L310)  — Editar transacción de compra
                     ├── AddTradingModal     (L393)  — Agregar operación de trading
                     └── AddTransactionModal (L489)  — Agregar G/L acciones (dividendo/venta/trading)
Líneas   601–3196 → export default function App()
                     ├── STATE (~60 líneas)
                     │   ├── allData        → { [year]: Array(12) de meses }
                     │   ├── portfolio      → [{ ticker, shares, price, categoria, history }]
                     │   ├── cash, goal     → números
                     │   ├── tab            → "home"|"tabla"|"resumen"|"graficos"|"performance"|"ai"
                     │   ├── unrealized     → { [year]: { startValue, endValue } }
                     │   ├── plazoConfig    → { ETF:"LARGO PLAZO", CRYPTO:"LARGO PLAZO", ... }
                     │   ├── yearSnapshots  → { [year]: { portfolioValue, cash } }
                     │   └── modal states   → addStock, addTx, addTrade, editTx, etc.
                     │
                     ├── EFFECTS (L670–689)
                     │   ├── Persistir unrealized, yearSnapshots, plazoConfig en localStorage
                     │   └── Listener de resize para isMobile
                     │
                     ├── HANDLERS (L694–1196)
                     │   ├── updatePrices()      → Yahoo Finance vía allorigins proxy
                     │   ├── goYear()            → Navegar entre años
                     │   ├── saveTrade()         → Guardar operación trading
                     │   ├── saveTx()            → Guardar transacción acciones
                     │   ├── handleAddStock()    → Agregar stock + registro compra en mes
                     │   ├── saveEditedCompra()  → Editar compra existente
                     │   ├── exportExcel()       → Exportar a .xlsx
                     │   ├── importExcel()       → Importar desde .xlsx
                     │   ├── pullFromSheet()     → GET desde Google Apps Script
                     │   ├── pushToSheet()       → POST hacia Google Apps Script
                     │   └── askAI()             → Llamada a Anthropic API
                     │
                     ├── COMPUTED (L900–987)
                     │   ├── computed[]          → Cálculos por mes (total, rendPct, etc.)
                     │   ├── ytd, faltante, progress, promedio, necesario
                     │   ├── Portfolio metrics   → stockValue, totalPortfolioValue, pieData, barData
                     │   └── Chart data          → rendMensualData, dividendosData, ventasData
                     │
                     ├── SHARED COMPONENTS (L1222–1321)
                     │   ├── YearSelector        → Navegación entre años
                     │   └── TxCard              → Tarjeta de transacción reutilizable
                     │
                     ├── SCREENS (L1322–2996)
                     │   ├── HomeScreen          (L1324)  — Dashboard principal con KPIs
                     │   ├── TablaScreen         (L1392)  — Tabla mensual de G/L
                     │   ├── ResumenScreen       (L1549)  — Portafolio con pie/bar charts
                     │   ├── GraficosScreen      (L1706)  — Gráficos detallados multi-año
                     │   ├── PerformanceScreen   (L2273)  — ROI, rendimiento anual, equity curve
                     │   └── AIScreen            (L2886)  — Análisis AI + sync Google Sheets
                     │
                     ├── MODALS WRAPPER (L2997–3072)
                     │   └── Modals()            → Renderiza todos los modals condicionalmente
                     │
                     └── RENDER (L3073–3195)
                         ├── Mobile layout       (L3075)  — Bottom tab bar
                         └── Desktop layout      (L3118)  — Sidebar + top bar
```

---

## 📊 Modelo de Datos

### `allData` — Datos por Año
```js
{
  2026: [
    // Array de 12 meses (índice 0 = Enero, 11 = Diciembre)
    {
      trading: number | "",     // G/L trading manual (si no hay detail)
      capital: number | "",     // Capital usado manual
      margin: number | "",      // Impuestos/margin
      tradingDetail: [          // Operaciones de trading individuales
        { id, ticker, tipo, capital, ganancia }
      ],
      accionesDetail: [         // Transacciones de acciones
        { id, ticker, tipo:"dividendo"|"venta"|"compra"|"trading",
          monto, shares?, precioCompra?, precioVenta?, sharesVendidas? }
      ]
    },
    // ... 11 meses más
  ]
}
```

### `portfolio` — Posiciones Actuales
```js
[
  {
    ticker: "AAPL",
    shares: 10,
    price: 150.00,       // Precio actual (actualizable via Yahoo Finance)
    monthIdx: 0,         // Mes de compra original
    categoria: "ACCIONES", // ACCIONES | ETF | CRYPTO | TRADING
    history: []          // Historial de precios
  }
]
```

### Persistencia
| Dato | Storage | Mecanismo |
|---|---|---|
| `unrealized` | localStorage(`swingUnrealized`) | useEffect auto-save |
| `yearSnapshots` | localStorage(`swingYearSnapshots`) | useEffect auto-save |
| `plazoConfig` | localStorage(`swingPlazoConfig`) | useEffect auto-save |
| `scriptUrl` | localStorage(`swingScriptUrl`) | Manual save |
| **Todo el estado** | Google Sheets | Pull/Push manual vía Apps Script |
| **Todo el estado** | Excel .xlsx | Import/Export manual |

---

## 🌐 Integraciones Externas

### Yahoo Finance (Precios en tiempo real)
- **Endpoint:** `https://query2.finance.yahoo.com/v8/finance/chart/{TICKER}`
- **Proxy:** `https://api.allorigins.win/raw?url=...` (para evitar CORS)
- **Función:** `updatePrices()` (L694)

### Anthropic API (Análisis AI)
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Modelo:** `claude-sonnet-4-20250514`
- **Función:** `askAI()` (L1198)
- **Nota:** Requiere API key configurada (no hardcodeada en el código visible)

### Google Apps Script (Backend/Persistencia)
- **URL del deployment:** Almacenada en localStorage y en `URL-BD-PORTAFOLIO.txt`
- **GET:** `?action=get` → Retorna JSON completo desde celda A1 de hoja "AppData"
- **POST:** `data=JSON` → Guarda en A1 + genera hojas legibles (Vista_YYYY, Vista_Portafolio, Vista_Info)
- **Funciones:** `pullFromSheet()` (L1153), `pushToSheet()` (L1171)

---

## 🎨 Diseño y Estilos

- **Todo inline styles** — No hay archivos CSS externos
- **Tema:** Dark mode con fondo `#080d0f`
- **Colores principales:**
  - Verde: `#00ff88` (ganancias, acciones)
  - Azul: `#4aaeff` (ETF, largo plazo)
  - Dorado: `#ffd700` (crypto, dividendos)
  - Púrpura: `#aa88ff` (trading)
  - Rojo: `#ff4455` (pérdidas)
- **Fuente monoespaciada:** `'Courier New', monospace`
- **Responsive:** `isMobile = window.innerWidth < 768`
  - Mobile: Bottom tab bar, modales desde abajo
  - Desktop: Sidebar izquierda + top bar

---

## 🚀 Deploy

- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`)
- **Trigger:** Push a `main` o manual dispatch
- **Base URL:** `/swing-trading-app/`
- **PWA:** Standalone, portrait, theme `#080d0f`

---

## ⚠️ Notas para Desarrollo

1. **Archivo monolítico:** Todo vive en `swing-trading-2026.jsx` (~3196 líneas). Cualquier cambio se hace ahí.
2. **Sin routing:** La navegación es por estado `tab` con renderizado condicional.
3. **Sin state management externo:** Todo es `useState` + `useCallback` + `useEffect`.
4. **Categorías fijas:** `ACCIONES`, `ETF`, `CRYPTO`, `TRADING` (definidas en constante `CATEGORIAS`).
5. **Años dinámicos:** Se pueden crear nuevos años navegando con `goYear(+1)`.
6. **Service Worker:** Workbox con caching de assets estáticos, NetworkOnly para Anthropic API.
