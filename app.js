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
  }catch(error){
    alert("Login inválido");
    console.error(error);
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
    if(loginScreen) loginScreen.style.display = "none";  
    if(painel) painel.style.display = "block";
  }else{
    isAdmin = false;
    if(loginScreen) loginScreen.style.display = "block";  
    if(painel) painel.style.display = "none";
  }
});

/* ABAS */
window.trocarAba = function(dispositivo){
  abaAtual = dispositivo;
  render(playersCache);
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
    dispositivo
  });
};

/* EDITAR */
window.editarPlayer = async function(id){
  const novoNome = prompt("Novo nome:");
  if(!novoNome) return;
  await updateDoc(doc(db,"players",id),{ nome: novoNome });
};

/* REMOVER */
window.removerPlayer = async function(id){
  await deleteDoc(doc(db,"players",id));
};

/* FORMAT TIER */
function formatTier(t){
  return t.replace("plus","+").replace("minus","-").toUpperCase();
}

/* PONTUAÇÃO */
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

/* TOP GLOBAL */
function renderTopGlobal(players){
  const global = document.getElementById("global");
  const mobile = document.getElementById("global-mobile");
  const pc = document.getElementById("global-pc");
  const controle = document.getElementById("global-controle");

  if(global) global.innerHTML = "";
  if(mobile) mobile.innerHTML = "";
  if(pc) pc.innerHTML = "";
  if(controle) controle.innerHTML = "";

  const map = {};
  players.forEach(p=>{
    if(!p.nome) return; // filtra players inválidos
    const keyPlayer = `${p.nome}-${p.dispositivo}`;
    if(!map[keyPlayer]){
      map[keyPlayer] = {  
        nome:p.nome,  
        pontos:0,  
        categorias:new Set(),  
        modos:new Set(),  
        tiers:[],  
        dispositivo:p.dispositivo || "mobile"  
      };
    }
    const player = map[keyPlayer];
    const pontosBase = getPoints(p.tier);
    const key = p.categoria + "-" + p.modo;
    if(player[key]) return;
    player[key] = true;
    player.pontos += pontosBase;
    player.categorias.add(p.categoria);
    player.modos.add(p.modo);
    player.tiers.push(p.tier);
  });

  const ranking = Object.values(map);
  ranking.forEach(p=>{
    const bonusCategoria = p.categorias.size * 10;  
    const bonusModo = p.modos.size * 5;  
    const highTierBonus = p.tiers.filter(t=>t.includes("s")).length * 5;  
    p.scoreFinal = p.pontos + bonusCategoria + bonusModo + highTierBonus;
  });

  ranking.sort((a,b)=>b.scoreFinal-a.scoreFinal);
  ranking.slice(0,20).forEach((p,i)=>{
    const medalha = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
    const icon = p.dispositivo==="mobile"?"📱":p.dispositivo==="pc"?"🖥️":"🎮";
    const li = document.createElement("li");
    li.innerHTML = `<strong>${medalha} ${p.nome}</strong><span>${Math.floor(p.scoreFinal)} pts ${icon}</span>`;
    global?.appendChild(li);
    const clone = li.cloneNode(true);
    if(p.dispositivo==="mobile") mobile?.appendChild(clone);
    if(p.dispositivo==="pc") pc?.appendChild(clone);
    if(p.dispositivo==="controle") controle?.appendChild(clone);
  });
}

/* RENDER */
function render(data){
  const container = document.getElementById("ranking");
  if(!container) return;
  container.innerHTML = "";
  const categorias = ["combate","projeteis","estrategia","skills"];
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
    section.innerHTML = `<h2>${cat.toUpperCase()}</h2>`;  

    tiers.forEach(t=>{  
      const tierDiv = document.createElement("div");  
      tierDiv.className = `tier tier-${t}`;  
      tierDiv.innerHTML = `<div class="tier-title">${formatTier(t)}</div>`;  

      const playersDiv = document.createElement("div");  
      playersDiv.className = "players";  

      const filtrados = data.filter(p =>  
        p.categoria===cat &&  
        p.tier===t &&  
        (abaAtual==="todos" || p.dispositivo===abaAtual)  
      );  

      if(filtrados.length>0){  
        filtrados.forEach(p=>{  
          if(!p.id) return; // filtra players sem id
          const icon = p.dispositivo==="mobile"?"📱":p.dispositivo==="pc"?"🖥️":"🎮";  
          const el = document.createElement("div");  
          el.className = "player";  
          el.innerHTML = `<div><strong>${p.nome}</strong><span>${p.modo} ${icon}</span></div>`+
            (isAdmin?`<div class="admin-buttons"><button onclick="editarPlayer('${p.id}')">✏️</button><button onclick="removerPlayer('${p.id}')">❌</button></div>`:"");
          playersDiv.appendChild(el);  
        });  
      }else{  
        playersDiv.innerHTML = `<p>Sem players</p>`;  
      }  

      tierDiv.appendChild(playersDiv);  
      section.appendChild(tierDiv);  
    });  

    container.appendChild(section);
  });
}

/* FIREBASE */
onSnapshot(collection(db,"players"), snapshot=>{
  // Atualiza playersCache filtrando docs inválidos
  playersCache = snapshot.docs
    .map(doc => {
      const data = doc.data();
      if(!data.nome) return null;
      return { id: doc.id, ...data };
    })
    .filter(p => p !== null);

  render(playersCache);
  renderTopGlobal(playersCache);
});

/* LOADING */
window.addEventListener("load",()=>{
  const loading = document.getElementById("loading");
  if(loading){
    loading.style.opacity = "0";
    setTimeout(()=>{ loading.style.display = "none"; },500);
  }
});
