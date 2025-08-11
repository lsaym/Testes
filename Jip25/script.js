<script>
// --- Dados iniciais ---
const initialTeams = [
  '6°A','6°B','6°C','6°D','7°A','7°C','7°D','8°A','8°B','8°C','8°D','9°A','9°B','1° ANO','2° ANO','3° ANO'
];
const initialModalities = [
  {id:'braw', name:'BRAW STARS', category:'misto'},
  {id:'corrida100', name:'CORRIDA 100m', category:'masculino/feminino'},
  {id:'dama', name:'DAMA', category:'misto'},
  {id:'domino', name:'DOMINÓ', category:'misto'},
  {id:'fut7', name:'FUT 7', category:'masculino/feminino'},
  {id:'futmesa', name:'FUT MESA', category:'masculino/feminino'},
  {id:'handbol', name:'HANDBOL', category:'masculino/feminino'},
  {id:'queimado', name:'QUEIMADO', category:'masculino/feminino'},
  {id:'voleiPraia', name:'VÔLEI DE PRAIA', category:'misto'},
  {id:'xadrez', name:'XADREZ', category:'misto'}
];

// --- Storage keys ---
const KEY_TEAMS = 'jip2025_teams';
const KEY_MODALITIES = 'jip2025_modalities';
const KEY_MATCHES = 'jip2025_matches';

// --- Helpers ---
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

function loadOrInit(){
  if(!localStorage.getItem(KEY_TEAMS)) localStorage.setItem(KEY_TEAMS, JSON.stringify(initialTeams));
  if(!localStorage.getItem(KEY_MODALITIES)) localStorage.setItem(KEY_MODALITIES, JSON.stringify(initialModalities));
  if(!localStorage.getItem(KEY_MATCHES)) localStorage.setItem(KEY_MATCHES, JSON.stringify([]));
}

function saveMatches(arr){ localStorage.setItem(KEY_MATCHES, JSON.stringify(arr)); }
function getMatches(){ return JSON.parse(localStorage.getItem(KEY_MATCHES) || '[]'); }
function getTeams(){ return JSON.parse(localStorage.getItem(KEY_TEAMS) || '[]'); }
function getModalities(){ return JSON.parse(localStorage.getItem(KEY_MODALITIES) || '[]'); }

// --- UI populate ---
function populateSelectors(){
  const teams = getTeams();
  const mods = getModalities();
  const selA = qs('#selEquipeA'); const selB = qs('#selEquipeB');
  const selMod = qs('#selModalidade'); const filterMod = qs('#filterModalidade');
  [selA,selB].forEach(s => { s.innerHTML = teams.map(t=>`<option value="${t}">${t}</option>`).join('') });
  selMod.innerHTML = mods.map(m=>`<option value="${m.id}">${m.name} (${m.category})</option>`).join('');
  filterMod.innerHTML = '<option value="all">Todas as modalidades</option>' + mods.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
}

// --- Matches UI ---
function renderMatches(){
  const list = qs('#matches');
  const arr = getMatches();
  qs('#totalMatches').innerText = arr.length + ' partidas';
  list.innerHTML = arr.map((mt,idx)=>{
    const m = getModalities().find(x=>x.id===mt.modalidade) || {name:mt.modalidade};
    return `
      <div class="match">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${m.name}</strong> <span class="muted">(${mt.categoria})</span></div>
          <div class="small muted">${mt.data? new Date(mt.data).toLocaleString() : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <div style="flex:1">${mt.equipeA} <strong style="margin:0 8px">${mt.scoreA ?? '-'}</strong> x <strong style="margin:0 8px">${mt.scoreB ?? '-'}</strong> ${mt.equipeB}</div>
          <div style="display:flex;gap:6px">
            <button onclick="editMatch(${idx})" class="btn-ghost">Editar</button>
            <button onclick="deleteMatch(${idx})" class="btn-ghost">Apagar</button>
          </div>
        </div>
      </div>
    `
  }).join('') || '<div class="muted">Sem partidas cadastradas</div>';
}

// --- Create match ---
qs('#btnCriar').addEventListener('click',()=>{
  const mod = qs('#selModalidade').value; const cat = qs('#selCategoria').value;
  const a = qs('#selEquipeA').value; const b = qs('#selEquipeB').value; const d = qs('#inpData').value;
  if(!a || !b || a===b){ alert('Escolha duas turmas diferentes'); return; }
  const arr = getMatches();
  arr.push({modalidade:mod,categoria:cat,equipeA:a,equipeB:b,data:d,scoreA:null,scoreB:null});
  saveMatches(arr); renderMatches(); renderRanking();
});

qs('#btnReset').addEventListener('click',()=>{
  if(!confirm('Resetar todos os dados locais?')) return;
  localStorage.removeItem(KEY_MATCHES); localStorage.removeItem(KEY_MODALITIES); localStorage.removeItem(KEY_TEAMS);
  loadOrInit(); populateSelectors(); renderMatches(); renderRanking();
});

window.editMatch = function(i){
  const arr = getMatches(); const mt = arr[i];
  const sA = prompt('Placar - ' + mt.equipeA, mt.scoreA===null? '': mt.scoreA);
  if(sA===null) return; const sB = prompt('Placar - ' + mt.equipeB, mt.scoreB===null? '': mt.scoreB);
  if(sB===null) return;
  const nA = sA.trim()===''? null : Number(sA);
  const nB = sB.trim()===''? null : Number(sB);
  arr[i].scoreA = Number.isNaN(nA)? null : nA;
  arr[i].scoreB = Number.isNaN(nB)? null : nB;
  saveMatches(arr); renderMatches(); renderRanking();
}
window.deleteMatch = function(i){ const arr=getMatches(); if(!confirm('Apagar partida?')) return; arr.splice(i,1); saveMatches(arr); renderMatches(); renderRanking(); }

// --- Ranking calculation ---
function computeRanking(filterMod='all', filterCat='all'){
  const matches = getMatches().filter(m=> (filterMod==='all' || m.modalidade===filterMod) && (filterCat==='all' || m.categoria===filterCat) );
  const teams = getTeams();
  const ptsWin = Number(qs('#ptsWin').value||3); const ptsDraw = Number(qs('#ptsDraw').value||1); const ptsLose = Number(qs('#ptsLose').value||0);
  const stats = {};
  teams.forEach(t=> stats[t] = {team:t, points:0, played:0, wins:0, draws:0, losses:0, gf:0, ga:0, gd:0});

  matches.forEach(m=>{
    const a = m.equipeA, b = m.equipeB; const sA = m.scoreA, sB = m.scoreB;
    if(sA==null || sB==null) return; // sem resultado
    stats[a].played++; stats[b].played++;
    stats[a].gf += Number(sA); stats[a].ga += Number(sB);
    stats[b].gf += Number(sB); stats[b].ga += Number(sA);
    if(sA > sB){ stats[a].points += ptsWin; stats[a].wins++; stats[b].points += ptsLose; stats[b].losses++; }
    else if(sA < sB){ stats[b].points += ptsWin; stats[b].wins++; stats[a].points += ptsLose; stats[a].losses++; }
    else { stats[a].points += ptsDraw; stats[b].points += ptsDraw; stats[a].draws++; stats[b].draws++; }
  });

  Object.values(stats).forEach(s=> s.gd = s.gf - s.ga);
  const arr = Object.values(stats).sort((x,y)=> {
    if(y.points !== x.points) return y.points - x.points;
    if(y.gd !== x.gd) return y.gd - x.gd;
    if(y.wins !== x.wins) return y.wins - x.wins;
    return x.team.localeCompare(y.team);
  });
  return arr;
}

function renderRanking(){
  const filterMod = qs('#filterModalidade').value; const filterCat = qs('#filterCategoria').value;
  const ranking = computeRanking(filterMod, filterCat);
  const area = qs('#rankingArea');
  const modName = filterMod==='all'? 'Geral (todas modalidades)' : (getModalities().find(m=>m.id===filterMod)||{name:filterMod}).name;
  area.innerHTML = `<div class="small muted">Visualizando: <strong>${modName}</strong> — Categoria: <strong>${filterCat}</strong></div>`;
  const top = ranking.slice(0,16).map((r,idx)=> `
    <tr class="${idx===0? 'rank-1':''}">
      <td>${idx+1}</td>
      <td>${r.team}</td>
      <td>${r.played}</td>
      <td>${r.wins}</td>
      <td>${r.draws}</td>
      <td>${r.losses}</td>
      <td>${r.gf}</td>
      <td>${r.ga}</td>
      <td>${r.gd}</td>
      <td><strong>${r.points}</strong></td>
    </tr>
  `).join('');
  area.innerHTML += `
    <table>
      <thead><tr><th>#</th><th>Equipe</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GA</th><th>SG</th><th>Pts</th></tr></thead>
      <tbody>${top}</tbody>
    </table>
  `;
}

qs('#btnAtualizar').addEventListener('click', renderRanking);

// --- Overall (sum of modalities) ---
// The "filterModalidade=all" already sums all matches; this gives overall ranking by default.

// --- Init ---
loadOrInit(); populateSelectors(); renderMatches(); renderRanking();
</script>
</body>
</html>
