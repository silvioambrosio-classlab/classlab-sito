"""Prove nel browser (Chrome) contro e2e-server.js: pagine pubbliche, editor, accessi. Esegui: python3 e2e.py"""
import json, sys, urllib.request, urllib.parse, struct, zlib, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8123"
SILVIO, ALTRO = "silvio.ambrosio@classlab.it", "marco.rossi@classlab.it"
ESITI = []
def ok(nome, cond, extra=""):
    ESITI.append(bool(cond)); print(("  ok   " if cond else "  FAIL ") + nome + ((" — " + str(extra)) if (extra and not cond) else ""))

def http(path, dati=None):
    rq = urllib.request.Request(BASE + path, data=(json.dumps(dati).encode() if dati is not None else None), headers={"Content-Type": "text/plain"})
    return json.loads(urllib.request.urlopen(rq).read())
def token(email, **q): return http("/_test/token?" + urllib.parse.urlencode(dict(email=email, **q)))["token"]
def api(tok, fn, *args): return http("/rassegna-api", {"token": tok, "fn": fn, "args": list(args)})

def png(w=800, h=450):
    righe = b"".join(b"\x00" + b"".join(bytes([x * 255 // w, 140, y * 255 // h]) for x in range(w)) for y in range(h))
    def blocco(t, d): c = struct.pack(">I", len(d)) + t + d; return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + blocco(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + blocco(b"IDAT", zlib.compress(righe)) + blocco(b"IEND", b"")
IMG = png()
open("/tmp/prova.png", "wb").write(IMG)

GSI = "window.google={accounts:{id:{initialize:function(o){window.__gsi=o},renderButton:function(el){el.textContent='[Accedi con Google]'},prompt:function(){},disableAutoSelect:function(){}}}};"
def thumb(i): return f"https://drive.google.com/thumbnail?id={i}&sz=w1600"

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"], headless=True)
    errori = []
    def contesto(email=None, tok=None, w=390, h=844):
        cx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        cx.route("https://accounts.google.com/gsi/client", lambda r: r.fulfill(body=GSI, content_type="text/javascript"))
        cx.route("https://drive.google.com/thumbnail**", lambda r: r.fulfill(body=IMG, content_type="image/png"))
        t = tok or (token(email) if email else None)
        if t: cx.add_init_script(f"try{{sessionStorage.setItem('turniToken','{t}')}}catch(e){{}}")
        return cx
    def pagina(cx):
        p = cx.new_page(); p.on("pageerror", lambda e: errori.append(str(e))); return p
    def senza_scroll_orizzontale(p): return p.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")

    # ---------- pubblico ----------
    print("Pagine pubbliche")
    http("/_test/reset")
    cx = contesto(); p = pagina(cx)
    p.goto(BASE + "/rassegna-stampa.html"); p.wait_for_selector(".rs-vuoto")
    ok("archivio vuoto: messaggio gentile", "Nessuna rassegna pubblicata" in p.inner_text("#rs-archivio"))
    t = token(SILVIO)
    arts = lambda n: [dict(testata="Il Piccolo", titolo=f"Studenti al microscopio {n}", data="2026-11-20", link="https://example.org/a" + str(n), estratto="Un estratto d'esempio.", immagine=thumb("IMG" + str(n))),
                      dict(testata="Trieste Prima", titolo=f"Scienza in classe {n}", data="2026-11-18", link="https://example.org/b" + str(n), estratto="", immagine="")]
    nuove = {}
    for nome, d in [("Vecchia", "2026-05-10"), ("Recente", "2026-11-24"), ("Bozza segreta", "2026-12-01")]:
        r = api(t, "salva", dict(titolo=f"Rassegna {nome}", data=d, introduzione="Prima riga dell'introduzione.\n\nSeconda riga <b>non html</b>.", copertina=thumb("COP"), articoli=arts(nome[0])))["dati"]
        nuove[nome] = r
        if nome != "Bozza segreta": api(t, "stato", r["id"], "pubblicata")
    p.reload(); p.wait_for_selector(".rs-card")
    titoli = p.locator(".rs-card h2").all_inner_texts()
    ok("archivio: solo le pubblicate, dalla più recente", titoli == ["Rassegna Recente", "Rassegna Vecchia"], titoli)
    ok("archivio: la bozza non compare nella pagina", "segreta" not in p.content().lower())
    ok("archivio: titolo e descrizione per i motori di ricerca", "Rassegna stampa" in p.title() and len(p.get_attribute('meta[name="description"]', "content")) > 50)
    ok("archivio: nessuno scroll orizzontale su telefono", senza_scroll_orizzontale(p))
    p.screenshot(path="/tmp/shot-archivio-mobile.png", full_page=True)
    ok("menu e piè di pagina hanno il collegamento", p.locator('header a[href="rassegna-stampa.html"]').count() >= 1 and p.locator('footer a[href="rassegna-stampa.html"]').count() == 1)
    p.locator(".rs-card a").first.click(); p.wait_for_selector(".rs-art")
    ok("rassegna: titolo pagina aggiornato", p.title().startswith("Rassegna Recente"), p.title())
    ok("rassegna: canonical sul suo indirizzo", p.get_attribute('link[rel="canonical"]', "href").endswith("rassegna.html?r=" + nuove["Recente"]["slug"]))
    ld = json.loads(p.locator('script[type="application/ld+json"]').inner_text())
    ok("rassegna: dati strutturati con 2 articoli", ld["@type"] == "CollectionPage" and len(ld["mainEntity"]["itemListElement"]) == 2)
    ok("rassegna: testo impaginato in paragrafi, HTML non interpretato", p.locator(".rs-intro p").count() == 2 and p.locator(".rs-intro b").count() == 0)
    ok("rassegna: articoli con testata e data", "Il Piccolo" in p.inner_text(".rs-art__meta") and "20 novembre 2026" in p.inner_text(".rs-art__meta"))
    ok("rassegna: link originali in nuova scheda e sicuri", all(("noopener" in (a.get_attribute("rel") or "")) and a.get_attribute("target") == "_blank" for a in p.locator(".rs-art a").all()))
    ok("rassegna: nessuno scroll orizzontale su telefono", senza_scroll_orizzontale(p))
    p.screenshot(path="/tmp/shot-rassegna-mobile.png", full_page=True)
    p.goto(BASE + "/rassegna.html?r=" + nuove["Bozza segreta"]["slug"]); p.wait_for_selector(".rs-vuoto")
    ok("bozza aperta con il suo indirizzo: non trovata", "non trovata" in p.inner_text("#rs-pagina").lower() and "segreta" not in p.content().lower())
    ok("bozza: pagina marcata noindex", p.locator('meta[name="robots"][content="noindex"]').count() == 1)
    p.goto(BASE + "/rassegna.html?r=" + nuove["Bozza segreta"]["id"]); p.wait_for_selector(".rs-vuoto")
    ok("bozza aperta con il suo id: non trovata", "non trovata" in p.inner_text("#rs-pagina").lower())
    p.goto(BASE + "/rassegna.html?r=%3Cscript%3E"); p.wait_for_selector(".rs-vuoto")
    ok("indirizzo strano: nessun errore, nessuna esecuzione", "non trovata" in p.inner_text("#rs-pagina").lower())
    cx.close()
    cxd = contesto(w=1280, h=900); pd = pagina(cxd); pd.goto(BASE + "/rassegna-stampa.html"); pd.wait_for_selector(".rs-card"); pd.screenshot(path="/tmp/shot-archivio-desktop.png"); cxd.close()

    # ---------- editor: organizzatore ----------
    print("Editor (organizzatore)")
    cx = contesto(SILVIO); p = pagina(cx)
    p.goto(BASE + "/rassegna-editor/"); p.wait_for_selector(".riga")
    ok("elenco mostra bozze e pubblicate", p.locator(".riga").count() == 3)
    p.get_by_role("button", name="Bozze (1)").click()
    ok("filtro Bozze", p.locator(".riga").count() == 1 and "segreta" in p.inner_text(".riga"))
    p.screenshot(path="/tmp/shot-editor-elenco-mobile.png")
    p.get_by_role("button", name="+ Nuova rassegna").click(); p.wait_for_selector("#f-titolo")
    p.fill("#f-titolo", "Rassegna di prova"); p.fill("#f-data", "2026-11-30"); p.fill("#f-intro", "Introduzione.\n\nSecondo paragrafo.")
    p.get_by_role("button", name="Pubblica…").click()
    ok("pubblicare con articolo incompleto: bloccato e campi segnati", p.locator(".errcampo").count() >= 3 and p.locator("#prev.on").count() == 0)
    p.fill('[data-a="0"][data-k="testata"]', "Il Piccolo"); p.fill('[data-a="0"][data-k="titolo"]', "Titolo articolo")
    p.fill('[data-a="0"][data-k="data"]', "2026-11-29"); p.fill('[data-a="0"][data-k="link"]', "javascript:alert(1)")
    p.get_by_role("button", name="Salva bozza").click()
    ok("link non http(s): rifiutato", p.locator("#toast").is_visible() and "http" in p.inner_text("#toast"))
    p.fill('[data-a="0"][data-k="link"]', "https://example.org/articolo")
    p.set_input_files('input[data-img="cop"]', "/tmp/prova.png"); p.wait_for_selector("#img-cop img.anteprima")
    ok("copertina caricata nel Drive (simulato) e condivisa", http("/_test/stato")["files"] == 1)
    p.get_by_role("button", name="Salva bozza").click(); p.wait_for_selector("#toast:visible")
    st = http("/_test/stato"); riga = [r for r in st["rassegne"][1:] if r[2] == "Rassegna di prova"]
    ok("bozza salvata, stato 'bozza', non pubblica", len(riga) == 1 and riga[0][6] == "bozza")
    ok("la bozza salvata non è sul sito pubblico", "Rassegna di prova" not in json.dumps(http("/rassegna-api?azione=elenco")))
    p.screenshot(path="/tmp/shot-editor-form-mobile.png", full_page=True)
    p.get_by_role("button", name="Anteprima").click(); p.wait_for_selector("#prev.on")
    fr = p.frame_locator("#prevFrame"); fr.locator("h1").wait_for()
    ok("anteprima mostra la rassegna con la grafica del sito", fr.locator("h1").inner_text() == "Rassegna di prova" and fr.locator(".rs-art").count() == 1)
    p.screenshot(path="/tmp/shot-editor-anteprima-mobile.png")
    p.get_by_role("button", name="Chiudi anteprima").click()
    p.get_by_role("button", name="Pubblica…").click(); p.wait_for_selector("#prev.on")
    ok("pubblica passa dall'anteprima", p.get_by_role("button", name="Pubblica ora").is_visible() and "Rassegna di prova" not in json.dumps(http("/rassegna-api?azione=elenco")))
    p.get_by_role("button", name="Pubblica ora").click(); p.wait_for_selector("text=Togli dalla pubblicazione")
    ok("pubblicata: ora è sul sito", "Rassegna di prova" in json.dumps(http("/rassegna-api?azione=elenco")))
    p.get_by_role("button", name="Togli dalla pubblicazione").click(); p.get_by_role("button", name="Togli dalla pubblicazione").last.click(); p.wait_for_selector("text=Pubblica…")
    ok("tolta dalla pubblicazione: sparisce dal sito, resta bozza", "Rassegna di prova" not in json.dumps(http("/rassegna-api?azione=elenco")))
    p.fill("#f-titolo", "Titolo cambiato"); p.get_by_role("button", name="←").first.click()
    ok("uscire con modifiche non salvate chiede conferma", p.locator("#modal").is_visible() and "non salvate" in p.inner_text("#modal"))
    p.get_by_role("button", name="Continua a modificare").click()
    p.get_by_role("button", name="Elimina").click()
    ok("elimina chiede conferma", p.locator("#modal").is_visible())
    p.get_by_role("button", name="Annulla").click()
    ok("annullando non elimina", any(r[2] == "Rassegna di prova" for r in http("/_test/stato")["rassegne"][1:]))
    p.get_by_role("button", name="Elimina").click(); p.get_by_role("button", name="Elimina definitivamente").click(); p.wait_for_selector(".riga")
    st = http("/_test/stato")
    ok("eliminata dopo conferma (rassegna e articoli)", not any(r[2] in ("Rassegna di prova", "Titolo cambiato") for r in st["rassegne"][1:]) and not any(a[3] == "Titolo articolo" for a in st["articoli"][1:]))
    ok("registro: azioni tracciate", set(["crea", "modifica", "pubblica", "toglie-pubblicazione", "elimina", "carica-immagine"]) <= set(r[2] for r in st["registro"][1:]))
    ok("editor: nessuno scroll orizzontale su telefono", senza_scroll_orizzontale(p))
    cx.close()

    # ---------- area team ----------
    print("Area team")
    cx = contesto(SILVIO, w=1100, h=800); p = pagina(cx); p.goto(BASE + "/area-team.html"); p.wait_for_selector(".at-card")
    ok("organizzatore vede la scheda Rassegna stampa", "Rassegna stampa" in p.inner_text("#at-griglia") and "Permessi del team" in p.inner_text("#at-griglia"))
    p.screenshot(path="/tmp/shot-area-team-org.png"); cx.close()
    cx = contesto(ALTRO, w=1100, h=800); p = pagina(cx); p.goto(BASE + "/area-team.html"); p.wait_for_selector(".at-card")
    ok("altro account @classlab.it NON vede la scheda", "Rassegna stampa" not in p.inner_text("#at-griglia") and "Permessi del team" not in p.inner_text("#at-griglia"))
    cx.close()

    # ---------- editor: accessi non validi ----------
    print("Editor (accessi non validi)")
    cx = contesto(ALTRO); p = pagina(cx); p.goto(BASE + "/rassegna-editor/"); p.wait_for_selector("#negato:not(.hidden)")
    ok("account non organizzatore: 'accesso riservato', nessun dato", "riservata" in p.inner_text("#negato") and p.locator("#app").is_hidden() and p.locator(".riga").count() == 0)
    p.screenshot(path="/tmp/shot-editor-negato.png"); cx.close()
    scaduto = token(SILVIO, exp=1700000000)
    cx = contesto(tok=scaduto); p = pagina(cx); p.goto(BASE + "/rassegna-editor/"); p.wait_for_selector("#login:not(.hidden)")
    ok("sessione scaduta: torna il login", p.locator("#app").is_hidden() and p.locator(".riga").count() == 0)
    cx.close()
    falso = token(SILVIO, registra="0")
    cx = contesto(tok=falso); p = pagina(cx); p.goto(BASE + "/rassegna-editor/"); p.wait_for_selector("#login:not(.hidden)")
    ok("token falso (valido per il browser, respinto dal server): login con errore", p.locator("#app").is_hidden() and "accedi di nuovo" in p.inner_text("#loginErr").lower(), p.inner_text("#loginErr"))
    cx.close()
    cx = contesto(); p = pagina(cx); p.goto(BASE + "/rassegna-editor/"); p.wait_for_selector("#login:not(.hidden)")
    ok("senza accesso: solo il pulsante di login", p.locator("#app").is_hidden() and p.locator(".riga").count() == 0)
    cx.close()
    ok("nessun errore JavaScript nelle pagine", not errori, errori)
    br.close()
print(f"\n{sum(ESITI)}/{len(ESITI)} prove superate")
sys.exit(0 if all(ESITI) else 1)
