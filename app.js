import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDhsV1GJeEvBGBAQmcUXQ8FDcAOXus4DP0",
  authDomain: "bmc-ranking.firebaseapp.com",
  projectId: "bmc-ranking",
  storageBucket: "bmc-ranking.firebasestorage.app",
  messagingSenderId: "81111080222",
  appId: "1:81111080222:web:3370c3289ab07b83493d0f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isAdmin = false;
let abaAtual = "todos";
let playersCache = [];

/* LOGIN */
window.login = async function(event){
  if(event) event.preventDefault();
  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;
  if(!email || !senha) return;

  try{
    await signInWithEmailAndPassword(auth,email,senha);
    document.getElementById("login-screen").style.display = "none";  
    document.getElementById("painel").style.display = "block";
  }catch{
    alert("Login inválido");
  }
};

/* ENTER LOGIN */
document.addEventListener("keydown",(e)=>{
  if(e.key==="Enter") login(e);
});

/* LOGOUT */
window.logout = function(){
  signOut(auth);
  location.reload();
};

/* AUTH */
onAuthStateChanged(auth,user=>{
  const loginScreen = document.getElementById("login-screen");
  const painel = document.getElementById("painel");

  if(user){
    isAdmin = true;
    loginScreen.style.display = "none";  
    painel.style.display = "block";
  }else{
    isAdmin = false;
    loginScreen.style.display = "block";  
    painel.style.display = "none";
  }
});

/* ABAS */
window.trocarAba = function(dispositivo){
  abaAtual = dispositivo;
  render(playersCache);
  renderTopGlobal(playersCache);
};

/* BUSCA */
window.filtrarPlayers = function(){
  const termo = document.getElementById("busca")?.value.toLowerCase() || "";
  const filtrados = playersCache.filter(p => p.nome.toLowerCase().includes(termo));
  render(filtrados);
  renderTopGlobal(filtrados);
};

/* ADD PLAYER */
window.addPlayer = async function(){
  if(!isAdmin) return;

  const nome = document.getElementById("nome")?.value.trim();
  const modo = document.getElementById("modo")?.value.trim();
  const categoria = document.getElementById("categoria")?.value;
  const tier = document.getElementById("tier")?.value;
  const dispositivo = document.getElementById("dispositivo")?.value;

  if(!nome || !modo) return;

  await addDoc(collection(db,"players"),{
    nome,
    modo,
    categoria,
    tier,
    dispositivo,
    posicao: 999
  });
};

/* EDITAR */
window.editarPlayer = async function(id, atual){
  const nome = prompt("Nome:", atual.nome);
  if(nome === null) return;

  const tier = prompt("Tier:", atual.tier);
  if(tier === null) return;

  const dispositivo = prompt("Dispositivo:", atual.dispositivo);
  if(dispositivo === null) return;

  const posicao = prompt("Posição:", atual.posicao || 999);
  if(posicao === null) return;

  await updateDoc(doc(db,"players",id),{
    nome,
    tier,
    dispositivo,
    posicao: Number(posicao)
  });
};

/* REMOVER */
window.removerPlayer = async function(id){
  await deleteDoc(doc(db,"players",id));
};

/* FORMAT */
function formatTier(t){
  return t.replace("plus","+").replace("minus","-").toUpperCase();
}

/* =========================================
   NOVO SISTEMA DE PONTOS (MAIS JUSTO)
========================================= */

/*
OBJETIVO:
- Especialistas valerem MAIS
- Generalistas não dominarem ranking
- Redução geral dos pontos
- Diferença maior entre tiers altas e baixas
*/

function getPoints(tier){
  const map = {

    // S TIERS
    splus: 40,
    s: 36,
    sminus: 32,

    // A TIERS
    aplus: 26,
    a: 23,
    aminus: 20,

    // B TIERS
    bplus: 14,
    b: 11,
    bminus: 9,

    // C TIERS
    cplus: 6,
    c: 4,
    cminus: 3,

    // D TIERS
    dplus: 2,
    d: 1,
    dminus: 0
  };

  return map[tier] || 0;
}

/* =========================================
   BONUS DE ESPECIALISTA
========================================= */

/*
Quanto MAIS tiers altas,
mais bônus o player recebe.

Isso impede:
"B+ em tudo > S tier"

Agora:
1 S tier forte > vários B/C
*/

function getEspecialistaBonus(tiers){

  let bonus = 0;

  tiers.forEach(t=>{

    if(t === "splus") bonus += 16;
    else if(t === "s") bonus += 13;
    else if(t === "sminus") bonus += 10;

    else if(t === "aplus") bonus += 6;
    else if(t === "a") bonus += 5;
    else if(t === "aminus") bonus += 4;

  });

  return bonus;
}

/* =========================================
   PENALIDADE POR MUITOS MODOS
========================================= */

/*
Se o player tiver MUITOS modos,
cada modo extra vale menos.

Isso deixa:
especialistas > generalistas
*/

function getDiminishingMultiplier(totalModos){

  if(totalModos <= 2) return 1;

  if(totalModos === 3) return 0.95;

  if(totalModos === 4) return 0.90;

  if(totalModos === 5) return 0.85;

  if(totalModos >= 6) return 0.78;

  return 1;
}

/* 🔥 TOP GLOBAL BALANCEADO */
function renderTopGlobal(players){

  const global = document.getElementById("global");
  if(!global) return;

  global.innerHTML = "";

  const filtrados = players.filter(p =>
    abaAtual === "todos" || p.dispositivo === abaAtual
  );

  const map = {};

  filtrados.forEach(p=>{

    if(!p.nome) return;

    if(!map[p.nome]){
      map[p.nome] = {
        nome:p.nome,
        pontos:0,
        categorias:new Set(),
        modos:new Set(),
        tiers:[]
      };
    }

    const player = map[p.nome];

    const key = p.categoria + "-" + p.modo;

    // impede duplicado
    if(player[key]) return;
    player[key] = true;

    player.pontos += getPoints(p.tier);

    player.categorias.add(p.categoria);
    player.modos.add(p.modo);

    player.tiers.push(p.tier);
  });

  const ranking = Object.values(map);

  ranking.forEach(p=>{

    // bônus por tiers altas
    const bonusEspecialista = getEspecialistaBonus(p.tiers);

    // penalidade por muitos modos
    const multiplier = getDiminishingMultiplier(
      p.modos.size
    );

    // score final
    p.scoreFinal =
      (p.pontos + bonusEspecialista) * multiplier;
  });

  ranking.sort((a,b)=>b.scoreFinal-a.scoreFinal);

  ranking.slice(0,20).forEach((p,i)=>{

    const medalha =
      i===0 ? "🥇" :
      i===1 ? "🥈" :
      i===2 ? "🥉" :
      `#${i+1}`;

    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${medalha} ${p.nome}</strong>
      <span>${Math.floor(p.scoreFinal)} pts</span>
    `;

    global.appendChild(li);
  });
}

/* RENDER (tiers) */
function render(data){

  const container = document.getElementById("ranking");
  if(!container) return;

  container.innerHTML = "";

  const categorias = [
    "combate",
    "projeteis",
    "estrategia",
    "skills"
  ];

  const tiers = [
    "splus","s","sminus",
    "aplus","a","aminus",
    "bplus","b","bminus",
    "cplus","c","cminus",
    "dplus","d","dminus"
  ];

  categorias.forEach(cat=>{

    const section = document.createElement("div");

    section.className = "categoria";

    section.innerHTML = `
      <h2>${cat.toUpperCase()}</h2>
    `;

    tiers.forEach(t=>{

      const tierDiv = document.createElement("div");

      tierDiv.className = `tier tier-${t}`;

      tierDiv.innerHTML = `
        <div class="tier-title">
          ${formatTier(t)}
        </div>
      `;

      const playersDiv = document.createElement("div");

      playersDiv.className = "players";

      const filtrados = data
        .filter(p =>
          p.categoria===cat &&
          p.tier===t &&
          (
            abaAtual==="todos" ||
            p.dispositivo===abaAtual
          )
        )
        .sort((a,b)=>
          (a.posicao||999) -
          (b.posicao||999)
        );

      if(filtrados.length > 0){

        filtrados.forEach(p=>{

          const icon =
            p.dispositivo==="mobile" ? "📱" :
            p.dispositivo==="pc" ? "🖥️" :
            "🎮";

          const el = document.createElement("div");

          el.className = "player";

          el.innerHTML = `
            <div>
              <strong>${p.nome}</strong>
              <span>${p.modo} ${icon}</span>
            </div>

            ${isAdmin ? `
              <div class="admin-buttons">
                <button onclick='editarPlayer("${p.id}", ${JSON.stringify(p)})'>✏️</button>
                <button onclick="removerPlayer('${p.id}')">❌</button>
              </div>
            ` : ""}
          `;

          playersDiv.appendChild(el);
        });

      }else{

        playersDiv.innerHTML = `
          <p>Sem players</p>
        `;
      }

      tierDiv.appendChild(playersDiv);

      section.appendChild(tierDiv);
    });

    container.appendChild(section);
  });
}

/* FIREBASE */
onSnapshot(collection(db,"players"), snapshot=>{

  playersCache = snapshot.docs.map(doc=>({
    id: doc.id,
    ...doc.data()
  }));

  render(playersCache);

  renderTopGlobal(playersCache);
});

/* LOADING */
window.addEventListener("load",()=>{

  const loading = document.getElementById("loading");

  if(loading){

    loading.style.opacity = "0";

    setTimeout(()=>{
      loading.style.display = "none";
    },500);
  }
});
