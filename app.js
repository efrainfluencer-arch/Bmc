// ================= FIREBASE =================
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

// ================= CONTROLE STAFF =================
let isAdmin = false;

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

  } catch (e) {
    alert("Erro: " + e.message);
  }
};

window.logout = function () {
  signOut(auth);
};

// ================= VERIFICAR LOGIN =================
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

// ================= ADICIONAR PLAYER =================
window.addPlayer = async function () {
  try {
    if (!isAdmin) {
      alert("Apenas staff!");
      return;
    }

    const nome = document.getElementById("nome")?.value.trim();
    const modo = document.getElementById("modo")?.value.trim();
    const categoria = document.getElementById("categoria")?.value;
    const tier = document.getElementById("tier")?.value;

    if (!nome || !modo) {
      alert("Preencha tudo!");
      return;
    }

    await addDoc(collection(db, "players"), {
      nome,
      modo,
      categoria,
      tier
    });

    document.getElementById("nome").value = "";
    document.getElementById("modo").value = "";

    alert("Player adicionado 🔥");

  } catch (e) {
    alert("Erro ao adicionar: " + e.message);
  }
};

// ================= REMOVER =================
window.removerPlayer = async function (id) {
  try {
    if (!isAdmin) {
      alert("Sem permissão!");
      return;
    }

    if (!id) return;

    if (!confirm("Remover player?")) return;

    await deleteDoc(doc(db, "players", id));

  } catch (e) {
    alert("Erro ao remover: " + e.message);
  }
};

// ================= EDITAR =================
window.editarPlayer = async function (id, nomeAtual, modoAtual, tierAtual, categoriaAtual) {
  try {
    if (!isAdmin) {
      alert("Sem permissão!");
      return;
    }

    if (!id) return;

    const nome = prompt("Novo nome:", nomeAtual);
    if (!nome) return;

    const modo = prompt("Novo modo:", modoAtual);
    if (!modo) return;

    const tier = prompt("Nova tier:", tierAtual);
    if (!tier) return;

    const categoria = prompt("Categoria:", categoriaAtual);
    if (!categoria) return;

    await updateDoc(doc(db, "players", id), {
      nome,
      modo,
      tier,
      categoria
    });

  } catch (e) {
    alert("Erro ao editar: " + e.message);
  }
};

// ================= FORMATAR =================
function formatTier(t) {
  if (!t) return "";

  return t.replace("plus", "+").replace("minus", "-").toUpperCase();
}

// ================= PONTUAÇÃO =================
function getPoints(tier){
  const map = {
    splus:100, s:95, sminus:90,
    aplus:85, a:80, aminus:75,
    bplus:70, b:65, bminus:60,
    cplus:55, c:50, cminus:45,
    dplus:40, d:35, dminus:30
  };
  return map[tier] || 0;
}

// ================= RENDER GLOBAL =================
function renderGlobal(players){
  const global = document.getElementById("global");
  if(!global) return;

  global.innerHTML = "";

  const map = {};

  players.forEach(p=>{
    if(!p.nome) return;

    if(!map[p.nome]){
      map[p.nome] = {
        nome: p.nome,
        pontos: 0,
        categorias: new Set(),
        modos: new Set(),
        tiers: []
      };
    }

    const player = map[p.nome];

    // base
    const pontosBase = getPoints(p.tier);

    // evitar duplicar mesmo modo + categoria
    const key = p.categoria + "-" + p.modo;
    if(player[key]) return;
    player[key] = true;

    player.pontos += pontosBase;

    // salvar info pra bônus
    player.categorias.add(p.categoria);
    player.modos.add(p.modo);
    player.tiers.push(p.tier);
  });

  const ranking = Object.values(map);

  ranking.forEach(p=>{
    // 🔥 BONUS POR VARIEDADE
    const bonusCategoria = p.categorias.size * 10;

    // 🔥 BONUS POR MODOS DIFERENTES
    const bonusModo = p.modos.size * 5;

    // 🔥 BONUS POR TIER ALTA
    const highTierBonus = p.tiers.filter(t => t.includes("s")).length * 5;

    p.scoreFinal = p.pontos + bonusCategoria + bonusModo + highTierBonus;
  });

  // ordenar pelo score final
  ranking.sort((a,b)=>b.scoreFinal - a.scoreFinal);

  ranking.slice(0,10).forEach((p,i)=>{
    const li = document.createElement("li");

    const medalha =
      i===0?"🥇":
      i===1?"🥈":
      i===2?"🥉":`#${i+1}`;

    li.innerHTML = `
      <strong>${medalha} ${p.nome}</strong>
      <span>${Math.floor(p.scoreFinal)} pts</span>
    `;

    // glow clean verde
    if(i===0) li.style.boxShadow="0 0 20px rgba(34,197,94,0.4)";
    if(i===1) li.style.boxShadow="0 0 15px rgba(132,204,22,0.35)";
    if(i===2) li.style.boxShadow="0 0 10px rgba(74,222,128,0.3)";

    global.appendChild(li);
  });
}

// ================= RENDER NORMAL =================
function render(data) {
  const container = document.getElementById("ranking");
  if (!container) return;

  container.innerHTML = "";

  const categorias = ["combate", "projeteis", "estrategia", "skills"];

  const tiers = [
    "splus","s","sminus",
    "aplus","a","aminus",
    "bplus","b","bminus",
    "cplus","c","cminus",
    "dplus","d","dminus"
  ];

  categorias.forEach(cat => {

    const section = document.createElement("div");
    section.className = "categoria";

    const title = document.createElement("h2");
    title.innerText = cat.toUpperCase();
    section.appendChild(title);

    tiers.forEach(t => {

      const tierDiv = document.createElement("div");
      tierDiv.className = `tier tier-${t}`;

      const tierTitle = document.createElement("div");
      tierTitle.className = "tier-title";
      tierTitle.innerText = formatTier(t);

      const playersDiv = document.createElement("div");
      playersDiv.className = "players";

      data
        .filter(p => p.categoria === cat && p.tier === t)
        .forEach(p => {

          const el = document.createElement("div");
          el.className = "player";

          el.innerHTML = `
            <strong>${p.nome || "Sem nome"}</strong>
            <span>${p.modo || ""}</span>
          `;

          if (isAdmin) {
            el.innerHTML += `
              <div class="admin-buttons">
                <button onclick="removerPlayer('${p.id}')">❌</button>
                <button onclick="editarPlayer('${p.id}','${p.nome}','${p.modo}','${p.tier}','${p.categoria}')">✏️</button>
              </div>
            `;
          }

          playersDiv.appendChild(el);
        });

      tierDiv.appendChild(tierTitle);
      tierDiv.appendChild(playersDiv);

      section.appendChild(tierDiv);
    });

    container.appendChild(section);
  });
}

// ================= TEMPO REAL =================
onSnapshot(collection(db, "players"), snapshot => {
  try {
    const players = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    render(players);
    renderGlobal(players); // 🔥 ADICIONADO

  } catch (e) {
    console.error("Erro render:", e);
  }
});

window.addEventListener("load", ()=>{
  setTimeout(()=>{
    document.getElementById("loading").style.display = "none";
  },2000);
});
