const defaultCustomers = [
  {id:1,name:'Juan Dela Cruz',plan:'50 Mbps',fee:999,status:'Active',due:'2026-08-15'},
  {id:2,name:'Maria Santos',plan:'100 Mbps',fee:1499,status:'Unpaid',due:'2026-08-10'}
];

let customers = JSON.parse(localStorage.getItem('customers') || 'null') || defaultCustomers;
let payments = JSON.parse(localStorage.getItem('payments') || '[]');

const $ = (id) => document.getElementById(id);

function money(v){return '₱' + Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}
function save(){
  localStorage.setItem('customers', JSON.stringify(customers));
  localStorage.setItem('payments', JSON.stringify(payments));
}

function renderCustomers(){
  $('customerTable').innerHTML = customers.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.plan}</td>
      <td>${money(c.fee)}</td>
      <td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td>
      <td>${c.due || '-'}</td>
      <td>
        <button onclick="toggleStatus(${c.id})">${c.status === 'Active' ? 'Mark Unpaid' : 'Mark Paid'}</button>
        <button onclick="removeCustomer(${c.id})">Delete</button>
      </td>
    </tr>
  `).join('');

  $('paymentCustomer').innerHTML = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderPayments(){
  $('paymentTable').innerHTML = payments.slice().reverse().map(p => {
    const c = customers.find(x => x.id === p.customerId);
    return `<tr><td>${c ? c.name : 'Unknown'}</td><td>${money(p.amount)}</td><td>${p.date}</td></tr>`;
  }).join('');
}

function renderDashboard(){
  $('totalCustomers').textContent = customers.length;
  $('activeCustomers').textContent = customers.filter(c=>c.status==='Active').length;
  $('unpaidCustomers').textContent = customers.filter(c=>c.status==='Unpaid').length;
  const total = payments.reduce((s,p)=>s+Number(p.amount),0);
  $('totalCollected').textContent = money(total);
  $('reportPayments').textContent = payments.length;
  $('reportRevenue').textContent = money(total);
}

function renderAll(){
  renderCustomers();
  renderPayments();
  renderDashboard();
  save();
}

window.toggleStatus = function(id){
  const c = customers.find(x=>x.id===id);
  if(!c) return;
  c.status = c.status === 'Active' ? 'Unpaid' : 'Active';
  renderAll();
}

window.removeCustomer = function(id){
  customers = customers.filter(x=>x.id!==id);
  renderAll();
}

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.section).classList.add('active');
  })
});

$('addCustomerBtn').addEventListener('click',()=>$('customerModal').classList.remove('hidden'));
$('cancelCustomerBtn').addEventListener('click',()=>$('customerModal').classList.add('hidden'));

$('saveCustomerBtn').addEventListener('click',()=>{
  const name = $('customerName').value.trim();
  const plan = $('customerPlan').value.trim();
  const fee = Number($('customerFee').value);
  const due = $('customerDue').value;

  if(!name || !plan || !fee){
    alert('Please complete Name, Plan, and Monthly Fee.');
    return;
  }

  customers.push({
    id: Date.now(),
    name, plan, fee,
    due,
    status:'Unpaid'
  });

  $('customerName').value='';
  $('customerPlan').value='';
  $('customerFee').value='';
  $('customerDue').value='';
  $('customerModal').classList.add('hidden');
  renderAll();
});

$('recordPaymentBtn').addEventListener('click',()=>{
  const customerId = Number($('paymentCustomer').value);
  const amount = Number($('paymentAmount').value);
  const date = $('paymentDate').value || new Date().toISOString().slice(0,10);

  if(!customerId || !amount){
    alert('Select a customer and enter payment amount.');
    return;
  }

  payments.push({id:Date.now(),customerId,amount,date});
  const c = customers.find(x=>x.id===customerId);
  if(c) c.status='Active';

  $('paymentAmount').value='';
  renderAll();
});

$('paymentDate').value = new Date().toISOString().slice(0,10);
renderAll();
