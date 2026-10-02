# 📜 HISTORIAL Y ARQUITECTURA DEL PROYECTO — SWING TRADING APP

> **DOCUMENTO PARA AGENTES DE IA Y DESARROLLADORES**  
> **Propósito:** Lee este archivo al inicio de una conversación o sesión de desarrollo. Contiene el historial completo de cambios realizados, el mapeo exacto de líneas del archivo monolítico `src/swing-trading-2026.jsx` (3413 líneas) y la lógica matemática/financiera de la aplicación.  
> **Ahorro de tokens:** Consultar este mapa evita escanear todo el código fuente o realizar búsquedas costosas.

---

## 📑 ÍNDICE
1. [Historial Cronológico de Cambios](#1-historial-cronológico-de-cambios)
2. [Estructura del Proyecto y Tecnologías](#2-estructura-del-proyecto-y-tecnologías)
3. [Mapa Detallado de Líneas (`src/swing-trading-2026.jsx`)](#3-mapa-detallado-de-líneas-srcswing-trading-2026jsx)
4. [Modelo de Datos y Persistencia](#4-modelo-de-datos-y-persistencia)
5. [Lógica de Negocio y Fórmulas Matemáticas Críticas](#5-lógica-de-negocio-y-fórmulas-matemáticas-críticas)
6. [Guía Rápida para Futuros Desarrollos](#6-guía-rápida-para-futuros-desarrollos)

---

## 1. 🕒 HISTORIAL CRONOLÓGICO DE CAMBIOS

### Fase Inicial (Abril – Mayo 2026)
* **Creación de la App:** Configuración de Vite, React 18, PWA con Service Worker, Recharts y SheetJS (`xlsx`).
* **Backend sin Servidor (Google Apps Script):** Código embebido dentro de la app para persistencia directa en Google Sheets (`AppData` y vistas legibles).
* **Integración de Precios Yahoo Finance:** Conexión vía proxy CORS (`allorigins.win`) para actualización de precios de activos en tiempo real.
* **Exportación / Importación Excel:** Serialización completa de `allData`, `portfolio`, `unrealized` y `yearSnapshots`.
* **Registro de Acciones y Categorías:** Posiciones clasificadas en `ACCIONES`, `ETF`, `CRYPTO`, `TRADING`.

### Fase de Expansión de Gráficos y Métricas (Junio – Agosto 2026)
* **Pestaña Performance:** Curva de equity histórica, cálculo de valor inicial basado en compras de enero, ROI y métricas multianuales.
* **Separación Realized vs Unrealized:** Registro manual de valor latente de portafolio por año (`swingUnrealized`).
* **Snapshots de Años:** Guardado de snapshots de valor de portafolio y cash al cerrar o cambiar de año (`swingYearSnapshots`).
* **Margen / Impuestos:** Deducción mensual de costos de margen/comisiones que impacta automáticamente en el cash.

### Fase de Refinamiento y Métricas Avanzadas (Septiembre – Octubre 2026) ★
1. **Separación de Métricas de Trading (`GraficosScreen`):**
   * Se extrajeron las métricas detalladas de trading de la tarjeta general de categorías y se ubicaron en una sección dedicada: **◈ MÉTRICAS Y RENDIMIENTO DE TRADING**.
   * Se aumentaron tamaños de fuente, títulos completos y visualización en tarjetas individuales:
     * *Ganancia Total Trading ($)*
     * *% del Portafolio*
     * *Ganancia Promedio Mensual %*
     * *Ganancia Promedio Mensual $*
     * *Capital Utilizado Promedio Mensual*
2. **Cálculo de Capital Utilizado Promedio Realized (`capitalPromRealized`):**
   * Se implementó el cálculo del capital utilizado promedio para ventas de acciones: recorre todas las ventas de tipo `venta` y calcula `sharesVendidas * precioCompra`.
   * Se combina con el capital utilizado promedio de trading (`capitalPromTrading`) para obtener el capital promedio activo del portafolio.
3. **Nuevas Métricas en el Dashboard (`HomeScreen`):**
   * **Tarjeta `PROMEDIO/MES`:** Muestra la ganancia promedio en dólares y al lado el rendimiento porcentual promedio mensual (`promedioPct`), calculado sobre `capitalPromRealized`.
   * **Tarjeta `PROMEDIO/MES CAPITAL UTILIZADO`:** Nueva tarjeta que muestra `capitalPromRealized` con subtítulo `base cálculo meta (10%/m)`.
   * **Aumento de Subtítulos para PC:** Ajuste de tipografía en subtítulos de métricas en pantallas grandes (`isMobile ? "9px" : "13px"`).
4. **Meta Anual Dinámica (10% Mensual):**
   * Si existe capital utilizado promedio (`capitalPromRealized > 0`):
     * `metaMensual = capitalPromRealized * 0.10`
     * `metaAnual = metaMensual * 12`
   * Si no hay capital utilizado registrado, se utiliza el objetivo manual ingresado por el usuario (`goal`, por defecto $750).
5. **Rendimiento % Mensual Combinado en `TablaScreen`:**
   * La columna `REND. %` de cada mes ahora suma tanto el trading como las ventas de acciones cerradas:
     $$\text{rendPct} = \frac{\text{tradingGain} + \text{ventasGain}}{\text{tradingCap} + \text{ventasCap}} \times 100$$
6. **Estandarización Visual con `PctBadge`:**
   * Se creó el componente reutilizable `PctBadge`:
     * Positivo: Texto `#00ff88` con fondo `#00ff8818` y signo `+`.
     * Negativo: Texto `#ff4455` con fondo `#ff445518`.
   * Se aplicó de manera homogénea en:
     * **Inicio:** Badges en promedios y progreso.
     * **Gráficos:** Tarjetas de resumen anual (Unrealized, Realized, Rend. Anual), tabla comparativa de años, tarjetas de métricas de trading.
     * **Performance:** Tarjetas de desglose anual (`G/L TRADING`, `G/L VENTAS RL`, `G/L DIVIDENDOS`, `G/L VENTAS UNRL`, `TOTAL G/L`, `DEPÓSITOS`).

---

## 2. 🛠️ ESTRUCTURA DEL PROYECTO Y TECNOLOGÍAS

```
swing-trading-app/
├── .github/workflows/deploy.yml   # Deploy automático a GitHub Pages (Node 22)
├── public/favicon.svg             # Favicon
├── src/
│   ├── main.jsx                   # Entry point (monta <App />)
│   └── swing-trading-2026.jsx     # ★ ARCHIVO MONOLÍTICO PRINCIPAL (~3413 líneas)
├── index.html                     # Shell HTML, PWA headers, estilos CSS base
├── vite.config.js                 # Config Vite + PWA Manifest + Workbox
├── package.json                   # Dependencias del proyecto
├── URL-BD-PORTAFOLIO.txt          # Endpoint URL de Google Apps Script
├── AGENTS.md                      # Instrucciones iniciales para agentes AI
└── HISTORIAL.md                   # ★ Este archivo (guía maestra y contexto completo)
```

### Tecnologías:
* **React 18.3.1** (sin TypeScript, JSX puro, hooks de estado nativos).
* **Vite 5.3.4** (HMR y build rápido).
* **Recharts 2.12.7** (`AreaChart`, `BarChart`, `PieChart`, `ResponsiveContainer`).
* **SheetJS (`xlsx` 0.18.5)** (Importación/exportación de libros Excel multi-hoja).
* **Claude Sonnet API (Anthropic REST)**: Análisis inteligente del portafolio.
* **Estilos:** Inline styles con paleta dark mode premium (`#080d0f`, `#00ff88`, `#ffd700`, `#4aaeff`, `#aa88ff`).

---

## 3. 🗺️ MAPA DETALLADO DE LÍNEAS (`src/swing-trading-2026.jsx`)

Total de líneas: **3413**

| Rango de Líneas | Sección / Componente | Descripción |
|---|---|---|
| **1 – 17** | **Imports y Constantes** | Recharts, XLSX, `MONTHS`, `CATEGORIAS`, `CAT_COLORS`, `CAT_ICONS`, `DEFAULT_GOAL` |
| **18 – 154** | **Google Apps Script** | Plantilla de código backend para Google Sheets (`doGet`, `doPost`, `writeReadableView`) |
| **156 – 210** | **Utilidades y Helpers** | `downloadScript`, `uid`, `emptyYear`, `fmt`, `fpct`, `pctColor`, estilos base y `PctBadge` |
| **185 – 209** | 🌟 `PctBadge` | Componente reutilizable para badges verde/rojo con porcentajes |
| **211 – 626** | **Modales Independientes** | |
| ↳ *213 – 230* | `InputModal` | Modal genérico para editar valores numéricos o texto |
| ↳ *232 – 278* | `EditPlazoModal` | Configura si una categoría es CORTO o LARGO PLAZO |
| ↳ *280 – 334* | `AddStockModal` | Agrega nueva posición al portafolio con mes de compra inicial |
| ↳ *336 – 417* | `EditCompraModal` | Permite editar acciones, precio y cambiar el mes de una compra |
| ↳ *419 – 513* | `AddTradingModal` | Formulario para registrar operaciones cerradas de swing trading |
| ↳ *515 – 617* | `AddTransactionModal`| Formulario para registrar dividendos o ventas de acciones |
| ↳ *619 – 625* | `PieLabel` | Renderizador personalizado de etiquetas en gráficos de pastel |
| **628 – 3412**| **`export default function App()`** | Componente monolítico central de la aplicación |
| **629 – 686** | **Estado (`useState`)** | `allData`, `portfolio`, `cash`, `goal`, `activeYear`, `tab`, `unrealized`, `plazoConfig`, etc. |
| **696 – 717** | **Efectos (`useEffect`)** | Persistencia a `localStorage` (`swingUnrealized`, `swingYearSnapshots`, `swingPlazoConfig`), resize listener |
| **718 – 925** | **Handlers de Acción** | |
| ↳ *720 – 763* | `updatePrices()` | Consulta precios a Yahoo Finance mediante `allorigins.win` proxy |
| ↳ *769 – 781* | `goYear(dir)` | Navegación entre años, guarda snapshots de valor al cambiar |
| ↳ *783 – 794* | `update(i, field, val)`| Edición de campos mensuales directos y deducción de margen en cash |
| ↳ *797 – 835* | `handleAddTrading` / `removeTradingTx` | Agrega/elimina operaciones trading, ajusta cash y posiciones |
| ↳ *838 – 864* | `handleAddTransaction` / `removeTransaction` | Agrega/elimina dividendos o ventas, actualiza historial de ticker |
| ↳ *867 – 900* | `handleAddStock` | Agrega posición (o promedia ponderado existente) y descuenta cash |
| ↳ *903 – 924* | `handleSaveCompraTx` | Guarda edición de transacción de compra existente |
| **926 – 1030**| **Métricas Calculadas (`computed`)** | |
| ↳ *927 – 955* | `computed` | Mapeo mensual: tradingDetail, accionesDetail, margen, rendimiento combinado |
| ↳ *957 – 965* | `capitalPromVentasAcciones` | Promedio de capital invertido en ventas de acciones en el año activo |
| ↳ *966 – 973* | `capitalPromTrading` | Promedio de capital mensual utilizado en trading |
| ↳ *974 – 979* | `capitalPromRealized` | Promedio ponderado de capital activo de ambas fuentes |
| ↳ *980 – 994* | YTD, Promedios y Meta | `ytd`, `promedio`, `promedioPct`, `metaMensual` (10%), `metaAnual`, `faltante`, `progreso` |
| ↳ *997 – 1017*| Métricas de Portafolio | `stockValue`, `totalPortfolioValue`, `cashPct`, `stockPct`, `pieData`, `barData` |
| ↳ *1018 – 1030*| `txHistory` y Gráficos Data | Desglose mensual para gráficos de dividendos, ventas y trading |
| **1031 – 1282**| **Sincronización, Exportación y AI** | |
| ↳ *1150 – 1206*| `exportExcel` / `importExcel` | Serialización e importación de archivos `.xlsx` |
| ↳ *1208 – 1265*| `pullFromSheet` / `pushToSheet`| Sincronización GET/POST con Google Apps Script |
| ↳ *1268 – 1281*| `askAI` | Llamada a Claude Sonnet API con resumen de métricas del año |
| **1292 – 1392**| **Componentes Compartidos** | |
| ↳ *1294 – 1303*| `YearSelector` | Selector interactivo de año anterior / siguiente |
| ↳ *1306 – 1391*| `TxCard` / `TradeCard` | Tarjetas de visualización de transacciones individuales |
| **1394 – 3212**| **PANTALLAS (SCREENS)** | |
| ↳ *1394 – 1516*| `HomeScreen` | **Inicio:** KPI YTD grande, Meta del 10%, Faltante, Promedio/mes con %, Capital Utilizado |
| ↳ *1517 – 1673*| `TablaScreen` | **Registro Mensual:** Tabla 12 meses, edición de trading, acciones, margen y detalle |
| ↳ *1674 – 1830*| `ResumenScreen` | **Portafolio:** Valor total, desglose Cash/Acciones, tarjetas de posiciones y dropdown categoría |
| ↳ *1831 – 2483*| `GraficosScreen` | **Gráficos y Métricas:** Resumen anual (Unrealized/Realized), tabla histórica, sección dedicada de Trading, gráficos Recharts |
| ↳ *2484 – 3102*| `PerformanceScreen` | **Performance:** Curva de equity, filtros temporales, ROI anual, desglose en 4 cards + Total G/L + Depósitos |
| ↳ *3103 – 3212*| `AIScreen` | **Análisis AI & Sync:** Prompt a Claude, visor de respuesta, sync con Google Sheets |
| **3215 – 3288**| **Wrapper de Modals (`Modals`)** | Render condicional de todos los modales (incluye advertencia de confirmación push) |
| **3293 – 3333**| **Render Móvil (`isMobile`)** | Layout con Bottom Navigation Bar, safe-area insets |
| **3335 – 3412**| **Render Desktop / Tablet** | Layout con Sidebar lateral fija izquierda + Top Header bar |

---

## 4. 💾 MODELO DE DATOS Y PERSISTENCIA

### `allData`
Almacena por cada año un array de 12 objetos (índice 0 = ENERO, 11 = DICIEMBRE):
```javascript
{
  "2026": [
    {
      "trading": 120.50,       // Ganancia manual si no hay tradingDetail
      "capital": 1000,         // Capital manual si no hay tradingDetail
      "margin": 15.20,         // Costos de intereses/margen deducidos del mes
      "tradingDetail": [
        {
          "id": "abc1234",
          "ticker": "TSLA",
          "tipo": "swing",
          "capital": 1200,
          "ganancia": 85.50,
          "cashRecibido": 85.50,
          "sharesVendidas": 5,
          "precioCompra": 240,
          "precioVenta": 257.10
        }
      ],
      "accionesDetail": [
        {
          "id": "def5678",
          "tipo": "compra",    // "compra" | "venta" | "dividendo"
          "ticker": "AAPL",
          "shares": 10,
          "precioCompra": 180,
          "monto": 0           // En compra es 0 (no es ganancia)
        },
        {
          "id": "ghi9012",
          "tipo": "venta",
          "ticker": "META",
          "sharesVendidas": 2,
          "precioCompra": 593.32,
          "precioVenta": 645.33,
          "monto": 104.02      // Ganancia neta realizada
        }
      ]
    }
  ]
}
```

### `portfolio`
Posiciones abiertas actuales:
```javascript
[
  {
    "ticker": "NVDA",
    "shares": 15,
    "price": 128.50,          // Actualizable con Yahoo Finance
    "categoria": "ACCIONES",  // ACCIONES | ETF | CRYPTO | TRADING
    "history": [              // Trazabilidad de compras y ventas de esta posición
      { "tipo": "compra", "mes": "ENERO", "year": 2026, "shares": 15, "precioCompra": 115.00, "cashUsado": 1725.00 }
    ]
  }
]
```

### `localStorage` Keys
* `swingUnrealized`: Objeto `{ [year]: { usd: number, pct: number } }`.
* `swingYearSnapshots`: Objeto `{ [year]: { portfolioValue: number, cash: number } }`.
* `swingPlazoConfig`: Mapeo de categorías a `"CORTO PLAZO"` o `"LARGO PLAZO"`.
* `swingScriptUrl`: URL del backend de Google Apps Script.

---

## 5. 🧮 LÓGICA DE NEGOCIO Y FÓRMULAS MATEMÁTICAS CRÍTICAS

### 1. Rendimiento Mensual Total en Dólares ($)
Para cada mes en `computed`:
$$\text{total} = \text{tradingGain} + \text{accionesGain} - \text{margin}$$
*(Donde `accionesGain` excluye transacciones de tipo `"compra"`).*

### 2. Rendimiento Mensual Combinado (%)
$$\text{rendPct} = \frac{\text{tradingGain} + \text{ventasGain}}{\text{tradingCap} + \text{ventasCap}} \times 100$$
* `ventasCap` se calcula como `sharesVendidas * precioCompra`.

### 3. Capital Utilizado Promedio (`capitalPromRealized`)
1. **Acciones Vendidas:**
   $$\text{capitalPromVentasAcciones} = \frac{\sum (\text{sharesVendidas} \times \text{precioCompra})}{N_{\text{ventas}}}$$
2. **Trading:**
   $$\text{capitalPromTrading} = \frac{\sum \text{capital mensual de trading}}{N_{\text{meses activos trading}}}$$
3. **Ponderado Realized:**
   Promedio entre ambas fuentes según cuáles estén activas (> 0).

### 4. Meta Anual y Mensual Dinámica (10%)
* Si $\text{capitalPromRealized} > 0$:
  $$\text{metaMensual} = \text{capitalPromRealized} \times 0.10$$
  $$\text{metaAnual} = \text{metaMensual} \times 12$$
* Si $\text{capitalPromRealized} = 0$:
  Fallback a `goal` manual ingresado por el usuario ($750 por defecto).
* **Rendimiento Promedio Mensual (%):**
  $$\text{promedioPct} = \frac{\text{promedio}}{\text{capitalPromRealized}} \times 100$$
* **Necesario Mensual para Meta:**
  $$\text{necesario} = \frac{\text{metaAnual} - \text{YTD}}{12 - \text{mesesActivos}}$$

---

## 6. 🚀 GUÍA RÁPIDA PARA FUTUROS DESARROLLOS

1. **Cero Dependencias de CSS Externas:**
   * Todos los componentes usan `style={{ ... }}` directamente en JSX.
   * Mantener siempre la fuente monospaced: `fontFamily: "'Courier New',monospace"`.
2. **Para Mostrar Porcentajes Nuevos:**
   * Utilizar siempre `<PctBadge val={porcentaje} />`. No renderizar etiquetas con texto plano gris si representan ganancias/pérdidas.
3. **Para Probar Compilación:**
   * Ejecutar en terminal: `npm run build`. El build genera el bundle en `dist/` y actualiza el Service Worker Workbox sin fallos.
4. **Al Abrir una Nueva Conversación:**
   * Citar directamente las líneas de `src/swing-trading-2026.jsx` usando este mapa para editar con `replace_file_content` o `multi_replace_file_content` de forma precisa y con mínimo consumo de tokens.
