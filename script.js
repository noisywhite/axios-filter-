// ==UserScript==
// @name         Axios - Nascondi assenze recenti e voti bassi
// @namespace    http://tampermonkey.net/
// @version      5.4
// @description  Voti: nasconde negativi in griglia ed elenco, aggiusta medie. Registro: svuota note/disciplinari, nasconde flag assenze/ritardi/uscite. Note: nasconde righe note disciplinari. Dashboard: mostra solo argomenti nella timeline. Zero flash al cambio pagina.
// @author       Matteo
// @match        *://registrofamiglie.axioscloud.it/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const GIORNI       = 45;
    const SOGLIA_VOTO  = 6;
    const SOGLIA_MEDIA = 6;

    const CSS_PREEMPTIVE = `
    .mt-actions .mt-action { display: none !important; }
    #table-rcla tbody td:nth-child(5) span.label,
    #table-rcla tbody td:nth-child(6),
    #table-rcla tbody td:nth-child(7) { visibility: hidden; }
    #table-note tbody tr { transition: none !important; }
  `;

    function injectCSS(css) {
        const style = document.createElement('style');
        style.id = 'tm-axios-preemptive';
        style.textContent = css;
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.head && document.head.appendChild(style);
            }, { once: true });
        }
    }

    injectCSS(CSS_PREEMPTIVE);

    const patchedEls = new WeakSet();
    const hiddenRows = new WeakSet();

    function getCutoff() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - GIORNI);
        return d;
    }

    function parseDataIT(str) {
        const m = (str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        return new Date(+m[3], +m[2] - 1, +m[1]);
    }

    function parseVoto(str) {
        return parseFloat((str || '').replace(',', '.').replace(/[+\-]$/, ''));
    }

    function hideRow(tr) {
        if (hiddenRows.has(tr)) return;
        hiddenRows.add(tr);
        tr.style.display = 'none';
    }

    function isTabellAssenze(table) {
        const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim().toLowerCase());
        if (headers.some(h => h.includes('valutazione') || h.includes('materia'))) return false;
        if (headers.some(h => h.includes('tipo evento') || h.includes('giustificaz'))) return true;
        return !headers.some(h => h.includes('valutazione'));
    }

    function filtraElencoVoti() {
        const tabella = document.querySelector('#table-voti');
        if (!tabella) return;
        tabella.querySelectorAll('tbody tr').forEach(tr => {
            if (patchedEls.has(tr)) return;
            const spanVoto = tr.querySelector('td span.label[data-original-title]');
            if (!spanVoto) return;
            const title = spanVoto.getAttribute('data-original-title') || '';
            const valoreMatch = title.match(/Valore:\s*([\d,\.]+)/i);
            if (!valoreMatch) return;
            const valore = parseVoto(valoreMatch[1]);
            if (!isNaN(valore) && valore > 0 && valore < SOGLIA_VOTO) {
                patchedEls.add(tr);
                tr.style.display = 'none';
            }
        });
    }

    function filtraGrigliaVoti() {
        document.querySelectorAll('td[class*="_negativo"]').forEach(td => {
            if (patchedEls.has(td)) return;
            patchedEls.add(td);
            td.style.visibility = 'hidden';
            td.style.backgroundColor = 'transparent';
            td.removeAttribute('data-original-title');
            td.removeAttribute('title');
            td.textContent = '';
        });
        document.querySelectorAll('td.voto').forEach(td => {
            if (patchedEls.has(td)) return;
            const title = td.getAttribute('data-original-title') || '';
            const valoreMatch = title.match(/Valore:\s*([\d,\.]+)/i);
            if (!valoreMatch) return;
            const valore = parseVoto(valoreMatch[1]);
            if (!isNaN(valore) && valore > 0 && valore < SOGLIA_VOTO) {
                patchedEls.add(td);
                td.style.visibility = 'hidden';
                td.style.backgroundColor = 'transparent';
                td.removeAttribute('data-original-title');
                td.textContent = '';
            }
        });
    }

    function aggiustaMedia() {
        document.querySelectorAll('span.label.label-danger').forEach(span => {
            if (patchedEls.has(span)) return;
            const td = span.closest('td');
            if (!td) return;
            const titleRaw = td.getAttribute('data-original-title') || '';
            if (!titleRaw.toLowerCase().includes('media')) return;
            const match = titleRaw.match(/Media ponderata:\s*([\d,\.]+)/i);
            if (!match) return;
            const media = parseVoto(match[1]);
            if (!isNaN(media) && media < SOGLIA_MEDIA) {
                patchedEls.add(span);
                span.textContent = String(SOGLIA_MEDIA).replace('.', ',');
                span.classList.remove('label-danger');
                span.classList.add('bg-green', 'bg-font-green');
                td.setAttribute('data-original-title', 'Media ponderata: ' + String(SOGLIA_MEDIA).replace('.', ','));
            }
        });
    }

    function filtraPresenze(cutoff) {
        document.querySelectorAll('table').forEach(table => {
            if (!isTabellAssenze(table)) return;
            table.querySelectorAll('tbody tr').forEach(tr => {
                if (hiddenRows.has(tr)) return;
                const tdData = tr.querySelector('td:first-child');
                if (!tdData) return;
                const data = parseDataIT(tdData.textContent.trim());
                if (!data) return;
                if (data >= cutoff) hideRow(tr);
            });
        });
    }

    function pulisciRegistroClasse() {
        const tabella = document.querySelector('#table-rcla');
        if (!tabella) return;
        tabella.querySelectorAll('tbody tr').forEach(tr => {
            const celle = tr.querySelectorAll('td');
            if (celle.length < 7) return;
            celle[4].querySelectorAll('span.label').forEach(span => span.remove());
            celle[5].innerHTML = '';
            celle[6].innerHTML = '';
        });
    }

    function nascondiNoteDisciplinari() {
        const tabella = document.querySelector('#table-note');
        if (!tabella) return;
        tabella.querySelectorAll('tbody tr').forEach(tr => {
            if (hiddenRows.has(tr)) return;
            const tipoSpan = tr.querySelector('td:nth-child(2) span.label-danger');
            const tipoTesto = (tr.querySelector('td:nth-child(2)')?.textContent || '').toLowerCase();
            if (tipoSpan || tipoTesto.includes('disciplinar')) {
                hideRow(tr);
            }
        });
    }

    const ICONE_DA_TENERE = ['fa-list'];

    function pulisciTimeline() {
        const container = document.querySelector('.mt-actions');
        if (!container) return;
        container.querySelectorAll('.mt-action').forEach(block => {
            const icon = block.querySelector('.mt-action-icon i');
            if (!icon) return;
            const classes = icon.className || '';
            const tieniBlocco = ICONE_DA_TENERE.some(cls => classes.includes(cls));
            block.style.display = tieniBlocco ? '' : 'none';
        });
    }

    function badge(msg) {
        let el = document.getElementById('tm-axios-badge');
        if (!el) {
            el = document.createElement('div');
            el.id = 'tm-axios-badge';
            Object.assign(el.style, {
                position: 'fixed', bottom: '16px', right: '16px', zIndex: '999999',
                background: '#01696f', color: '#fff',
                padding: '7px 14px', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'system-ui, sans-serif',
                boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                transition: 'opacity 0.6s ease', opacity: '1',
                pointerEvents: 'none',
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.style.opacity = '0'; }, 3500);
    }

    let scheduled = false;

    function run() {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            const cutoff = getCutoff();
            filtraElencoVoti();
            filtraGrigliaVoti();
            aggiustaMedia();
            filtraPresenze(cutoff);
            pulisciRegistroClasse();
            nascondiNoteDisciplinari();
            pulisciTimeline();
            badge('✓ Axios v5.4 attivo');
        });
    }

    let debounce;
    const observer = new MutationObserver(() => {
        clearTimeout(debounce);
        debounce = setTimeout(run, 0);
    });

    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        run();
    });

})();