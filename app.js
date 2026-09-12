// =========================================
// 🔥 FIREBASE
// =========================================

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


// =========================================
// ⚙️ CONFIGURAÇÃO FIREBASE
// =========================================

const firebaseConfig = {

    apiKey: "AIzaSyDhsV1GJeEvBGBAQmcUXQ8FDcAOXus4DP0",

    authDomain: "bmc-ranking.firebaseapp.com",

    projectId: "bmc-ranking",

    storageBucket: "bmc-ranking.firebasestorage.app",

    messagingSenderId: "81111080222",

    appId: "1:81111080222:web:3370c3289ab07b83493d0f"

};


// =========================================
// 🚀 INICIALIZAR FIREBASE
// =========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);

// =========================================
// 📦 VARIÁVEIS
// =========================================

let players = [];

let editandoPlayerId = null;

let avatarAtual = "";


// =========================================
// 🔐 LOGIN
// =========================================

window.login = async function(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("senha").value;


    if(!email || !senha){

        alert("Preencha email e senha.");

        return;

    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

        console.log("Login realizado com sucesso.");

    } catch(error) {

        console.error(
            "Erro ao fazer login:",
            error
        );

        alert(
            "Não foi possível fazer login. Verifique seu email e senha."
        );

    }

};


// =========================================
// 🚪 LOGOUT
// =========================================

window.logout = async function(){

    try {

        await signOut(auth);

        console.log("Logout realizado.");

    } catch(error) {

        console.error(
            "Erro ao sair:",
            error
        );

    }

};


// =========================================
// 👤 VERIFICAR AUTENTICAÇÃO
// =========================================

onAuthStateChanged(auth, user => {

    const loginScreen =
        document.getElementById("login-screen");

    const painel =
        document.getElementById("painel");


    if(user){

        console.log(
            "Usuário autenticado:",
            user.email
        );


        if(loginScreen){

            loginScreen.style.display =
                "none";

        }


        if(painel){

            painel.style.display =
                "block";

        }


        iniciarPlayers();


    } else {

        console.log(
            "Nenhum usuário autenticado."
        );


        if(loginScreen){

            loginScreen.style.display =
                "flex";

        }


        if(painel){

            painel.style.display =
                "none";

        }

    }

});


// =========================================
// 📡 CARREGAR PLAYERS EM TEMPO REAL
// =========================================

function iniciarPlayers(){

    const playersRef =
        collection(db, "players");


    onSnapshot(
        playersRef,

        snapshot => {

            players =
                snapshot.docs.map(doc => ({

                    id: doc.id,

                    ...doc.data()

                }));


            console.log(
                "Players carregados:",
                players
            );


            renderPlayers(players);

            atualizarStats(players);

        },

        error => {

            console.error(
                "Erro ao carregar players:",
                error
            );

        }

    );

}


// =========================================
// 🖼️ UPLOAD DO AVATAR
// =========================================

async function uploadAvatar(file, playerId){

    if(!file){
        console.log("Nenhum arquivo selecionado.");
        return "";
    }

    console.log("1. Arquivo selecionado:", file.name);
    console.log("2. Tipo:", file.type);
    console.log("3. Tamanho:", file.size);

    if(!file.type.startsWith("image/")){
        throw new Error(
            "O arquivo selecionado não é uma imagem."
        );
    }

    if(file.size > 5 * 1024 * 1024){
        throw new Error(
            "A imagem deve ter no máximo 5 MB."
        );
    }

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    const fileName =
        `${Date.now()}_${Math.random()
            .toString(36)
            .substring(2)}.${extension}`;

    const storagePath =
        `players/${playerId}/${fileName}`;

    const storageRef =
        ref(storage, storagePath);

    console.log("4. Caminho criado:", storagePath);

    try {

        console.log("5. Iniciando upload...");

        const uploadResult =
            await uploadBytes(
                storageRef,
                file
            );

        console.log(
            "6. Upload concluído:",
            uploadResult
        );

        console.log(
            "7. Buscando URL..."
        );

        const downloadURL =
            await getDownloadURL(
                storageRef
            );

        console.log(
            "8. URL recebida:",
            downloadURL
        );

        return downloadURL;

    } catch(error) {

        console.error(
            "❌ ERRO NO FIREBASE STORAGE:",
            error
        );

        console.error(
            "Código do erro:",
            error.code
        );

        console.error(
            "Mensagem:",
            error.message
        );

        throw error;

    }

}


// =========================================
// ➕ ADICIONAR PLAYER
// =========================================

window.addPlayer = async function(){

    const nomeInput =
        document.getElementById("nome");

    const avatarInput =
        document.getElementById("avatar");

    const dispositivoInput =
        document.getElementById("dispositivo");

    const modoInput =
        document.getElementById("modo");

    const tierInput =
        document.getElementById("tier");

    const posicaoInput =
        document.getElementById("posicao");

    const statusInput =
        document.getElementById("status");

    const tagInput =
        document.getElementById("discordTag");


    if(!nomeInput ||
       !dispositivoInput ||
       !modoInput ||
       !tierInput){

        alert(
            "Erro: campos do formulário não encontrados."
        );

        return;

    }


    const nome =
        nomeInput.value.trim();

    const dispositivo =
        dispositivoInput.value;

    const modo =
        modoInput.value;

    const tier =
        tierInput.value;

    const posicao =
        posicaoInput
            ? posicaoInput.value
            : "";

    const status =
        statusInput
            ? statusInput.value
            : "active";

    const discordTag =
        tagInput
            ? tagInput.value
            : "none";


    if(!nome){

        alert(
            "Digite o nickname do player."
        );

        return;

    }


    if(!modo){

        alert(
            "Selecione o modo."
        );

        return;

    }


    if(!tier){

        alert(
            "Selecione o tier."
        );

        return;

    }


    const file =
        avatarInput &&
        avatarInput.files.length > 0
            ? avatarInput.files[0]
            : null;


    try {

        // =====================================
        // 1️⃣ CRIAR PLAYER SEM AVATAR
        // =====================================

        const playerRef =
            await addDoc(
                collection(db, "players"),
                {

                    nome: nome,

                    dispositivo: dispositivo,

                    modo: modo,

                    tier: tier,

                    posicao: posicao,

                    avatarUrl: "",

                    status: status,

                    discordTag: discordTag,

                    criadoEm:
                        new Date()

                }
            );


        console.log(
            "Player criado:",
            playerRef.id
        );


        // =====================================
        // 2️⃣ UPLOAD DO AVATAR
        // =====================================

        if(file){

            const avatarUrl =
                await uploadAvatar(
                    file,
                    playerRef.id
                );


            // =================================
            // 3️⃣ SALVAR URL NO FIRESTORE
            // =================================

            await updateDoc(

                doc(
                    db,
                    "players",
                    playerRef.id
                ),

                {

                    avatarUrl:
                        avatarUrl

                }

            );

        }

        // =====================================
        // 4️⃣ SINCRONIZAR STATUS/TAG DO PLAYER
        // =====================================

        await sincronizarDadosDoPlayer(
            nome,
            {
                status: status,
                discordTag: discordTag
            }
        );


        alert(
            "Player adicionado com sucesso!"
        );


        limparFormulario();


    } catch(error) {

        console.error(
            "Erro ao adicionar player:",
            error
        );


        alert(
            "Erro ao adicionar player: "
            + error.message
        );

    }

};


// =========================================
// 🧹 LIMPAR FORMULÁRIO
// =========================================

function limparFormulario(){

    const form =
        document.getElementById(
            "player-form"
        );


    if(form){

        form.reset();

    }


    editandoPlayerId =
        null;

    avatarAtual =
        "";


    const button =
        form
            ? form.querySelector(
                "button"
            )
            : null;


    if(button){

        button.innerHTML =
            "Add Player";

        button.onclick =
            addPlayer;

    }

}


// =========================================
// 🔄 SINCRONIZAR DADOS DO PLAYER
// =========================================

async function sincronizarDadosDoPlayer(nome, dados){

    const snapshot =
        await getDocs(
            collection(db, "players")
        );

    const atualizacoes = [];

    snapshot.docs.forEach(snapshotDoc => {

        const player = snapshotDoc.data();

        if(
            player.nome &&
            player.nome.toLowerCase() === nome.toLowerCase()
        ){

            atualizacoes.push(
                updateDoc(
                    doc(db, "players", snapshotDoc.id),
                    dados
                )
            );

        }

    });

    await Promise.all(atualizacoes);
}


// =========================================
// 🏷️ FORMATAR TAG DISCORD
// =========================================

function formatDiscordTag(tag){

    const nomes = {
        member: "Member",
        tester: "Tester",
        media: "Media",
        famous: "Famous",
        mod: "Mod",
        admin: "Admin",
        owner: "Owner"
    };

    return nomes[tag] || tag;
}


// =========================================
// 🎨 ESTILOS DAS TAGS DO STAFF
// =========================================

function garantirEstilosMetaStaff(){

    if(document.getElementById("bmc-staff-meta-styles"))
        return;

    const style = document.createElement("style");

    style.id = "bmc-staff-meta-styles";

    style.textContent = `
        .player-meta-tags {
            display:flex;
            align-items:center;
            justify-content:center;
            gap:6px;
            flex-wrap:wrap;
            margin-top:10px;
        }

        .player-status,
        .player-discord-tag {
            display:inline-flex;
            align-items:center;
            padding:4px 8px;
            border-radius:999px;
            font-size:10px;
            font-weight:700;
            line-height:1;
        }

        .player-status.active {
            color:#22c55e;
            background:rgba(34,197,94,.12);
        }

        .player-status.inactive {
            color:#9ca3af;
            background:rgba(156,163,175,.12);
        }

        .player-discord-tag {
            color:#d1d5db;
            background:rgba(255,255,255,.07);
        }

        .player-discord-tag.tag-admin { color:#ef4444; background:rgba(239,68,68,.12); }
        .player-discord-tag.tag-owner { color:#facc15; background:rgba(250,204,21,.12); }
        .player-discord-tag.tag-tester { color:#f97316; background:rgba(249,115,22,.12); }
        .player-discord-tag.tag-media { color:#a855f7; background:rgba(168,85,247,.12); }
        .player-discord-tag.tag-famous { color:#ec4899; background:rgba(236,72,153,.12); }
        .player-discord-tag.tag-mod { color:#3b82f6; background:rgba(59,130,246,.12); }
        .player-discord-tag.tag-member { color:#9ca3af; background:rgba(156,163,175,.12); }
    `;

    document.head.appendChild(style);
}


garantirEstilosMetaStaff();


// =========================================
// 📋 RENDERIZAR PLAYERS
// =========================================

function renderPlayers(lista){

    const container =
        document.getElementById(
            "ranking"
        );


    if(!container){

        return;

    }


    container.innerHTML =
        "";


    if(lista.length === 0){

        container.innerHTML = `

            <p class="no-players">

                Nenhum player encontrado.

            </p>

        `;

        return;

    }


    lista.forEach(player => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "player-card";


        // =====================================
        // AVATAR
        // =====================================
console.log("PLAYER:", player.nome);
console.log("AVATAR URL:", player.avatarUrl);
      
        const avatar =
    player.avatarUrl
        ? player.avatarUrl
        : `https://tabavatars.net/avatar/?username=${encodeURIComponent(player.nome)}&platform=bedrock&size=150&type=helm`;


        // =====================================
        // ÍCONE DISPOSITIVO
        // =====================================

        const deviceIcon =

            player.dispositivo === "mobile"

                ? '<i class="ri-smartphone-line"></i>'

                : player.dispositivo === "pc"

                ? '<i class="ri-keyboard-line"></i>'

                : '<i class="ri-gamepad-line"></i>';


        // =====================================
        // CARD
        // =====================================

        card.innerHTML = `

            <div class="player-header">

                <span
                    class="player-tier tier-${player.tier}"
                >

                    ${formatTier(player.tier)}

                </span>


                <span class="device-icon">

                    ${deviceIcon}

                </span>

            </div>


            <div class="player-head">

                <img
                    src="${avatar}"
                    alt="${player.nome}"
                >

            </div>


            <h3 class="player-name">

                ${player.nome}

            </h3>


            <p class="player-mode">

                ${player.modo}

            </p>

            <div class="player-meta-tags">
                <span class="player-status ${player.status === "inactive" ? "inactive" : "active"}">
                    ${player.status === "inactive" ? "● Inativo" : "● Ativo"}
                </span>
                ${player.discordTag && player.discordTag !== "none" ? `
                    <span class="player-discord-tag tag-${player.discordTag}">
                        ${formatDiscordTag(player.discordTag)}
                    </span>
                ` : ""}
            </div>


            <div class="player-actions">

                <button
                    class="edit-btn"
                    onclick="editarPlayer('${player.id}')"
                    title="Editar"
                >

                    <i class="ri-edit-line"></i>

                </button>


                <button
                    class="delete-btn"
                    onclick="excluirPlayer('${player.id}')"
                    title="Excluir"
                >

                    <i class="ri-delete-bin-line"></i>

                </button>

            </div>

        `;


        container.appendChild(
            card
        );

    });

}


// =========================================
// 🔎 FILTRAR PLAYERS
// =========================================

window.filtrarPlayers = function(){

    const input =
        document.getElementById(
            "busca"
        );


    if(!input){

        return;

    }


    const termo =
        input.value
            .trim()
            .toLowerCase();


    const filtrados =
        players.filter(player =>

            player.nome
                .toLowerCase()
                .includes(
                    termo
                )

        );


    renderPlayers(
        filtrados
    );

};


// =========================================
// ✏️ EDITAR PLAYER
// =========================================

window.editarPlayer = function(id){

    const player =
        players.find(
            p => p.id === id
        );


    if(!player){

        alert(
            "Player não encontrado."
        );

        return;

    }


    editandoPlayerId =
        id;


    avatarAtual =
        player.avatarUrl || "";


    document.getElementById(
        "nome"
    ).value =
        player.nome || "";


    document.getElementById(
        "dispositivo"
    ).value =
        player.dispositivo || "mobile";


    document.getElementById(
        "modo"
    ).value =
        player.modo || "BedFight";


    document.getElementById(
        "tier"
    ).value =
        player.tier || "dminus";


    const posicao =
        document.getElementById(
            "posicao"
        );


    if(posicao){

        posicao.value =
            player.posicao || "";

    }

    const status =
        document.getElementById("status");

    if(status){
        status.value =
            player.status || "active";
    }

    const discordTag =
        document.getElementById("discordTag");

    if(discordTag){
        discordTag.value =
            player.discordTag || "none";
    }


    const button =
        document.querySelector(
            "#player-form button"
        );


    if(button){

        button.innerHTML =
            "Salvar alterações";


        button.onclick =
            salvarEdicao;

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

};


// =========================================
// 💾 SALVAR EDIÇÃO
// =========================================


window.salvarEdicao = async function(){

    if(!editandoPlayerId){

        return;

    }


    const nome =
        document.getElementById(
            "nome"
        ).value.trim();


    const dispositivo =
        document.getElementById(
            "dispositivo"
        ).value;


    const modo =
        document.getElementById(
            "modo"
        ).value;


    const tier =
        document.getElementById(
            "tier"
        ).value;


    const posicaoInput =
        document.getElementById(
            "posicao"
        );


    const posicao =
        posicaoInput
            ? posicaoInput.value
            : "";

    const statusInput =
        document.getElementById("status");

    const tagInput =
        document.getElementById("discordTag");

    const status =
        statusInput
            ? statusInput.value
            : "active";

    const discordTag =
        tagInput
            ? tagInput.value
            : "none";


    const avatarInput =
        document.getElementById(
            "avatar"
        );


    const file =
        avatarInput &&
        avatarInput.files.length > 0
            ? avatarInput.files[0]
            : null;


    try {

        let avatarUrl =
            avatarAtual;


        // =====================================
        // NOVO AVATAR
        // =====================================

        if(file){

            avatarUrl =
                await uploadAvatar(
                    file,
                    editandoPlayerId
                );

        }


        // =====================================
        // ATUALIZAR FIRESTORE
        // =====================================

        await updateDoc(

            doc(
                db,
                "players",
                editandoPlayerId
            ),

            {

                nome: nome,

                dispositivo:
                    dispositivo,

                modo: modo,

                tier: tier,

                posicao:
                    posicao,

                avatarUrl:
                    avatarUrl

            }

        );


        alert(
            "Player atualizado com sucesso!"
        );


        limparFormulario();


    } catch(error) {

        console.error(
            "Erro ao editar player:",
            error
        );


        alert(
            "Erro ao editar player: "
            + error.message
        );

    }

};


// =========================================
// 🗑️ EXCLUIR PLAYER
// =========================================

window.excluirPlayer = async function(id){

    const player =
        players.find(
            p => p.id === id
        );


    if(!player){

        return;

    }


    const confirmar =
        confirm(

            `Tem certeza que deseja excluir ${player.nome}?`

        );


    if(!confirmar){

        return;

    }


    try {

        await deleteDoc(

            doc(
                db,
                "players",
                id
            )

        );


        alert(
            "Player excluído com sucesso!"
        );


    } catch(error) {

        console.error(
            "Erro ao excluir player:",
            error
        );


        alert(
            "Erro ao excluir player: "
            + error.message
        );

    }

};


// =========================================
// 📊 ATUALIZAR ESTATÍSTICAS
// =========================================

function atualizarStats(players){

    const playersCount =
        document.getElementById(
            "players-count"
        );


    const testsCount =
        document.getElementById(
            "tests-count"
        );


    // =====================================
    // PLAYERS ÚNICOS
    // =====================================

    const nomes =
        new Set(

            players.map(
                player =>
                    player.nome
            )

        );


    if(playersCount){

        playersCount.textContent =
            nomes.size;

    }


    // =====================================
    // TESTES
    // =====================================

    if(testsCount){

        testsCount.textContent =
            players.length;

    }

}


// =========================================
// 🏷️ FORMATAR TIER
// =========================================

function formatTier(tier){

    if(!tier){

        return "";

    }


    return tier

        .replace(
            "plus",
            "+"
        )

        .replace(
            "minus",
            "-"
        )

        .toUpperCase();

}


// =========================================
// 🛡️ LOG
// =========================================

console.log(
    "BMC Staff App iniciado."
);