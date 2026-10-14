const TIPOS = ["Entrada Manhã", "Saída Almoço", "Volta Almoço", "Saída Tarde"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const KEY_USERS = "pontualiza_users";
const KEY_PONTOS = "pontualiza_pontos";
const KEY_SESSAO = "pontualiza_sessao";
const MQ_DESKTOP = window.matchMedia("(min-width: 1024px)");

function isDesktop() {
  return MQ_DESKTOP.matches;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatarData(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarHora(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function horaCurta(hms) {
  return hms ? hms.slice(0, 5) : "--:--";
}

function ler(chave, fallback) {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function salvar(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function seed() {
  const users = ler(KEY_USERS, []);
  if (users.length) return;

  users.push(
    {
      id: 1,
      nome: "Marina Carvalho",
      email: "admin@pontualiza.com",
      documento: "00000000000",
      perfil: "admin",
      senha: "admin123",
      cargo: "Administradora"
    },
    {
      id: 2,
      nome: "Lucas Rocha",
      email: "colaborador@pontualiza.com",
      documento: "12345678901",
      perfil: "colaborador",
      senha: "123456",
      cargo: "Designer"
    }
  );
  salvar(KEY_USERS, users);
}

function getUsers() {
  return ler(KEY_USERS, []);
}

function getPontos() {
  return ler(KEY_PONTOS, []);
}

function getSessao() {
  const id = ler(KEY_SESSAO, null);
  if (!id) return null;
  return getUsers().find((u) => u.id === id) || null;
}

function setSessao(id) {
  if (id == null) localStorage.removeItem(KEY_SESSAO);
  else salvar(KEY_SESSAO, id);
}

function pontosDoUsuario(userId) {
  return getPontos().filter((p) => p.userId === userId);
}

function registroDoDia(userId, dia) {
  return getPontos().find((p) => p.userId === userId && p.data === dia);
}

function minutosDe(hms) {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 60 + m + Math.floor((s || 0) / 60);
}

function totalHoras(marcas) {
  if (!marcas || marcas.length < 2) return "00:00";
  let min = 0;
  if (marcas[0] && marcas[1]) min += minutosDe(marcas[1]) - minutosDe(marcas[0]);
  if (marcas[2] && marcas[3]) min += minutosDe(marcas[3]) - minutosDe(marcas[2]);
  if (min < 0) min = 0;
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function statusDia(marcas) {
  if (!marcas || !marcas[0]) return "—";
  if (marcas.length < 4) return "Incompleto";
  const entrada = minutosDe(marcas[0]);
  if (entrada > 8 * 60) return "Atraso";
  return "Pontual";
}

function mostrarMsg(id, texto, tipo) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = `msg ${tipo}`;
}

function destinoAdmin() {
  return isDesktop() ? "admin" : "admin-bloqueio";
}

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function badge(status) {
  const cls =
    status === "Pontual" ? "badge-ok" :
    status === "Atraso" || status === "Leve atraso" ? "badge-atraso" :
    status === "Falta" ? "badge-falta" : "badge-info";
  return `<span class="badge ${cls}">${status}</span>`;
}

function horasTexto(marcas) {
  const t = totalHoras(marcas);
  const [h, m] = t.split(":");
  return `${Number(h)}h ${m}min`;
}

function tipoCurto(i) {
  return i % 2 === 0 ? "Entrada" : "Saída";
}

function htmlCalendario(compacto) {
  const user = getSessao();
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const offset = new Date(ano, mes, 1).getDay();
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const diaHoje = agora.getDate();
  const pontos = user ? pontosDoUsuario(user.id) : [];
  const porDia = {};
  pontos.forEach((p) => { porDia[p.data] = p.marcas; });

  let html = "<tr>";
  for (let i = 0; i < offset; i++) html += "<td></td>";
  for (let dia = 1; dia <= ultimo; dia++) {
    if ((offset + dia - 1) % 7 === 0 && dia !== 1) html += "</tr><tr>";
    const iso = `${ano}-${pad(mes + 1)}-${pad(dia)}`;
    const extra = !compacto && porDia[iso] ? `<br><small>${totalHoras(porDia[iso])}</small>` : "";
    const cls = dia === diaHoje ? ' class="hoje-celula"' : "";
    html += `<td${cls}><span>${dia}</span></td>`;
  }
  const resto = (offset + ultimo) % 7;
  if (resto) for (let i = resto; i < 7; i++) html += "<td></td>";
  html += "</tr>";
  return { html, titulo: compacto ? `${MESES[mes].slice(0, 3)} ${ano}` : `${MESES[mes]} ${ano}` };
}

function aplicarLayout() {
  const user = getSessao();
  document.body.dataset.layout = user ? "app" : "guest";
  document.body.dataset.perfil = user ? user.perfil : "";
  document.getElementById("app-guest").classList.toggle("hidden", Boolean(user));
  document.getElementById("app-logado").classList.toggle("hidden", !user);
  document.getElementById("rodape-guest").classList.toggle("hidden", Boolean(user));
}

function mostrarGuest(id) {
  ["escolha", "login", "cadastro"].forEach((secId) => {
    document.getElementById(secId).classList.toggle("hidden", secId !== id);
  });
  document.body.dataset.guestView = id;
}

function prepararHero(modo) {
  const titulo = document.getElementById("hero-titulo");
  const texto = document.getElementById("hero-texto");
  if (modo === "func") {
    titulo.innerHTML = "Sua equipe,<br>conectada desde o<br>primeiro dia.";
    texto.textContent = "Crie um acesso individual, seguro e sempre vinculado à empresa.";
  } else if (modo === "admin") {
    titulo.innerHTML = "Comece a gestão<br>da sua empresa.";
    texto.textContent = "Cadastre a empresa e o responsável para administrar equipes com segurança.";
  } else {
    titulo.innerHTML = "Gestão de ponto,<br>simples e precisa.";
    texto.textContent = "Acesse sua jornada de trabalho com segurança, agilidade e transparência.";
  }
}

function prepararCadastro(perfil) {
  const ehAdmin = perfil === "admin";
  document.getElementById("cad-perfil").value = perfil;
  document.getElementById("campos-empresa-func").classList.toggle("hidden", ehAdmin);
  document.getElementById("campos-empresa-admin").classList.toggle("hidden", !ehAdmin);
  document.getElementById("stepper-admin").classList.toggle("hidden", !ehAdmin);
  document.getElementById("aceite-termos").classList.toggle("hidden", !ehAdmin);
  document.getElementById("cadastro-kicker").textContent = ehAdmin
    ? "Cadastro inicial"
    : "Novo acesso de funcionário";
  document.getElementById("cadastro-titulo").textContent = ehAdmin
    ? "Configure sua empresa"
    : "Crie seu cadastro";
  document.getElementById("cadastro-subtitulo").textContent = ehAdmin
    ? "Informe os dados essenciais da empresa e do responsável administrador."
    : "Seu acesso será individual e ficará vinculado à empresa informada.";
  document.getElementById("cadastro-submit").textContent = ehAdmin
    ? "Cadastrar empresa e administrador →"
    : "Criar cadastro de funcionário →";
  const voltar = document.getElementById("cadastro-voltar");
  voltar.setAttribute("data-perfil", perfil);
  voltar.setAttribute("data-ir", "login");
  voltar.parentElement.childNodes[0].textContent = ehAdmin
    ? "Já possui conta como administrador? "
    : "Já possui conta como funcionário? ";
  document.getElementById("bloco-dados-titulo").textContent = ehAdmin
    ? "Responsável administrador"
    : "Dados essenciais";
  document.getElementById("ico-responsavel").classList.toggle("hidden", !ehAdmin);
  document.getElementById("hint-responsavel").classList.toggle("hidden", !ehAdmin);
  document.getElementById("cad-doc").required = !ehAdmin;
  document.body.dataset.cadastroPerfil = perfil;
  prepararHero(ehAdmin ? "admin" : "func");
}

function prepararLogin(perfil) {
  document.getElementById("login-perfil").value = perfil;
  document.getElementById("login-titulo").textContent =
    perfil === "admin" ? "Entrar como administrador" : "Entrar como funcionário";
}

function mostrarSecao(id) {
  const user = getSessao();
  aplicarLayout();

  if (!user) {
    if (!["escolha", "login", "cadastro"].includes(id)) id = "escolha";
    if (id === "escolha") prepararHero("portal");
    mostrarGuest(id);
    history.replaceState(null, "", `#${id}`);
    return;
  }

  if (user.perfil === "admin") {
    const permitidas = isDesktop() ? ["admin"] : ["admin-bloqueio"];
    if (id === "admin" && !isDesktop()) id = "admin-bloqueio";
    if (id === "admin-bloqueio" && isDesktop()) id = "admin";
    if (!permitidas.includes(id) && id !== "admin" && id !== "admin-bloqueio") {
      id = destinoAdmin();
    }
    if (!isDesktop()) id = "admin-bloqueio";
    else if (id !== "admin") id = "admin";
  } else {
    const permitidas = ["ponto", "calendario", "historico", "perfil"];
    if (!permitidas.includes(id)) id = "ponto";
  }

  document.querySelectorAll("#app-logado main section").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== id);
  });

  document.querySelectorAll("#app-logado nav a").forEach((a) => {
    const match = a.getAttribute("href") === `#${id}`;
    const duplicataPonto = id === "ponto" && a.textContent.includes("Meu ponto");
    const duplicataAdmin = id === "admin" && !a.textContent.includes("Visão geral") && a.closest("[data-admin]");
    a.classList.toggle("ativo", match && !duplicataPonto && !duplicataAdmin);
  });

  history.replaceState(null, "", `#${id}`);

  if (id === "ponto") renderPonto();
  if (id === "calendario") renderCalendario();
  if (id === "historico") renderHistorico();
  if (id === "perfil") renderPerfil();
  if (id === "admin") renderAdmin();
}

function atualizarNav() {
  const user = getSessao();
  const bar = document.getElementById("user-bar");
  const saudacao = document.getElementById("user-saudacao");
  const adminDesktop = Boolean(user && user.perfil === "admin" && isDesktop());

  document.querySelectorAll("[data-auth]").forEach((el) => {
    el.classList.toggle("hidden", !(user && user.perfil !== "admin"));
  });
  document.querySelectorAll("[data-admin]").forEach((el) => {
    el.classList.toggle("hidden", !adminDesktop);
  });

  if (user) {
    bar.classList.remove("hidden");
    saudacao.textContent = user.nome;
    document.getElementById("user-papel").textContent =
      user.perfil === "admin" ? `${user.cargo || "Administrador"} · Pontualiza Tech` : "Funcionário";
    document.getElementById("avatar-iniciais").textContent = iniciais(user.nome);
    const area = user.perfil === "admin" ? "Painel Administrativo" : "Área do Funcionário";
    document.getElementById("app-kicker").textContent = area;
    document.getElementById("saudacao-titulo").textContent = `Olá, ${user.nome.split(" ")[0]}! 👋`;
    document.getElementById("saudacao-texto").textContent =
      user.perfil === "admin"
        ? "Acompanhe a jornada da equipe e mantenha a gestão em dia."
        : "Bons resultados começam com um bom controle de ponto.";
  } else {
    bar.classList.add("hidden");
    saudacao.textContent = "";
  }
}

function relogio() {
  const dataEl = document.getElementById("data-atual");
  if (dataEl) {
    dataEl.textContent = new Date().toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }
}

function renderPonto() {
  const user = getSessao();
  if (!user) return;

  const dia = hojeISO();
  const reg = registroDoDia(user.id, dia);
  const marcas = (reg && reg.marcas) || [];
  const cal = htmlCalendario(true);
  document.getElementById("tbody-mini-cal").innerHTML = cal.html;
  document.getElementById("titulo-mini-mes").textContent = cal.titulo;

  const tipoAtual = marcas.length ? TIPOS[marcas.length - 1] : "—";
  const horaAtual = marcas.length ? marcas[marcas.length - 1] : "";
  document.getElementById("ultimo-registro").textContent = marcas.length
    ? `Último registro: ${tipoAtual} - ${horaCurta(horaAtual)} · ${formatarData(dia)}`
    : "Último registro: —";

  document.getElementById("kpi-entrada").textContent = horaCurta(marcas[0]);
  document.getElementById("kpi-saida").textContent = horaCurta(marcas[3]);
  document.getElementById("kpi-horas").textContent = horasTexto(marcas);
  document.getElementById("kpi-entrada-data").textContent = marcas[0] ? formatarData(dia) : "—";
  document.getElementById("kpi-saida-data").textContent = marcas[3] ? formatarData(dia) : "—";
  document.getElementById("kpi-dias").textContent = pontosDoUsuario(user.id).length;
  document.getElementById("kpi-status").textContent = `${MESES[new Date().getMonth()].slice(0, 3)}. de ${new Date().getFullYear()}`;

  const linhas = [];
  pontosDoUsuario(user.id)
    .slice()
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .forEach((p) => {
      (p.marcas || []).forEach((hora, i) => {
        const st = i === 0 && minutosDe(hora) > 8 * 60 ? "Leve atraso" : "Pontual";
        linhas.push({
          tipo: tipoCurto(i),
          hora: horaCurta(hora),
          data: formatarData(p.data),
          status: st,
          horas: i % 2 === 1 ? horasTexto(p.marcas) : "-"
        });
      });
    });

  const lista = document.getElementById("lista-hoje");
  const visiveis = linhas.slice(0, 4);
  document.getElementById("registros-contagem").textContent =
    `Exibindo ${visiveis.length} de ${linhas.length} registros`;

  if (!visiveis.length) {
    lista.innerHTML = "<li>Nenhum registro ainda.</li>";
    return;
  }
  lista.innerHTML = visiveis.map((l) => {
    return `<li><strong>${l.tipo}</strong><span>${l.hora}</span><span>${l.data}</span>${badge(l.status)}<span>${l.horas}</span></li>`;
  }).join("");
}

function renderCalendario() {
  const cal = htmlCalendario(false);
  document.getElementById("titulo-mes").textContent = cal.titulo;
  document.getElementById("tbody-calendario").innerHTML = cal.html;
}

function renderHistorico() {
  const user = getSessao();
  if (!user) return;
  const historico = pontosDoUsuario(user.id).slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  const tbody = document.getElementById("tbody-historico");
  if (!historico.length) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhuma marcação ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = historico.map((p) => {
    const m = p.marcas;
    const tipo = TIPOS[Math.max(0, m.length - 1)];
    const hora = m[m.length - 1] || "--:--";
    return `<tr>
      <td>${tipo}</td>
      <td>${horaCurta(hora)}</td>
      <td>${formatarData(p.data)}</td>
      <td>${badge(statusDia(m))}</td>
      <td>${totalHoras(m)}</td>
    </tr>`;
  }).join("");
}

function renderPerfil() {
  const user = getSessao();
  if (!user) return;
  document.getElementById("perfil-nome").textContent = user.nome;
  document.getElementById("perfil-email").textContent = user.email;
}

function renderAdmin() {
  const user = getSessao();
  if (!user || user.perfil !== "admin" || !isDesktop()) return;

  const users = getUsers();
  const colaboradores = users.filter((u) => u.perfil === "colaborador");
  const dia = hojeISO();
  const pontos = getPontos();
  const hojeRegs = pontos.filter((p) => p.data === dia && p.marcas.length);
  const comPontoHoje = new Set(hojeRegs.map((p) => p.userId));
  const atrasos = hojeRegs.filter((p) => statusDia(p.marcas) === "Atraso").length;
  const faltas = colaboradores.filter((c) => !comPontoHoje.has(c.id)).length;
  const incompletos = hojeRegs.filter((p) => p.marcas.length < 4).length;
  const perc = colaboradores.length ? Math.round((comPontoHoje.size / colaboradores.length) * 1000) / 10 : 0;

  let minutos = 0;
  hojeRegs.forEach((p) => {
    const t = totalHoras(p.marcas).split(":").map(Number);
    minutos += t[0] * 60 + t[1];
  });

  const pontuais = Math.max(0, comPontoHoje.size - atrasos);
  const base = Math.max(colaboradores.length, 1);
  const elP = document.getElementById("freq-presentes");
  const elA = document.getElementById("freq-atrasos");
  const elF = document.getElementById("freq-faltas");
  if (elP) elP.style.width = `${(pontuais / base) * 100}%`;
  if (elA) elA.style.width = `${(atrasos / base) * 100}%`;
  if (elF) elF.style.width = `${(faltas / base) * 100}%`;

  document.getElementById("admin-total").textContent = colaboradores.length;
  document.getElementById("admin-total-det").textContent = `${colaboradores.length} ativos`;
  document.getElementById("admin-hoje").textContent = comPontoHoje.size;
  document.getElementById("admin-perc").textContent = `${perc}% da equipe`;
  document.getElementById("admin-faltas").textContent = faltas + atrasos;
  document.getElementById("admin-faltas-det").textContent = `${faltas} faltas · ${atrasos} atrasos`;
  document.getElementById("admin-horas").textContent = `${Math.floor(minutos / 60)}h`;
  document.getElementById("admin-freq-data").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  });
  document.getElementById("admin-atualizado").textContent =
    `Atualizado agora · Registros vinculados à Pontualiza Tech`;
  document.getElementById("admin-alertas-n").textContent = String(
    Number(incompletos > 0) + Number(atrasos > 0)
  );

  document.getElementById("admin-alertas").innerHTML = `
    <li class="alerta-risco"><strong>${incompletos} marcações incompletas</strong><br>Revisar registros de hoje</li>
    <li class="alerta-aviso"><strong>${atrasos} atrasos hoje</strong><br>Acompanhar jornada da equipe</li>
  `;
  document.getElementById("admin-legenda").innerHTML = `
    <span><i class="dot dot-verde"></i> Presentes ${comPontoHoje.size} · ${perc}%</span>
    <span><i class="dot dot-laranja"></i> Atrasos ${atrasos}</span>
    <span><i class="dot dot-falta"></i> Faltas ${faltas}</span>
  `;

  const tbody = document.getElementById("tbody-admin");
  if (!colaboradores.length) {
    tbody.innerHTML = '<tr><td colspan="6">Nenhum colaborador cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = colaboradores.map((u) => {
    const reg = registroDoDia(u.id, dia);
    const m = (reg && reg.marcas) || [];
    const situacao = !m.length ? "Falta" : m.length < 4 ? "Em jornada" : statusDia(m);
    return `<tr>
      <td>${u.nome}</td>
      <td>${u.cargo || "—"}</td>
      <td>${m[0] ? horaCurta(m[0]) : "—"}</td>
      <td>${m[3] ? horaCurta(m[3]) : "—"}</td>
      <td>${badge(situacao)}</td>
      <td>${!m.length ? "—" : m.length < 4 ? "Em jornada" : horasTexto(m)}</td>
    </tr>`;
  }).join("");
}

function sair() {
  setSessao(null);
  atualizarNav();
  mostrarSecao("escolha");
}

function iniciar() {
  seed();
  relogio();
  setInterval(relogio, 1000);
  atualizarNav();

  const hash = (location.hash || "").replace("#", "");
  if (getSessao()) {
    mostrarSecao(hash || (getSessao().perfil === "admin" ? destinoAdmin() : "ponto"));
  } else {
    mostrarSecao(hash || "escolha");
  }

  document.querySelector("#app-guest").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ir]");
    if (!btn) return;
    const destino = btn.getAttribute("data-ir");
    const perfil = btn.getAttribute("data-perfil");

    if (perfil === "admin" && !isDesktop()) {
      alert("O painel administrativo só pode ser acessado no computador.");
      return;
    }

    if (perfil) {
      if (destino === "login") prepararLogin(perfil);
      if (destino === "cadastro") prepararCadastro(perfil);
    }
    mostrarSecao(destino);
  });

  document.querySelector("#app-logado nav").addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    mostrarSecao(a.getAttribute("href").slice(1));
  });

  document.querySelector("#app-logado").addEventListener("click", (e) => {
    const link = e.target.closest(".link-interno");
    if (!link) return;
    e.preventDefault();
    mostrarSecao(link.getAttribute("href").slice(1));
  });

  document.getElementById("form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const senha = document.getElementById("login-senha").value;
    const perfilEsperado = document.getElementById("login-perfil").value;
    const user = getUsers().find(
      (u) => u.email.toLowerCase() === email && u.senha === senha
    );

    if (!user) {
      mostrarMsg("login-msg", "E-mail ou senha inválidos.", "erro");
      return;
    }

    if (user.perfil !== perfilEsperado) {
      mostrarMsg(
        "login-msg",
        perfilEsperado === "admin"
          ? "Esta conta não é de administrador."
          : "Esta conta não é de funcionário. Entre pelo acesso de administrador no computador.",
        "erro"
      );
      return;
    }

    if (user.perfil === "admin" && !isDesktop()) {
      mostrarMsg("login-msg", "O painel administrativo só pode ser acessado no computador.", "erro");
      return;
    }

    setSessao(user.id);
    atualizarNav();
    mostrarSecao(user.perfil === "admin" ? destinoAdmin() : "ponto");
  });

  document.getElementById("form-cadastro").addEventListener("submit", (e) => {
    e.preventDefault();
    const perfil = document.getElementById("cad-perfil").value;

    if (perfil === "admin" && !isDesktop()) {
      mostrarMsg("cadastro-msg", "Cadastro de administrador só pode ser feito no computador.", "erro");
      return;
    }

    const senha = document.getElementById("cad-senha").value;
    const senha2 = document.getElementById("cad-senha2").value;
    if (senha !== senha2) {
      mostrarMsg("cadastro-msg", "As senhas não coincidem.", "erro");
      return;
    }

    if (perfil === "colaborador" && !document.getElementById("cad-codigo").value.trim()) {
      mostrarMsg("cadastro-msg", "Informe o código da empresa.", "erro");
      return;
    }

    if (perfil === "admin" && !document.getElementById("cad-termos").checked) {
      mostrarMsg("cadastro-msg", "Aceite os Termos de uso e a Política de privacidade.", "erro");
      return;
    }

    const users = getUsers();
    const email = document.getElementById("cad-email").value.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      mostrarMsg("cadastro-msg", "Este e-mail já está cadastrado.", "erro");
      return;
    }

    users.push({
      id: Date.now(),
      nome: document.getElementById("cad-nome").value.trim(),
      email,
      documento: document.getElementById("cad-doc").value.trim(),
      perfil,
      senha,
      cargo: perfil === "admin" ? "Administrador" : "Colaborador",
      codigoEmpresa: document.getElementById("cad-codigo").value.trim(),
      razao: document.getElementById("cad-razao").value.trim(),
      cnpj: document.getElementById("cad-cnpj").value.trim()
    });
    salvar(KEY_USERS, users);
    e.target.reset();
    document.getElementById("cad-perfil").value = perfil;
    mostrarMsg("cadastro-msg", "Cadastro feito. Faça login para continuar.", "ok");
  });

  document.getElementById("form-ponto").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = getSessao();
    if (!user) return;

    const dia = hojeISO();
    const hora = formatarHora(new Date());
    const pontos = getPontos();
    let reg = pontos.find((p) => p.userId === user.id && p.data === dia);

    if (!reg) {
      reg = { userId: user.id, data: dia, marcas: [] };
      pontos.push(reg);
    }

    if (reg.marcas.length >= 4) {
      mostrarMsg("ponto-msg", "Você já registrou as 4 marcações de hoje.", "erro");
      return;
    }

    const tipo = TIPOS[reg.marcas.length];
    reg.marcas.push(hora);
    salvar(KEY_PONTOS, pontos);
    mostrarMsg("ponto-msg", `${tipo} registrada às ${hora}.`, "ok");
    renderPonto();
  });

  document.getElementById("btn-sair").addEventListener("click", sair);
  document.getElementById("btn-sair-mobile-admin").addEventListener("click", sair);

  document.getElementById("tbody-admin").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-detalhe]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-detalhe"));
    const u = getUsers().find((x) => x.id === id);
    const dia = registroDoDia(id, hojeISO());
    const marcas = (dia && dia.marcas) || [];
    const linhas = TIPOS.map((t, i) => `${t}: ${horaCurta(marcas[i])}`).join("\n");
    alert(`${u.nome}\n${u.cargo || "Colaborador"}\n\nHoje (${formatarData(hojeISO())}):\n${linhas}\nTotal: ${totalHoras(marcas)}\nStatus: ${statusDia(marcas)}`);
  });

  MQ_DESKTOP.addEventListener("change", () => {
    atualizarNav();
    const user = getSessao();
    if (!user) return;
    if (user.perfil === "admin") mostrarSecao(destinoAdmin());
  });
}

document.addEventListener("DOMContentLoaded", iniciar);
