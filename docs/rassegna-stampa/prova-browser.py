# Prova nel browser (Chrome) di pagine pubbliche ed editor, con il server di prova.
# Uso: node docs/rassegna-stampa/server-prova.js   poi   python3 docs/rassegna-stampa/prova-browser.py
# Richiede: pip install playwright (usa Chrome installato in /usr/bin/google-chrome)
import json, urllib.request, base64, time, sys, os
RADICE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = '/tmp'
from playwright.sync_api import sync_playwright
B='http://localhost:8765'
def tok(email, scaduto=False):
    return json.load(urllib.request.urlopen(f'{B}/token-prova?email={email}'+('&scaduto=1' if scaduto else '')))['token']
GSI = "window.google={accounts:{id:{initialize(o){},renderButton(el){el.innerHTML='<button>Accedi con Google</button>'},prompt(){},disableAutoSelect(){}}}};"
PNG = open(RADICE+'/assets/img/og-image.jpg','rb').read()
risultati=[]; errori_js=[]
def ok(nome, cond):
    risultati.append((nome, bool(cond))); print(('  ok  ' if cond else 'FAIL  ')+nome)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def pagina(token=None, mobile=False):
        ctx = br.new_context(viewport={'width':390,'height':844} if mobile else {'width':1280,'height':900}, is_mobile=mobile, has_touch=mobile)
        ctx.route('https://accounts.google.com/**', lambda r: r.fulfill(body=GSI, content_type='text/javascript'))
        ctx.route('https://drive.google.com/**', lambda r: r.fulfill(body=PNG, content_type='image/jpeg'))
        if token: ctx.add_init_script(f"sessionStorage.setItem('turniToken', {json.dumps(token)})")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errori_js.append(str(e))); pg.on('dialog', lambda d: d.accept())
        return pg

    # 1. pubblico vuoto
    pg = pagina(); pg.goto(B+'/rassegna-stampa/'); pg.wait_for_function("document.getElementById('rs-stato').textContent!=='Caricamento…'")
    ok('archivio vuoto: messaggio "presto"', 'Presto' in pg.text_content('#rs-stato'))
    ok('menu contiene Rassegna stampa ed è evidenziata', pg.locator('nav a[aria-current=page]').first.text_content().strip()=='Rassegna stampa')
    ok('piè di pagina contiene Rassegna stampa', pg.locator('footer a', has_text='Rassegna stampa').count()==1)
    pg.goto(B+'/'); ok('dalla home il link del menu porta alla rassegna', pg.locator('nav a', has_text='Rassegna stampa').get_attribute('href')=='rassegna-stampa/')

    # 2. non autenticato -> login; token scaduto lato pagina -> login
    pg = pagina(); pg.goto(B+'/rassegna-stampa-editor/'); pg.wait_for_selector('#ed-login:not(.ed-hidden)')
    ok('editor senza accesso: schermata di login', pg.is_visible('#gbtn'))
    t = 'h.'+base64.urlsafe_b64encode(json.dumps({'email':'silvio.ambrosio@classlab.it','hd':'classlab.it','exp':int(time.time())-10}).encode()).decode().rstrip('=')+'.f'
    pg = pagina(t); pg.goto(B+'/rassegna-stampa-editor/'); pg.wait_for_selector('#ed-login:not(.ed-hidden)')
    ok('token scaduto (pagina): torna al login', True)

    # 3. token che il server considera scaduto
    pg = pagina(tok('silvio.ambrosio@classlab.it', True)); pg.goto(B+'/rassegna-stampa-editor/'); pg.wait_for_selector('#ed-login:not(.ed-hidden)')
    ok('token scaduto (server): login con "Sessione scaduta"', 'scaduta' in pg.text_content('#ed-loginErr'))

    # 4. account @classlab.it non organizzatore
    pg = pagina(tok('mario.rossi@classlab.it')); pg.goto(B+'/rassegna-stampa-editor/'); pg.wait_for_selector('#ed-negato:not(.ed-hidden)')
    ok('non organizzatore: "Accesso riservato", nessun dato', 'riservata' in pg.text_content('#ed-negatoMsg') and pg.locator('.ed-riga').count()==0)
    pg.goto(B+'/area-team.html'); pg.wait_for_selector('.at-card')
    ok('non organizzatore: nessuna scheda Rassegna stampa in area team', pg.locator('.at-card', has_text='Rassegna stampa').count()==0)

    # 5. organizzatore, da telefono: crea bozza con 2 articoli e immagine
    S = tok('silvio.ambrosio@classlab.it')
    pg = pagina(S); pg.goto(B+'/area-team.html'); pg.wait_for_selector('.at-card')
    ok('organizzatore: scheda Rassegna stampa in area team', pg.locator('a.at-card', has_text='Rassegna stampa').get_attribute('href')=='/rassegna-stampa-editor/')
    pg = pagina(S, mobile=True); pg.goto(B+'/rassegna-stampa-editor/'); pg.wait_for_selector('#ed-app:not(.ed-hidden)')
    pg.click('text=+ Nuova rassegna')
    pg.fill('[data-dove=r] [data-k=titolo]', 'Prova <b>stampa</b> & scuole')
    pg.fill('[data-dove=r] [data-k=introduzione]', 'Primo paragrafo.\n\nSecondo <script>alert(1)</script>')
    pg.click('text=Salva bozza'); time.sleep(.3)
    ok('validazione in pagina: articolo senza link bloccato', 'link' in pg.text_content('#ed-toast') or 'titolo' in pg.text_content('#ed-toast'))
    a = '[data-dove="0"]'
    pg.fill(a+' [data-k=testata]', 'Il Piccolo'); pg.fill(a+' [data-k=titolo]', 'Studenti in cattedra'); pg.fill(a+' [data-k=data]', '2026-11-18')
    pg.fill(a+' [data-k=link]', 'https://example.org/articolo'); pg.fill(a+' [data-k=estratto]', 'Un estratto.')
    pg.click('text=+ Aggiungi articolo')
    pg.fill('[data-dove="1"] [data-k=titolo]', 'Secondo pezzo'); pg.fill('[data-dove="1"] [data-k=link]', 'https://example.org/2')
    pg.set_input_files('[data-dove=r] input[type=file]', RADICE+'/assets/img/hero-home.webp')
    pg.wait_for_selector('[data-dove=r] .ed-img img'); 
    pg.click('text=Salva bozza'); pg.wait_for_selector('.ed-stato.bozza')
    ok('bozza salvata con copertina e 2 articoli', 'Bozza salvata' in pg.text_content('#ed-toast') and pg.locator('.ed-art').count()==2)
    larg = pg.evaluate('document.documentElement.scrollWidth')
    ok(f'editor da telefono senza scorrimento orizzontale ({larg}px)', larg<=390)
    pg.screenshot(path=OUT+'/editor-telefono.png', full_page=True)

    # 6. la bozza non si vede dal pubblico
    pub = pagina(); pub.goto(B+'/rassegna-stampa/'); pub.wait_for_function("document.getElementById('rs-stato').textContent!=='Caricamento…'")
    ok('bozza NON visibile nell archivio pubblico', pub.locator('.rs-card').count()==0)
    slug = json.load(urllib.request.urlopen(urllib.request.Request(B+'/api', data=json.dumps({'token':S,'fn':'elenco'}).encode())))['dati'][0]['slug']
    pub.goto(B+'/rassegna-stampa/rassegna.html?r='+slug); pub.wait_for_selector('.rs-stato--errore')
    ok('bozza NON visibile nemmeno con l indirizzo diretto (e noindex)', 'non trovata' in pub.text_content('#rs-stato') and pub.locator('meta[name=robots][content=noindex]').count()==1)

    # 7. riordino, anteprima e pubblicazione
    pg.click('[data-dove="1"] button[title="Sposta su"]')
    ok('riordino articoli', pg.input_value('[data-dove="0"] [data-k=titolo]')=='Secondo pezzo')
    pg.click('text=Pubblica…'); pg.wait_for_selector('#ed-confpub')
    ok('anteprima prima di pubblicare, testo non eseguito', pg.locator('.ed-prev-corpo h1').text_content()=='Prova <b>stampa</b> & scuole' and pg.locator('.ed-prev-corpo script').count()==0)
    pg.screenshot(path=OUT+'/anteprima-telefono.png', full_page=False)
    pg.click('#ed-confpub'); pg.wait_for_selector('.ed-stato.pubblicata')
    ok('pubblicata', 'pubblicata' in pg.text_content('#ed-toast'))

    # 8. pubblico: archivio e pagina singola, desktop e telefono
    pub.goto(B+'/rassegna-stampa/'); pub.wait_for_selector('.rs-card')
    ok('pubblicata: compare nell archivio', pub.locator('.rs-card h2').text_content()=='Prova <b>stampa</b> & scuole')
    pub.click('.rs-card'); pub.wait_for_selector('.rs-art')
    ok('pagina singola: 2 articoli nell ordine giusto con testata e data', pub.locator('.rs-art h3').all_text_contents()==['Secondo pezzo','Studenti in cattedra'] and 'Il Piccolo · 18 novembre 2026' in pub.text_content('.rs-art:nth-of-type(2) .rs-art__fonte'))
    ok('pagina singola: link originale in nuova scheda', pub.locator('a.rs-art__link').first.get_attribute('target')=='_blank')
    ok('titolo e descrizione per i motori di ricerca', pub.title().startswith('Prova <b>stampa</b>') and pub.get_attribute('meta[name=description]','content').startswith('Primo paragrafo') and 'r='+slug in pub.get_attribute('link[rel=canonical]','href'))
    ok('dati strutturati presenti', pub.locator('script[type="application/ld+json"]').count()==1)
    tel = pagina(mobile=True); tel.goto(pub.url); tel.wait_for_selector('.rs-art')
    ok('pagina singola da telefono senza scorrimento orizzontale', tel.evaluate('document.documentElement.scrollWidth')<=390)
    tel.screenshot(path=OUT+'/rassegna-telefono.png', full_page=True)
    tel.goto(B+'/rassegna-stampa/'); tel.wait_for_selector('.rs-card'); tel.screenshot(path=OUT+'/archivio-telefono.png', full_page=True)
    pub.goto(B+'/rassegna-stampa/'); pub.wait_for_selector('.rs-card'); pub.screenshot(path=OUT+'/archivio-desktop.png', full_page=True)

    # 9. modifica di una pubblicata, ritiro, eliminazione
    pg.fill('[data-dove=r] [data-k=titolo]', 'Titolo aggiornato'); pg.click('text=Salva modifiche'); pg.wait_for_function("document.getElementById('ed-toast').textContent.includes('online')")
    ok('modifica di una pubblicata: stesso indirizzo', json.load(urllib.request.urlopen(B+'/api?fn=pubblica&slug='+slug))['dati']['titolo']=='Titolo aggiornato')
    pg.click('text=Togli dalla pubblicazione'); pg.click('#ed-si'); pg.wait_for_selector('.ed-stato.bozza')
    ok('tolta dalla pubblicazione: sparisce dal pubblico', json.load(urllib.request.urlopen(B+'/api?fn=pubbliche'))['dati']==[])
    pg.click('text=Elimina rassegna'); pg.click('#ed-no')
    ok('eliminazione annullabile', pg.locator('.ed-stato.bozza').count()==1)
    pg.click('text=Elimina rassegna'); pg.click('#ed-si'); pg.wait_for_selector('.ed-vuoto')
    ok('eliminata con conferma', True)
    br.close()
ok('nessun errore JavaScript nelle pagine', not errori_js)
if errori_js: print(errori_js)
print(f"\n{sum(r for _,r in risultati)}/{len(risultati)} prove superate")
