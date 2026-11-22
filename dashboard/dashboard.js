(() => {
  'use strict';

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5wDx7YdOppY3Gvi889cd7B_p0Tp92mL9dNrcZdL7mMcj45d-1HVge4kfhe-DEG-tw2A/exec';   // the RSVP Apps Script web app URL (same as RSVP_ENDPOINT in the card's app.js)

  const WEDDING_DAY = '2027-02-26';
  const WEDDING_LABEL = 'Friday 26 February 2027';
  const STORE = 'wedding-dashboard:';
  const STALE_AFTER_MS = 60 * 1000;
  const SIDE_LABELS = {all: 'Everyone', ruzbeh: 'Ruzbeh’s side', rukhshana: 'Rukhshana’s side', unassigned: 'No side set'};
  const SIGNATURE_BY_SIDE = {ruzbeh: 'Ruzbeh & Rukhshana', rukhshana: 'Rukhshana & Ruzbeh', unassigned: 'Ruzbeh & Rukhshana'};
  const VIEWS = ['overview', 'waiting', 'replies', 'gifts'];

  const $ = id => document.getElementById(id);
  const demo = new URLSearchParams(location.search).has('demo');
  const memory = new Map();

  const state = {
    data: null,
    fetchedAt: 0,
    loading: false,
    side: stored('side') || 'all',
    view: VIEWS.includes(stored('view')) ? stored('view') : 'overview',
    replyFilter: 'all',
    giftFilter: 'open',
    waitingQuery: '',
    replyQuery: ''
  };

  // ---------- storage ----------

  function stored(name) {
    try {
      const value = localStorage.getItem(STORE + name);
      if (value != null) return value;
    } catch (error) { /* private mode */ }
    return memory.get(name) || '';
  }

  function remember(name, value) {
    memory.set(name, value);
    try { localStorage.setItem(STORE + name, value); } catch (error) { /* private mode */ }
  }

  function forget(name) {
    memory.delete(name);
    try { localStorage.removeItem(STORE + name); } catch (error) { /* private mode */ }
  }

  function takeLinkFromAddress() {
    if (!location.hash) return;
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (fragment.get('k')) remember('key', fragment.get('k').trim());
    if (fragment.get('e')) remember('endpoint', fragment.get('e').trim());
    history.replaceState(null, '', location.pathname + location.search);
  }

  const endpoint = () => ENDPOINT || stored('endpoint');
  const accessKey = () => stored('key');

  // ---------- talking to the sheet ----------

  async function call(action, extra = {}) {
    if (demo) return demoCall(action, extra);
    // text/plain keeps this a simple CORS request; Google Apps Script cannot answer a preflight.
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, key: accessKey(), ...extra}),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`The sheet answered ${response.status}`);
    const result = await response.json();
    if (!result.ok) {
      const error = new Error(result.error || 'The sheet said no');
      error.locked = result.error === 'locked';
      throw error;
    }
    return result;
  }

  let demoData = null;

  async function demoCall(action, extra) {
    if (!demoData) demoData = await (await fetch('demo/payload.json', {cache: 'no-store'})).json();
    await new Promise(resolve => setTimeout(resolve, 280));
    const copy = value => JSON.parse(JSON.stringify(value));
    if (action === 'dashboard') return {ok: true, ...copy(demoData)};
    if (action === 'remind') {
      const remindedAt = new Date().toISOString();
      demoData.invitations.filter(item => item.name === extra.invitation).forEach(item => { item.remindedAt = remindedAt; });
      return {ok: true, remindedAt};
    }
    if (action === 'saveGift') {
      const input = extra.gift;
      const existing = demoData.gifts.find(gift => gift.id === input.id);
      const gift = {
        id: existing ? existing.id : `demo-${Date.now()}`,
        addedAt: existing ? existing.addedAt : new Date().toISOString(),
        from: input.from.trim(),
        side: input.side || 'unassigned',
        gift: (input.gift || '').trim(),
        amount: Number(String(input.amount || '').replace(/[^\d.]/g, '')) || null,
        thankedAt: input.thanked ? (existing && existing.thankedAt) || new Date().toISOString() : '',
        note: (input.note || '').trim()
      };
      if (existing) Object.assign(existing, gift);
      else demoData.gifts.push(gift);
      return {ok: true, gift: copy(gift), gifts: copy(demoData.gifts)};
    }
    if (action === 'deleteGift') {
      demoData.gifts = demoData.gifts.filter(gift => gift.id !== extra.id);
      return {ok: true, gifts: copy(demoData.gifts)};
    }
    throw new Error('Unknown action');
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    document.body.classList.add('is-refreshing');
    try {
      const data = await call('dashboard');
      state.data = data;
      state.fetchedAt = Date.now();
      if (!demo) remember('snapshot', JSON.stringify({data, fetchedAt: state.fetchedAt}));
      showApp();
      render();
    } catch (error) {
      if (error.locked) {
        forget('key');
        forget('snapshot');
        state.data = null;
        showConnect('This link no longer opens the dashboard. Open the newest link from the Summary tab of the RSVP sheet.');
      } else if (state.data) {
        toast('Couldn’t reach the sheet. Showing your last update.');
      } else {
        showApp();
        renderOffline(error);
      }
    } finally {
      state.loading = false;
      document.body.classList.remove('is-refreshing');
      renderUpdated();
    }
  }

  // ---------- small helpers ----------

  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([name, value]) => {
      if (value == null || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else node.setAttribute(name, value === true ? '' : value);
    });
    node.append(...children.flat(Infinity).filter(child => child != null && child !== false && child !== '')
      .map(child => (typeof child === 'number' ? String(child) : child)));
    return node;
  }

  const ICONS = {
    chevron: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    share: '<path d="M12 14.5V4m0 0L8.5 7.5M12 4l3.5 3.5"/><path d="M6 11v8.5h12V11"/>',
    chat: '<path d="M5 19l1.1-3.3A7.5 7.5 0 1 1 9 18.4z"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>'
  };

  function icon(name) {
    const holder = document.createElement('span');
    holder.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
    return holder.firstChild;
  }

  const numberFormat = new Intl.NumberFormat('en-IN');
  const rupees = value => `₹${numberFormat.format(value)}`;
  const plural = (count, one, many = `${one}s`) => `${numberFormat.format(count)} ${count === 1 ? one : many}`;
  const nameKey = value => String(value || '').replace(/\s+/g, ' ').trim().replace(/^'/, '').toLowerCase();

  function shortDate(iso) {
    const date = new Date(iso);
    if (isNaN(date)) return '';
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric'});
  }

  function ago(iso) {
    const time = Date.parse(iso);
    if (!time) return '';
    const seconds = (Date.now() - time) / 1000;
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    if (seconds < 86400 * 2) return 'yesterday';
    if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} days ago`;
    return shortDate(iso);
  }

  function daysToWedding() {
    const todayInMumbai = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date());
    return Math.round((Date.parse(WEDDING_DAY) - Date.parse(todayInMumbai)) / 86400000);
  }

  function countdownText() {
    const days = daysToWedding();
    if (days > 1) return `${numberFormat.format(days)} days to go`;
    if (days === 1) return 'Tomorrow';
    if (days === 0) return 'Today';
    return `Married ${plural(-days, 'day')}`;
  }

  let toastTimer = 0;
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = h('textarea', {style: 'position:fixed;opacity:0', readonly: true});
      area.value = text;
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    }
  }

  function sideTag(side) {
    return h('span', {class: 'side-tag'}, h('i', {class: `dot dot--${side}`}), SIDE_LABELS[side] || SIDE_LABELS.unassigned);
  }

  // ---------- what the current side sees ----------

  const inSide = item => state.side === 'all' || item.side === state.side;
  const totals = () => state.data.totals[state.side] || state.data.totals.all;
  const invitations = () => state.data.invitations.filter(inSide);
  const replies = () => state.data.replies.filter(inSide);
  const gifts = () => state.data.gifts.filter(inSide);
  const waitingInvitations = () => invitations().filter(item => !item.replied);

  function sortedWaiting() {
    return waitingInvitations().sort((a, b) => {
      if (!a.remindedAt !== !b.remindedAt) return a.remindedAt ? 1 : -1;
      if (a.remindedAt && b.remindedAt && a.remindedAt !== b.remindedAt) return a.remindedAt < b.remindedAt ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  const matches = (query, ...fields) => !query || fields.some(field => nameKey(field).includes(nameKey(query)));

  // ---------- frame ----------

  function showApp() {
    $('connect').hidden = true;
    $('app').hidden = false;
  }

  function showConnect(message) {
    $('app').hidden = true;
    $('connect').hidden = false;
    if (message) $('connect-text').textContent = message;
    $('connect-endpoint-field').hidden = Boolean(ENDPOINT);
    $('connect-endpoint').required = !ENDPOINT;
    $('connect-endpoint').value = stored('endpoint');
  }

  function renderUpdated() {
    if (!state.fetchedAt) { $('updated').textContent = state.loading ? 'Opening the sheet…' : ''; return; }
    const when = ago(new Date(state.fetchedAt).toISOString());
    $('updated').textContent = state.loading ? 'Updating…' : `Updated ${when}`;
  }

  function renderChrome() {
    $('countdown').textContent = `${countdownText()} · ${WEDDING_LABEL.replace(/^\w+ /, '')}`;
    document.querySelectorAll('.sides button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.side === state.side));
    });
    document.querySelectorAll('.tabs button').forEach(button => {
      if (button.dataset.view === state.view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const waiting = state.data ? waitingInvitations().length : 0;
    const toThank = state.data ? gifts().filter(gift => !gift.thankedAt).length : 0;
    $('badge-waiting').hidden = !waiting;
    $('badge-waiting').textContent = waiting > 99 ? '99+' : waiting;
    $('badge-gifts').hidden = !toThank;
    $('badge-gifts').textContent = toThank;
    renderUpdated();
  }

  let lastRenderedView = '';
  function render() {
    renderChrome();
    if (!state.data) {
      $('main').replaceChildren(h('div', {class: 'view'}, h('div', {class: 'skeleton'}), h('div', {class: 'skeleton'})));
      return;
    }
    const views = {overview: renderOverview, waiting: renderWaiting, replies: renderReplies, gifts: renderGifts};
    const view = views[state.view]();
    if (state.view !== lastRenderedView) view.classList.add('is-entering');
    lastRenderedView = state.view;
    $('main').replaceChildren(view);
  }

  function renderOffline(error) {
    renderChrome();
    $('main').replaceChildren(h('div', {class: 'view'},
      h('div', {class: 'empty'},
        h('p', {class: 'empty-title', text: 'Couldn’t reach the sheet'}),
        h('p', {text: navigator.onLine ? 'Google didn’t answer this time. Try again in a moment.' : 'You seem to be offline.'}),
        h('p', {class: 'fine', text: String(error.message || error)}),
        h('p', {}, h('button', {class: 'button button--primary', type: 'button', style: 'margin-top:14px', onclick: load}, 'Try again')))));
  }

  function go(view) {
    state.view = view;
    remember('view', view);
    render();
    window.scrollTo({top: 0});
  }

  // ---------- overview ----------

  function renderOverview() {
    const sum = totals();
    const list = invitations();
    if (!list.length && !replies().length) {
      return h('div', {class: 'view'}, h('div', {class: 'empty'},
        h('p', {class: 'empty-title', text: state.side === 'all' ? 'No invitations yet' : `Nothing on ${SIDE_LABELS[state.side]} yet`}),
        h('p', {text: 'Add one row per invitation to the Invites tab of the sheet. Replies show up here as they arrive.'})));
    }
    return h('div', {class: 'view'},
      heroCard(sum, list),
      catererCard(sum),
      state.side === 'all' ? familyCard() : null,
      latestCard(),
      attentionCard());
  }

  function heroCard(sum, list) {
    const coming = list.filter(item => item.replied && item.attending).length;
    const declined = list.filter(item => item.replied && !item.attending).length;
    const waiting = list.length - coming - declined;
    const share = count => `${list.length ? (count / list.length) * 100 : 0}%`;
    const percent = list.length ? Math.round((sum.replied / list.length) * 100) : 0;
    return h('section', {class: 'card'},
      h('p', {class: 'label', text: 'Guests coming'}),
      h('p', {class: 'big'}, h('span', {class: 'big-number', text: numberFormat.format(sum.guests)}),
        h('span', {class: 'big-unit', text: sum.guests === 1 ? 'guest' : 'guests'})),
      h('p', {class: 'sub', text: householdsLine(sum)}),
      h('div', {class: 'progress', role: 'img', 'aria-label': `${coming} coming, ${declined} can’t come, ${waiting} waiting`},
        h('span', {class: 'coming', style: `width:${share(coming)}`}),
        h('span', {class: 'declined', style: `width:${share(declined)}`})),
      h('ul', {class: 'legend'},
        h('li', {}, h('i', {class: 'dot dot--coming'}), h('b', {text: coming}), 'coming'),
        h('li', {}, h('i', {class: 'dot dot--declined'}), h('b', {text: declined}), 'can’t come'),
        h('li', {}, h('i', {class: 'dot dot--waiting'}), h('b', {text: waiting}), 'waiting')),
      h('p', {class: 'fine', text: `${numberFormat.format(sum.replied)} of ${plural(list.length, 'invitation')} replied · ${percent}%`}));
  }

  function householdsLine(sum) {
    if (!sum.householdsAttending) return 'No one has said yes yet';
    const offListComing = replies().filter(reply => reply.attending && !reply.onList).length;
    const households = `from ${plural(sum.householdsAttending, 'household')}`;
    return offListComing ? `${households}, ${offListComing} not on your invite list` : households;
  }

  function catererText(sum) {
    const today = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
    const lines = [`Ruzbeh & Rukhshana · ${WEDDING_LABEL}`, `Confirmed guests as of ${today}: ${sum.guests}`];
    if (state.side !== 'all') lines.push(`(${SIDE_LABELS[state.side]} only)`);
    state.data.meals.forEach(meal => lines.push(`${meal}: ${sum.meals[meal]}`));
    return lines.join('\n');
  }

  function catererCard(sum) {
    const meals = state.data.meals;
    const most = Math.max(1, ...meals.map(meal => sum.meals[meal]));
    const mealTotal = meals.reduce((total, meal) => total + sum.meals[meal], 0);
    const copy = h('button', {class: 'button button--small', type: 'button', onclick: async () => {
      toast(await copyText(catererText(sum)) ? 'Copied. Paste it to the caterer.' : 'Couldn’t copy on this phone');
    }}, icon('copy'), 'Copy');
    return h('section', {class: 'card'},
      h('div', {class: 'card-head'}, h('p', {class: 'label', text: 'For the caterer'}), copy),
      h('div', {class: 'meals'},
        meals.map(meal => h('div', {class: 'meal'},
          h('span', {text: meal}),
          h('span', {class: 'meal-bar'}, h('span', {style: `--share:${(sum.meals[meal] / most) * 100}%`})),
          h('span', {class: 'meal-count', text: numberFormat.format(sum.meals[meal])}))),
        h('div', {class: 'meal meal--total'}, h('span', {text: 'Total meals'}), h('span'),
          h('span', {class: 'meal-count', text: numberFormat.format(mealTotal)}))));
  }

  function familyCard() {
    const sides = ['ruzbeh', 'rukhshana', 'unassigned'].filter(side => side !== 'unassigned'
      || state.data.totals.unassigned.invitations || state.data.totals.unassigned.guests);
    return h('section', {class: 'card'},
      h('div', {class: 'card-head'}, h('p', {class: 'label', text: 'By family'})),
      h('table', {class: 'family-table'},
        h('thead', {}, h('tr', {}, h('th', {text: ''}), h('th', {text: 'Invited'}), h('th', {text: 'Replied'}), h('th', {text: 'Coming'}))),
        h('tbody', {}, sides.map(side => {
          const sum = state.data.totals[side];
          const row = h('tr', side === 'unassigned' ? {} : {'data-side': side},
            h('td', {}, h('span', {class: 'family-name'}, h('i', {class: `dot dot--${side}`}), SIDE_LABELS[side])),
            h('td', {text: numberFormat.format(sum.invitations)}),
            h('td', {text: numberFormat.format(sum.replied)}),
            h('td', {text: numberFormat.format(sum.guests)}));
          if (side !== 'unassigned') row.addEventListener('click', () => setSide(side));
          return row;
        }))));
  }

  function replyStatus(reply) {
    return reply.attending
      ? h('span', {class: 'chip chip--coming', text: `Coming · ${reply.partySize}`})
      : h('span', {class: 'chip chip--declined', text: 'Can’t come'});
  }

  function latestCard() {
    const latest = replies().slice(0, 4);
    if (!latest.length) return null;
    return h('section', {class: 'card'},
      h('div', {class: 'card-head'}, h('p', {class: 'label', text: 'Latest replies'})),
      h('ul', {class: 'mini-list'}, latest.map(reply => h('li', {},
        h('button', {class: 'mini-row', type: 'button', onclick: () => { state.replyFilter = 'all'; state.replyQuery = reply.name; go('replies'); }},
          h('span', {class: 'grow'}, h('span', {class: 'name', text: reply.onList ? reply.invitation : reply.name}),
            h('span', {class: 'when', text: ago(reply.updatedAt)})),
          replyStatus(reply))))),
      h('button', {class: 'link-button', type: 'button', onclick: () => go('replies')}, 'All replies', icon('chevron')));
  }

  function attentionCard() {
    const items = [];
    const offList = replies().filter(reply => !reply.onList);
    if (offList.length) {
      items.push(h('li', {},
        h('span', {text: `${plural(offList.length, 'reply', 'replies')} not on your invite list`}),
        h('small', {text: `${offList.map(reply => reply.name).join(', ')}. They count in the totals. Add them to the Invites tab if they should be there.`})));
    }
    if (state.side === 'all' && state.data.duplicateNames.length) {
      items.push(h('li', {},
        h('span', {text: 'Two invitations share a name'}),
        h('small', {text: `${state.data.duplicateNames.join(', ')}. They get the same link, so their replies overwrite each other. Make each name unique.`})));
    }
    const noSide = state.side === 'all' ? state.data.invitations.filter(item => item.side === 'unassigned').length : 0;
    if (noSide) {
      items.push(h('li', {},
        h('span', {text: `${plural(noSide, 'invitation')} with no side`}),
        h('small', {text: 'Put ruzbeh or rukhshana in column B of the Invites tab so the card shows the right family wording.'})));
    }
    if (!items.length) return null;
    return h('section', {class: 'card attention'},
      h('div', {class: 'card-head'}, h('p', {class: 'label', text: 'Worth a look'})),
      h('ul', {}, items));
  }

  // ---------- waiting ----------

  function reminderText(invitation) {
    return `Hello ${invitation.name.replace(/^the\s+/i, '')}! A gentle reminder from ${SIGNATURE_BY_SIDE[invitation.side] || SIGNATURE_BY_SIDE.unassigned}: `
      + `we would love to know if you can join us on ${WEDDING_LABEL}. You can reply on your invitation here: ${invitation.link}`;
  }

  function whatsappNumber(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
    return digits.length >= 11 ? digits : '';
  }

  function markReminded(invitation, refresh) {
    const previous = invitation.remindedAt;
    invitation.remindedAt = new Date().toISOString();
    refresh();
    call('remind', {invitation: invitation.name}).catch(() => {
      invitation.remindedAt = previous;
      refresh();
      toast('Couldn’t save the reminder date in the sheet');
    });
  }

  function waitingItem(invitation) {
    const number = whatsappNumber(invitation.phone);
    const message = reminderText(invitation);
    let item = null;
    const refresh = () => {
      if (!item || !item.isConnected) return;
      const updated = waitingItem(invitation);
      item.replaceWith(updated);
      item = updated;
    };
    const actions = [];
    if (number) {
      actions.push(h('a', {
        class: 'button button--whatsapp button--small',
        href: `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        target: '_blank',
        rel: 'noopener',
        onclick: () => markReminded(invitation, refresh)
      }, icon('chat'), 'Remind on WhatsApp'));
    }
    if (navigator.share) {
      actions.push(h('button', {class: 'button button--small', type: 'button', onclick: () => {
        navigator.share({text: message}).then(() => markReminded(invitation, refresh)).catch(() => {});
      }}, icon('share'), number ? 'Share' : 'Send reminder'));
    } else {
      actions.push(h('button', {class: 'button button--small', type: 'button', onclick: async () => {
        if (await copyText(message)) { toast('Reminder copied. Paste it in a message.'); markReminded(invitation, refresh); }
      }}, icon('copy'), number ? 'Copy' : 'Copy reminder'));
    }
    item = h('li', {class: 'item'},
      h('p', {class: 'item-name', text: invitation.name}),
      h('p', {class: 'item-meta'},
        state.side === 'all' ? sideTag(invitation.side) : null,
        invitation.phone ? h('span', {text: invitation.phone}) : h('span', {text: 'No phone'}),
        invitation.remindedAt
          ? h('span', {class: 'reminded', text: `Reminded ${ago(invitation.remindedAt)}`})
          : h('span', {text: 'Not reminded yet'})),
      h('div', {class: 'item-actions'}, actions));
    return item;
  }

  let waitingList = null;
  function renderWaitingList() {
    if (!waitingList || !waitingList.isConnected) return;
    const list = sortedWaiting().filter(item => matches(state.waitingQuery, item.name, item.phone));
    waitingList.replaceChildren(...(list.length ? list.map(waitingItem) : [h('li', {class: 'empty'},
      h('p', {class: 'empty-title', text: state.waitingQuery ? 'No match' : 'Everyone has replied'}),
      h('p', {text: state.waitingQuery ? 'Try another name.' : 'Nobody left to chase. Lovely.'}))]));
  }

  function searchBox(value, placeholder, onInput) {
    return h('label', {class: 'search'}, icon('search'),
      h('input', {type: 'search', value, placeholder, 'aria-label': placeholder, autocomplete: 'off',
        oninput: event => onInput(event.target.value)}));
  }

  function renderWaiting() {
    const count = waitingInvitations().length;
    waitingList = h('ul', {class: 'list'});
    const view = h('div', {class: 'view'},
      h('div', {class: 'view-head'},
        h('h2', {class: 'view-title', text: count ? `${plural(count, 'invitation')} waiting` : 'All replied'}),
        h('p', {class: 'view-text', text: 'Reminding opens WhatsApp with a message and their link ready. You press send.'})),
      count > 6 || state.waitingQuery ? searchBox(state.waitingQuery, 'Search names', value => { state.waitingQuery = value; renderWaitingList(); }) : null,
      waitingList);
    queueMicrotask(renderWaitingList);
    return view;
  }

  // ---------- replies ----------

  const REPLY_FILTERS = {
    all: {label: 'All', test: () => true},
    coming: {label: 'Coming', test: reply => reply.attending},
    declined: {label: 'Can’t come', test: reply => !reply.attending},
    notes: {label: 'With a note', test: reply => Boolean(reply.note)},
    offList: {label: 'Not on list', test: reply => !reply.onList}
  };

  function replyItem(reply) {
    const title = reply.onList ? reply.invitation : reply.name;
    const changed = reply.submissions > 1 ? `changed ${reply.submissions === 2 ? 'once' : `${reply.submissions - 1} times`}` : '';
    return h('li', {class: 'item'},
      h('div', {class: 'item-top'}, h('p', {class: 'item-name', text: title}), replyStatus(reply)),
      h('p', {class: 'item-meta'},
        state.side === 'all' ? sideTag(reply.side) : null,
        h('span', {text: `Replied ${ago(reply.updatedAt)}`}),
        changed ? h('span', {text: changed}) : null,
        reply.onList && nameKey(reply.name) !== nameKey(reply.invitation) ? h('span', {text: `as ${reply.name}`}) : null,
        reply.onList ? null : h('span', {class: 'chip chip--alert', text: reply.invitation ? 'Name not on list' : 'Link without a name'})),
      reply.guests.length
        ? h('ul', {class: 'guests'}, reply.guests.map(guest => h('li', {}, h('span', {text: guest.name}), h('span', {class: 'meal-tag', text: guest.meal}))))
        : reply.attending && reply.guestsText ? h('p', {class: 'gift-detail', text: reply.guestsText}) : null,
      reply.note ? h('p', {class: 'note', text: `“${reply.note}”`}) : null);
  }

  let replyList = null;
  function renderReplyList() {
    if (!replyList || !replyList.isConnected) return;
    const list = replies().filter(REPLY_FILTERS[state.replyFilter].test)
      .filter(reply => matches(state.replyQuery, reply.name, reply.invitation, reply.guestsText, reply.note));
    replyList.replaceChildren(...(list.length ? list.map(replyItem) : [h('li', {class: 'empty'},
      h('p', {class: 'empty-title', text: replies().length ? 'No match' : 'No replies yet'}),
      h('p', {text: replies().length ? 'Try another filter or name.' : 'They show up here the moment someone answers.'}))]));
  }

  function renderReplies() {
    const all = replies();
    replyList = h('ul', {class: 'list'});
    const filterKeys = Object.keys(REPLY_FILTERS).filter(name => name !== 'offList' || all.some(REPLY_FILTERS.offList.test));
    if (!filterKeys.includes(state.replyFilter)) state.replyFilter = 'all';
    const filters = h('div', {class: 'filters', role: 'group', 'aria-label': 'Show'}, filterKeys.map(name => h('button', {
      class: 'filter', type: 'button', 'aria-pressed': String(state.replyFilter === name),
      onclick: event => {
        state.replyFilter = name;
        event.currentTarget.parentNode.querySelectorAll('.filter').forEach(button => button.setAttribute('aria-pressed', String(button === event.currentTarget)));
        renderReplyList();
      }
    }, REPLY_FILTERS[name].label, h('b', {text: all.filter(REPLY_FILTERS[name].test).length}))));
    const view = h('div', {class: 'view'},
      h('div', {class: 'view-head'},
        h('h2', {class: 'view-title', text: all.length ? plural(all.length, 'reply', 'replies') : 'Replies'}),
        h('p', {class: 'view-text', text: 'Newest first. Each household’s latest answer.'})),
      h('div', {class: 'tools'},
        all.length > 6 || state.replyQuery ? searchBox(state.replyQuery, 'Search names, guests, notes', value => { state.replyQuery = value; renderReplyList(); }) : null,
        filters),
      replyList);
    queueMicrotask(renderReplyList);
    return view;
  }

  // ---------- gifts ----------

  function giftItem(gift) {
    const thanked = Boolean(gift.thankedAt);
    return h('li', {class: `item gift${thanked ? ' is-thanked' : ''}`},
      h('button', {
        class: 'thank', type: 'button', role: 'checkbox', 'aria-checked': String(thanked),
        'aria-label': `Thank-you sent to ${gift.from}`,
        onclick: () => toggleThanked(gift)
      }, icon('check')),
      h('button', {class: 'gift-body', type: 'button', onclick: () => openGift(gift)},
        h('p', {class: 'item-name', text: gift.from}),
        h('p', {class: 'gift-detail'},
          gift.gift || null,
          gift.amount ? h('span', {class: 'amount', text: `${gift.gift ? ' · ' : ''}${rupees(gift.amount)}`}) : null,
          thanked ? h('span', {text: `${gift.gift || gift.amount ? ' · ' : ''}thanked ${shortDate(gift.thankedAt)}`}) : null),
        gift.note ? h('p', {class: 'gift-detail', text: gift.note}) : null),
      icon('chevron'));
  }

  async function toggleThanked(gift) {
    const previous = gift.thankedAt;
    gift.thankedAt = previous ? '' : new Date().toISOString();
    render();
    try {
      const result = await call('saveGift', {gift: {...gift, thanked: !previous}});
      state.data.gifts = result.gifts;
      render();
    } catch (error) {
      gift.thankedAt = previous;
      render();
      toast('Couldn’t save that in the sheet. Try again.');
    }
  }

  function renderGifts() {
    const all = gifts();
    const open = all.filter(gift => !gift.thankedAt);
    if (state.giftFilter === 'open' && !open.length) state.giftFilter = 'all';
    const shown = (state.giftFilter === 'open' ? open : all).slice().sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
    const cash = all.reduce((sum, gift) => sum + (gift.amount || 0), 0);
    const filter = (name, label, count) => h('button', {
      class: 'filter', type: 'button', 'aria-pressed': String(state.giftFilter === name),
      onclick: () => { state.giftFilter = name; render(); }
    }, label, h('b', {text: count}));
    return h('div', {class: 'view'},
      h('div', {class: 'view-head gift-summary'},
        h('div', {},
          h('h2', {class: 'view-title', text: all.length ? plural(all.length, 'gift') : 'Gifts'}),
          h('p', {class: 'gift-total', text: all.length
            ? open.length ? `${plural(open.length, 'thank-you')} to write` : 'Every thank-you sent'
            : 'Note gifts as they come, tick them off as you thank people.'}),
          cash ? h('p', {class: 'gift-total gift-total--cash', text: `${rupees(cash)} in envelopes`}) : null),
        h('button', {class: 'button button--primary', type: 'button', onclick: () => openGift(null)}, icon('plus'), 'Add')),
      all.length ? h('div', {class: 'filters', role: 'group', 'aria-label': 'Show'},
        filter('open', 'To thank', open.length), filter('all', 'All', all.length)) : null,
      h('ul', {class: 'list'}, shown.length ? shown.map(giftItem) : [h('li', {class: 'empty'},
        h('p', {class: 'empty-title', text: 'No gifts noted yet'}),
        h('p', {text: 'Tap Add after the wedding, or type them straight into the Gifts tab.'}))]));
  }

  let editingGift = null;
  let deleteArmed = false;

  function openGift(gift) {
    editingGift = gift;
    deleteArmed = false;
    const form = $('gift-form');
    form.reset();
    $('gift-title').textContent = gift ? 'Edit gift' : 'Add a gift';
    form.from.value = gift ? gift.from : '';
    form.gift.value = gift ? gift.gift : '';
    form.amount.value = gift && gift.amount ? numberFormat.format(gift.amount) : '';
    form.note.value = gift ? gift.note : '';
    form.thanked.checked = Boolean(gift && gift.thankedAt);
    $('gift-delete').hidden = !gift;
    $('gift-delete').textContent = 'Delete';
    $('gift-error').hidden = true;
    const names = [...new Set([...state.data.invitations.map(item => item.name), ...state.data.replies.map(item => item.name)])].sort();
    $('gift-names').replaceChildren(...names.map(name => h('option', {value: name})));
    $('gift-dialog').showModal();
    if (!gift) form.from.focus();
  }

  function giftSide(from) {
    const invitation = state.data.invitations.find(item => nameKey(item.name) === nameKey(from));
    if (invitation) return invitation.side;
    if (editingGift && nameKey(editingGift.from) === nameKey(from)) return editingGift.side;
    return state.side === 'all' ? 'unassigned' : state.side;
  }

  async function saveGiftForm(event) {
    event.preventDefault();
    const form = $('gift-form');
    const from = form.from.value.trim();
    if (!from) {
      $('gift-error').textContent = 'Say who the gift is from.';
      $('gift-error').hidden = false;
      form.from.focus();
      return;
    }
    const save = $('gift-save');
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      const result = await call('saveGift', {gift: {
        id: editingGift ? editingGift.id : '',
        from,
        side: giftSide(from),
        gift: form.gift.value.trim(),
        amount: form.amount.value,
        note: form.note.value.trim(),
        thanked: form.thanked.checked
      }});
      state.data.gifts = result.gifts;
      $('gift-dialog').close();
      if (!editingGift) state.giftFilter = 'open';
      render();
      toast(editingGift ? 'Saved' : `Noted the gift from ${from}`);
    } catch (error) {
      $('gift-error').textContent = `Couldn’t save: ${error.message}`;
      $('gift-error').hidden = false;
    } finally {
      save.disabled = false;
      save.textContent = 'Save';
    }
  }

  async function deleteGift() {
    if (!editingGift) return;
    if (!deleteArmed) {
      deleteArmed = true;
      $('gift-delete').textContent = 'Tap again to delete';
      return;
    }
    const button = $('gift-delete');
    button.disabled = true;
    try {
      const result = await call('deleteGift', {id: editingGift.id});
      state.data.gifts = result.gifts;
      $('gift-dialog').close();
      render();
      toast('Deleted');
    } catch (error) {
      $('gift-error').textContent = `Couldn’t delete: ${error.message}`;
      $('gift-error').hidden = false;
    } finally {
      button.disabled = false;
    }
  }

  // ---------- wiring ----------

  function setSide(side) {
    state.side = side;
    remember('side', side);
    render();
  }

  function connect(event) {
    event.preventDefault();
    const pasted = $('connect-key').value.trim();
    const hashAt = pasted.indexOf('#');
    const fragment = new URLSearchParams(hashAt === -1 ? '' : pasted.slice(hashAt + 1));
    const key = fragment.get('k') || (hashAt === -1 ? pasted : '');
    if (!/^[0-9a-f]{32,}$/i.test(key)) {
      $('connect-text').textContent = 'That doesn’t look like the dashboard link. Copy the whole link from the Summary tab and paste it here.';
      return;
    }
    remember('key', key);
    const typedEndpoint = fragment.get('e') || $('connect-endpoint').value.trim();
    if (typedEndpoint) remember('endpoint', typedEndpoint);
    if (!endpoint()) { $('connect-text').textContent = 'Paste the web app URL too. It ends in /exec.'; return; }
    showApp();
    render();
    load();
  }

  function start() {
    if (demo) {
      document.body.classList.add('demo');
      $('demo-banner').hidden = false;
    }
    takeLinkFromAddress();
    document.querySelectorAll('.sides button').forEach(button => button.addEventListener('click', () => setSide(button.dataset.side)));
    document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => {
      state.waitingQuery = '';
      state.replyQuery = '';
      go(button.dataset.view);
    }));
    $('refresh').addEventListener('click', load);
    $('connect-form').addEventListener('submit', connect);
    $('gift-form').addEventListener('submit', saveGiftForm);
    $('gift-close').addEventListener('click', () => $('gift-dialog').close());
    $('gift-delete').addEventListener('click', deleteGift);
    $('gift-dialog').addEventListener('click', event => { if (event.target === $('gift-dialog')) $('gift-dialog').close(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.data && Date.now() - state.fetchedAt > STALE_AFTER_MS) load();
    });
    setInterval(renderUpdated, 30000);

    if (!demo && (!accessKey() || !endpoint())) {
      showConnect(accessKey() ? 'Almost there. Paste the web app URL from the Apps Script deployment.' : '');
      return;
    }
    if (!demo) {
      try {
        const snapshot = JSON.parse(stored('snapshot') || 'null');
        if (snapshot && snapshot.data) Object.assign(state, {data: snapshot.data, fetchedAt: snapshot.fetchedAt});
      } catch (error) { forget('snapshot'); }
    }
    showApp();
    render();
    load();
  }

  start();
})();
