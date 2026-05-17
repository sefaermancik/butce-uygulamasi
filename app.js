// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  income:  [{id:'maas',label:'Maaş',icon:''},{id:'freelance',label:'Freelance',icon:''},{id:'kira_gelir',label:'Kira Geliri',icon:''},{id:'yatirim',label:'Yatırım',icon:''},{id:'diger_gelir',label:'Diğer Gelir',icon:''}],
  expense: [{id:'yiyecek',label:'Yiyecek',icon:''},{id:'ulasim',label:'Ulaşım',icon:''},{id:'fatura',label:'Fatura',icon:''},{id:'kira',label:'Kira',icon:''},{id:'saglik',label:'Sağlık',icon:''},{id:'egitim',label:'Eğitim',icon:''},{id:'eglence',label:'Eğlence',icon:''},{id:'giyim',label:'Giyim',icon:''},{id:'market',label:'Market',icon:''},{id:'diger',label:'Diğer',icon:''}]
};

let state = {
  transactions: JSON.parse(localStorage.getItem('bx_tx') || '[]'),
  budgets: JSON.parse(localStorage.getItem('bx_budgets') || '[]'),
  theme: localStorage.getItem('bx_theme') || 'dark',
  editId: null,
  txType: 'income'
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => '₺' + Math.abs(n).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
const save = () => { localStorage.setItem('bx_tx', JSON.stringify(state.transactions)); localStorage.setItem('bx_budgets', JSON.stringify(state.budgets)); };
const getMonthTx = () => { const now = new Date(); return state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }); };
const getCat = (type, id) => CATEGORIES[type]?.find(c => c.id === id) || {label: id, icon:'📦'};
const allCats = () => [...CATEGORIES.income, ...CATEGORIES.expense];

function toast(msg, type='ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderColor = type === 'ok' ? 'var(--income)' : 'var(--expense)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');
  if (page === 'dashboard') renderDashboard();
  if (page === 'transactions') renderTransactions();
  if (page === 'budgets') renderBudgets();
  if (page === 'reports') renderReports();
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.getElementById('themeIcon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}
applyTheme();
document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('bx_theme', state.theme);
  applyTheme();
});

// ── Hamburger ─────────────────────────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('addBtnMobile').addEventListener('click', () => openModal());

// ── Date display ──────────────────────────────────────────────────────────────
document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('tr-TR', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

// ── Dashboard ─────────────────────────────────────────────────────────────────
let flowChart, pieChart;

function renderDashboard() {
  const all = state.transactions;
  const month = getMonthTx();

  const totalInc = all.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExp = all.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalInc - totalExp;
  const rate = totalInc > 0 ? Math.round((net / totalInc) * 100) : 0;

  document.getElementById('totalIncome').textContent = fmt(totalInc);
  document.getElementById('totalExpense').textContent = fmt(totalExp);
  document.getElementById('netBalance').textContent = fmt(net);
  document.getElementById('netBalance').style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';
  document.getElementById('savingsRate').textContent = '%' + Math.max(0, rate);

  renderFlowChart();
  renderPieChart();

  const sorted = [...all].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  document.getElementById('recentTransactions').innerHTML = sorted.length ? sorted.map(txHTML).join('') : '<div class="empty-state"><div class="empty-icon">📭</div><p>Henüz işlem yok.</p></div>';
  attachTxEvents('recentTransactions');
}

function renderFlowChart() {
  const months = [];
  const incData = [], expData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('tr-TR', {month:'short'}));
    const txs = state.transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); });
    incData.push(txs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0));
    expData.push(txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0));
  }
  const ctx = document.getElementById('flowChart').getContext('2d');
  if (flowChart) flowChart.destroy();
  flowChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {label:'Gelir', data:incData, backgroundColor:'rgba(34,211,160,0.7)', borderRadius:6},
        {label:'Gider', data:expData, backgroundColor:'rgba(242,81,110,0.7)', borderRadius:6}
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#9090aa'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#9090aa', callback:v=>'₺'+v.toLocaleString('tr-TR')}}
      }
    }
  });
}

function renderPieChart() {
  const expenses = state.transactions.filter(t => t.type === 'expense');
  const bycat = {};
  expenses.forEach(t => { bycat[t.category] = (bycat[t.category]||0) + t.amount; });
  const entries = Object.entries(bycat).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const colors = ['#7c6af7','#22d3a0','#f2516e','#f59e0b','#3b82f6','#ec4899'];
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();
  if (!entries.length) return;
  pieChart = new Chart(ctx, {
    type:'doughnut',
    data:{labels:entries.map(e=>getCat('expense',e[0]).label), datasets:[{data:entries.map(e=>e[1]), backgroundColor:colors, borderWidth:0, hoverOffset:6}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, cutout:'65%'}
  });
  const total = entries.reduce((s,e)=>s+e[1],0);
  document.getElementById('pieLegend').innerHTML = entries.map((e,i)=>`<div class="pie-legend-item"><div class="pie-dot" style="background:${colors[i]}"></div><span style="flex:1">${getCat('expense',e[0]).label}</span><span>${Math.round(e[1]/total*100)}%</span></div>`).join('');
}

// ── Transaction HTML ──────────────────────────────────────────────────────────
function txHTML(t) {
  const cat = getCat(t.type, t.category);
  const iconContent = cat.icon || cat.label.charAt(0);
  const d = new Date(t.date).toLocaleDateString('tr-TR', {day:'2-digit', month:'short', year:'numeric'});
  return `<div class="tx-item" data-id="${t.id}">
    <div class="tx-icon" style="background:${t.type==='income'?'var(--income-bg)':'var(--expense-bg)'}">${iconContent}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.description}</div>
      <div class="tx-meta">${cat.label} · ${d}${t.note?' · '+t.note:''}</div>
    </div>
    <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
    <div class="tx-actions">
      <button class="icon-btn" data-action="edit" data-id="${t.id}">Düz.</button>
      <button class="icon-btn" data-action="delete" data-id="${t.id}">Sil</button>
    </div>
  </div>`;
}

function attachTxEvents(containerId) {
  document.getElementById(containerId).querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.action === 'delete') deleteTransaction(id);
      else openModal(id);
    });
  });
}

// ── Transactions Page ─────────────────────────────────────────────────────────
function renderTransactions() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const cat = document.getElementById('filterCategory').value;
  const period = document.getElementById('filterPeriod').value;
  const now = new Date();

  let txs = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (search) txs = txs.filter(t => t.description.toLowerCase().includes(search) || t.note?.toLowerCase().includes(search));
  if (type !== 'all') txs = txs.filter(t => t.type === type);
  if (cat !== 'all') txs = txs.filter(t => t.category === cat);
  if (period === 'today') txs = txs.filter(t => new Date(t.date).toDateString() === now.toDateString());
  if (period === 'week') { const w = new Date(now); w.setDate(now.getDate()-7); txs = txs.filter(t => new Date(t.date) >= w); }
  if (period === 'month') txs = txs.filter(t => { const d=new Date(t.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); });
  if (period === 'year') txs = txs.filter(t => new Date(t.date).getFullYear()===now.getFullYear());

  document.getElementById('transactionCount').textContent = txs.length + ' işlem';
  const el = document.getElementById('allTransactions');
  el.innerHTML = txs.length ? txs.map(txHTML).join('') : '<div class="empty-state"><div class="empty-icon">📭</div><p>İşlem bulunamadı.</p></div>';
  attachTxEvents('allTransactions');
}

['searchInput','filterType','filterCategory','filterPeriod'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', renderTransactions);
});

function populateCategoryFilter() {
  const sel = document.getElementById('filterCategory');
  sel.innerHTML = '<option value="all">Tüm Kategoriler</option>' + allCats().map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
}
populateCategoryFilter();

// ── Budgets ───────────────────────────────────────────────────────────────────
function renderBudgets() {
  const grid = document.getElementById('budgetsGrid');
  if (!state.budgets.length) { grid.innerHTML='<div class="empty-state card"><div class="empty-icon">🎯</div><p>Henüz bütçe hedefi yok.</p></div>'; return; }
  const monthTx = getMonthTx().filter(t=>t.type==='expense');
  grid.innerHTML = state.budgets.map(b => {
    const cat = getCat('expense', b.category);
    const spent = monthTx.filter(t=>t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct = Math.min(100, Math.round(spent/b.limit*100));
    const cls = pct>=100?'danger':pct>=80?'warning':'';
    return `<div class="card budget-card">
      <div class="budget-header">
        <div class="budget-cat"><span>${cat.icon}</span><span>${cat.label}</span></div>
        <button class="icon-btn" data-budget-del="${b.id}">🗑️</button>
      </div>
      <div class="budget-amounts"><span class="spent">${fmt(spent)}</span><span>/ ${fmt(b.limit)}</span></div>
      <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="budget-pct" style="color:${pct>=100?'var(--expense)':pct>=80?'#f59e0b':'var(--accent2)'}">${pct}% kullanıldı</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-budget-del]').forEach(btn => {
    btn.addEventListener('click', () => { state.budgets=state.budgets.filter(b=>b.id!==btn.dataset.budgetDel); save(); renderBudgets(); toast('Bütçe silindi'); });
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────
let yearChart;
function renderReports() {
  const expenses = state.transactions.filter(t=>t.type==='expense');
  const bycat = {};
  expenses.forEach(t=>{ bycat[t.category]=(bycat[t.category]||0)+t.amount; });
  const entries = Object.entries(bycat).sort((a,b)=>b[1]-a[1]);
  const maxVal = entries[0]?.[1]||1;
  document.getElementById('topCategories').innerHTML = entries.slice(0,6).map(([id,amt]) => {
    const cat=getCat('expense',id);
    return `<div class="top-cat-item"><span class="top-cat-label">${cat.icon} ${cat.label}</span><div class="top-cat-bar"><div class="top-cat-fill" style="width:${Math.round(amt/maxVal*100)}%"></div></div><span class="top-cat-amount">${fmt(amt)}</span></div>`;
  }).join('') || '<p style="color:var(--text2)">Veri yok</p>';

  const now = new Date();
  const months=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const rows=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const txs=state.transactions.filter(t=>{const td=new Date(t.date);return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear();});
    const inc=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const max=Math.max(inc,exp,1);
    rows.push(`<div class="month-row"><span class="month-name">${months[d.getMonth()]}</span><div class="month-bars"><div class="month-bar inc" style="width:${Math.round(inc/max*100)}%"></div><div class="month-bar exp" style="width:${Math.round(exp/max*100)}%"></div></div><span style="font-size:12px;color:var(--text2);min-width:80px;text-align:right">${fmt(inc-exp)}</span></div>`);
  }
  document.getElementById('monthlyComparison').innerHTML = rows.join('') || '<p style="color:var(--text2)">Veri yok</p>';

  const all=state.transactions;
  const totalInc=all.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExp=all.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const avgMonthly = all.length ? Math.round(totalExp / Math.max(1, new Set(all.map(t=>t.date.slice(0,7))).size)) : 0;
  document.getElementById('statsContent').innerHTML = `
    <div class="stat-item"><div class="stat-val">${all.length}</div><div class="stat-lbl">Toplam İşlem</div></div>
    <div class="stat-item"><div class="stat-val">${fmt(totalInc)}</div><div class="stat-lbl">Toplam Gelir</div></div>
    <div class="stat-item"><div class="stat-val">${fmt(totalExp)}</div><div class="stat-lbl">Toplam Gider</div></div>
    <div class="stat-item"><div class="stat-val">${fmt(avgMonthly)}</div><div class="stat-lbl">Ort. Aylık Gider</div></div>`;

  // Year chart
  const yearData = Array.from({length:12},(_,i)=>{
    const txs=state.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===i&&d.getFullYear()===now.getFullYear();});
    return txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  });
  const ctx=document.getElementById('yearChart').getContext('2d');
  if(yearChart) yearChart.destroy();
  yearChart=new Chart(ctx,{type:'line',data:{labels:months,datasets:[{label:'Aylık Gider',data:yearData,borderColor:'#f2516e',backgroundColor:'rgba(242,81,110,0.1)',fill:true,tension:.4,pointBackgroundColor:'#f2516e',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#9090aa'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#9090aa',callback:v=>'₺'+v.toLocaleString('tr-TR')}}}}});
}

// ── Transaction Modal ─────────────────────────────────────────────────────────
function openModal(editId) {
  state.editId = editId || null;
  const modal = document.getElementById('transactionModal');
  const form = document.getElementById('transactionForm');
  form.reset();
  document.getElementById('txDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('editId').value = editId || '';
  document.getElementById('modalTitle').textContent = editId ? 'İşlemi Düzenle' : 'İşlem Ekle';

  if (editId) {
    const t = state.transactions.find(x=>x.id===editId);
    if (t) {
      setTxType(t.type);
      document.getElementById('amount').value = t.amount;
      document.getElementById('description').value = t.description;
      document.getElementById('txDate').value = t.date;
      document.getElementById('note').value = t.note||'';
      populateCategories(t.type);
      document.getElementById('category').value = t.category;
    }
  } else {
    setTxType('income');
    populateCategories('income');
  }
  modal.classList.add('open');
}

function setTxType(type) {
  state.txType = type;
  document.getElementById('incomeBtn').classList.toggle('active', type==='income');
  document.getElementById('expenseBtn').classList.toggle('active', type==='expense');
  populateCategories(type);
}

function populateCategories(type) {
  const sel = document.getElementById('category');
  sel.innerHTML = '<option value="">Seçin...</option>' + CATEGORIES[type].map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  const bsel = document.getElementById('budgetCategory');
  if(bsel) bsel.innerHTML = '<option value="">Seçin...</option>' + CATEGORIES.expense.map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
}

document.getElementById('incomeBtn').addEventListener('click', ()=>setTxType('income'));
document.getElementById('expenseBtn').addEventListener('click', ()=>setTxType('expense'));
['addTransactionBtn','addTransactionBtn2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',()=>openModal()); });
['closeModal','cancelModal'].forEach(id=>{ document.getElementById(id).addEventListener('click',()=>document.getElementById('transactionModal').classList.remove('open')); });
document.getElementById('transactionModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('transactionForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('editId').value || Date.now().toString();
  const tx = {
    id, type:state.txType,
    amount: parseFloat(document.getElementById('amount').value),
    description: document.getElementById('description').value.trim(),
    category: document.getElementById('category').value,
    date: document.getElementById('txDate').value,
    note: document.getElementById('note').value.trim()
  };
  if (document.getElementById('editId').value) {
    state.transactions = state.transactions.map(t=>t.id===id?tx:t);
    toast('İşlem güncellendi ✅');
  } else {
    state.transactions.unshift(tx);
    toast('İşlem eklendi ✅');
  }
  save();
  document.getElementById('transactionModal').classList.remove('open');
  renderDashboard();
  renderTransactions();
});

function deleteTransaction(id) {
  if (!confirm('Bu işlemi silmek istiyor musunuz?')) return;
  state.transactions = state.transactions.filter(t=>t.id!==id);
  save(); toast('İşlem silindi','err');
  renderDashboard(); renderTransactions();
}

// ── Budget Modal ──────────────────────────────────────────────────────────────
document.getElementById('addBudgetBtn').addEventListener('click', () => {
  populateCategories('expense');
  document.getElementById('budgetModal').classList.add('open');
});
['closeBudgetModal','cancelBudgetModal'].forEach(id=>{ document.getElementById(id).addEventListener('click',()=>document.getElementById('budgetModal').classList.remove('open')); });
document.getElementById('budgetModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('budgetForm').addEventListener('submit', e => {
  e.preventDefault();
  const cat = document.getElementById('budgetCategory').value;
  if (state.budgets.find(b=>b.category===cat)) { toast('Bu kategori zaten mevcut','err'); return; }
  state.budgets.push({id:Date.now().toString(), category:cat, limit:parseFloat(document.getElementById('budgetLimit').value)});
  save();
  document.getElementById('budgetModal').classList.remove('open');
  document.getElementById('budgetForm').reset();
  renderBudgets();
  toast('Bütçe hedefi eklendi ✅');
});

document.getElementById('viewAllBtn').addEventListener('click', ()=>navigate('transactions'));

// ── Seed Demo Data ─────────────────────────────────────────────────────────────
function seedDemo() {
  if (state.transactions.length) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const demos = [
    {id:'d1',type:'income',amount:15000,description:'Mayıs Maaşı',category:'maas',date:`${y}-${String(m+1).padStart(2,'0')}-01`,note:''},
    {id:'d2',type:'income',amount:3500,description:'Freelance Proje',category:'freelance',date:`${y}-${String(m+1).padStart(2,'0')}-05`,note:'Web tasarım'},
    {id:'d3',type:'expense',amount:4500,description:'Kira',category:'kira',date:`${y}-${String(m+1).padStart(2,'0')}-02`,note:''},
    {id:'d4',type:'expense',amount:850,description:'Market Alışverişi',category:'market',date:`${y}-${String(m+1).padStart(2,'0')}-07`,note:''},
    {id:'d5',type:'expense',amount:420,description:'Elektrik & Su',category:'fatura',date:`${y}-${String(m+1).padStart(2,'0')}-03`,note:''},
    {id:'d6',type:'expense',amount:650,description:'Yemek & Kafe',category:'yiyecek',date:`${y}-${String(m+1).padStart(2,'0')}-10`,note:''},
    {id:'d7',type:'expense',amount:200,description:'Ulaşım',category:'ulasim',date:`${y}-${String(m+1).padStart(2,'0')}-08`,note:'Akbil'},
    {id:'d8',type:'expense',amount:350,description:'Netflix & Spotify',category:'eglence',date:`${y}-${String(m+1).padStart(2,'0')}-01`,note:''},
  ];
  state.transactions = demos;
  state.budgets = [
    {id:'b1',category:'market',limit:1500},
    {id:'b2',category:'yiyecek',limit:1000},
    {id:'b3',category:'eglence',limit:500},
  ];
  save();
}

// ── Init ──────────────────────────────────────────────────────────────────────
if (!localStorage.getItem('bx_seeded')) {
  seedDemo();
  localStorage.setItem('bx_seeded', 'true');
}
renderDashboard();
