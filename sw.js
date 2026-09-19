// Le service worker du Modèle Bounty (Léo, 16/09/2026) : il reçoit les
// notifications « push » même application fermée, et les affiche comme une
// notification du système. Un clic ouvre l'application (ou la remet devant).
//
// Depuis la 4.0 (plan docs/43, phase 1) il garde aussi les logiciels hors
// ligne : les morceaux de code construits (dossier assets/, noms qui changent
// à chaque version) sont mis en cache la première fois qu'ils sont demandés —
// c'est ce que fait l'écran « Installation des logiciels » — et servis depuis
// le cache ensuite. La page elle-même reste servie en direct : une nouvelle
// version se prend en rechargeant.

const CACHE = "mb-logiciels-v1";

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // les caches d'une autre génération s'en vont
    for (const nom of await caches.keys()) if (nom !== CACHE) await caches.delete(nom);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.includes("/assets/")) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const enCache = await cache.match(e.request);
    if (enCache) return enCache;
    const reponse = await fetch(e.request);
    if (reponse.ok) await cache.put(e.request, reponse.clone());
    return reponse;
  })());
});

self.addEventListener("push", (e) => {
  let d = { titre: "Modèle Bounty", texte: "", url: "./", id: "" };
  try { d = { ...d, ...(e.data ? e.data.json() : {}) }; } catch { /* une charge illisible : on montre le titre par défaut */ }
  e.waitUntil(self.registration.showNotification(d.titre, {
    body: d.texte, tag: d.id || undefined, icon: "./icone-256.png", badge: "./icone-128.png", data: { url: d.url }, renotify: false,
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  // L'adresse vient de l'abonnement en base ; on n'ouvre que la nôtre (rapport de sécurité du 17/09/2026).
  const voulue = String((e.notification.data && e.notification.data.url) || "");
  const url = voulue.startsWith(self.location.origin + "/") ? voulue : "./";
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenetres) { if ("focus" in f) { try { await f.focus(); return; } catch { /* suivant */ } } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
