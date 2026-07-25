import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {

    apiKey: "AIzaSyDhsV1GJeEvBGBAQmcUXQ8FDcAOXus4DP0",

    authDomain: "bmc-ranking.firebaseapp.com",

    projectId: "bmc-ranking",

    storageBucket: "bmc-ranking.firebasestorage.app",

    messagingSenderId: "81111080222",

    appId: "1:81111080222:web:3370c3289ab07b83493d0f"

};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


/* =========================================
   VARIÁVEIS
========================================= */

let players = [];

let filtroBusca = "";

let filtroDispositivo = "todos";

let filtroModo = "overall";


/* =========================================
   FIREBASE — CARREGAR PLAYERS
========================================= */

onSnapshot(
    collection(db, "players"),
    snapshot => {

        players = snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()

        }));

        aplicarFiltros();

    },

    error => {

        console.error(
            "Erro ao carregar players:",
            error
        );

    }
);


/* =========================================
   AVATAR DO PLAYER
========================================= */

function getPlayerAvatar(player, size = 100) {

    if (player.avatarUrl) {

        return player.avatarUrl;

    }

    return `https://tabavatars.net/avatar/?username=${encodeURIComponent(player.nome)}&platform=bedrock&size=${size}&type=helm`;

}

/* =========================================
   FORMATAR TIER
========================================= */

function formatTier(t) {

    if (!t) return "";

    return t
        .replace("plus", "+")
        .replace("minus", "-")
        .toUpperCase();

}


/* =========================================
   FILTROS
========================================= */

function aplicarFiltros() {

    let filtrados = [...players];


    /* =====================================
       PESQUISA
    ===================================== */

    if (filtroBusca) {

        filtrados = filtrados.filter(player => {

            const nome =
                player.nome || "";

            return nome
                .toLowerCase()
                .includes(
                    filtroBusca.toLowerCase()
                );

        });

    }


    /* =====================================
       DISPOSITIVO
    ===================================== */

    if (
        filtroDispositivo !== "todos"
    ) {

        filtrados = filtrados.filter(player =>

            player.dispositivo ===
            filtroDispositivo

        );

    }


    /* =====================================
       MODO
    ===================================== */

    if (
        filtroModo !== "overall"
    ) {

        filtrados = filtrados.filter(player =>

            player.modo ===
            filtroModo

        );

    }


    /* =====================================
       CALCULAR RANKING
    ===================================== */

    const ranking =
        calcularRanking(filtrados);


    /* =====================================
       ESTATÍSTICAS
    ===================================== */

    atualizarStats(ranking);


    /* =====================================
       TOP 3
    ===================================== */

    renderTop3(ranking);


    /* =====================================
       RANKING
    ===================================== */

    renderRankingList(ranking);

}


/* =========================================
   SISTEMA DE PONTOS
========================================= */

function getPoints(tier) {

    const map = {

        /* S */

        splus: 100,
        s: 95,
        sminus: 90,

        /* A */

        aplus: 85,
        a: 80,
        aminus: 75,

        /* B */

        bplus: 70,
        b: 65,
        bminus: 60,

        /* C */

        cplus: 55,
        c: 50,
        cminus: 45,

        /* D */

        dplus: 40,
        d: 35,
        dminus: 30

    };

    return map[tier] || 0;

}


/* =========================================
   BONUS DE ESPECIALISTA
========================================= */

function getEspecialistaBonus(tiers) {

    let bonus = 0;

    tiers.forEach(t => {

        if (t === "splus")
            bonus += 40;

        else if (t === "s")
            bonus += 35;

        else if (t === "sminus")
            bonus += 30;

        else if (t === "aplus")
            bonus += 25;

        else if (t === "a")
            bonus += 20;

        else if (t === "aminus")
            bonus += 15;

    });

    return bonus;

}


/* =========================================
   PENALIDADE POR MUITOS MODOS
========================================= */

function getDiminishingMultiplier(totalModos) {

    if (totalModos <= 2)
        return 1;

    if (totalModos === 3)
        return 0.95;

    if (totalModos === 4)
        return 0.90;

    if (totalModos === 5)
        return 0.85;

    if (totalModos >= 6)
        return 0.80;

    return 1;

}


/* =========================================
   CALCULAR RANKING
========================================= */

function calcularRanking(players) {

    const mapa = {};


    players.forEach(p => {

        if (
            !p.nome ||
            !p.modo ||
            !p.tier
        ) {

            return;

        }


        /* ================================
           CRIAR PLAYER
        ================================= */

        if (!mapa[p.nome]) {

            mapa[p.nome] = {

                nome: p.nome,

                dispositivo:
                    p.dispositivo ||
                    "mobile",

                /*
                Guarda o avatar personalizado.
                */

                avatar:
                    p.avatar ||
                    null,

                tiers: [],

                modos: new Set(),

                modoTiers: {},

                pontos: 0

            };

        }


        const player =
            mapa[p.nome];


        /* ================================
           ATUALIZAR AVATAR
        ================================= */

        if (p.avatar) {

            player.avatar =
                p.avatar;

        }


        /* ================================
           EVITAR DUPLICAR MODO
        ================================= */

        if (
            player.modoTiers[p.modo]
        ) {

            return;

        }


        /* ================================
           SALVAR MODO + TIER
        ================================= */

        player.modoTiers[p.modo] =
            p.tier;


        /* ================================
           ADICIONAR MODO
        ================================= */

        player.modos.add(
            p.modo
        );


        /* ================================
           ADICIONAR TIER
        ================================= */

        player.tiers.push(
            p.tier
        );


        /* ================================
           ADICIONAR PONTOS
        ================================= */

        player.pontos +=
            getPoints(p.tier);

    });


    const ranking =
        Object.values(mapa);


    /* =====================================
       CALCULAR SCORE
    ===================================== */

    ranking.forEach(player => {

        const bonusEspecialista =
            getEspecialistaBonus(
                player.tiers
            );


        const multiplier =
            getDiminishingMultiplier(
                player.modos.size
            );


        player.score =

            (
                player.pontos +
                bonusEspecialista
            )

            *

            multiplier;

    });


    /* =====================================
       ORDENAR
    ===================================== */

    ranking.sort(
        (a, b) =>
            b.score -
            a.score
    );


    return ranking;

}


/* =========================================
   TOP 3
========================================= */

function renderTop3(ranking) {

    const container =
        document.getElementById(
            "top-three-container"
        );


    if (!container)

        return;


    container.innerHTML = "";


    if (ranking.length === 0) {

        container.innerHTML =

            "<p>Nenhum player encontrado.</p>";

        return;

    }


    const top3 =
        ranking.slice(0, 3);


    top3.forEach(
        (player, index) => {


            const medalha =

                index === 0
                    ? "🥇"

                    : index === 1
                    ? "🥈"

                    : "🥉";


            const avatar =

                getPlayerAvatar(
                    player,
                    120
                );


            const icon =

                player.dispositivo ===
                "mobile"

                    ? "📱"

                    : player.dispositivo ===
                      "pc"

                    ? "⌨️"

                    : "🎮";


            container.innerHTML += `

                <div class="top-card place-${index + 1}">

                    <div class="top-medal">

                        ${medalha}

                    </div>


                    <img

                        src="${avatar}"

                        class="top-avatar"

                        alt="${player.nome}"

                        onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(player.nome)}/120';"

                    >


                    <h2>

                        ${player.nome}

                    </h2>


                    <p>

                        ${icon}

                    </p>


                    <span>

                        ${Math.floor(player.score)} pts

                    </span>

                </div>

            `;

        }

    );

}


/* =========================================
   RANKING COMPLETO
========================================= */

function renderRankingList(ranking) {

    const container =
        document.getElementById(
            "leaderboard-list"
        );


    if (!container)

        return;


    container.innerHTML = "";


    ranking.forEach(
        (player, index) => {


            const position =
                index + 1;


            const avatar =

                getPlayerAvatar(
                    player,
                    100
                );


            const icon =

                player.dispositivo ===
                "mobile"

                    ? '<i class="ri-smartphone-line"></i>'

                    : player.dispositivo ===
                      "pc"

                    ? '<i class="ri-keyboard-line"></i>'

                    : '<i class="ri-gamepad-line"></i>';


            const card =
                document.createElement(
                    "div"
                );


            card.className =

                `ranking-card rank-${position}`;


            card.style.cursor =
                "pointer";


            card.addEventListener(
                "click",
                () => {

                    abrirPlayerModal(
                        player
                    );

                }
            );


            card.innerHTML = `

                <div class="ranking-position">

                    #${position}

                </div>


                <img

                    src="${avatar}"

                    class="ranking-avatar"

                    alt="${player.nome}"

                    onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(player.nome)}/100';"

                >


                <div class="ranking-info">

                    <div class="ranking-name">

                        ${player.nome}

                    </div>


                    <div class="ranking-device">

                        ${icon}

                        <span>

                            ${player.dispositivo}

                        </span>

                    </div>


                    <div class="ranking-modes">

                        ${player.modos.size}
                        modos

                    </div>

                </div>


                <div class="ranking-tier tier-${player.tiers[0]}">

                    ${formatTier(
                        player.tiers[0]
                    )}

                </div>


                <div class="ranking-points">

                    ${Math.floor(
                        player.score
                    )}

                    pts

                </div>

            `;


            container.appendChild(
                card
            );

        }

    );

}


/* =========================================
   PESQUISA
========================================= */

const searchInput =

    document.querySelector(
        ".search-box input"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            filtroBusca =
                searchInput.value.trim();


            aplicarFiltros();

        }
    );

}


/* =========================================
   FILTRO DE DISPOSITIVO
========================================= */

const deviceFilter =

    document.getElementById(
        "device-filter"
    );


if (deviceFilter) {

    deviceFilter.addEventListener(
        "change",
        () => {

            filtroDispositivo =
                deviceFilter.value;


            aplicarFiltros();

        }
    );

}


/* =========================================
   FILTRO DE MODO
========================================= */

const modeFilter =

    document.getElementById(
        "mode-filter"
    );


if (modeFilter) {

    modeFilter.addEventListener(
        "change",
        () => {

            filtroModo =
                modeFilter.value;


            aplicarFiltros();

        }
    );

}


/* =========================================
   ESTATÍSTICAS
========================================= */

function atualizarStats(ranking) {

    const totalPlayers =

        document.getElementById(
            "total-players"
        );


    const mobileCount =

        document.getElementById(
            "mobile-count"
        );


    const pcCount =

        document.getElementById(
            "pc-count"
        );


    const controllerCount =

        document.getElementById(
            "controller-count"
        );


    /* =====================================
       TOTAL
    ===================================== */

    const nomes =

        new Set(

            ranking.map(
                player =>
                    player.nome
            )

        );


    if (totalPlayers) {

        totalPlayers.textContent =
            nomes.size;

    }


    /* =====================================
       MOBILE
    ===================================== */

    if (mobileCount) {

        mobileCount.textContent =

            ranking.filter(

                player =>

                    player.dispositivo ===
                    "mobile"

            ).length;

    }


    /* =====================================
       PC
    ===================================== */

    if (pcCount) {

        pcCount.textContent =

            ranking.filter(

                player =>

                    player.dispositivo ===
                    "pc"

            ).length;

    }


    /* =====================================
       CONTROLLER
    ===================================== */

    if (controllerCount) {

        controllerCount.textContent =

            ranking.filter(

                player =>

                    player.dispositivo ===
                    "controller"

            ).length;

    }

}


/* =========================================
   MODAL
========================================= */

function abrirPlayerModal(player) {

    const modal =

        document.getElementById(
            "player-modal"
        );


    const body =

        document.getElementById(
            "player-modal-body"
        );


    if (
        !modal ||
        !body
    )

        return;


    /* =====================================
       AVATAR
    ===================================== */

    const avatar =

        getPlayerAvatar(
            player,
            150
        );


    /* =====================================
       ÍCONE
    ===================================== */

    const deviceIcon =

        player.dispositivo ===
        "mobile"

            ? '<i class="ri-smartphone-line"></i>'

            : player.dispositivo ===
              "pc"

            ? '<i class="ri-keyboard-line"></i>'

            : '<i class="ri-gamepad-line"></i>';


    /* =====================================
       TIERS POR MODO
    ===================================== */

    let modosHTML = "";


    if (

        player.modoTiers &&

        Object.keys(
            player.modoTiers
        ).length > 0

    ) {


        modosHTML =

            Object.entries(
                player.modoTiers
            )

            .map(
                ([modo, tier]) => {

                    return `

                        <div class="player-mode-row">

                            <span class="mode-name">

                                ${modo}

                            </span>


                            <span class="player-tier tier-${tier}">

                                ${formatTier(
                                    tier
                                )}

                            </span>

                        </div>

                    `;

                }

            )

            .join("");

    }

    else {


        modosHTML = `

            <p class="no-modes">

                Nenhum modo encontrado.

            </p>

        `;

    }


    /* =====================================
       MODAL HTML
    ===================================== */

    body.innerHTML = `

        <div class="modal-player-header">

            <img

                src="${avatar}"

                class="modal-player-avatar"

                alt="${player.nome}"

                onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(player.nome)}/150';"

            >


            <div class="modal-player-info">

                <h2>

                    ${player.nome}

                </h2>


                <div class="modal-player-device">

                    ${deviceIcon}

                    <span>

                        ${player.dispositivo}

                    </span>

                </div>

            </div>

        </div>


        <div class="modal-player-score">

            <span>

                Pontuação Global

            </span>


            <strong>

                ${Math.floor(
                    player.score
                )}

                pts

            </strong>

        </div>


        <div class="modal-modes">

            <h3>

                Tiers por modo

            </h3>


            <div class="player-modes-list">

                ${modosHTML}

            </div>

        </div>

    `;


    modal.classList.add(
        "active"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================
   FECHAR MODAL
========================================= */

function fecharPlayerModal() {

    const modal =

        document.getElementById(
            "player-modal"
        );


    if (!modal)

        return;


    modal.classList.remove(
        "active"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================
   DISPONIBILIZAR PARA HTML
========================================= */

window.fecharPlayerModal =

    fecharPlayerModal;


/* =========================================
   BOTÃO FECHAR
========================================= */

const closeModalButton =

    document.querySelector(
        ".modal-close"
    );


if (closeModalButton) {

    closeModalButton.addEventListener(

        "click",

        fecharPlayerModal

    );

}


/* =========================================
   OVERLAY
========================================= */

const modalOverlay =

    document.querySelector(
        ".player-modal-overlay"
    );


if (modalOverlay) {

    modalOverlay.addEventListener(

        "click",

        fecharPlayerModal

    );

}


/* =========================================
   ESC FECHA MODAL
========================================= */

document.addEventListener(

    "keydown",

    event => {

        if (
            event.key ===
            "Escape"
        ) {

            fecharPlayerModal();

        }

    }

);