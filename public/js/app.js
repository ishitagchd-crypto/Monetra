const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const compactMoney = (n) => '₹' + new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
const monthKey = (date) => String(date).slice(0, 7);
const today = new Date();
$('date').value = today.toISOString().slice(0, 10);
$('budgetMonth').value = today.toISOString().slice(0, 7);
$('todayLabel').textContent = today.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();

let transactions = [], budgets = [], savingsGoals = [], cashChart = null, categoryChart = null, demoMode = false;const palette = ['#4c7dff','#35c58c','#e0a64b','#f0736a','#7aa2ff','#58c6d6','#b18cf0','#8b9bb4'];
const categoryIcons = {Food:'✳',Travel:'↗',Shopping:'◇',Bills:'▤',Education:'▣',Entertainment:'♫',Health:'＋',Salary:'↙',Allowance:'＋',Freelance:'⌘',Other:'•'};
function showNotice(message,type='success'){const n=$('notice');n.textContent=message;n.className=`notice show ${type}`;window.clearTimeout(showNotice.timer);showNotice.timer=setTimeout(()=>n.className='notice',4000);}
async function api(path,options={}){const response=await fetch(path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=response.status===204?{}:await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;}

async function loadData() {
  let loadedTransactions, loadedBudgets;

  try {
    [loadedTransactions, loadedBudgets] = await Promise.all([
      api('/api/transactions'),
      api('/api/budgets')
    ]);
  } catch (e) {
    demoMode = true;
    transactions = [
      {id:'d1',type:'EXPENSE',category:'Food',amount:350,description:'Lunch with friends',date:todayISO(-1)},
      {id:'d2',type:'INCOME',category:'Allowance',amount:10000,description:'Monthly allowance',date:todayISO(-2)},
      {id:'d3',type:'EXPENSE',category:'Travel',amount:300,description:'Metro card recharge',date:todayISO(-3)},
      {id:'d4',type:'EXPENSE',category:'Shopping',amount:1200,description:'Everyday essentials',date:todayISO(-5)},
      {id:'d5',type:'INCOME',category:'Freelance',amount:2500,description:'Design project',date:todayISO(-7)},
      {id:'d6',type:'EXPENSE',category:'Bills',amount:850,description:'Phone recharge',date:todayISO(-8)}
    ];
    budgets = [
      {id:'b1',category:'Food',limit:3000,month:today.toISOString().slice(0,7)},
      {id:'b2',category:'Travel',limit:1800,month:today.toISOString().slice(0,7)},
      {id:'b3',category:'Shopping',limit:2500,month:today.toISOString().slice(0,7)}
    ];
    savingsGoals = [];
    renderAll();
    showNotice('Preview mode: could not reach the server. Start MySQL and the Java server to save data.','error');
    return;
  }

  transactions = loadedTransactions;
  budgets = loadedBudgets;
  demoMode = false;

  try {
    savingsGoals = await api('/api/savings-goals');
  } catch (e) {
    savingsGoals = [];
    showNotice('Savings goals could not be loaded.','error');
  }

  renderAll();
}
function todayISO(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);}
function isCurrentMonth(date){return monthKey(date)===today.toISOString().slice(0,7);}
function sum(list,type){return list.filter(t=>!type||t.type===type).reduce((s,t)=>s+Number(t.amount),0);}
function expensesByCategory(list=transactions){const map={};list.filter(t=>t.type==='EXPENSE').forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount));return Object.entries(map).sort((a,b)=>b[1]-a[1]);}

function renderAll() {
    renderMetrics();
    renderTransactions();
    renderBudgets();
    renderCharts();
    renderAnalytics();
    renderMonthlyTrends();
    renderProjection();

    if (window.MonetraSpending) {
        window.MonetraSpending.render(
            document.getElementById("spendingBreakdown"),
            transactions
        );
    }
    renderSavingsGoals();
}
function renderMetrics(){const income=sum(transactions,'INCOME'),expenses=sum(transactions,'EXPENSE'),balance=income-expenses;$('totalIncome').textContent=money(income);$('totalExpenses').textContent=money(expenses);$('netBalance').textContent=money(balance);$('savingsRate').textContent=(income>0?balance/income*100:0).toFixed(1)+'%';}
function rowMarkup(t,showType=false){const income=t.type==='INCOME';return `<tr><td><div class="transaction-name"><span class="transaction-symbol ${income?'':'expense'}">${categoryIcons[t.category]||'•'}</span><span>${escapeHtml(t.description||t.category)}</span></div></td><td>${escapeHtml(t.category)}</td><td>${formatDate(t.date)}</td>${showType?`<td><span class="type-pill ${t.type}">${income?'Income':'Expense'}</span></td>`:''}<td class="align-right ${income?'amount-income':'amount-expense'}">${income?'+':'−'}${money(t.amount)}</td><td><button class="delete-btn" data-delete="${t.id}" aria-label="Delete transaction">×</button></td></tr>`;}
function renderTransactions(){const recent=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);$('transactionRows').innerHTML=recent.map(t=>rowMarkup(t)).join('');$('transactionEmpty').classList.toggle('visible',!transactions.length);const query=($('transactionSearch')?.value||$('searchInput').value||'').toLowerCase();const type=$('typeFilter')?.value||'ALL',cat=$('categoryFilter')?.value||'ALL';const filtered=[...transactions].filter(t=>(!query||`${t.category} ${t.description||''}`.toLowerCase().includes(query))&&(type==='ALL'||t.type===type)&&(cat==='ALL'||t.category===cat)).sort((a,b)=>b.date.localeCompare(a.date));if($('allTransactionRows'))$('allTransactionRows').innerHTML=filtered.map(t=>rowMarkup(t,true)).join('');if($('allTransactionEmpty'))$('allTransactionEmpty').classList.toggle('visible',!filtered.length);if($('categoryFilter')){const selected=$('categoryFilter').value,cats=[...new Set(transactions.map(t=>t.category))].sort();$('categoryFilter').innerHTML='<option value="ALL">All categories</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');$('categoryFilter').value=cats.includes(selected)?selected:'ALL';}}
function renderBudgets(){const current=budgets.filter(b=>b.month===today.toISOString().slice(0,7));const markup=current.map(b=>{const spent=sum(transactions.filter(t=>t.type==='EXPENSE'&&t.category===b.category&&isCurrentMonth(t.date)));const pct=Math.min(100,spent/Number(b.limit)*100),cls=pct>=100?'danger':pct>=80?'warning':'';return `<div class="budget-row"><div class="budget-icon">${categoryIcons[b.category]||'◎'}</div><div class="budget-details"><div class="budget-topline"><strong>${escapeHtml(b.category)}</strong><div class="budget-actions"><span>${money(spent)} / ${money(b.limit)} <em>${Math.round(spent/Number(b.limit)*100)}%</em></span><button class="delete-btn budget-remove" data-delete-budget="${b.id}" aria-label="Remove ${escapeHtml(b.category)} budget">×</button></div></div><div class="progress-track"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div></div></div>`;}).join('');$('budgetList').innerHTML=markup;$('budgetEmpty').classList.toggle('visible',!current.length);$('budgetCards').innerHTML=current.map(b=>{const spent=sum(transactions.filter(t=>t.type==='EXPENSE'&&t.category===b.category&&isCurrentMonth(t.date))),pct=Math.round(spent/Number(b.limit)*100),cls=pct>=100?'danger':pct>=80?'warning':'';return `<article class="budget-card"><div class="budget-topline"><strong>${categoryIcons[b.category]||'◎'} &nbsp;${escapeHtml(b.category)}</strong><div class="budget-actions"><span>${pct>=100?'Limit reached':pct>=80?'Getting close':'On track'}</span><button class="delete-btn budget-remove" data-delete-budget="${b.id}" aria-label="Remove ${escapeHtml(b.category)} budget">×</button></div></div><div class="big-budget">${money(spent)} <span style="font-size:12px;color:#93a1b5;font-weight:500">of ${money(b.limit)}</span></div><div class="progress-track"><div class="progress-fill ${cls}" style="width:${Math.min(100,pct)}%"></div></div><p>${money(Math.max(0,Number(b.limit)-spent))} remaining · ${pct}% used</p></article>`;}).join('');$('budgetPageEmpty').classList.toggle('visible',!current.length);}
function renderCharts(){const months=Number($('chartRange').value||6),labels=[],income=[],expense=[];for(let i=months-1;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');labels.push(d.toLocaleDateString('en-IN',{month:'short'}));income.push(sum(transactions.filter(t=>monthKey(t.date)===key),'INCOME'));expense.push(sum(transactions.filter(t=>monthKey(t.date)===key),'EXPENSE'));}$('cashFlowEmpty').classList.toggle('visible',!transactions.length);$('cashFlowChart').style.display=transactions.length?'':'none';if(cashChart){cashChart.destroy();cashChart=null;}if(transactions.length)cashChart=new Chart($('cashFlowChart'),{type:'bar',data:{labels,datasets:[{label:'Income',data:income,backgroundColor:'#35c58c',borderRadius:5,borderSkipped:false,barPercentage:.55},{label:'Expenses',data:expense,backgroundColor:'#f0736a',borderRadius:5,borderSkipped:false,barPercentage:.55}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',align:'end',labels:{usePointStyle:true,pointStyle:'circle',boxWidth:7,boxHeight:7,color:'#93a1b5',font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{color:'#8b99ad',font:{size:10}},border:{display:false}},y:{beginAtZero:true,grid:{color:'#232c3a'},ticks:{color:'#8b99ad',font:{size:10},callback:v=>compactMoney(v)},border:{display:false}}}}});const cats=expensesByCategory();$('categoryEmpty').classList.toggle('visible',!cats.length);if(categoryChart){categoryChart.destroy();categoryChart=null;}if(cats.length)categoryChart=new Chart($('categoryChart'),{type:'doughnut',data:{labels:cats.map(x=>x[0]),datasets:[{data:cats.map(x=>x[1]),backgroundColor:cats.map((_,i)=>palette[i%palette.length]),borderWidth:3,borderColor:'#161c26',hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});const total=cats.reduce((s,x)=>s+x[1],0);$('categoryLegend').innerHTML=cats.slice(0,6).map((x,i)=>`<div class="legend-item"><span class="legend-dot" style="background:${palette[i%palette.length]}"></span><span>${escapeHtml(x[0])}</span><strong>${total?Math.round(x[1]/total*100):0}%</strong></div>`).join('');}
function renderAnalytics(){const expenses=transactions.filter(t=>t.type==='EXPENSE'),cats=expensesByCategory();$('avgExpense').textContent=money(expenses.length?sum(expenses)/expenses.length:0);$('topCategory').textContent=cats[0]?.[0]||'—';$('transactionCount').textContent=transactions.length;const current=budgets.filter(b=>b.month===today.toISOString().slice(0,7));$('budgetHealth').textContent=!current.length?'Not set':current.some(b=>sum(transactions.filter(t=>t.type==='EXPENSE'&&t.category===b.category&&isCurrentMonth(t.date)))>Number(b.limit))?'Review':'On track';const insights=[];if(cats.length)insights.push(['Highest spending category',`${cats[0][0]} accounts for ${Math.round(cats[0][1]/Math.max(1,sum(expenses))*100)}% of recorded expenses.`]);if(current.length){const over=current.filter(b=>sum(transactions.filter(t=>t.type==='EXPENSE'&&t.category===b.category&&isCurrentMonth(t.date)))>Number(b.limit));insights.push(['Budget check',over.length?`${over.map(b=>b.category).join(', ')} is over its monthly limit.`:'Your recorded spending is within all current category budgets.']);}const inc=sum(transactions,'INCOME'),bal=inc-sum(transactions,'EXPENSE');insights.push(['Savings snapshot',inc?`Your current net balance is ${money(bal)}, which is ${(bal/inc*100).toFixed(1)}% of recorded income.`:'Record some income to calculate your savings rate.']);$('insightsList').innerHTML=insights.map(i=>`<div class="insight-row"><div><strong>${escapeHtml(i[0])}</strong><p>${escapeHtml(i[1])}</p></div></div>`).join('');}

function renderMonthlyTrends() {
    const canvas = document.getElementById("monthlyTrendsChart");
    const summary = document.getElementById("monthlyTrendsSummary");

    if (!canvas || !summary || typeof Chart === "undefined") return;

    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
            income: 0,
            expenses: 0
        });
    }

    transactions.forEach(t => {
        const month = months.find(m => m.key === String(t.date || "").slice(0, 7));
        if (!month) return;

        const amount = Number(t.amount) || 0;

        if (t.type === "INCOME") month.income += amount;
        if (t.type === "EXPENSE") month.expenses += amount;
    });

    const savings = months.map(m => m.income - m.expenses);

    if (window.monetraMonthlyChart) {
        window.monetraMonthlyChart.destroy();
    }

    window.monetraMonthlyChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: "Income",
                    data: months.map(m => m.income),
                    backgroundColor: "#35c58c",
                    borderRadius: 6
                },
                {
                    label: "Expenses",
                    data: months.map(m => m.expenses),
                    backgroundColor: "#e0a64b",
                    borderRadius: 6
                },
                {
                    label: "Net savings",
                    data: savings,
                    backgroundColor: "#4c7dff",
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 7,
                        boxHeight: 7,
                        color: "#93a1b5",
                        font: { family: "DM Sans", size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.dataset.label}: ₹${Number(context.raw).toLocaleString("en-IN")}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#8b99ad", font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#232c3a" },
                    border: { display: false },
                    ticks: {
                        color: "#8b99ad",
                        font: { size: 10 },
                        callback: value => "₹" + Number(value).toLocaleString("en-IN")
                    }
                }
            }
        }
    });

    const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);

    summary.textContent =
        `Last 6 months: income ₹${totalIncome.toLocaleString("en-IN")}, ` +
        `expenses ₹${totalExpenses.toLocaleString("en-IN")}, ` +
        `net savings ₹${(totalIncome - totalExpenses).toLocaleString("en-IN")}.`;
}

function renderProjection(){const amount=Number($('monthlySave').value),months=Number($('saveMonths').value);$('monthlySaveLabel').textContent=money(amount);$('projectionTotal').textContent=money(amount*months);$('projectionNote').textContent=`If you save ${money(amount)} every month for ${months} months, before interest or returns.`;}

function renderSavingsGoals() {
  const container = $('savingsGoalsList');
  if (!container) return;

  if (!savingsGoals.length) {
    container.innerHTML = '<p class="goal-empty">No goals yet.</p>';
    return;
  }

  container.innerHTML = savingsGoals.map(goal => {
    const target = Number(goal.targetAmount || 0);
    const saved = Number(goal.savedAmount || 0);
    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const deadline = goal.deadline ? formatDate(goal.deadline) : 'No date';

    return `
      <div class="goal-row">
        <div class="goal-top">
          <strong>${escapeHtml(String(goal.name || 'Savings goal'))}</strong>
          <span>${money(saved)} of ${money(target)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <p>${progress.toFixed(0)}% saved &middot; due ${deadline}</p>
      </div>
    `;
  }).join('');
}

function formatDate(d){return new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function openModal(id){$(id).classList.remove('hidden');document.body.style.overflow='hidden';}
function closeModal(id){$(id).classList.add('hidden');document.body.style.overflow='';}
function showView(view){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));document.querySelectorAll('.content > section:not(.view-section)').forEach(s=>s.classList.toggle('hidden',view!=='dashboard'));document.querySelectorAll('.view-section').forEach(s=>s.classList.add('hidden'));const target=$(view+'View');if(view!=='dashboard'&&target)target.classList.remove('hidden');if(view==='transactions')renderTransactions();if(view==='budgets')renderBudgets();if(view==='analytics'){renderAnalytics();renderMonthlyTrends();}if(view==='money')renderProjection();$('sidebar')?.classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});}document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));$('refreshBtn').addEventListener('click',loadData);document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
$('addTopBtn').addEventListener('click',()=>openModal('transactionModal'));$('addInView').addEventListener('click',()=>openModal('transactionModal'));$('emptyAddBtn').addEventListener('click',()=>openModal('transactionModal'));$('createBudgetBtn').addEventListener('click',()=>openModal('budgetModal'));$('addBudgetBtn').addEventListener('click',()=>openModal('budgetModal'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));document.querySelectorAll('.modal-backdrop').forEach(b=>b.addEventListener('click',e=>{if(e.target===b)closeModal(b.id)}));document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m=>closeModal(m.id));});
$('transactionForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),payload={type:f.get('type'),amount:Number(f.get('amount')),category:f.get('category'),date:f.get('date'),description:f.get('description')||''};try{if(demoMode)transactions.push({...payload,id:'d'+Date.now()});else await api('/api/transactions',{method:'POST',body:JSON.stringify(payload)});closeModal('transactionModal');$('transactionForm').reset();$('date').value=todayISO();renderAll();showNotice(demoMode?'Preview only: connect the Java server and MySQL to permanently save transactions.':'Transaction saved successfully.');if(!demoMode)await loadData();}catch(err){showNotice(err.message,'error');}});
$('budgetForm').addEventListener('submit',async e=>{e.preventDefault();const payload={category:$('budgetCategory').value,limit:Number($('budgetLimit').value),month:$('budgetMonth').value};try{if(demoMode){budgets=budgets.filter(b=>!(b.category===payload.category&&b.month===payload.month));budgets.push({...payload,id:'b'+Date.now()});}else await api('/api/budgets',{method:'POST',body:JSON.stringify(payload)});closeModal('budgetModal');$('budgetForm').reset();$('budgetMonth').value=today.toISOString().slice(0,7);renderAll();showNotice(demoMode?'Preview only: connect MySQL to save budgets.':'Budget saved successfully.');if(!demoMode)await loadData();}catch(err){showNotice(err.message,'error');}});
$('savingsGoalForm').addEventListener('submit',async e=>{e.preventDefault();const message=$('savingsGoalMessage');if(demoMode){message.textContent='Preview mode: start the server to save goals.';return;}const payload={name:$('goalName').value.trim(),targetAmount:Number($('goalTarget').value),savedAmount:Number($('goalSaved').value||0),deadline:$('goalDeadline').value};message.textContent='Saving...';try{await api('/api/savings-goals',{method:'POST',body:JSON.stringify(payload)});$('savingsGoalForm').reset();$('goalSaved').value=0;message.textContent='Goal added.';await loadData();}catch(err){message.textContent=err.message;}});
document.body.addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b)return;if(!confirm('Delete this transaction?'))return;try{if(demoMode)transactions=transactions.filter(t=>String(t.id)!==String(b.dataset.delete));else await api('/api/transactions/'+encodeURIComponent(b.dataset.delete),{method:'DELETE'});renderAll();showNotice(demoMode?'Removed from preview.':'Transaction deleted.');if(!demoMode)await loadData();}catch(err){showNotice(err.message,'error');}});
document.body.addEventListener('click',async e=>{const b=e.target.closest('[data-delete-budget]');if(!b)return;if(!confirm('Remove this budget?'))return;try{if(demoMode){budgets=budgets.filter(x=>String(x.id)!==String(b.dataset.deleteBudget));renderAll();showNotice('Removed from preview.');return;}await api('/api/budgets/'+encodeURIComponent(b.dataset.deleteBudget),{method:'DELETE'});await loadData();showNotice('Budget removed.');}catch(err){showNotice(err.message,'error');}});
$('chartRange').addEventListener('change',renderCharts);$('monthlySave').addEventListener('input',renderProjection);$('saveMonths').addEventListener('change',renderProjection);
$('searchInput').addEventListener('input',()=>{if(!$('transactionsView').classList.contains('hidden')){$('transactionSearch').value=$('searchInput').value;renderTransactions();}else{showView('transactions');$('transactionSearch').value=$('searchInput').value;renderTransactions();}});
$('transactionSearch')?.addEventListener('input', renderTransactions);
$('typeFilter')?.addEventListener('change', renderTransactions);
$('categoryFilter')?.addEventListener('change', renderTransactions);loadData();
$('exportCsvBtn')?.addEventListener('click', () => {
    if (!transactions.length) {
        showNotice('No transactions available to export.', 'error');
        return;
    }

    const headers = ['Type', 'Amount', 'Category', 'Date', 'Description'];
    const rows = transactions.map(t => [
        t.type,
        t.amount,
        t.category,
        t.date,
        t.description || ''
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(value =>
            '"' + String(value ?? '').replace(/"/g, '""') + '"'
        ).join(','))
        .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monetra-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);

    showNotice('Transactions exported successfully.');
});