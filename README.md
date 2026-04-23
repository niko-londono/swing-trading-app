# Swing Trading Portfolio PWA

App de gestión de portafolio de swing trading con análisis AI. Funciona como PWA instalable en el celular.

---

## 🚀 Setup inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Desarrollo local
```bash
npm run dev
```
Abre http://localhost:5173 en tu navegador.

---

## 📦 Deploy a GitHub Pages

### 1. Crear repositorio en GitHub
Crea un nuevo repositorio público, por ejemplo `swing-trading-app`.

### 2. Actualizar `vite.config.js`
Cambia la línea `base` con el nombre exacto de tu repo:
```js
base: "/swing-trading-app/",   // ← pon aquí el nombre de tu repo
```

### 3. Habilitar GitHub Pages con Actions
En tu repo → **Settings → Pages → Source → GitHub Actions**

### 4. Push al repo
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/swing-trading-app.git
git push -u origin main
```

El workflow de GitHub Actions se ejecuta automáticamente y en ~2 minutos tu app estará disponible en:
```
https://TU_USUARIO.github.io/swing-trading-app/
```

---

## 📱 Instalar como PWA en el celular

### iOS (Safari)
1. Abre la URL en Safari
2. Toca el botón compartir (□↑)
3. Selecciona **"Añadir a pantalla de inicio"**

### Android (Chrome)
1. Abre la URL en Chrome
2. Toca el menú (⋮)
3. Selecciona **"Añadir a pantalla de inicio"** o **"Instalar app"**

---

## 📁 Estructura del proyecto

```
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   └── swing-trading-2026.jsx   ← app principal
├── .github/workflows/deploy.yml
├── index.html
├── vite.config.js
└── package.json
```

---

## ⚠️ Nota sobre la API key de Anthropic

El análisis AI funciona a través de la API de Anthropic. Para producción, asegúrate de que tu API key esté configurada correctamente según el entorno donde despliegues la app.
