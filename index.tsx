
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", serif;
  --color-patriot-navy: #003366;
  --color-patriot-gold: #FFC107;
}

@keyframes ring {
  0% { transform: rotate(0); }
  10% { transform: rotate(30deg); }
  20% { transform: rotate(-28deg); }
  30% { transform: rotate(34deg); }
  40% { transform: rotate(-32deg); }
  50% { transform: rotate(30deg); }
  60% { transform: rotate(-28deg); }
  70% { transform: rotate(34deg); }
  80% { transform: rotate(-32deg); }
  90% { transform: rotate(28deg); }
  100% { transform: rotate(0); }
}

.animate-ring {
  animation: ring 2s ease-in-out infinite;
  transform-origin: top center;
}

/* Global Styles */
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  background-color: #F8FAFC;
  color: #0F172A;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}
