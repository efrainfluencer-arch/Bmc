import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    getDoc,
    updateDoc
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyDhsV1GJeEvBGBAQmcUXQ8FDcAOXus4DP0",

    authDomain:
        "bmc-ranking.firebaseapp.com",

    projectId:
        "bmc-ranking",

    storageBucket:
        "bmc-ranking.firebasestorage.app",

    messagingSenderId:
        "81111080222",

    appId:
        "1:81111080222:web:3370c3289ab07b83493d0f"

};


const app =
    initializeApp(firebaseConfig);

const db =
    getFirestore(app);

const auth =
    getAuth(app);


/* =========================================
   VARIÁVEIS
========================================= */

let players = [];

let filtroBusca = "";

let filtroDispositivo = "todos";

let filtroModo = "overall";

let usuarioAtual = null;

let podeEditarPosicoes = false;


/* =========================================
   BÔNUS DE POSIÇÃO
   SOMENTE MODOS ESPECÍFICOS
========================================= */

const BONUS_POSICAO_TIER = {

    1: 3,

    2: 2,

    3: 1

};


/* =========================================
   MODOS DO BMC
========================================= */

const MODOS = [

    "BedFight",
    "Boxing",
    "Build UHC",
    "Mid Fight",
    "NodeBuff",
    "SkyWars",
    "Sumo",
    "The Bridge"

];


/* =========================================
   ORDEM DAS TIERS
========================================= */

const ORDEM_TIER = {

    splus: 1,
    s: 2,
    sminus: 3,

    aplus: 4,
    a: 5,
    aminus: 6,

    bplus: 7,
    b: 8,
    bminus: 9,

    cplus: 10,
    c: 11,
    cminus: 12,

    dplus: 13,
    d: 14,
    dminus: 15

};


/* =========================================
   FIREBASE — CARREGAR PLAYERS
========================================= */

onSnapshot(

    collection(db, "players"),

    snapshot => {

        players =
            snapshot.docs.map(
                docSnapshot => ({

                    id:
                        docSnapshot.id,

                    ...docSnapshot.data()

                })
            );


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
   VERIFICAR USUÁRIO
========================================= */

onAuthStateChanged(

    auth,

    async user => {

        usuarioAtual = user;

        podeEditarPosicoes = false;


        if (!user) {

            console.log(
                "Nenhum usuário logado."
            );

            aplicarFiltros();

            return;

        }


        console.log(
            "Usuário logado:",
            user.email
        );


        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(
                    userRef
                );


            if (
                userSnap.exists()
            ) {

                const dados =
                    userSnap.data();


                const role =
                    dados.role;


                if (
                    role === "tester" ||
                    role === "staff"
                ) {

                    podeEditarPosicoes =
                        true;

                }

            }


            console.log(
                "Pode editar posições:",
                podeEditarPosicoes
            );


        } catch (error) {

            console.error(
                "Erro ao verificar cargo:",
                error
            );

        }


        aplicarFiltros();

    }

);


/* =========================================
   AVATAR
========================================= */

function getPlayerAvatar(
    player,
    size = 100
) {

    if (
        player.avatarUrl
    ) {

        return player.avatarUrl;

    }


    return `https://tabavatars.net/avatar/?username=${encodeURIComponent(
        player.nome || ""
    )}&platform=bedrock&size=${size}&type=helm`;

}


/* =========================================
   FORMATAR TIER
========================================= */

function formatTier(t) {

    if (!t)

        return "";


    return t
        .toString()
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


/* =========================================
   NORMALIZAR TIER
========================================= */

function normalizarTier(tier) {

    if (!tier)

        return "";


    return tier
        .toString()
        .trim()
        .toLowerCase();

}


/* =========================================
   SISTEMA DE PONTOS
   SISTEMA ORIGINAL EQUILIBRADO
========================================= */

function getPoints(tier) {

    const map = {

        /* S */

        splus: 40,
        s: 36,
        sminus: 32,


        /* A */

        aplus: 26,
        a: 23,
        aminus: 20,


        /* B */

        bplus: 14,
        b: 11,
        bminus: 9,


        /* C */

        cplus: 6,
        c: 4,
        cminus: 3,


        /* D */

        dplus: 2,
        d: 1,
        dminus: 0

    };


    return map[
        normalizarTier(tier)
    ] || 0;

}


/* =========================================
   BÔNUS DE ESPECIALISTA
   SOMENTE GLOBAL
========================================= */

function getEspecialistaBonus(
    tiers
) {

    let bonus = 0;


    tiers.forEach(
        tier => {

            tier =
                normalizarTier(
                    tier
                );


            if (
                tier === "splus"
            )

                bonus += 16;


            else if (
                tier === "s"
            )

                bonus += 13;


            else if (
                tier === "sminus"
            )

                bonus += 10;


            else if (
                tier === "aplus"
            )

                bonus += 6;


            else if (
                tier === "a"
            )

                bonus += 5;


            else if (
                tier === "aminus"
            )

                bonus += 4;

        }
    );


    return bonus;

}


/* =========================================
   PENALIDADE POR MUITOS MODOS
   SOMENTE GLOBAL
========================================= */

function getDiminishingMultiplier(
    totalModos
) {

    if (
        totalModos <= 2
    )

        return 1;


    if (
        totalModos === 3
    )

        return 0.95;


    if (
        totalModos === 4
    )

        return 0.90;


    if (
        totalModos === 5
    )

        return 0.85;


    if (
        totalModos >= 6
    )

        return 0.80;


    return 1;

}


/* =========================================
   OBTER POSIÇÃO SALVA
========================================= */

function getPosicaoSalva(
    player,
    modo
) {

    /*
       Formato atual:

       posicoes: {
           BedFight: 1,
           Boxing: 2
       }
    */

    if (
        player.posicoes &&
        typeof player.posicoes === "object"
    ) {

        const valor =
            player.posicoes[modo];


        if (
            valor !== undefined &&
            valor !== null
        ) {

            const numero =
                Number(valor);


            if (
                Number.isInteger(
                    numero
                )
            ) {

                return numero;

            }

        }

    }


    /*
       Compatibilidade com
       sistema antigo.
    */

    if (
        player.modo === modo &&
        player.posicao !== undefined &&
        player.posicao !== null
    ) {

        const numero =
            Number(
                player.posicao
            );


        if (
            Number.isInteger(
                numero
            )
        ) {

            return numero;

        }

    }


    return null;

}


/* =========================================
   CALCULAR POSIÇÕES DA MESMA TIER
========================================= */

function calcularPosicoesPorTier(
    lista,
    modo
) {

    const grupos = {};


    /*
       Separar jogadores por tier.
    */

    lista.forEach(
        player => {

            const tier =
                normalizarTier(
                    player.tier
                );


            if (!tier)

                return;


            if (!grupos[tier]) {

                grupos[tier] = [];

            }


            grupos[tier].push(
                player
            );

        }
    );


    /*
       Processar cada tier.
    */

    Object.values(
        grupos
    ).forEach(
        grupo => {

            /*
               Se só existe um jogador,
               não existe posição manual.
            */

            if (
                grupo.length <= 1
            ) {

                grupo.forEach(
                    player => {

                        player.posicaoTier =
                            null;

                        player.bonusPosicao =
                            0;

                        player.temPosicaoEditavel =
                            false;

                    }
                );

                return;

            }


            /*
               Ordenação:

               1. posição salva
               2. nome
               3. ID
            */

            grupo.sort(
                (a, b) => {

                    const posA =
                        getPosicaoSalva(
                            a,
                            modo
                        );


                    const posB =
                        getPosicaoSalva(
                            b,
                            modo
                        );


                    const valorA =
                        posA === null
                            ? 999999
                            : posA;


                    const valorB =
                        posB === null
                            ? 999999
                            : posB;


                    if (
                        valorA !==
                        valorB
                    ) {

                        return (
                            valorA -
                            valorB
                        );

                    }


                    const nomeA =
                        (
                            a.nome ||
                            ""
                        ).toLowerCase();


                    const nomeB =
                        (
                            b.nome ||
                            ""
                        ).toLowerCase();


                    if (
                        nomeA !==
                        nomeB
                    ) {

                        return nomeA
                            .localeCompare(
                                nomeB
                            );

                    }


                    return (
                        a.id || ""
                    ).localeCompare(
                        b.id || ""
                    );

                }
            );


            /*
               Atribuir posição
               e bônus.
            */

            grupo.forEach(
                (player, index) => {

                    player.posicaoTier =
                        index + 1;


                    player.bonusPosicao =
                        BONUS_POSICAO_TIER[
                            index + 1
                        ] || 0;


                    /*
                       Só é editável se:

                       - usuário for Staff/Tester
                       - houver mais de um
                         jogador na tier
                    */

                    player.temPosicaoEditavel =
                        podeEditarPosicoes;

                }
            );

        }
    );

    }

 /* =========================================
   CALCULAR POSIÇÕES DO OVERALL
========================================= */

function calcularPosicoesOverall(lista) {

    const grupos = {};

    /*
       Separar jogadores pela mesma
       pontuação final.
    */

    lista.forEach(player => {

        const score = Number(player.score);

        if (!Number.isFinite(score))
            return;

        /*
           Usamos o score como chave.
        */

        const chave = score.toFixed(6);

        if (!grupos[chave]) {

            grupos[chave] = [];

        }

        grupos[chave].push(player);

    });


    /*
       Processar cada grupo de empate.
    */

    Object.values(grupos).forEach(grupo => {

        /*
           Se só existe um jogador
           com aquela pontuação,
           não existe posição editável.
        */

        if (grupo.length <= 1) {

            grupo.forEach(player => {

                player.posicaoOverall = null;

                player.temPosicaoOverallEditavel = false;

            });

            return;

        }


        /*
           Ordenação inicial:

           1. posição Overall salva
           2. quantidade de modos
           3. nome
           4. ID
        */

        grupo.sort((a, b) => {

            const posA =
                getPosicaoSalva(
                    a,
                    "overall"
                );

            const posB =
                getPosicaoSalva(
                    b,
                    "overall"
                );


            const valorA =
                posA === null
                    ? 999999
                    : posA;

            const valorB =
                posB === null
                    ? 999999
                    : posB;


            if (
                valorA !== valorB
            ) {

                return valorA - valorB;

            }


            /*
               Se ninguém tiver posição salva,
               mantém o desempate antigo:
               mais modos primeiro.
            */

            if (
                a.modos.size !==
                b.modos.size
            ) {

                return (
                    b.modos.size -
                    a.modos.size
                );

            }


            const nomeA =
                (a.nome || "").toLowerCase();

            const nomeB =
                (b.nome || "").toLowerCase();


            if (
                nomeA !== nomeB
            ) {

                return nomeA.localeCompare(
                    nomeB
                );

            }


            return (
                a.id || ""
            ).localeCompare(
                b.id || ""
            );

        });


        /*
           Atribuir posição dentro
           do empate.
        */

        grupo.forEach(
            (player, index) => {

                player.posicaoOverall =
                    index + 1;


                /*
                   Só aparece o lápis
                   se houver empate.
                */

                player.temPosicaoOverallEditavel =
                    podeEditarPosicoes;

            }
        );

    });

}


/* =========================================
   STATUS / TAG DISCORD
========================================= */

function getStatus(player) {
    return player.status === "inactive"
        ? "inactive"
        : "active";
}

function formatDiscordTag(tag) {
    const nomes = {
        member: "Member",
        tester: "Tester",
        media: "Media",
        famous: "Famous",
        mod: "Mod",
        admin: "Admin",
        owner: "Owner"
    };

    return nomes[tag] || "";
}

function getDiscordTagClass(tag) {
    return tag && tag !== "none"
        ? `tag-${tag}`
        : "";
}

function getDiscordTagHTML(player) {
    if (!player.discordTag || player.discordTag === "none") {
        return "";
    }

    const label = formatDiscordTag(player.discordTag);

    if (!label) return "";

    return `
        <span class="leaderboard-discord-tag ${getDiscordTagClass(player.discordTag)}">
            ${label}
        </span>
    `;
}

function garantirEstilosTags() {
    if (document.getElementById("bmc-player-meta-styles")) return;

    const style = document.createElement("style");
    style.id = "bmc-player-meta-styles";
    style.textContent = `
        .leaderboard-player-meta {
            display:flex;
            align-items:center;
            gap:7px;
            flex-wrap:wrap;
            margin-top:6px;
        }
        .leaderboard-status,
        .leaderboard-discord-tag {
            display:inline-flex;
            align-items:center;
            gap:4px;
            padding:4px 8px;
            border-radius:999px;
            font-size:10px;
            font-weight:700;
            line-height:1;
        }
        .leaderboard-status.active {
            color:#22c55e;
            background:rgba(34,197,94,.12);
        }
        .leaderboard-status.inactive {
            color:#9ca3af;
            background:rgba(156,163,175,.12);
        }
        .leaderboard-discord-tag {
            color:#d1d5db;
            background:rgba(255,255,255,.07);
        }
        .leaderboard-discord-tag.tag-admin { color:#ef4444; background:rgba(239,68,68,.12); }
        .leaderboard-discord-tag.tag-owner { color:#facc15; background:rgba(250,204,21,.12); }
        .leaderboard-discord-tag.tag-tester { color:#f97316; background:rgba(249,115,22,.12); }
        .leaderboard-discord-tag.tag-media { color:#a855f7; background:rgba(168,85,247,.12); }
        .leaderboard-discord-tag.tag-famous { color:#ec4899; background:rgba(236,72,153,.12); }
        .leaderboard-discord-tag.tag-mod { color:#3b82f6; background:rgba(59,130,246,.12); }
        .leaderboard-discord-tag.tag-member { color:#9ca3af; background:rgba(156,163,175,.12); }
        .ranking-card.player-inactive { opacity:.62; }
    `;
    document.head.appendChild(style);
}


garantirEstilosTags();


/* =========================================
   CALCULAR RANKING
========================================= */

function calcularRanking(
    lista
) {

    /* =====================================
       RANKING DE MODO ESPECÍFICO
    ===================================== */

    if (
        filtroModo !== "overall"
    ) {

        const rankingModo =

            lista

                .filter(
                    player =>
                        player.nome &&
                        player.modo &&
                        player.tier
                )

                .map(
                    player => ({

                        ...player,

                        tier:
                            normalizarTier(
                                player.tier
                            ),

                        score:
                            getPoints(
                                player.tier
                            ),

                        modoTiers: {

                            [player.modo]:
                                normalizarTier(
                                    player.tier
                                )

                        },

                        tiers: [

                            normalizarTier(
                                player.tier
                            )

                        ],

                        modos:
                            new Set([
                                player.modo
                            ])

                    })
                );


        /*
           Calcular posições somente
           entre jogadores da mesma tier.
        */

        calcularPosicoesPorTier(
            rankingModo,
            filtroModo
        );


        /*
           Ordenação principal:

           1. Tier
           2. Posição dentro da tier

           A posição NÃO permite
           ultrapassar outra tier.
        */

        rankingModo.sort(
            (a, b) => {

                const tierA =
                    ORDEM_TIER[
                        normalizarTier(
                            a.tier
                        )
                    ] || 999;


                const tierB =
                    ORDEM_TIER[
                        normalizarTier(
                            b.tier
                        )
                    ] || 999;


                if (
                    tierA !==
                    tierB
                ) {

                    return (
                        tierA -
                        tierB
                    );

                }


                return (

                    (
                        a.posicaoTier ||
                        999999
                    )

                    -

                    (
                        b.posicaoTier ||
                        999999
                    )

                );

            }
        );


        /*
           Pontuação do modo:

           Pontos da tier
           +
           bônus de posição.

           SEM bônus de especialista
           e SEM multiplicador.
        */

        rankingModo.forEach(
            player => {

                player.score =

                    getPoints(
                        player.tier
                    )

                    +

                    (
                        player.bonusPosicao ||
                        0
                    );

            }
        );


        return rankingModo;

    }


    /* =====================================
       RANKING GLOBAL
    ===================================== */

    const mapa = {};


    lista.forEach(
        p => {

            if (
                !p.nome ||
                !p.modo ||
                !p.tier
            ) {

                return;

            }


            /*
               Criar player.
            */

            if (
                !mapa[p.nome]
            ) {

                mapa[p.nome] = {
    id:
        p.id,

    nome:
        p.nome,

    dispositivo:
        p.dispositivo ||
        "mobile",

    avatarUrl:
        p.avatarUrl ||
        "",

    tiers: [],

    modos:
        new Set(),

    modoTiers: {},

    pontos: 0
};

            }


            const player =
                mapa[p.nome];


            /*
               Avatar.
            */

            if (
                p.avatarUrl
            ) {

                player.avatarUrl =
                    p.avatarUrl;

            }

            if (p.status === "inactive") {
                player.status = "inactive";
            }

            if (
                (!player.discordTag || player.discordTag === "none") &&
                p.discordTag &&
                p.discordTag !== "none"
            ) {
                player.discordTag = p.discordTag;
            }


            /*
               Não duplicar o mesmo
               modo do mesmo jogador.
            */

            if (
                player.modoTiers[
                    p.modo
                ]
            ) {

                return;

            }


            const tier =
                normalizarTier(
                    p.tier
                );


            player.modoTiers[
                p.modo
            ] =
                tier;


            player.modos.add(
                p.modo
            );


            player.tiers.push(
                tier
            );


            player.pontos +=
                getPoints(
                    tier
                );

        }
    );


    const ranking =
        Object.values(
            mapa
        );


    /*
       Calcular score global.

       IMPORTANTE:

       Pontos = sistema antigo.

       Bônus especialista = SIM.

       Multiplicador por quantidade
       de modos = SIM.

       Bônus de posição = NÃO.
    */

    ranking.forEach(
        player => {

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

        }
    );


    /*
   ======================================
   POSIÇÕES DO OVERALL
   ======================================

   Jogadores com pontuação diferente
   continuam sendo ordenados normalmente.

   Jogadores com EXATAMENTE a mesma
   pontuação podem ter posição manual.
*/

calcularPosicoesOverall(
    ranking
);


/*
   ======================================
   ORDENAR OVERALL
   ======================================
*/

ranking.sort(
    (a, b) => {

        /*
           Primeiro:
           maior pontuação.
        */

        const diferenca =
            b.score -
            a.score;


        if (
            diferenca !== 0
        ) {

            return diferenca;

        }


        /*
           Se empatar em pontos:
           posição manual do Overall.
        */

        const posA =
            a.posicaoOverall === null ||
            a.posicaoOverall === undefined
                ? 999999
                : a.posicaoOverall;


        const posB =
            b.posicaoOverall === null ||
            b.posicaoOverall === undefined
                ? 999999
                : b.posicaoOverall;


        if (
            posA !== posB
        ) {

            return posA - posB;

        }


        /*
           Fallback:
           mais modos primeiro.
        */

        return (
            b.modos.size -
            a.modos.size
        );

    }
);


    return ranking;

}


/* =========================================
   FILTROS
========================================= */

function aplicarFiltros() {

    let filtrados =
        [...players];


    /*
       PESQUISA
    */

    if (
        filtroBusca
    ) {

        filtrados =
            filtrados.filter(
                player => {

                    const nome =
                        player.nome ||
                        "";


                    return nome
                        .toLowerCase()
                        .includes(
                            filtroBusca
                                .toLowerCase()
                        );

                }
            );

    }


/*
       DISPOSITIVO
    */

    if (
        filtroDispositivo !==
        "todos"
    ) {

        filtrados =
            filtrados.filter(
                player =>

                    player.dispositivo ===
                    filtroDispositivo

            );

    }


    /*
       MODO
    */

    if (
        filtroModo !==
        "overall"
    ) {

        filtrados =
            filtrados.filter(
                player =>

                    player.modo ===
                    filtroModo

            );

    }


    const ranking =
        calcularRanking(
            filtrados
        );


    atualizarStats(
        ranking
    );


    renderTop3(
        ranking
    );


    renderRankingList(
        ranking
    );

}

/* =========================================
   TOP 3
========================================= */

function renderTop3(
    ranking
) {

    const container =
        document.getElementById(
            "top-three-container"
        );


    if (!container)

        return;


    container.innerHTML =
        "";


    if (
        ranking.length === 0
    ) {

        container.innerHTML =
            "<p>Nenhum player encontrado.</p>";

        return;

    }


    const top3 =
        ranking.slice(
            0,
            3
        );


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

                <div
                    class="top-card place-${index + 1}${getStatus(player) === "inactive" ? " player-inactive" : ""}"
                >

                    <div class="top-medal">

                        ${medalha}

                    </div>


                    <img
                        src="${avatar}"
                        class="top-avatar"
                        alt="${player.nome}"

                        onerror="
                            this.onerror=null;
                            this.src='https://minotar.net/avatar/${encodeURIComponent(
                                player.nome
                            )}/120';
                        "
                    >


                    <h2>

                        ${player.nome}

                    </h2>


                    <p>

                        ${icon}

                    </p>


                    <span>

                        ${Math.floor(
                            player.score
                        )}

                        pts

                    </span>

                </div>

            `;

        }
    );

}


/* =========================================
   RANKING COMPLETO
========================================= */

function renderRankingList(
    ranking
) {

    const container =
        document.getElementById(
            "leaderboard-list"
        );


    if (!container)

        return;


    container.innerHTML =
        "";


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
                `ranking-card rank-${position}` +
                (getStatus(player) === "inactive"
                    ? " player-inactive"
                    : "");


            card.style.cursor =
                "pointer";


            /*
               Abrir modal.
            */

            card.addEventListener(
                "click",
                () => {

                    abrirPlayerModal(
                        player
                    );

                }
            );


            /*
               =================================
               BOTÃO DE EDITAR POSIÇÃO
               =================================
            */

            let editarHTML = "";


            /*
               O lápis aparece SOMENTE:

               - modo específico
               - usuário Tester/Staff
               - mais de um jogador na mesma tier
            */

            if (
    podeEditarPosicoes &&
    (
        (
            filtroModo !== "overall" &&
            player.temPosicaoEditavel === true
        )
        ||
        (
            filtroModo === "overall" &&
            player.temPosicaoOverallEditavel === true
        )
    )
) {

    editarHTML = `
        <button
            type="button"
            class="position-edit-btn"
            title="${
                filtroModo === "overall"
                    ? "Editar posição no Overall"
                    : "Editar posição dentro da tier"
            }"
            aria-label="Editar posição de ${player.nome}"
        >
            <i class="ri-pencil-line"></i>
        </button>
    `;

            }

            /*
               =================================
               BÔNUS DE POSIÇÃO
               =================================
            */

            let bonusHTML = "";


            if (
                filtroModo !== "overall" &&
                player.bonusPosicao > 0
            ) {

                bonusHTML = `

                    <span
                        class="tier-position-bonus"
                    >

                        +${player.bonusPosicao}

                    </span>

                `;

            }


            card.innerHTML = `

                <div class="ranking-position">

                    #${position}

                </div>


                <img
                    src="${avatar}"
                    class="ranking-avatar"
                    alt="${player.nome}"

                    onerror="
                        this.onerror=null;
                        this.src='https://minotar.net/avatar/${encodeURIComponent(
                            player.nome
                        )}/100';
                    "
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

                    <div class="leaderboard-player-meta">
                        <span class="leaderboard-status ${getStatus(player)}">
                            ● ${getStatus(player) === "inactive" ? "Inativo" : "Ativo"}
                        </span>
                        ${getDiscordTagHTML(player)}
                    </div>


                    <div class="ranking-modes">

                        ${
                            filtroModo === "overall"

                                ? `${player.modos.size} modos`

                                : `${formatTier(
                                    player.tier
                                )}`

                        }

                    </div>

                </div>


                <div
                    class="
                        ranking-tier
                        tier-${normalizarTier(
                            player.tier ||
                            player.tiers?.[0]
                        )}
                    "
                >

                    ${formatTier(
                        player.tier ||
                        player.tiers?.[0]
                    )}

                </div>


                <div class="ranking-points">

                    ${Math.floor(
                        player.score
                    )}

                    pts

                    ${bonusHTML}

                </div>


                ${editarHTML}

            `;


            /*
               =================================
               EVENTO DO LÁPIS
               =================================
            */

            const editButton =
                card.querySelector(
                    ".position-edit-btn"
                );


            if (
                editButton
            ) {

                editButton.addEventListener(
                    "click",
                    event => {

                        /*
                           Impede abrir o modal.
                        */

                        event.stopPropagation();


                        if (
    filtroModo === "overall"
) {

    editarPosicaoOverall(
        player.id
    );

} else {

    editarPosicao(
        player.id
    );

                        }

                    }
                );

            }


            container.appendChild(
                card
            );

        }
    );

}

/* =========================================
   EDITAR POSIÇÃO NO OVERALL
========================================= */

async function editarPosicaoOverall(id) {

    /*
       Verificar permissão.
    */

    if (
        !podeEditarPosicoes
    ) {

        alert(
            "Você não tem permissão para editar posições."
        );

        return;

    }


    /*
       Encontrar player.
    */

    const player =
        players.find(
            p =>
                p.id === id
        );


    if (!player) {

        alert(
            "Player não encontrado."
        );

        return;

    }


   

    /*
       Criar o Overall completo
       novamente para descobrir
       a pontuação real de todos.
    */

    const mapa = {};


    players.forEach(p => {

        if (
            !p.nome ||
            !p.modo ||
            !p.tier
        ) {

            return;

        }


        if (
            !mapa[p.nome]
        ) {

            mapa[p.nome] = {

                id: p.id,

                nome: p.nome,

                dispositivo:
                    p.dispositivo ||
                    "mobile",

                avatarUrl:
                    p.avatarUrl ||
                    "",

                status:
                    p.status ||
                    "active",

                discordTag:
                    p.discordTag ||
                    "none",

                tiers: [],

                modos:
                    new Set(),

                modoTiers: {},

                pontos: 0

            };

        }


        const jogador =
            mapa[p.nome];


        if (
            jogador.modoTiers[p.modo]
        ) {

            return;

        }


        const tier =
            normalizarTier(
                p.tier
            );


        jogador.modoTiers[p.modo] =
            tier;


        jogador.modos.add(
            p.modo
        );


        jogador.tiers.push(
            tier
        );


        jogador.pontos +=
            getPoints(
                tier
            );

    });


    const ranking =
        Object.values(
            mapa
        );


    /*
       Calcular score global
       exatamente igual ao
       sistema principal.
    */

    ranking.forEach(
        jogador => {

            const bonusEspecialista =
                getEspecialistaBonus(
                    jogador.tiers
                );


            const multiplier =
                getDiminishingMultiplier(
                    jogador.modos.size
                );


            jogador.score =
                (
                    jogador.pontos +
                    bonusEspecialista
                )
                *
                multiplier;

        }
    );


    /*
       Encontrar o jogador
       dentro desse Overall.
    */

    const jogadorAtual =
        ranking.find(
            jogador =>
                jogador.id === id
        );


    if (!jogadorAtual) {

        alert(
            "Não foi possível encontrar o jogador no Overall."
        );

        return;

    }


    /*
       Encontrar todos que possuem
       exatamente a mesma pontuação.
    */

    const mesmaPontuacao =
        ranking.filter(
            jogador =>
                Math.abs(
                    jogador.score -
                    jogadorAtual.score
                ) < 0.000001
        );


    /*
       Se não houver empate,
       não existe posição editável.
    */

    if (
        mesmaPontuacao.length <= 1
    ) {

        alert(
            "Esse player não está empatado em pontos com outro player. A posição não pode ser editada."
        );

        return;

    }


    /*
       Organizar o grupo do empate.
    */

    mesmaPontuacao.sort(
        (a, b) => {

            const posA =
                getPosicaoSalva(
                    a,
                    "overall"
                );


            const posB =
                getPosicaoSalva(
                    b,
                    "overall"
                );


            const valorA =
                posA === null
                    ? 999999
                    : posA;


            const valorB =
                posB === null
                    ? 999999
                    : posB;


            if (
                valorA !== valorB
            ) {

                return (
                    valorA -
                    valorB
                );

            }


            /*
               Se ainda não houver
               posição salva, usar
               quantidade de modos.
            */

            if (
                a.modos.size !==
                b.modos.size
            ) {

                return (
                    b.modos.size -
                    a.modos.size
                );

            }


            return (
                a.nome || ""
            ).localeCompare(
                b.nome || ""
            );

        }
    );


    /*
       Descobrir posição atual.
    */

    let posicaoAtual =
        getPosicaoSalva(
            jogadorAtual,
            "overall"
        );


    if (
        posicaoAtual === null
    ) {

        posicaoAtual =
            mesmaPontuacao.findIndex(
                jogador =>
                    jogador.id === id
            ) + 1;

    }


    /*
       Perguntar nova posição.
    */

    const novaPosicao =
        prompt(

            `Posição de ${player.nome} no Overall:

Pontos: ${Math.floor(
    jogadorAtual.score
)}

Existem ${mesmaPontuacao.length} players empatados.

Digite uma posição de 1 até ${mesmaPontuacao.length}.`,

            posicaoAtual

        );


    if (
        novaPosicao === null
    ) {

        return;

    }


    const numero =
        Number(
            novaPosicao
        );


    /*
       Validar.
    */

    if (
        !Number.isInteger(
            numero
        )
    ) {

        alert(
            "Digite um número inteiro."
        );

        return;

    }


    if (
        numero < 1 ||
        numero > mesmaPontuacao.length
    ) {

        alert(
            `A posição deve estar entre 1 e ${mesmaPontuacao.length}.`
        );

        return;

    }


    /*
       Descobrir posição atual
       dentro do grupo.
    */

    const jogadorIndex =
        mesmaPontuacao.findIndex(
            jogador =>
                jogador.id === id
        );


    if (
        jogadorIndex === -1
    ) {

        alert(
            "Não foi possível encontrar o jogador."
        );

        return;

    }


    /*
       Remover da posição atual.
    */

    const jogador =
        mesmaPontuacao.splice(
            jogadorIndex,
            1
        )[0];


    /*
       Colocar na nova posição.
    */

    mesmaPontuacao.splice(
        numero - 1,
        0,
        jogador
    );


    /*
       Salvar posição Overall
       de TODOS os empatados.

       Não mexe nas posições
       dos modos específicos.
    */

    try {

        const atualizacoes =
            mesmaPontuacao.map(
                async (
                    jogador,
                    index
                ) => {

                    const playerOriginal =
                        players.find(
                            p =>
                                p.id ===
                                jogador.id
                        );


                    const posicoesAtuais =
                        playerOriginal &&
                        playerOriginal.posicoes &&
                        typeof playerOriginal.posicoes === "object"

                            ? {
                                ...playerOriginal.posicoes
                            }

                            : {};


                    posicoesAtuais.overall =
                        index + 1;


                    await updateDoc(
                        doc(
                            db,
                            "players",
                            jogador.id
                        ),
                        {
                            posicoes:
                                posicoesAtuais
                        }
                    );

                }
            );


        await Promise.all(
            atualizacoes
        );


        alert(
            "Posições do Overall atualizadas com sucesso!"
        );


    } catch (error) {

        console.error(
            "Erro ao atualizar posição do Overall:",
            error
        );


        alert(
            "Erro ao atualizar posição do Overall. Verifique o console."
        );

    }

}


/*
   Disponibilizar globalmente.
*/

window.editarPosicaoOverall =
    editarPosicaoOverall;



/* =========================================
   EDITAR POSIÇÃO
========================================= */

async function editarPosicao(
    id
) {

    /*
       Verificar permissão.
    */

    if (
        !podeEditarPosicoes
    ) {

        alert(
            "Você não tem permissão para editar posições."
        );

        return;

    }


    /*
       Nunca permitir no Global.
    */

    if (
        filtroModo ===
        "overall"
    ) {

        alert(
            "As posições só podem ser editadas nos modos específicos."
        );

        return;

    }


    /*
       Encontrar player.
    */

    const player =
        players.find(
            p =>
                p.id === id
        );


    if (!player) {

        alert(
            "Player não encontrado."
        );

        return;

    }


    /*
       Encontrar todos os jogadores
       da mesma tier no mesmo modo.
    */

    const mesmaTier =
        players.filter(
            p =>

                p.modo ===
                player.modo

                &&

                normalizarTier(
                    p.tier
                ) ===
                normalizarTier(
                    player.tier
                )
        );


    /*
       Se houver somente um,
       não existe posição editável.
    */

    if (
        mesmaTier.length <= 1
    ) {

        alert(
            "Esse player é o único dessa tier neste modo. A posição não pode ser editada."
        );

        return;

    }


    /*
       Descobrir posição atual.
    */

    const posicaoAtualSalva =
        getPosicaoSalva(
            player,
            player.modo
        );


    /*
       Se ainda não houver posição,
       descobrir pela ordem atual.
    */

    let posicaoAtual =
        posicaoAtualSalva;


    if (
        posicaoAtual === null
    ) {

        const ordenadosInicial =
            [...mesmaTier].sort(
                (a, b) => {

                    const posA =
                        getPosicaoSalva(
                            a,
                            player.modo
                        );


                    const posB =
                        getPosicaoSalva(
                            b,
                            player.modo
                        );


                    const valorA =
                        posA === null
                            ? 999999
                            : posA;


                    const valorB =
                        posB === null
                            ? 999999
                            : posB;


                    if (
                        valorA !==
                        valorB
                    ) {

                        return (
                            valorA -
                            valorB
                        );

                    }


                    return (
                        a.nome || ""
                    ).localeCompare(
                        b.nome || ""
                    );

                }
            );


        posicaoAtual =
            ordenadosInicial
                .findIndex(
                    p =>
                        p.id === id
                ) + 1;

    }


    /*
       Perguntar nova posição.
    */

    const novaPosicao =
        prompt(

            `Posição de ${player.nome} dentro da tier ${formatTier(
                player.tier
            )} no modo ${player.modo}:

Digite uma posição de 1 até ${mesmaTier.length}.`,

            posicaoAtual

        );


    if (
        novaPosicao === null
    ) {

        return;

    }


    const numero =
        Number(
            novaPosicao
        );


    /*
       Validar número.
    */

    if (
        !Number.isInteger(
            numero
        )
    ) {

        alert(
            "Digite um número inteiro."
        );

        return;

    }


    if (
        numero < 1 ||
        numero > mesmaTier.length
    ) {

        alert(
            `A posição deve estar entre 1 e ${mesmaTier.length}.`
        );

        return;

    }


    /*
       Organizar jogadores
       pela posição atual.
    */

    try {

        const ordenados =
            [...mesmaTier].sort(
                (a, b) => {

                    const posA =
                        getPosicaoSalva(
                            a,
                            player.modo
                        );


                    const posB =
                        getPosicaoSalva(
                            b,
                            player.modo
                        );


                    const valorA =
                        posA === null
                            ? 999999
                            : posA;


                    const valorB =
                        posB === null
                            ? 999999
                            : posB;


                    if (
                        valorA !==
                        valorB
                    ) {

                        return (
                            valorA -
                            valorB
                        );

                    }


                    return (
                        a.nome || ""
                    ).localeCompare(
                        b.nome || ""
                    );

                }
            );


        /*
           Encontrar jogador.
        */

        const jogadorIndex =
            ordenados.findIndex(
                p =>
                    p.id === id
            );


        if (
            jogadorIndex === -1
        ) {

            alert(
                "Não foi possível encontrar o jogador."
            );

            return;

        }


        /*
           Remover jogador da posição atual.
        */

        const jogador =
            ordenados.splice(
                jogadorIndex,
                1
            )[0];


        /*
           Colocar na nova posição.
        */

        ordenados.splice(
            numero - 1,
            0,
            jogador
        );


        /*
           Atualizar todos da mesma tier.

           Usa o formato:

           posicoes: {
               BedFight: 1
           }

           Assim não apaga posições
           de outros modos.
        */

        const atualizacoes =
            ordenados.map(
                async (
                    p,
                    index
                ) => {

                    const posicoesAtuais =

                        p.posicoes &&
                        typeof p.posicoes === "object"

                            ? {
                                ...p.posicoes
                            }

                            : {};


                    posicoesAtuais[
                        player.modo
                    ] =
                        index + 1;


                    await updateDoc(

                        doc(
                            db,
                            "players",
                            p.id
                        ),

                        {
                            posicoes:
                                posicoesAtuais
                        }

                    );

                }
            );


        await Promise.all(
            atualizacoes
        );


        /*
           Atualizar também o
           sistema antigo "posicao"
           para compatibilidade.
        */

        const atualizacoesCompatibilidade =
            ordenados.map(
                async (
                    p,
                    index
                ) => {

                    await updateDoc(

                        doc(
                            db,
                            "players",
                            p.id
                        ),

                        {
                            posicao:
                                index + 1
                        }

                    );

                }
            );


        await Promise.all(
            atualizacoesCompatibilidade
        );


        alert(
            "Posições atualizadas com sucesso!"
        );


    } catch (error) {

        console.error(
            "Erro ao atualizar posição:",
            error
        );


        alert(
            "Erro ao atualizar posição. Verifique o console."
        );

    }

}


/*
   Disponibilizar função globalmente
   caso outro código precise chamar.
*/

window.editarPosicao =
    editarPosicao;


/* =========================================
   PESQUISA
========================================= */

const searchInput =
    document.querySelector(
        ".search-box input"
    );


if (
    searchInput
) {

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


if (
    deviceFilter
) {

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


if (
    modeFilter
) {

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

function atualizarStats(
    ranking
) {

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


    /*
       TOTAL
    */

    const nomes =
        new Set(

            ranking.map(
                player =>
                    player.nome
            )

        );


    if (
        totalPlayers
    ) {

        totalPlayers.textContent =
            nomes.size;

    }


    /*
       MOBILE
    */

    if (
        mobileCount
    ) {

        mobileCount.textContent =

            ranking.filter(
                player =>

                    player.dispositivo ===
                    "mobile"

            ).length;

    }


    /*
       PC
    */

    if (
        pcCount
    ) {

        pcCount.textContent =

            ranking.filter(
                player =>

                    player.dispositivo ===
                    "pc"

            ).length;

    }


    /*
       CONTROLLER
    */

    if (
        controllerCount
    ) {

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

function abrirPlayerModal(
    player
) {

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


    /*
       Avatar
    */

    const avatar =
        getPlayerAvatar(
            player,
            150
        );


    /*
       Ícone
    */

    const deviceIcon =

        player.dispositivo ===
        "mobile"

            ? '<i class="ri-smartphone-line"></i>'

            : player.dispositivo ===
              "pc"

            ? '<i class="ri-keyboard-line"></i>'

            : '<i class="ri-gamepad-line"></i>';


    /*
       Tiers por modo
    */

    let modosHTML =
        "";


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

                        <div
                            class="player-mode-row"
                        >

                            <span
                                class="mode-name"
                            >

                                ${modo}

                            </span>


                            <span
                                class="
                                    player-tier
                                    tier-${normalizarTier(
                                        tier
                                    )}
                                "
                            >

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


    /*
       Posição dentro da tier
       somente em modo específico.
    */

    let posicaoHTML =
        "";


    if (
        filtroModo !==
        "overall" &&

        player.posicaoTier
    ) {

        posicaoHTML = `

            <div
                class="modal-tier-position"
            >

                <span>

                    Posição na tier

                </span>


                <strong>

                    #${player.posicaoTier}

                </strong>

            </div>

        `;

    }


    /*
       Modal
    */

    body.innerHTML = `

        <div
            class="modal-player-header"
        >

            <img

                src="${avatar}"

                class="modal-player-avatar"

                alt="${player.nome}"

                onerror="
                    this.onerror=null;
                    this.src='https://minotar.net/avatar/${encodeURIComponent(
                        player.nome
                    )}/150';
                "

            >


            <div
                class="modal-player-info"
            >

                <h2>

                    ${player.nome}

                </h2>


                <div
                    class="modal-player-device"
                >

                    ${deviceIcon}

                    <span>

                        ${player.dispositivo}

                    </span>

                </div>

                <div class="leaderboard-player-meta">
                    <span class="leaderboard-status ${getStatus(player)}">
                        ● ${getStatus(player) === "inactive" ? "Inativo" : "Ativo"}
                    </span>
                    ${getDiscordTagHTML(player)}
                </div>

            </div>

        </div>


        <div
            class="modal-player-score"
        >

            <span>

                Pontuação

            </span>


            <strong>

                ${Math.floor(
                    player.score
                )}

                pts

            </strong>

        </div>


        ${posicaoHTML}


        <div
            class="modal-modes"
        >

            <h3>

                Tiers por modo

            </h3>


            <div
                class="player-modes-list"
            >

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


    if (
        !modal
    )

        return;


    modal.classList.remove(
        "active"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


window.fecharPlayerModal =
    fecharPlayerModal;

/* =========================================
   BOTÃO FECHAR MODAL
========================================= */

const closeModalButton =
    document.querySelector(
        ".modal-close"
    );


if (
    closeModalButton
) {

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


if (
    modalOverlay
) {

    modalOverlay.addEventListener(
        "click",
        fecharPlayerModal
    );

}


/* =========================================
   ESC
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


/* =========================================
   DEBUG
========================================= */

console.log(
    "🔥 BMC Leaderboard V3 iniciado."
);

console.log(
    "👤 Usuário:",
    usuarioAtual
);

console.log(
    "✏️ Pode editar posições:",
    podeEditarPosicoes
);
