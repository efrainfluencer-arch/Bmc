// ================================
// 🔥 FIREBASE IMPORTS
// ================================
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
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================================
// 🔥 CONFIG (SEU FIREBASE)
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyDhsV1GJeEvBGBAQmcUXQ8FDcAOXus4DP0",
  authDomain: "bmc-ranking.firebaseapp.com",
  projectId: "bmc-ranking",
  storageBucket: "bmc-ranking.firebasestorage.app",
  messagingSenderId: "81111080222",
  appId: "1:81111080222:web:3370c3289ab07b83493d0f"
};


// ================================
// 🔥 INIT
// ================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================================
// 🔥 LOGIN
// ================================
window.loginFirebase = function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => alert("Logado 😈"))
    .catch(err => alert(err.message));
};


// ================================
// 🔥 VERIFICAR LOGIN
// ================================
onAuthStateChanged(auth, (user) => {
  const login = document.getElementById("login-screen");
  const painel = document.getElementById("painel");

  if (!login || !painel) return;

  if (user) {
    login.style.display = "none";
    painel.style.display = "block";
  } else {
    login.style.display = "flex";
    painel.style.display = "none";
  }
});


// ================================
// 🔥 LOGOUT
// ================================
window.logout = function () {
  signOut(auth);
};


// ================================
// 🔥 ADICIONAR PLAYER
// ================================
window.adicionarDoPainel = async function () {
  const nome = document.getElementById("nome").value;
  const modo = document.getElementById("modo").value;
  const categoria = document.getElementById("categoria").value;
  const tier = document.getElementById("tier").value;
  const pontos = document.getElementById("pontos").value;

  if (!nome || !modo) {
    alert("Preencha tudo!");
    return;
  }

  await addDoc(collection(db, "players"), {
    nome,
    modo,
    categoria,
    tier,
    pontos
  });

  limparCampos();
};


// ================================
// 🔥 REMOVER PLAYER
// ================================
window.removerPlayer = async function (id) {
  await deleteDoc(doc(db, "players", id));
};


// ================================
// 🔥 LIMPAR INPUTS
// ================================
function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("modo").value = "";
  document.getElementById("pontos").value = "";
}


// ================================
// 🔥 CRIAR CARD PLAYER
// ================================
function criarPlayer(nome, modo, pontos) {
  const div = document.createElement("div");
  div.className = "player";

  div.innerHTML = `
    <span class="nick">${nome}</span>
    <span class="modo">${modo}</span>
    <span class="pontos">${pontos || 0} pts</span>
  `;

  return div;
}


// ================================
// 🔥 RENDER TEMPO REAL
// ================================
onSnapshot(collection(db, "players"), (snapshot) => {

  // limpa tiers
  document.querySelectorAll(".players").forEach(el => el.innerHTML = "");

  const lista = document.getElementById("lista");
  if (lista) lista.innerHTML = "";

  snapshot.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;

    const tierId = `${p.categoria}-${p.tier}`;
    const container = document.getElementById(tierId);

    if (container) {
      container.appendChild(
        criarPlayer(p.nome, p.modo, p.pontos)
      );
    }

    // STAFF LIST
    if (lista) {
      const div = document.createElement("div");

      div.className = "player-staff";

      div.innerHTML = `
        <strong>${p.nome}</strong> - ${p.modo}
        <br>
        ${p.categoria} / ${p.tier}
        <br>
        ${p.pontos || 0} pts
        <br>
        <button onclick="removerPlayer('${id}')">Remover</button>
      `;

      lista.appendChild(div);
    }

  });

});