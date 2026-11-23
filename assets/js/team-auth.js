/* =====================================================================
   CLASSLAB – ACCESSO CONDIVISO DELL'AREA TEAM
   ---------------------------------------------------------------------
   Usato da: area-team.html, /turni/, /materiali/, /permessi/.
   Gestisce il login Google (solo account @classlab.it), la sessione
   condivisa tra le pagine (sessionStorage "turniToken") e le chiamate
   agli script Google. Ogni pagina decide solo cosa mostrare.

   Uso:
     TeamAuth.avvia({
       api: "https://script.google.com/macros/s/.../exec", // facoltativo se non si usa chiama()
       bottone: "gbtn",                 // id dell'elemento dove disegnare il pulsante Google
       onLogin: function (msg) {},      // mostra la schermata di accesso (msg = eventuale errore)
       onAccesso: function (p, tok) {}, // l'utente è dentro: p = dati del profilo Google
       onBusy: function (attivo) {}     // facoltativo: barra di caricamento
     });
     TeamAuth.chiama("nomeFunzione", arg1, arg2)  → Promise con i dati
     TeamAuth.esci()
   Per cambiare il modo di accedere si modifica solo questo file.
   ===================================================================== */
window.TeamAuth = (function () {
  var DOMINIO = "classlab.it";
  var CHIAVE = "turniToken"; // stessa sessione in tutte le pagine: un solo accesso
  var token = null;
  var o = {};

  function payload(tok) {
    try { return JSON.parse(decodeURIComponent(escape(atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e) { return {}; }
  }
  function valido(tok) {
    var p = tok && payload(tok);
    return !!(p && p.exp && p.exp * 1000 > Date.now() + 60000 && p.hd === DOMINIO);
  }
  function dimentica() {
    token = null;
    try { sessionStorage.removeItem(CHIAVE); } catch (e) {}
  }
  function login(msg) {
    if (o.onLogin) o.onLogin(msg || "");
    try { google.accounts.id.prompt(); } catch (e) {}
  }
  function onCredenziale(r) {
    var p = payload(r.credential);
    if (p.hd !== DOMINIO) { login("Puoi accedere solo con un account @" + DOMINIO + "."); return; }
    token = r.credential;
    try { sessionStorage.setItem(CHIAVE, token); } catch (e) {}
    if (o.onAccesso) o.onAccesso(p, token);
  }

  function avvia(opzioni) {
    o = opzioni || {};
    var cid = (window.TURNI_CONFIG || {}).CLIENT_ID;
    if (!cid) { login("Manca il CLIENT_ID in turni/config.js."); return; }
    if (!window.google || !google.accounts || !google.accounts.id) { setTimeout(function () { avvia(o); }, 100); return; }
    google.accounts.id.initialize({ client_id: cid, callback: onCredenziale, hd: DOMINIO, auto_select: true, cancel_on_tap_outside: false });
    var b = document.getElementById(o.bottone || "gbtn");
    if (b) google.accounts.id.renderButton(b, { theme: "outline", size: "large", text: "signin_with", shape: "pill", locale: "it" });
    var tok = null; try { tok = sessionStorage.getItem(CHIAVE); } catch (e) {}
    if (valido(tok)) onCredenziale({ credential: tok }); else login("");
  }

  function esci() {
    dimentica();
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    login("");
  }

  function chiama(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!valido(token)) {
      dimentica(); login("Sessione scaduta: accedi di nuovo.");
      return Promise.reject(Object.assign(new Error("Sessione scaduta: accedi di nuovo."), { auth: true }));
    }
    if (o.onBusy) o.onBusy(true);
    return fetch(o.api || (window.TURNI_CONFIG || {}).API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: token, fn: fn, args: args })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) {
        var e = new Error(j.errore || "Errore");
        if (j.auth) { e.auth = true; dimentica(); login(j.errore); }
        throw e;
      }
      return j.dati;
    }).then(function (d) { if (o.onBusy) o.onBusy(false); return d; },
            function (e) { if (o.onBusy) o.onBusy(false); throw e; });
  }

  return { avvia: avvia, esci: esci, chiama: chiama, payload: payload, valido: valido, token: function () { return token; }, DOMINIO: DOMINIO };
})();
