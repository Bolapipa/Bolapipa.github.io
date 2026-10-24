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
document.querySelectorAll(".revelar").forEach((el) => observador.observe(el));

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

  const inicio = performance.now();
  for (const [i, ordem] of ordens.entries()) {
    const etapa = nos.filter((n) => Number(n.dataset.ordem) === ordem);
    status.textContent = `rodando · task ${i + 1}/${ordens.length}`;
    etapa.forEach((n) => n.classList.add("rodando"));
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

// Escreve uma linha no terminal; a classe define a cor
function escrever(texto, classe = "t-out") {
  const p = document.createElement("p");
  p.className = classe;
  p.innerHTML = texto;
  corpo.appendChild(p);
  corpo.scrollTop = corpo.scrollHeight;
}

// Escreve várias linhas com um pequeno atraso entre elas
async function escreverLinhas(linhas, atraso = 70) {
  for (const [texto, classe] of linhas) {
    escrever(texto, classe);
    if (!semMovimento) await new Promise((r) => setTimeout(r, atraso));
  }
}

// Comandos disponíveis
const comandos = {
  help: () => escreverLinhas([
    ["comandos disponíveis:", "t-a"],
    ["  sobre       quem sou eu"],
    ["  stack       ferramentas que uso"],
    ["  projetos    projetos em destaque"],
    ["  pipeline    roda um pipeline Medallion"],
    ["  experiencia onde já trabalhei"],
    ["  contato     como falar comigo"],
    ["  cv          abre o currículo em PDF"],
    ["  clear       limpa o terminal"],
  ], 25),

  sobre: () => escreverLinhas([
    ["Arthur Viana Delacorte · Engenheiro de Dados · Rio de Janeiro", "t-a"],
    ["Construí, junto com o time, o Data Lake corporativo da OceanPact"],
    ["no Azure Databricks desde o zero. Gosto de pipelines simples,"],
    ["bem documentados e fáceis de manter."],
  ]),

  stack: () => escreverLinhas([
    ["SELECT categoria, ferramentas FROM arthur.stack;", "t-a"],
    ["ingest       │ Azure Data Factory · APIs REST · Microsoft Graph · SQL Server"],
    ["store        │ ADLS Gen2 · Delta Lake · Unity Catalog · Entra ID"],
    ["transform    │ Python · PySpark · SQL · Lakeflow/DLT"],
    ["analytics    │ Star Schema · Power BI · Genie Space"],
    ["orchestrate  │ Databricks Jobs · Airflow · Asset Bundles · Azure DevOps · GitHub Actions"],
    ["ia           │ Mistral OCR · ai_parse_document · Genie Space"],
    ["(6 linhas)", "t-ok"],
  ], 45),

  projetos: () => escreverLinhas([
    ["01 · Data Lake corporativo · OceanPact (case profissional)", "t-g"],
    ["02 · Project Lake House · Databricks + Medallion + CI/CD", "t-a"],
    ['→ <a href="#projetos" class="t-a">ver detalhes</a>'],
  ]),

  experiencia: () => escreverLinhas([
    ["mai/2025 - atual  │ Engenharia de Dados · OceanPact", "t-a"],
    ["ago/2023 - mar/2025 │ Análise de Dados · Vesuvius (financeiro)"],
  ]),

  contato: () => escreverLinhas([
    ['email    → <a href="mailto:delacortearthur@gmail.com" class="t-a">delacortearthur@gmail.com</a>'],
    ['linkedin → <a href="https://www.linkedin.com/in/arthur-viana-delacorte" target="_blank" rel="noopener" class="t-a">in/arthur-viana-delacorte</a>'],
    ['github   → <a href="https://github.com/Bolapipa" target="_blank" rel="noopener" class="t-a">github.com/Bolapipa</a>'],
  ]),

  cv: () => {
    escrever("abrindo CV_Arthur_Delacorte.pdf…", "t-ok");
    window.open("assets/CV_Arthur_Delacorte.pdf", "_blank", "noopener");
  },

  // Simula a execução de um pipeline Medallion
  pipeline: () => escreverLinhas([
    ["databricks bundle run medallion -t dev", "t-a"],
    ["[fontes]  lendo APIs, ERPs e PDFs…"],
    ["[bronze]  ✓ 12.480 linhas ingeridas (MERGE incremental)", "t-b"],
    ["[silver]  ✓ tipagem, limpeza e deduplicação", "t-s"],
    ["[gold]    ✓ fact_operacao, dim_embarcacao, dim_data", "t-g"],
    ["[bi]      ✓ dashboards e Genie Space atualizados", "t-a"],
    ["pipeline concluído com sucesso em 42s (simulação)", "t-ok"],
  ], 260),

  clear: () => { corpo.innerHTML = ""; },
};

// Apelidos em inglês e sem acento
Object.assign(comandos, {
  about: comandos.sobre, projects: comandos.projetos, experience: comandos.experiencia,
  "experiência": comandos.experiencia, contact: comandos.contato, ls: comandos.help,
});

async function executar(texto) {
  const cmd = texto.trim().toLowerCase();
  if (!cmd) return;
  escrever(cmd.replace(/</g, "&lt;"), "t-cmd");
  if (comandos[cmd]) await comandos[cmd]();
  else escrever(`comando não encontrado: ${cmd.replace(/</g, "&lt;")}. digite help`, "t-erro");
}

document.getElementById("terminalForm").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = entrada.value;
  if (texto.trim()) { historico.push(texto); posicaoHistorico = historico.length; }
  entrada.value = "";
  await executar(texto);
});

// Setas para cima e para baixo navegam no histórico de comandos
entrada.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowUp" && posicaoHistorico > 0) {
    entrada.value = historico[--posicaoHistorico];
    evento.preventDefault();
  } else if (evento.key === "ArrowDown") {
    posicaoHistorico = Math.min(posicaoHistorico + 1, historico.length);
    entrada.value = historico[posicaoHistorico] ?? "";
    evento.preventDefault();
  }
});

// Clicar em qualquer parte do terminal foca o campo
document.getElementById("terminal").addEventListener("click", () => entrada.focus({ preventScroll: true }));

// Mensagem de boas-vindas
escreverLinhas([
  ["bem-vindo ao meu lakehouse pessoal 👋", "t-a"],
  ["digite help para explorar, ou pipeline para ver os dados fluindo."],
  [""],
], 120);
