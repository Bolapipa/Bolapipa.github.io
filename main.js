// Portfólio · Arthur Delacorte
// Navegação, animações de entrada, contadores, formulário e terminal interativo

// ================= Navegação =================

const nav = document.getElementById("nav");
const menuToggle = document.getElementById("menuToggle");

// Fundo da barra aparece depois de rolar um pouco
const atualizarNav = () => nav.classList.toggle("nav--rolado", window.scrollY > 20);
window.addEventListener("scroll", atualizarNav, { passive: true });
atualizarNav();

// Menu do celular
menuToggle.addEventListener("click", () => {
  const aberto = nav.classList.toggle("nav--aberto");
  menuToggle.setAttribute("aria-expanded", String(aberto));
});

// Fecha o menu ao clicar em um link
document.querySelectorAll("#menu a").forEach((link) =>
  link.addEventListener("click", () => {
    nav.classList.remove("nav--aberto");
    menuToggle.setAttribute("aria-expanded", "false");
  })
);

// Ano do rodapé
document.getElementById("ano").textContent = new Date().getFullYear();

// ================= Animação de entrada e contadores =================

const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Conta de 0 até o valor do atributo data-contar
function contar(el) {
  const alvo = Number(el.dataset.contar);
  if (semMovimento) { el.textContent = alvo; return; }
  const inicio = performance.now();
  const duracao = 1200;
  const passo = (agora) => {
    const t = Math.min((agora - inicio) / duracao, 1);
    // Desacelera no final
    el.textContent = Math.round(alvo * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("visivel");
      entrada.target.querySelectorAll("[data-contar]").forEach(contar);
      observador.unobserve(entrada.target);
    });
  },
  { threshold: 0.15 }
);
// Dentro de cada seção, os itens entram um depois do outro
document.querySelectorAll("[data-task]").forEach((secao) =>
  secao.querySelectorAll(".revelar").forEach((el, i) => el.style.setProperty("--atraso", `${i * 90}ms`))
);
document.querySelectorAll(".revelar").forEach((el) => observador.observe(el));

// ================= Página como job: cada seção é uma task =================
// A seção que está na tela fica "rodando", as anteriores "ok" e as seguintes "na fila"

const tasks = [...document.querySelectorAll("[data-task]")];
const navRun = document.getElementById("navRun");
const navRunTexto = document.getElementById("navRunTexto");

function atualizarTasks() {
  const linha = window.innerHeight * 0.45;
  const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  // Índice da última seção cujo topo já passou da linha de leitura
  let atual = -1;
  tasks.forEach((secao, i) => { if (secao.getBoundingClientRect().top < linha) atual = i; });
  if (noFim) atual = tasks.length;

  tasks.forEach((secao, i) => {
    secao.dataset.estado = i < atual ? "ok" : i === atual ? "rodando" : "fila";
  });

  if (atual < 0) {
    navRun.dataset.estado = "fila";
    navRunTexto.textContent = "na fila";
  } else if (atual >= tasks.length) {
    navRun.dataset.estado = "ok";
    navRunTexto.textContent = `✓ succeeded · ${tasks.length}/${tasks.length}`;
  } else {
    navRun.dataset.estado = "rodando";
    navRunTexto.textContent = `rodando · ${atual + 1}/${tasks.length}`;
  }
}
window.addEventListener("scroll", atualizarTasks, { passive: true });
window.addEventListener("resize", atualizarTasks);
atualizarTasks();

// ================= Jobs orquestrados (DAGs de projetos e stack) =================
// Cada task tem data-ordem; as de mesma ordem rodam juntas, e as ordens rodam em sequência

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function orquestrar(job) {
  // Evita duas execuções ao mesmo tempo no mesmo job
  if (job.dataset.rodando === "1") return;
  job.dataset.rodando = "1";

  const nos = [...job.querySelectorAll("[data-ordem]")];
  const arestas = [...job.querySelectorAll(".dag__aresta")];
  const status = job.querySelector("[data-status]");
  const ordens = [...new Set(nos.map((n) => Number(n.dataset.ordem)))].sort((a, b) => a - b);

  // Volta tudo para "na fila"
  nos.forEach((n) => n.classList.remove("rodando", "ok"));
  arestas.forEach((a) => a.classList.remove("ativa"));
  job.classList.remove("job--ok");
  status.className = "job__status rodando";

  // Job em construção (data-parcial): só as primeiras etapas terminam e a seguinte fica rodando
  const parcial = job.dataset.parcial === undefined ? ordens.length : Number(job.dataset.parcial);

  const inicio = performance.now();
  for (const [i, ordem] of ordens.entries()) {
    const etapa = nos.filter((n) => Number(n.dataset.ordem) === ordem);
    status.textContent = `rodando · task ${i + 1}/${ordens.length}`;
    etapa.forEach((n) => n.classList.add("rodando"));
    if (i >= parcial) {
      status.className = "job__status construcao";
      status.textContent = job.dataset.parcialTexto;
      job.dataset.rodando = "0";
      return;
    }
    if (!semMovimento) await esperar(650);
    etapa.forEach((n) => { n.classList.remove("rodando"); n.classList.add("ok"); });
    // Liga a aresta que sai desta etapa
    if (arestas[i]) arestas[i].classList.add("ativa");
  }

  const segundos = ((performance.now() - inicio) / 1000).toFixed(1);
  status.className = "job__status ok";
  status.textContent = semMovimento ? "✓ succeeded" : `✓ succeeded · ${segundos}s`;
  job.classList.add("job--ok");
  job.dataset.rodando = "0";
}

const jobs = document.querySelectorAll("[data-dag]");

// Roda cada job quando ele aparece na tela
const observadorJobs = new IntersectionObserver(
  (entradas) => entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    orquestrar(e.target);
    observadorJobs.unobserve(e.target);
  }),
  { threshold: 0.35 }
);
jobs.forEach((job) => {
  observadorJobs.observe(job);
  // Botão "↻ run" executa o job de novo
  job.querySelector("[data-rerun]").addEventListener("click", () => orquestrar(job));
});

// ================= Formulário de contato =================
// Sem servidor: monta um e-mail e abre o aplicativo de e-mail do visitante

document.getElementById("contatoForm").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dados = new FormData(evento.target);
  const assunto = `Contato pelo portfólio - ${dados.get("nome")}`;
  const corpo = `${dados.get("mensagem")}\n\n${dados.get("nome")}`;
  window.location.href =
    `mailto:delacortearthur@gmail.com?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
});

// ================= Terminal interativo =================

const corpo = document.getElementById("terminalCorpo");
const entrada = document.getElementById("terminalInput");
const historico = [];
let posicaoHistorico = 0;

const links = {
  email: "mailto:delacortearthur@gmail.com",
  linkedin: "https://www.linkedin.com/in/arthur-viana-delacorte",
  github: "https://github.com/Bolapipa",
  cv: "assets/CV_Arthur_Delacorte.pdf",
};

// Link que abre em outra aba quando é externo
const link = (href, texto) =>
  `<a href="${href}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${texto}</a>`;

const escaparHtml = (texto) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Minúsculas e sem acento: "Experiência" vira "experiencia"
const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const rolarFim = () => { corpo.scrollTop = corpo.scrollHeight; };
const pausa = (ms) => (semMovimento ? Promise.resolve() : esperar(ms));

// Escreve uma linha; a classe define a cor. O texto quebra sozinho na largura do terminal
function escrever(html, classe = "t-out") {
  const p = document.createElement("p");
  p.className = classe;
  p.innerHTML = html;
  corpo.appendChild(p);
  rolarFim();
}

// Escreve várias linhas com um pequeno atraso entre elas
async function escreverLinhas(linhas, atraso = 70) {
  for (const linha of linhas) {
    const [html, classe] = Array.isArray(linha) ? linha : [linha];
    escrever(html, classe);
    await pausa(atraso);
  }
}

// Tabela de duas colunas [chave, valor], alinhada pelo CSS (.t-tab)
async function escreverTabela(linhas, atraso = 40) {
  const tabela = document.createElement("dl");
  tabela.className = "t-tab";
  corpo.appendChild(tabela);
  for (const [chave, valor] of linhas) {
    tabela.insertAdjacentHTML("beforeend", `<dt>${chave}</dt><dd>${valor}</dd>`);
    rolarFim();
    await pausa(atraso);
  }
}

// ----- Dados usados pelos comandos -----

const projetos = [
  {
    chave: "oceanpact", nome: "Data Lake corporativo da OceanPact", cor: "t-g",
    resumo: "Lakehouse corporativo no Azure Databricks, construído desde o zero: ERPs, bancos, APIs de telemetria, SharePoint e PDFs passando por Bronze, Silver e Gold, com deploy por CI/CD e consumo em dashboards e no Genie Space.",
    stack: "Azure Databricks, Azure Data Factory, PySpark, Delta Lake, Lakeflow, Unity Catalog, Asset Bundles, Azure DevOps",
    nota: "código privado da empresa, detalhes em entrevista",
  },
  {
    chave: "fleet", nome: "Fleet Ops DB", cor: "t-b", status: "em construção, fase 1 de 8",
    resumo: "Banco operacional (OLTP) em PostgreSQL de uma frota marítima fictícia: modelagem em 3FN com constraints, migrations versionadas, milhões de leituras de sensores, BRIN e particionamento medidos com EXPLAIN ANALYZE, Row-Level Security e CDC para o lakehouse.",
    stack: "PostgreSQL, SQL, PL/pgSQL, Python, Docker, pytest, GitHub Actions",
    url: "https://github.com/Bolapipa/fleet-ops-db",
  },
  {
    chave: "lakehouse", nome: "Project Lake House", cor: "t-a",
    resumo: "Ingestão incremental de 5 APIs públicas (FIPE, PokeAPI, IBGE, Open-Meteo e Câmara), Silver em Delta Live Tables e Gold em Star Schema com EXPECT. Deploy dev/prod com GitHub Actions e job disparado por um DAG no Airflow.",
    stack: "Databricks, Delta Live Tables, Unity Catalog, Asset Bundles, GitHub Actions, Airflow, PySpark",
    url: "https://github.com/Bolapipa/project_lake_house",
  },
];

const experiencias = [
  {
    chave: "oceanpact", periodo: "mai 2025 – atual", titulo: "Engenharia de Dados na OceanPact Serviços Marítimos",
    itens: [
      "Data Lake corporativo no Azure Databricks desde o início, com arquitetura Medallion.",
      "Pipelines batch e incrementais com Azure Data Factory, PySpark e SQL, com CDC e cargas históricas.",
      "Deploy de jobs e pipelines Lakeflow com Asset Bundles, Azure DevOps e CI/CD, separando dev e prod.",
      "Modelagem dimensional na Gold para RH, finanças, jurídico, logística, manutenção e operações.",
      "Extração de PDFs com Mistral OCR e IA; Genie Space para consultas em linguagem natural.",
    ],
  },
  {
    chave: "vesuvius", periodo: "ago 2023 – mar 2025", titulo: "Análise de Dados na Vesuvius Refratários (financeiro)",
    itens: [
      "Extração e tratamento de dados do SAP e ETL com Power Query e Excel.",
      "Automação de relatórios entre SAP e Excel com VBA.",
      "Dashboards no Power BI com indicadores financeiros e conciliação entre sistemas.",
    ],
  },
];

// Procura um item pelo número (1, 2...) ou por parte da chave/nome
function encontrar(lista, termo) {
  const n = Number(termo);
  if (Number.isInteger(n) && n >= 1 && n <= lista.length) return lista[n - 1];
  return lista.find((item) => item.chave.startsWith(termo) || normalizar(item.nome ?? item.titulo).includes(termo));
}

// ----- Comandos -----
// desc aparece no help; uso mostra os argumentos opcionais

const comandos = {
  help: {
    desc: "lista os comandos",
    run: async () => {
      escrever("comandos disponíveis:", "t-a");
      await escreverTabela(
        Object.entries(comandos).map(([nome, c]) => [nome + (c.uso ? ` ${c.uso}` : ""), c.desc]),
        25
      );
      escrever("Tab completa o comando, ↑ e ↓ navegam no histórico.", "t-fraco");
    },
  },

  sobre: {
    desc: "quem sou eu",
    run: () => escreverLinhas([
      ["Arthur Viana Delacorte, Engenheiro de Dados no Rio de Janeiro", "t-a"],
      "Construí, junto com o time, o Data Lake corporativo da OceanPact no Azure Databricks desde o zero: da configuração do ambiente na nuvem até dados confiáveis em dashboards e decisões de negócio.",
      "Antes, fui analista de dados no setor financeiro. Gosto de pipelines simples, bem documentados e fáceis de manter.",
      ["status: aberto a oportunidades, híbrido ou remoto", "t-ok"],
    ], 110),
  },

  stack: {
    desc: "ferramentas que uso, por etapa",
    run: async () => {
      escrever("SELECT etapa, ferramentas FROM arthur.stack;", "t-a");
      await escreverTabela([
        ["ingest", "Azure Data Factory, APIs REST, Microsoft Graph, SQL Server, PostgreSQL"],
        ["store", "ADLS Gen2, Delta Lake, Unity Catalog, Entra ID"],
        ["transform", "Python, PySpark, SQL, Spark SQL, Lakeflow / DLT, CDC"],
        ["analytics", "Star Schema, fatos e dimensões, Power BI, Genie Space"],
        ["orchestrate", "Databricks Jobs, Airflow, Asset Bundles, Azure DevOps, GitHub Actions, Docker"],
        ["ia", "Mistral OCR, ai_parse_document, Genie Space"],
      ], 60);
      escrever("(6 linhas)", "t-fraco");
    },
  },

  projetos: {
    desc: "projetos em destaque",
    uso: "[nome]",
    run: async (termo) => {
      if (!termo) {
        await escreverTabela(projetos.map((p, i) => [
          `${i + 1}`,
          `<span class="${p.cor}">${p.nome}</span>${p.status ? ` <span class="t-fraco">(${p.status})</span>` : ""}`,
        ]), 60);
        escrever("digite <b>projetos 2</b> ou <b>projetos fleet</b> para ver os detalhes.", "t-fraco");
        return;
      }
      const p = encontrar(projetos, termo);
      if (!p) {
        escrever(`projeto não encontrado: ${escaparHtml(termo)}. Opções: ${projetos.map((x) => x.chave).join(", ")}.`, "t-erro");
        return;
      }
      escrever(p.nome, p.cor);
      await escreverLinhas([p.resumo], 0);
      await escreverTabela([
        ...(p.status ? [["status", p.status]] : []),
        ["stack", p.stack],
        p.url ? ["código", link(p.url, p.url.replace("https://", ""))] : ["código", p.nota],
      ], 50);
    },
  },

  experiencia: {
    desc: "onde trabalhei e formação",
    uso: "[empresa]",
    run: async (termo) => {
      if (termo) {
        const e = encontrar(experiencias, termo);
        if (!e) {
          escrever(`empresa não encontrada: ${escaparHtml(termo)}. Opções: ${experiencias.map((x) => x.chave).join(", ")}.`, "t-erro");
          return;
        }
        escrever(`${e.titulo} <span class="t-fraco">(${e.periodo})</span>`, "t-a");
        await escreverLinhas(e.itens.map((item) => [`- ${item}`, "t-out t-item"]), 60);
        return;
      }
      await escreverTabela(experiencias.map((e) => [e.periodo, e.titulo]), 60);
      escrever("formação", "t-a");
      await escreverTabela([
        ["2023 – 2027", "Bacharelado em Engenharia de Software, Estácio"],
        ["2021 – 2022", "Técnico em Automação Industrial, Firjan Senai"],
      ], 60);
      escrever("digite <b>experiencia oceanpact</b> ou <b>experiencia vesuvius</b> para ver os detalhes.", "t-fraco");
    },
  },

  pipeline: {
    desc: "roda um pipeline Medallion (simulação)",
    run: () => escreverLinhas([
      ["databricks bundle run medallion -t dev", "t-a"],
      "[fontes]  lendo APIs, ERPs e PDFs…",
      ["[bronze]  ✓ 12.480 linhas ingeridas (MERGE incremental)", "t-b"],
      ["[silver]  ✓ tipagem, limpeza e deduplicação", "t-s"],
      ["[gold]    ✓ fact_operacao, dim_embarcacao, dim_data", "t-g"],
      ["[bi]      ✓ dashboards e Genie Space atualizados", "t-a"],
      ["pipeline concluído com sucesso em 42s (simulação)", "t-ok"],
    ], 260),
  },

  contato: {
    desc: "como falar comigo",
    run: () => escreverTabela([
      ["e-mail", link(links.email, "delacortearthur@gmail.com")],
      ["linkedin", link(links.linkedin, "in/arthur-viana-delacorte")],
      ["github", link(links.github, "github.com/Bolapipa")],
      ["cv", link(links.cv, "CV_Arthur_Delacorte.pdf")],
    ], 50),
  },

  cv: {
    desc: "abre o currículo em PDF",
    run: () => {
      escrever("abrindo CV_Arthur_Delacorte.pdf…", "t-ok");
      window.open(links.cv, "_blank", "noopener");
    },
  },

  github: {
    desc: "abre meu GitHub",
    run: () => {
      escrever("abrindo github.com/Bolapipa…", "t-ok");
      window.open(links.github, "_blank", "noopener");
    },
  },

  linkedin: {
    desc: "abre meu LinkedIn",
    run: () => {
      escrever("abrindo in/arthur-viana-delacorte…", "t-ok");
      window.open(links.linkedin, "_blank", "noopener");
    },
  },

  clear: { desc: "limpa o terminal", run: () => { corpo.innerHTML = ""; } },
};

// Apelidos: em inglês, no singular e atalhos comuns
const apelidos = {
  "?": "help", ajuda: "help", ls: "help",
  about: "sobre", whoami: "sobre",
  projects: "projetos", projeto: "projetos", project: "projetos",
  experience: "experiencia", exp: "experiencia", formacao: "experiencia", carreira: "experiencia",
  contact: "contato", email: "contato", "e-mail": "contato",
  curriculo: "cv", resume: "cv",
  limpar: "clear", cls: "clear",
};

const nomesConhecidos = [...Object.keys(comandos), ...Object.keys(apelidos)];

// Distância de edição, para sugerir o comando certo quando há erro de digitação
function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

async function executar(texto) {
  const limpo = texto.trim();
  if (!limpo) return;
  escrever(escaparHtml(limpo), "t-cmd");

  const [primeiro, ...resto] = normalizar(limpo).split(/\s+/);
  const nome = apelidos[primeiro] ?? primeiro;
  const termo = resto.join(" ");

  if (comandos[nome]) {
    await comandos[nome].run(termo);
    return;
  }
  const sugestao = nomesConhecidos
    .map((n) => [n, distancia(primeiro, n)])
    .sort((a, b) => a[1] - b[1])[0];
  if (sugestao && sugestao[1] <= 2) {
    escrever(`comando não encontrado: ${escaparHtml(primeiro)}. Você quis dizer <b>${sugestao[0]}</b>?`, "t-erro");
  } else {
    escrever(`comando não encontrado: ${escaparHtml(primeiro)}. Digite <b>help</b> para ver os comandos.`, "t-erro");
  }
}

// Os comandos rodam em fila, para a saída de um não se misturar com a do próximo
let fila = Promise.resolve();

document.getElementById("terminalForm").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const texto = entrada.value;
  if (texto.trim()) { historico.push(texto); posicaoHistorico = historico.length; }
  entrada.value = "";
  fila = fila.then(() => executar(texto));
});

entrada.addEventListener("keydown", (evento) => {
  // Setas para cima e para baixo navegam no histórico de comandos
  if (evento.key === "ArrowUp" && posicaoHistorico > 0) {
    entrada.value = historico[--posicaoHistorico];
    evento.preventDefault();
  } else if (evento.key === "ArrowDown") {
    posicaoHistorico = Math.min(posicaoHistorico + 1, historico.length);
    entrada.value = historico[posicaoHistorico] ?? "";
    evento.preventDefault();
  } else if (evento.key === "Tab" && entrada.value.trim() && !entrada.value.includes(" ")) {
    // Tab completa o nome do comando; com o campo vazio, o Tab segue a navegação normal
    const prefixo = normalizar(entrada.value);
    const opcoes = Object.keys(comandos).filter((n) => n.startsWith(prefixo));
    if (opcoes.length === 0) return;
    evento.preventDefault();
    if (opcoes.length === 1) entrada.value = `${opcoes[0]} `;
    else escrever(opcoes.join("   "), "t-fraco");
  }
});

// Clicar em qualquer parte do terminal foca o campo (menos nos links)
document.getElementById("terminal").addEventListener("click", (evento) => {
  if (!evento.target.closest("a")) entrada.focus({ preventScroll: true });
});

// Mensagem de boas-vindas
escreverLinhas([
  ["bem-vindo ao meu lakehouse pessoal", "t-a"],
  "digite <b>help</b> para ver os comandos, ou <b>pipeline</b> para ver os dados fluindo.",
], 120);
