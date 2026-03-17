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
  onSnapshot
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

window.login = async function (event) {
  if (event) event.preventDefault();

  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) return;

  try {
    await signInWithEmailAndPassword(auth, email, senha);

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("painel").style.display = "block";

  } catch (error) {
    alert("Login inválido");
    console.error(error);
  }
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    login(e);
  }
});

/* LOGOUT */

window.logout = function () {
  signOut(auth);
  location.reload();
};

/* AUTH CHECK */

onAuthStateChanged(auth, user => {
  const loginScreen = document.getElementById("login-screen");
  const painel = document.getElementById("painel");

  if (user) {
    isAdmin = true;

    if (loginScreen) loginScreen.style.display = "none";
    if (painel) painel.style.display = "block";

  } else {
    isAdmin = false;

    if (loginScreen) loginScreen.style.display = "block";
    if (painel) painel.style.display = "none";
  }
});

/* ABA */

window.trocarAba = function(dispositivo){
  abaAtual = dispositivo;
  render(playersCache);
};

/* ADD PLAYER */

window.addPlayer = async function () {
  if (!isAdmin) return;

  const nome = document.getElementById("nome")?.value.trim();
  const modo = document.getElementById("modo")?.value.trim();
  const categoria = document.getElementById("categoria")?.value;
  const tier = document.getElementById("tier")?.value;
  const dispositivo = document.getElementById("dispositivo")?.value;

  if (!nome || !modo) return;

  await addDoc(collection(db, "players"), {
    nome,
    modo,
    categoria,
    tier,
    dispositivo
  });
};

/* FORMAT */

function formatTier(t){
  return t.replace("plus","+").replace("minus","-").toUpperCase();
}

/* RENDER */

function render(data){
  const container = document.getElementById("ranking");
  if(!container) return;

  container.innerHTML = "";

  const categorias = ["combate","projeteis","estrategia","skills"];
  const tiers = ["splus","s","sminus","aplus","a","aminus","bplus","b","bminus","cplus","c","cminus","dplus","d","dminus"];

  categorias.forEach(cat => {
    const section = document.createElement("div");
    section.className = "categoria";
    section.innerHTML = `<h2>${cat.toUpperCase()}</h2>`;

    tiers.forEach(t => {
      const tierDiv = document.createElement("div");
      tierDiv.className = `tier tier-${t}`;

      tierDiv.innerHTML = `<div class="tier-title">${formatTier(t)}</div>`;

      const playersDiv = document.createElement("div");
      playersDiv.className = "players";

      const filtrados = data.filter(p =>
        p.categoria === cat &&
        p.tier === t &&
        (abaAtual === "todos" || p.dispositivo === abaAtual)
      );

      if(filtrados.length > 0){
        filtrados.forEach(p => {
          const icon =
            p.dispositivo === "mobile" ? "📱" :
            p.dispositivo === "pc" ? "🖥️" :
            "🎮";

          const el = document.createElement("div");
          el.className = "player";

          el.innerHTML = `
            <strong>${p.nome}</strong>
            <span>${p.modo} ${icon}</span>
          `;

          playersDiv.appendChild(el);
        });
      } else {
        playersDiv.innerHTML = `<p>Sem players</p>`;
      }

      tierDiv.appendChild(playersDiv);
      section.appendChild(tierDiv);
    });

    container.appendChild(section);
  });
}

/* FIREBASE */

onSnapshot(collection(db,"players"), snapshot => {
  playersCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  render(playersCache);
});

/* LOADING */

window.addEventListener("load", () => {
  const loading = document.getElementById("loading");

  if (loading) {
    loading.style.opacity = "0";

    setTimeout(() => {
      loading.style.display = "none";
    }, 500);
  }
});
