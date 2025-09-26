// app.js
const CACHE_VERSION = 'v1';
const breadListEl = document.getElementById('breadList');
const form = document.getElementById('formAdd');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const pingWorkerBtn = document.getElementById('pingWorkerBtn');

let breads = JSON.parse(localStorage.getItem('breads') || '[]');
render();
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene que Chrome muestre el prompt automáticamente
  e.preventDefault();
  deferredPrompt = e;

  // Muestra tu botón de instalar
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.style.display = 'block';
});

// Cuando el usuario hace clic en tu botón de instalar
const installBtn = document.getElementById('installBtn');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[app] Resultado instalación PWA:', outcome);
    deferredPrompt = null; // ya no se puede usar otra vez
  });
}


form.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  if (!name || isNaN(price)) return;
  breads.push({ id: Date.now(), name, price });
  localStorage.setItem('breads', JSON.stringify(breads));
  form.reset();
  render();
});

clearCacheBtn.addEventListener('click', async () => {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    console.log('[app] Cachés borradas:', keys);
    alert('Cachés borradas (dev). Recarga la página.');
  }
});

pingWorkerBtn.addEventListener('click', async () => {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    alert('No hay Service Worker activo');
    return;
  }
  const sw = navigator.serviceWorker.controller;
  // Enviar mensaje con un límite para el ejemplo (usa tu ejemplo)
  const msg = { type: 'GENERATE_NUMBER', limite: '1000' };
  const msgChannel = new MessageChannel();
  msgChannel.port1.onmessage = (ev) => {
    console.log('[app] Mensaje desde SW:', ev.data);
    alert('Numero generado por SW: ' + (ev.data.numero || '---'));
  };
  sw.postMessage(msg, [msgChannel.port2]);
});

function render() {
  breadListEl.innerHTML = '';
  if (breads.length === 0) {
    breadListEl.innerHTML = '<li>No hay panes. Agrega uno :)</li>';
    return;
  }
  breads.forEach(b => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${b.name} — $${b.price.toFixed(2)}</span>
                    <button data-id="${b.id}">Eliminar</button>`;
    li.querySelector('button').addEventListener('click', () => {
      breads = breads.filter(x => x.id !== b.id);
      localStorage.setItem('breads', JSON.stringify(breads));
      render();
    });
    breadListEl.appendChild(li);
  });
}

const enableBtn = document.getElementById('enableNotificationsBtn');

enableBtn.addEventListener('click', () => {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones');
    return;
  }

  Notification.requestPermission().then(permission => {
    console.log('[app] Permiso de notificaciones:', permission);

    if (permission === 'granted') {
      alert('¡Gracias! Ahora recibirás notificaciones de la panadería.');
      // Aquí puedes suscribir al usuario a push si quieres
    } else if (permission === 'denied') {
      alert('Has bloqueado las notificaciones. Puedes habilitarlas desde la configuración del navegador.');
    } else {
      alert('No se otorgó permiso para notificaciones.');
    }
  });
});



/* --- Registrar Service Worker --- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[app] Service Worker registrado:', reg);

      // si hay un SW esperando, puedes notificar al usuario
      if (reg.waiting) {
        console.log('[app] SW en espera (waiting). Posible nueva versión.');
      }

      // muestra updates en consola
      reg.addEventListener('updatefound', () => {
        console.log('[app] updatefound: nueva versión del SW detectada');
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          console.log('[app] nuevo SW state:', newSW.state);
        });
      });

      // Para que la pagina controle al SW inmediatamente (si ya hay controlador)
      if (navigator.serviceWorker.controller) {
        console.log('[app] Hay controlador activo.');
      }
    } catch (err) {
      console.error('[app] Registro de SW falló:', err);
    }
  });

  // opcional: escucha mensajes del SW (si envía)
  navigator.serviceWorker.addEventListener('message', (ev) => {
    console.log('[app] Mensaje recibido del SW (global):', ev.data);
  });
}
