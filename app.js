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

// ================= CONFIG =================
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

// ================= CONTROLE =================
let isAdmin = false;
let abaAtual = "todos";
let playersCache = [];

// ================= LOGIN =================
window.login = async function () {
  try {
    const email = document.getElementById("email")?.value;
    const senha = document.getElementById("senha")?.value;

    if (!email || !senha) {
      alert("Preencha tudo!");
      return;
    }

    await signInWithEmailAndPassword(auth, email, senha);
    alert("Logado 😈");
    location.reload();

  } catch (e) {
    alert("Erro: " + e.message);
  }
};

window.logout = function () {
  signOut(auth);
  location.reload();
};

// ================= LOGIN CHECK =================
onAuthStateChanged(auth, user => {
  const login = document.getElementById("login-screen");
  const painel = document.getElementById("painel");

  if (user) {
    isAdmin = true;
    if (login) login.style.display = "none";
    if (painel) painel.style.display = "block";
  } else {
    isAdmin = false;
    if (login) login.style.display = "block";
    if (painel) painel.style.display = "none";
  }
});

// ================= FILTROS =================
window.trocarAba = function(dispositivo){
  abaAtual = dispositivo;
  render(playersCache);
};

window.filtrarPlayers = function(){
  render(playersCache);
};

// ================= ADD PLAYER =================
window.addPlayer = async function () {
  try {
    if (!isAdmin) return;

    const nome = document.getElementById("nome")?.value.trim();
    const modo = document.getElementById("modo")?.value.trim();
    const categoria = document.getElementById("categoria")?.value;
    const tier = document.getElementById("tier")?.value;
    const dispositivo = document.getElementById("dispositivo")?.value;

    if (!nome || !modo) {
      alert("Preencha tudo!");
      return;
    }

    const duplicado = playersCache.find(p =>
      p.nome.toLowerCase() === nome.toLowerCase() &&
      p.modo.toLowerCase() === modo.toLowerCase() &&
      p.categoria === categoria &&
      p.dispositivo === dispositivo
    );

    if (duplicado) {
      alert("Player já existe ⚠️");
      return;
    }

    await addDoc(collection(db, "players"), {
      nome,
      modo,
      categoria,
      tier,
      dispositivo
    });

    document.getElementById("nome").value = "";
    document.getElementById("modo").value = "";

  } catch (e) {
    alert("Erro: " + e.message);
  }
};

// ================= REMOVE =================
window.removerPlayer = async function (id) {
  if (!isAdmin) return;
  await deleteDoc(doc(db, "players", id));
};

// ================= EDIT =================
window.editarPlayer = async function (id, nomeAtual, modoAtual, tierAtual, categoriaAtual) {

  const nome = prompt("Nome:", nomeAtual);
  if (nome === null) return;

  const modo = prompt("Modo:", modoAtual);
  if (modo === null) return;

  const tier = prompt("Tier:", tierAtual);
  if (tier === null) return;

  const categoria = prompt("Categoria:", categoriaAtual);
  if (categoria === null) return;

  await updateDoc(doc(db, "players", id), {
    nome,
    modo,
    tier,
    categoria
  });
};

// ================= TIER =================
function formatTier(t){
  return t.replace("plus","+").replace("minus","-").toUpperCase();
}

function getPoints(tier){
  const map = {
    splus:100,s:95,sminus:90,
    aplus:85,a:80,aminus:75,
    bplus:70,b:65,bminus:60,
    cplus:55,c:50,cminus:45,
    dplus:40,d:35,dminus:30
  };
  return map[tier] || 0;
}

// ================= TOP =================
function renderGlobal(players){
  const global = document.getElementById("global");
  const mobile = document.getElementById("global-mobile");
  const pc = document.getElementById("global-pc");
  const controle = document.getElementById("global-controle");

  if(!global) return;

  global.innerHTML = "";
  if(mobile) mobile.innerHTML = "";
  if(pc) pc.innerHTML = "";
  if(controle) controle.innerHTML = "";

  function gerarRanking(lista, elemento, limite = 10){
    if(!elemento) return;

    const mapa = {};

    lista.forEach(p=>{
      if(!mapa[p.nome]){
        mapa[p.nome] = {
          nome:p.nome,
          modo:p.modo,
          pontos:0,
          dispositivo:p.dispositivo
        };
      }

      mapa[p.nome].pontos += getPoints(p.tier);
    });

    const ranking = Object.values(mapa)
      .sort((a,b)=>b.pontos-a.pontos)
      .slice(0, limite);

    ranking.forEach((p,i)=>{

      const icon =
        p.dispositivo==="mobile" ? "📱" :
        p.dispositivo==="pc" ? "🖥️" :
        "🎮";

      const li = document.createElement("li");

      li.innerHTML = `
        <strong>#${i+1} ${p.nome}</strong>
        <span>${p.modo} ${icon} • ${p.pontos} pts</span>
      `;

      elemento.appendChild(li);
    });
  }

  gerarRanking(players, global, 20);
  gerarRanking(players.filter(p=>p.dispositivo==="mobile"), mobile);
  gerarRanking(players.filter(p=>p.dispositivo==="pc"), pc);
  gerarRanking(players.filter(p=>p.dispositivo==="controle"), controle);
}

// ================= RENDER =================
function render(data){
  const container = document.getElementById("ranking");
  if(!container) return;

  container.innerHTML = "";

  const busca = document.getElementById("busca")?.value?.toLowerCase() || "";

  const categorias = ["combate","projeteis","estrategia","skills"];
  const tiers = ["splus","s","sminus","aplus","a","aminus","bplus","b","bminus","cplus","c","cminus","dplus","d","dminus"];

  categorias.forEach(cat=>{

    const section = document.createElement("div");
    section.className = "categoria";
    section.innerHTML = `<h2>${cat.toUpperCase()}</h2>`;

    tiers.forEach(t=>{

      const playersDiv = document.createElement("div");
      playersDiv.className = "players";

      data
        .filter(p =>
          p.categoria===cat &&
          p.tier===t &&
          (abaAtual==="todos" || p.dispositivo===abaAtual) &&
          p.nome.toLowerCase().includes(busca)
        )
        .forEach(p=>{

          const icon =
            p.dispositivo==="mobile" ? "📱" :
            p.dispositivo==="pc" ? "🖥️" :
            "🎮";

          const el = document.createElement("div");
          el.className = "player";

          el.innerHTML = `
            <strong>${p.nome}</strong>
            <span>${p.modo} ${icon}</span>
          `;

          if(isAdmin){
            el.innerHTML += `
              <div class="admin-buttons">
                <button onclick='removerPlayer("${p.id}")'>❌</button>
                <button onclick='editarPlayer("${p.id}","${p.nome}","${p.modo}","${p.tier}","${p.categoria}")'>✏️</button>
              </div>
            `;
          }

          playersDiv.appendChild(el);
        });

      if(playersDiv.innerHTML){
        const tierDiv = document.createElement("div");
        tierDiv.className = `tier tier-${t}`;
        tierDiv.innerHTML = `<div class="tier-title">${formatTier(t)}</div>`;
        tierDiv.appendChild(playersDiv);
        section.appendChild(tierDiv);
      }
    });

    container.appendChild(section);
  });
}

// ================= REALTIME =================
onSnapshot(collection(db,"players"), snapshot=>{

  playersCache = snapshot.docs.map(doc=>({
    id:doc.id,
    ...doc.data()
  }));

  render(playersCache);
  renderGlobal(playersCache);
});

// ================= LOADING =================
window.addEventListener("load", ()=>{
  setTimeout(()=>{
    const load = document.getElementById("loading");
    if(load) load.style.display = "none";
  },2000);
});
