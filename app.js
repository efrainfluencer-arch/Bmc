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

window.login = async function () {
  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) return;

  await signInWithEmailAndPassword(auth, email, senha);
  location.reload();
};

window.logout = function () {
  signOut(auth);
  location.reload();
};

onAuthStateChanged(auth, user => {
  isAdmin = !!user;
});

window.trocarAba = function(dispositivo){
  abaAtual = dispositivo;
  render(playersCache);
};

window.addPlayer = async function () {
  const nome = document.getElementById("nome")?.value.trim();
  const modo = document.getElementById("modo")?.value.trim();
  const categoria = document.getElementById("categoria")?.value;
  const tier = document.getElementById("tier")?.value;
  const dispositivo = document.getElementById("dispositivo")?.value;

  await addDoc(collection(db, "players"), {
    nome, modo, categoria, tier, dispositivo
  });
};

function formatTier(t){
  return t.replace("plus","+").replace("minus","-").toUpperCase();
}

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

onSnapshot(collection(db,"players"), snapshot => {
  playersCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  render(playersCache);
});
