import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 偵測 Android LINE 內建瀏覽器，強制跳外部瀏覽器
(function() {
  const ua = navigator.userAgent || '';
  const isLineApp = ua.includes('Line/');
  const isAndroid = ua.includes('Android');
  if (isLineApp && isAndroid) {
    const url = location.href;
    // 加上 openExternalBrowser=1 參數，LINE 會跳去 Chrome 開啟
    if (!url.includes('openExternalBrowser')) {
      location.href = url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
    }
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
