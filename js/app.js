/* MOLBOX — interface. Liga o analisador de fórmulas, o motor de conversão
   e a tabela periódica. Sem dependências externas. */

(function () {
  "use strict";

  const CHAVE = "molbox.estado.v1";

  const estado = {
    formula: "NaOH",
    analise: null,
    volumeMolarId: "cntp",
    origem: "massa",
    entradaBruta: "4,00",
    elementoAberto: null,
    telaAtual: "tela-mol",
    bancada: null,
    eq: { formula: "H2SO4", k: "2", funcao: "acido", normalidade: "0,1", volume: "1",
          eletrolito: "K+", valorEletrolito: "4,0", unidadeEletrolito: "mEqPorL",
          vAcido: "12,0", nAcido: "0,02", vAmostra: "100",
          vEdta: "8,0", cEdta: "0,01", vAmostraDureza: "100" },
    mol: { pacote: 5, comparacao: 0, elemento: "C", copoAgua: "180",
           dentes: [], primeiraResposta: null, tecnicaAberta: false,
           rodada: null, indiceRodada: 0, acertosRodada: 0, respondidaRodada: false, escolhaRodada: null },
    equacao: "CH4 + O2 -> CO2 + H2O",
    balanceada: null,
    montagem: { reagentes: [], produtos: [], lado: "reagentes",
                modo: "montar", categoria: "usadas", receita: null },
    treinoBal: { receita: null, balanceada: null, coefs: [], respondido: false,
                 acertou: false, contou: false, rodada: 0, feitos: 0, seguidos: 0 },
    esteq: { unidade: "g", quantidades: {}, purezas: {}, produtoRendimento: 0, massaObtida: "" },
    solucao: { formula: "NaCl", unidade: "molar", valor: "1,0", densidade: "1,00",
               dil: { c1: "1,0", v1: "", c2: "0,1", v2: "250" },
               mix: [{ c: "0,5", v: "100" }, { c: "0,1", v: "400" }] },
    preparo: { formula: "NaOH", volume: "500", concentracao: "0,1", pureza: "97", densidade: "",
               unidade: "molar", densSolucao: "1" },
    ph: { modo: "acidoFraco", indice: 4, concentracao: "0,1",
          tampaoAcido: "0,1", tampaoBase: "0,1" },
    titulacao: {
      inversa: false, indice: 4, cAnalito: "0,1", vAnalito: "25", cTitulante: "0,1", indicador: 6 },
    degrau: 0,
    exercicio: null,
    tipoAnterior: null,
    usouDica: false,
    respondido: false,
    consultaAberta: false,
    escolhaFeita: null,
    expressao: "",
    sessao: { certas: 0, total: 0, xp: 0 },
  };

  let progresso = null;

  const EXEMPLOS = ["NaOH", "H2SO4", "Ca(OH)2", "C6H12O6", "CuSO4·5H2O", "KMnO4", "Al2(SO4)3", "K3[Fe(CN)6]"];

  const $ = (s) => document.querySelector(s);
  const criar = (tag, props) => Object.assign(document.createElement(tag), props || {});

  /* ---------------- persistência ---------------- */

  function guardar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        formula: estado.formula,
        volumeMolarId: estado.volumeMolarId,
        equacao: estado.equacao,
        telaAtual: estado.telaAtual,
        origem: estado.origem,
        entradaBruta: estado.entradaBruta,
        chave: estado.mol.dentes,
      }));
    } catch (e) { /* modo privativo: seguir sem guardar */ }
  }

  function recuperar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return;
      const d = JSON.parse(bruto);
      if (d.formula) estado.formula = d.formula;
      if (d.equacao) estado.equacao = d.equacao;
      if (d.telaAtual) estado.telaAtual = d.telaAtual;
      if (d.volumeMolarId) estado.volumeMolarId = d.volumeMolarId;
      if (d.origem && GRANDEZAS[d.origem]) estado.origem = d.origem;
      if (Array.isArray(d.chave)) estado.mol.dentes = d.chave;
      if (d.entradaBruta) estado.entradaBruta = d.entradaBruta;
    } catch (e) { /* dado corrompido: começar limpo */ }
  }

  function volumeMolarAtual() {
    return VOLUMES_MOLARES.find(v => v.id === estado.volumeMolarId) || VOLUMES_MOLARES[0];
  }

  /* ---------------- navegação ---------------- */

  const TITULOS = {
    "tela-mol": "Mol: A Chave",
    "tela-massa": "Massa molar",
    "tela-ponte": "Ponte do mol",
    "tela-balancear": "Balancear",
    "tela-esteq": "Estequiometria",
    "tela-treino-balanceamento": "Treino: Balanceamento",
    "tela-solucoes": "Concentração",
    "tela-preparo": "Preparo",
    "tela-ph": "Ácidos e bases",
    "tela-equivalente": "Equivalente e normalidade",
    "tela-bancada": "Titulação virtual",
    "tela-titulacao": "Titulação (Curvas)",
    "tela-sobre": "Sobre",
    "tela-treino": "Treino",
    "tela-progresso": "Progresso",
    "tela-tabela": "Tabela periódica",
  };

  function estreita() {
    if (typeof window.matchMedia === "function") return window.matchMedia("(max-width: 899px)").matches;
    return window.innerWidth < 900; // reserva para WebViews antigas
  }

  function abrirMenu() {
    $("#sidebar").classList.add("aberta");
    $("#cortina").hidden = false;
    $("#menuBtn").setAttribute("aria-expanded", "true");
  }

  function fecharMenu() {
    $("#sidebar").classList.remove("aberta");
    $("#cortina").hidden = true;
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }

  function mostrarTela(id) {
    estado.telaAtual = id;
    guardar();
    for (const s of document.querySelectorAll("main > section")) s.hidden = (s.id !== id);
    for (const b of document.querySelectorAll(".menu .item")) {
      if (b.dataset.tela && b.dataset.tela === id) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
    $("#tituloPagina").textContent = TITULOS[id] || "SUPER MOLBOX";
    if (typeof window.scrollTo === "function") { try { window.scrollTo(0, 0); } catch (e) {} }
    if (estreita()) fecharMenu();

    if (id === "tela-sobre") desenharSobre();
    if (id === "tela-mol") desenharMol();
    if (id === "tela-ponte") desenharPonte();
    if (id === "tela-esteq") desenharEstequiometria();
    if (id === "tela-treino-balanceamento") entrarNoTreinoBal();
    if (id === "tela-solucoes") desenharSolucoes();
    if (id === "tela-preparo") desenharPreparo();
    if (id === "tela-ph") desenharAcidoBase();
    if (id === "tela-equivalente") desenharEquivalente();
    if (id === "tela-bancada") desenharBancada();
    if (id === "tela-titulacao") desenharTitulacao();
    if (id === "tela-treino") entrarNoTreino();
    if (id === "tela-progresso") desenharProgresso();
  }



  /* ---------------- tela: sobre ---------------- */

  function desenharSobre() {
    const alvo = $("#painel-sobre");
    alvo.innerHTML = "";
    const autor = dadosDoAutor();

    const capa = criar("div", { className: "cartao capa-sobre" });
    capa.innerHTML =
      `<p class="sobretitulo">SOBRE O APLICATIVO</p>` +
      `<h1 style="margin:0 0 var(--mb-e3)">SUPER MOLBOX</h1>` +
      `<p class="lede-mol">Do átomo ao mol, do mol à bancada.</p>` +
      `<p>Um guia de bolso de Química para quem está aprendendo — e para quem já trabalha ` +
      `e precisa conferir uma conta antes de pesar.</p>`;
    alvo.appendChild(capa);

    // --- por que existe ---
    const porque = criar("div", { className: "cartao" });
    porque.innerHTML = `<h2 style="margin-top:0">Por que este aplicativo existe</h2>`;
    for (const m of motivosDoAplicativo()) {
      const item = criar("div", { className: "motivo-sobre" });
      item.innerHTML = `<p class="titulo-motivo">${m.titulo}</p><p>${m.texto}</p>`;
      porque.appendChild(item);
    }
    alvo.appendChild(porque);

    // --- o autor ---
    const quem = criar("div", { className: "cartao cartao-autor" });
    quem.innerHTML =
      `<h2 style="margin-top:0">Quem faz</h2>` +
      `<p class="nome-autor">${autor.nome}</p>` +
      `<p class="titulo-autor">${autor.titulo}</p>` +
      autor.apresentacao.map((p) => `<p>${p}</p>`).join("");

    const canal = criar("a", {
      className: "botao botao-canal", href: autor.canal.url,
      target: "_blank", rel: "noopener noreferrer",
    });
    canal.innerHTML = `<span aria-hidden="true">▶</span> ${autor.canal.rotulo}`;
    quem.appendChild(canal);
    alvo.appendChild(quem);

    // --- colaboração ---
    const juntos = criar("div", { className: "cartao" });
    juntos.innerHTML = `<h2 style="margin-top:0">Feito a várias mãos</h2>` +
      `<p>Nenhuma tela deste aplicativo saiu pronta da primeira vez. O que existe aqui ` +
      `passou por revisão de colegas e, sobretudo, por uso real em sala de aula.</p>`;
    for (const c of colaboradores()) {
      const item = criar("div", { className: "colaborador" });
      item.innerHTML = `<p class="quem">${c.quem}</p><p>${c.texto}</p>`;
      juntos.appendChild(item);
    }
    juntos.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Se você usou o SUPER MOLBOX em aula e tem uma crítica, ela é bem-vinda. " +
        "As melhores mudanças deste aplicativo vieram de alguém dizendo que alguma coisa não funcionava.",
    }));
    alvo.appendChild(juntos);

    // --- ficha técnica ---
    const ficha = criar("div", { className: "cartao" });
    ficha.innerHTML =
      `<h2 style="margin-top:0">Ficha técnica</h2>` +
      `<p class="ajuda">Aplicativo web instalável, sem cadastro e sem servidor. Todo o progresso ` +
      `fica guardado apenas neste aparelho, e nenhum dado é enviado para lugar nenhum. ` +
      `Depois da primeira visita, funciona sem internet.</p>` +
      `<p class="ajuda">As massas atômicas seguem a tabela IUPAC 2021. As orientações de segurança ` +
      `vêm de fichas de segurança e manuais de boas práticas, e não substituem a FISPQ do lote ` +
      `nem as normas do seu laboratório.</p>`;
    alvo.appendChild(ficha);
  }

  /* ---------------- tela: o que é o mol ---------------- */

  function secao(alvo, titulo, sobretitulo) {
    const cartao = criar("div", { className: "cartao secao-mol" });
    if (sobretitulo) cartao.appendChild(criar("p", { className: "sobretitulo", textContent: sobretitulo }));
    cartao.appendChild(criar("h2", { textContent: titulo, style: "margin-top:0" }));
    alvo.appendChild(cartao);
    return cartao;
  }

  function desenharMol() {
    const alvo = $("#painel-mol");
    alvo.innerHTML = "";

    /* --- abertura: a chave --- */
    const capa = criar("div", { className: "cartao capa-mol" });
    capa.innerHTML =
      `<h1 style="margin:0 0 var(--mb-e3)">Mol: A Chave</h1>` +
      `<p class="lede-mol">Pegue aqui <strong>A Chave</strong> 🔑 para destravar sua vida profissional com a Química.</p>` +
      `<p>Sem o mol você não controla reação, dose, rendimento nem laudo. ` +
      `Com o mol, a Tabela Periódica vira instrumento de bancada e a balança passa a “contar” partículas.</p>` +
      `<p>Você não consegue contar átomos. Ninguém consegue. ` +
      `Eles são pequenos demais, numerosos demais e leves demais. ` +
      `Ainda assim, todo dia alguém precisa saber <em>quantas</em> — porque o número de partículas decide se a reação ` +
      `acontece, quanto de produto sai e qual dose faz efeito.</p>` +
      `<p class="fecho-mol">O mol resolve isso. E a solução é mais simples do que parece: <strong>é um pacote</strong> — como a dúzia.</p>`;
    alvo.appendChild(capa);

    ganharDente("chegou");
    desenharEmblema(alvo);

    /* --- 1. o que a chave destrava: o impacto vem antes do conceito --- */
    const sDestrava = secao(alvo, "O que essa chave destrava", "POR QUE IMPORTA");
    sDestrava.appendChild(criar("p", {
      textContent: "Entender o mol não é só passar de ano. É a ferramenta que abre praticamente tudo que se faz com química na vida profissional.",
    }));
    const lista = criar("div", { className: "aplicacoes" });
    for (const a of aplicacoesProfissionais()) {
      const item = criar("div", { className: "aplicacao" });
      item.innerHTML = `<p class="area"><span class="emoji-area" aria-hidden="true">${a.emoji}</span> ${a.area}</p><p>${a.texto}</p>`;
      lista.appendChild(item);
    }
    sDestrava.appendChild(lista);

    /* --- 2. pacotes --- */
    const s1 = secao(alvo, "Você já usa pacotes a vida inteira", "A IDEIA CENTRAL");
    s1.appendChild(criar("p", {
      textContent: "Ninguém pede quinhentas folhas de papel na papelaria: pede uma resma. Ninguém compra doze ovos: compra uma dúzia. Sempre que uma coisa é numerosa demais para contar uma a uma, a gente inventa um pacote e passa a contar pacotes.",
    }));

    const chips = criar("div", { className: "chips" });
    pacotesConhecidos().forEach((p, i) => {
      const b = criar("button", { type: "button", className: "chip" + (i === estado.mol.pacote ? " ativo" : "") });
      b.textContent = p.nome;
      b.addEventListener("click", () => { estado.mol.pacote = i; ganharDente("pacote"); desenharMol(); });
      chips.appendChild(b);
    });
    s1.appendChild(chips);

    const p = pacotesConhecidos()[estado.mol.pacote];
    const cartaoPacote = criar("div", { className: "quadro-pacote" + (p.destaque ? " destaque-pacote" : "") });
    cartaoPacote.innerHTML =
      `<p class="nome-pacote">1 ${p.nome} =</p>` +
      `<p class="qtd-pacote">${Number.isInteger(p.quantidade) && p.quantidade < 1e6
        ? p.quantidade.toLocaleString("pt-BR")
        : formatarNumero(p.quantidade, 6)}</p>` +
      `<p class="uso-pacote">de ${p.usoPara}</p>` +
      `<p class="porque-pacote">${p.porque}</p>`;
    s1.appendChild(cartaoPacote);
    s1.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Repare que nenhum desses números é redondo por acaso. Cada um foi escolhido para resolver um problema prático de quem contava. Com o mol não é diferente — só que o problema era muito maior.",
    }));

    desenharPrimeiraPergunta(s1);

    /* --- 3. tamanho do pacote --- */
    const s2 = secao(alvo, "Quão grande é esse pacote", "PARA SENTIR O TAMANHO");
    s2.appendChild(criar("p", {
      innerHTML: `Um mol são <strong>602 214 076 000 000 000 000 000</strong> unidades. Ler esse número em voz alta não ajuda em nada — ` +
        `ninguém tem intuição para vinte e três zeros. Então escolha um objeto do dia a dia e veja o que acontece quando você junta um mol dele.`,
    }));

    const chipsObj = criar("div", { className: "chips" });
    comparacoesConhecidas().forEach((c, i) => {
      const b = criar("button", { type: "button", className: "chip" + (i === estado.mol.comparacao ? " ativo" : "") });
      b.textContent = `${c.emoji} ${c.nome}`;
      b.addEventListener("click", () => { estado.mol.comparacao = i; ganharDente("tamanho"); desenharMol(); });
      chipsObj.appendChild(b);
    });
    s2.appendChild(chipsObj);

    const comp = comparacoesConhecidas()[estado.mol.comparacao];
    const r = comp.calcular(constantesFisicas().AVOGADRO);
    const quadro = criar("div", { className: "quadro-comparacao" });
    quadro.innerHTML =
      `<p class="ajuda" style="margin:0 0 6px">Um mol de ${comp.nome} — ${comp.medida.nota} — dá</p>` +
      `<p class="resultado-comparacao">${r.resultado}</p>` +
      `<p class="conta-comparacao">${r.conta}</p>` +
      `<p class="referencia-comparacao">${r.referencia}</p>`;
    s2.appendChild(quadro);

    /* --- 4. o contraste --- */
    const s3 = secao(alvo, "Agora o golpe", "O CONTRASTE");
    const contraste = contrasteDaAgua(analisar("H2O").massaMolar);
    s3.appendChild(criar("p", {
      innerHTML: `Você viu que um mol de <strong>gotas</strong> de água encheria ${contraste.gotas.texto} de todos os oceanos do planeta.`,
    }));

    const duasColunas = criar("div", { className: "contraste" });
    duasColunas.innerHTML =
      `<div class="lado"><p class="rot-contraste">1 mol de GOTAS</p>` +
      `<p class="val-contraste">${contraste.gotas.texto}</p>` +
      `<p class="ajuda">de toda a água dos oceanos</p></div>` +
      `<div class="lado"><p class="rot-contraste">1 mol de MOLÉCULAS</p>` +
      `<p class="val-contraste destaque-val">${contraste.moleculas.texto}</p>` +
      `<p class="ajuda">uma colher de sopa</p></div>`;
    s3.appendChild(duasColunas);
    s3.appendChild(criar("p", {
      innerHTML: `A mesma quantidade. O mesmo pacote. A diferença entre encher parte de um oceano e encher uma colher ` +
        `é exatamente <strong>o tamanho de uma molécula de água</strong>.`,
    }));
    s3.appendChild(criar("div", {
      className: "dica-caixa",
      textContent: "É por isso que o mol precisa ser tão grande. Não é exagero de químico: é o tamanho necessário para que um pacote de partículas caiba numa colher e possa ser pesado numa balança comum.",
    }));

    /* --- 5. por que este número --- */
    /* Esta seção vem recolhida de propósito. Ela é a parte mais bonita da
       história e a mais difícil, e deixá-la aberta alonga a página justamente
       onde o aluno com dificuldade já está cansado. Recolhida, ela encurta a
       tela e — mais importante — dá permissão explícita para pular, sem que
       pular pareça fracasso. Quem quer, abre. */
    const cartaoTecnico = criar("div", { className: "cartao secao-mol secao-opcional" });
    cartaoTecnico.appendChild(criar("p", { className: "sobretitulo", textContent: "PARA QUEM QUER IR MAIS FUNDO" }));
    const s4 = criar("details", { className: "aprofundamento" });
    if (estado.mol.tecnicaAberta) s4.setAttribute("open", "");
    s4.addEventListener("toggle", () => { estado.mol.tecnicaAberta = s4.hasAttribute("open"); });
    const resumoTecnico = criar("summary");
    resumoTecnico.innerHTML =
      `<span class="titulo-opcional">Por que 6,02×10²³ e não um número redondo</span>` +
      `<span class="ajuda-opcional">Opcional. Dá para seguir sem isso e voltar depois.</span>`;
    s4.appendChild(resumoTecnico);
    cartaoTecnico.appendChild(s4);
    alvo.appendChild(cartaoTecnico);

    s4.appendChild(criar("p", {
      textContent: "Aqui está a parte genial, e é a que quase ninguém conta. O tamanho do pacote não foi escolhido para ser bonito. Foi escolhido para que um número que você lê na tabela periódica sirva para duas coisas ao mesmo tempo.",
    }));

    const chipsEl = criar("div", { className: "chips" });
    for (const sim of elementosDaVitrine()) {
      const b = criar("button", { type: "button", className: "chip" + (sim === estado.mol.elemento ? " ativo" : "") });
      b.textContent = sim;
      b.addEventListener("click", () => { estado.mol.elemento = sim; desenharMol(); });
      chipsEl.appendChild(b);
    }
    s4.appendChild(chipsEl);

    const el = pontesDoElemento(estado.mol.elemento);
    const ponte = criar("div", { className: "quadro-ponte" });
    ponte.innerHTML =
      `<div class="lado-ponte"><p class="rot-ponte">1 ÁTOMO de ${el.nome}</p>` +
      `<p class="val-ponte">${formatarNumero(el.massaAtomica, 5)} u</p>` +
      `<p class="ajuda">${el.z} prótons e ${el.neutrons} nêutrons no núcleo</p></div>` +
      `<div class="seta-ponte" aria-hidden="true">×&nbsp;6,02×10²³</div>` +
      `<div class="lado-ponte"><p class="rot-ponte">1 MOL de ${el.nome}</p>` +
      `<p class="val-ponte destaque-val">${formatarNumero(el.massaMolar, 5)} g</p>` +
      `<p class="ajuda">${formatarNumero(constantesFisicas().AVOGADRO, 4)} átomos</p></div>`;
    s4.appendChild(ponte);
    s4.appendChild(criar("p", {
      innerHTML: `<strong>É o mesmo número dos dois lados.</strong> A massa de um átomo em unidades de massa atômica e a massa ` +
        `de um mol em gramas dão o mesmo valor. O tamanho do pacote foi calibrado para que isso acontecesse.`,
    }));
    s4.appendChild(criar("p", {
      textContent: "E é por isso que a tabela periódica é um instrumento de bancada, não um cartaz. Aquele número embaixo do símbolo diz, ao mesmo tempo, quanto pesa um átomo sozinho e quantos gramas você precisa pesar para ter um pacote inteiro deles.",
    }));
    s4.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Um detalhe honesto: desde 2019 o mol é definido fixando o número de Avogadro em 6,02214076×10²³ exatamente, e não mais pelo carbono-12. A correspondência entre u e g/mol deixou de ser exata por definição, mas continua valendo até a nona casa decimal. Nenhum cálculo de laboratório sente a diferença.",
    }));


    /* --- 6. as reações --- */
    const s5 = secao(alvo, "Por que isso decide se a reação dá certo", "NA BANCADA");
    s5.appendChild(criar("p", {
      textContent: "As substâncias não reagem em gramas. Elas reagem em partículas, e em proporções de números inteiros: duas moléculas de hidrogênio para cada molécula de oxigênio, nunca uma vírgula sete.",
    }));
    s5.appendChild(criar("div", {
      className: "equacao-vista", style: "font-size:var(--mb-t-titulo-3);padding:var(--mb-e3) 0",
      innerHTML: `<span class="termo-eq"><b class="coef">2</b> H₂</span> <span class="op">+</span> <span class="termo-eq">O₂</span> <span class="op seta">→</span> <span class="termo-eq"><b class="coef">2</b> H₂O</span>`,
    }));
    s5.appendChild(criar("p", {
      textContent: "Só que a balança pesa gramas. Nenhum laboratório do mundo tem um instrumento que conte moléculas. É aí que o mol entra: ele traduz o que a reação exige para o que a balança consegue medir.",
    }));

    const entradaCopo = criar("div", { style: "max-width:280px" });
    campoTexto(entradaCopo, {
      id: "mol-copo", rotulo: "Quero produzir esta massa de água (g)", valor: estado.mol.copoAgua,
      aoMudar: (v) => { estado.mol.copoAgua = v; atualizarReceita(); },
    });
    s5.appendChild(entradaCopo);
    s5.appendChild(criar("div", { id: "saida-receita" }));

    /* --- 7. vídeo --- */
    desenharVideo(alvo);

    /* --- 8. degrau 0 --- */
    desenharTesteRapido(alvo);

    atualizarReceita();
  }

  function atualizarReceita() {
    const alvo = $("#saida-receita");
    if (!alvo) return;
    alvo.innerHTML = "";
    const massa = lerNumero(estado.mol.copoAgua);
    if (!(massa > 0)) {
      alvo.innerHTML = `<p class="ajuda">Informe uma massa de água.</p>`;
      return;
    }

    const r = receitaDaAgua(massa);
    const tabela = criar("table", { style: "margin-top:var(--mb-e3)" });
    tabela.innerHTML = `<thead><tr><th>Substância</th><th>Partículas</th><th>Mol</th><th>Na balança</th></tr></thead>`;
    const corpo = criar("tbody");
    const linhas = [
      ["H₂", r.molH2 * CONSTANTES.AVOGADRO, r.molH2, r.massaH2],
      ["O₂", r.molO2 * CONSTANTES.AVOGADRO, r.molO2, r.massaO2],
      ["H₂O", r.moleculasAgua, r.molAgua, r.massaAgua],
    ];
    for (const [nome, part, mol, g] of linhas) {
      const tr = criar("tr");
      tr.innerHTML = `<td style="font-family:var(--mb-fonte-dado)">${nome}</td>` +
        `<td class="num">${formatarNumero(part, 3)}</td>` +
        `<td class="num">${formatarNumero(mol, 4)}</td>` +
        `<td class="num" style="color:var(--mb-energia);font-weight:500">${formatarNumero(g, 4)} g</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    alvo.appendChild(tabela);

    alvo.appendChild(criar("div", {
      className: "motivo",
      innerHTML: `Você jamais conseguiria contar ${formatarNumero(r.moleculasAgua, 3)} moléculas. ` +
        `Mas consegue pesar ${formatarNumero(r.massaH2, 4)} g e ${formatarNumero(r.massaO2, 4)} g numa balança comum. ` +
        `<strong>É isso que o mol faz:</strong> transforma uma contagem impossível numa pesagem trivial.`,
    }));
  }


  /* O vídeo é a única coisa no aplicativo que depende de internet. Por isso
     ele entra como fachada: nada do YouTube é carregado até o aluno tocar em
     assistir. Isso mantém a página inteira funcionando offline, evita os
     rastreadores de terceiros no carregamento e não deixa um retângulo
     quebrado na tela de quem está sem sinal. */
  function desenharVideo(alvo) {
    const v = videoDaAula();
    const cartao = criar("div", { className: "cartao cartao-video" });
    cartao.innerHTML =
      `<p class="sobretitulo">VÍDEO</p>` +
      `<h2 style="margin-top:0">Assista a explicação</h2>` +
      `<p style="max-width:62ch">${v.descricao}</p>`;

    const moldura = criar("div", { className: "moldura-video" });
    const fachada = criar("button", { type: "button", className: "fachada-video" });
    fachada.setAttribute("aria-label", `Assistir: ${v.titulo}`);
    fachada.innerHTML =
      `<span class="play" aria-hidden="true"></span>` +
      `<span class="rotulo-video">${v.titulo}</span>` +
      `<span class="aviso-video">O vídeo abre pelo YouTube e precisa de internet</span>`;

    fachada.addEventListener("click", () => {
      if (navigator.onLine === false) {
        moldura.innerHTML = `<div class="sem-rede"><p><strong>Sem internet agora.</strong></p>` +
          `<p>O resto desta página funciona offline — só o vídeo é que precisa de conexão. ` +
          `Role para baixo e continue pela leitura; o vídeo cobre exatamente o mesmo conteúdo.</p></div>`;
        return;
      }
      const quadro = criar("iframe", {
        src: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&autoplay=1`,
        title: v.titulo,
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        loading: "lazy",
      });
      quadro.setAttribute("allowfullscreen", "");
      quadro.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      moldura.innerHTML = "";
      moldura.appendChild(quadro);
    });

    moldura.appendChild(fachada);
    cartao.appendChild(moldura);
    cartao.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Vídeo e leitura cobrem o mesmo conteúdo. Se preferir começar pelo vídeo, ele está aqui a qualquer momento — as partes interativas acima funcionam de qualquer jeito.",
    }));
    alvo.appendChild(cartao);
  }



  /* ---------------- o emblema da chave ---------------- */

  function ganharDente(id) {
    if (estado.mol.dentes.indexOf(id) >= 0) return false;
    estado.mol.dentes.push(id);
    guardar();
    return true;
  }

  function desenharEmblema(alvo) {
    const total = dentesDaChave().length;
    const tem = estado.mol.dentes.length;
    const cartao = criar("div", { className: "emblema-chave" });

    const arte = criar("div", { className: "arte-chave" });
    arte.innerHTML = svgDaChave(estado.mol.dentes);
    cartao.appendChild(arte);

    const lado = criar("div", { className: "texto-chave" });
    lado.appendChild(criar("p", {
      className: "contagem-chave",
      textContent: tem >= total ? "Chave completa" : `${tem} de ${total} dentes`,
    }));

    const faltando = dentesDaChave().filter((d) => estado.mol.dentes.indexOf(d.id) < 0);
    lado.appendChild(criar("p", {
      className: "ajuda",
      textContent: faltando.length === 0
        ? "Você percorreu a tela inteira. A chave está pronta para o treino."
        : `Falta: ${faltando[0].dica.toLowerCase()}.`,
    }));

    const lista = criar("ul", { className: "dentes-lista" });
    for (const d of dentesDaChave()) {
      const item = criar("li", { className: estado.mol.dentes.indexOf(d.id) >= 0 ? "conquistado" : "" });
      item.innerHTML = `<span class="marca" aria-hidden="true"></span>${d.rotulo}`;
      lista.appendChild(item);
    }
    lado.appendChild(lista);

    cartao.appendChild(lado);
    alvo.appendChild(cartao);
  }

  /* ---------------- a vitória antecipada ---------------- */

  /* Uma única pergunta, logo depois da analogia da dúzia. Existe porque o
     teste rápido fica no fim da tela: quem desiste no meio nunca chega nele,
     ou seja, o único momento de "eu consegui" estava guardado justamente para
     quem não precisava dele. Aqui a primeira sensação de competência chega em
     dois minutos de leitura.

     A pergunta é fixa, e não sorteada: ela cobra exatamente o que o aluno
     acabou de ler. Sortear aqui poderia cair numa pergunta sobre um trecho
     que ainda está lá embaixo. */
  function desenharPrimeiraPergunta(alvo) {
    const caixa = criar("div", { className: "primeira-pergunta" });
    caixa.appendChild(criar("p", { className: "rot-primeira", textContent: "RESPONDA DE CABEÇA" }));

    const q = perguntaDaIdeiaPorId("tamanho-do-pacote");
    const pergunta = criar("p", { className: "enunciado" });
    pergunta.innerHTML = q.enunciado;
    caixa.appendChild(pergunta);

    const respondida = estado.mol.primeiraResposta !== null;
    const opcoes = criar("div", { className: "alternativas" });
    q.opcoes.forEach((op, i) => {
      const b = criar("button", { type: "button", className: "alternativa" });
      b.innerHTML = `<span class="letra" aria-hidden="true">${"ABCDE"[i]}</span><span>${op.texto}</span>`;
      if (respondida) {
        b.disabled = true;
        if (op.correta) b.classList.add("certa");
        if (op.texto === estado.mol.primeiraResposta && !op.correta) b.classList.add("errada");
      } else {
        b.addEventListener("click", () => {
          // guarda o texto, não o índice: as alternativas são embaralhadas a
          // cada montagem, e o índice não sobreviveria ao redesenho
          estado.mol.primeiraResposta = op.texto;
          const acertou = !!op.correta;
          registrarResposta(progresso, q, acertou, false);
          atualizarResumoLateral();
          if (acertou) ganharDente("primeira");
          desenharMol();
        });
      }
      opcoes.appendChild(b);
    });
    caixa.appendChild(opcoes);

    if (respondida) {
      const escolhida = q.opcoes.filter((o) => o.texto === estado.mol.primeiraResposta)[0];
      const acertou = escolhida && escolhida.correta;
      const veredito = criar("div", { className: "veredito " + (acertou ? "certo" : "diagnosticado") });
      veredito.innerHTML =
        `<span class="selo">${acertou ? "CERTO" : "QUASE"}</span>` +
        `<p>${acertou
          ? "Isso mesmo. Você acabou de usar a ideia central do SUPER MOLBOX — e ela já vale como acerto no seu progresso."
          : (escolhida && escolhida.diagnostico) || "Releia o quadro acima com calma."}</p>`;
      caixa.appendChild(veredito);

      if (!acertou) {
        const tentar = criar("button", { type: "button", className: "botao secundario", textContent: "Tentar de novo" });
        tentar.addEventListener("click", () => { estado.mol.primeiraResposta = null; desenharMol(); });
        caixa.appendChild(criar("div", { className: "acoes" })).appendChild(tentar);
      }
    }

    alvo.appendChild(caixa);
  }

  /* ---------------- teste rápido do fim da tela ---------------- */

  /* Uma rodada fechada de cinco perguntas, com começo, meio e fim — diferente
     do treino, que é infinito. As perguntas vêm do mesmo banco do degrau 0 e
     passam pela mesma correção, e cada acerto conta para o progresso de
     verdade. Duas listas separadas de perguntas divergiriam com o tempo, e o
     aluno acabaria vendo respostas diferentes para a mesma dúvida. */
  function desenharTesteRapido(alvo) {
    const s = secao(alvo, "Degrau 0 — teste rápido", "TREINO INICIAL");
    s.appendChild(criar("p", {
      textContent: "Perguntas bem simples sobre o que você acabou de ver. O objetivo é só confirmar que a ideia do pacote ficou clara. Cada acerto conta no seu progresso.",
    }));
    s.appendChild(criar("div", { id: "teste-rapido" }));
    if (!estado.mol.rodada) iniciarRodada();
    else desenharRodada();
  }

  function iniciarRodada() {
    estado.mol.rodada = rodadaDaIdeia(5);
    estado.mol.indiceRodada = 0;
    estado.mol.acertosRodada = 0;
    estado.mol.respondidaRodada = false;
    estado.mol.escolhaRodada = null;
    desenharRodada();
  }

  function desenharRodada() {
    const alvo = $("#teste-rapido");
    if (!alvo) return;
    alvo.innerHTML = "";
    const m = estado.mol;
    const total = m.rodada.length;

    if (m.indiceRodada >= total) {
      ganharDente("degrau");
      const acertos = m.acertosRodada;
      const pct = Math.round((acertos / total) * 100);
      let titulo, texto;
      if (pct === 100) {
        titulo = "Perfeito. Você mandou bem.";
        texto = `Acertou todas as ${total} perguntas. A ideia do pacote já está clara — pode seguir com confiança.`;
      } else if (pct >= 60) {
        titulo = "Muito bom.";
        texto = `Você acertou ${acertos} de ${total}. Já entendeu o essencial. Vale reler o trecho das que escaparam.`;
      } else {
        titulo = "Vale uma segunda passada.";
        texto = `Você acertou ${acertos} de ${total}. Sem problema: volte à analogia da dúzia lá em cima e tente de novo. Aqui não existe nota.`;
      }

      const resultado = criar("div", { className: "resultado-rodada" });
      resultado.innerHTML = `<h3 style="margin-top:0">${titulo}</h3><p>${texto}</p>`;
      const acoes = criar("div", { className: "acoes" });
      const denovo = criar("button", { type: "button", className: "botao secundario", textContent: "Tentar novamente" });
      denovo.addEventListener("click", iniciarRodada);
      acoes.appendChild(denovo);
      const irTreino = criar("button", { type: "button", className: "botao", textContent: "Ir para o treino completo" });
      irTreino.addEventListener("click", () => mostrarTela("tela-treino"));
      acoes.appendChild(irTreino);
      resultado.appendChild(acoes);
      alvo.appendChild(resultado);
      return;
    }

    const q = m.rodada[m.indiceRodada];

    const barra = criar("div", { className: "progresso-rodada" });
    barra.innerHTML =
      `<span>Pergunta ${m.indiceRodada + 1} de ${total}</span>` +
      `<span class="trilho-rodada"><span class="preenche-rodada" style="width:${(m.indiceRodada / total) * 100}%"></span></span>`;
    alvo.appendChild(barra);

    const pergunta = criar("p", { className: "enunciado" });
    pergunta.innerHTML = q.enunciado;
    alvo.appendChild(pergunta);

    const opcoes = criar("div", { className: "alternativas" });
    q.opcoes.forEach((op, i) => {
      const b = criar("button", { type: "button", className: "alternativa" });
      b.innerHTML = `<span class="letra" aria-hidden="true">${"ABCDE"[i]}</span><span>${op.texto}</span>`;
      if (m.respondidaRodada) {
        b.disabled = true;
        if (op.correta) b.classList.add("certa");
        if (i === m.escolhaRodada && !op.correta) b.classList.add("errada");
      } else {
        b.addEventListener("click", () => responderRodada(i));
      }
      opcoes.appendChild(b);
    });
    alvo.appendChild(opcoes);

    if (m.respondidaRodada) {
      const veredito = corrigir(q, String(m.escolhaRodada));
      const caixa = criar("div", { className: "veredito " + veredito.situacao });
      caixa.innerHTML =
        `<span class="selo">${veredito.situacao === "certo" ? "CERTO" : "QUASE"}</span>` +
        `<p>${veredito.mensagem}</p>`;
      alvo.appendChild(caixa);

      alvo.appendChild(criar("div", { className: "resolucao", innerHTML: q.resolucao }));

      const acoes = criar("div", { className: "acoes" });
      const seguinte = criar("button", {
        type: "button", className: "botao",
        textContent: m.indiceRodada + 1 >= total ? "Ver resultado" : "Próxima pergunta",
      });
      seguinte.addEventListener("click", () => {
        m.indiceRodada += 1;
        m.respondidaRodada = false;
        m.escolhaRodada = null;
        desenharRodada();
      });
      acoes.appendChild(seguinte);
      alvo.appendChild(acoes);
    }
  }

  function responderRodada(indice) {
    const m = estado.mol;
    const q = m.rodada[m.indiceRodada];
    const veredito = corrigir(q, String(indice));
    m.escolhaRodada = indice;
    m.respondidaRodada = true;
    const acertou = veredito.situacao === "certo";
    if (acertou) m.acertosRodada += 1;
    const efeito = registrarResposta(progresso, q, acertou, false);
    atualizarResumoLateral();
    desenharRodada();
    if (efeito.subiuDegrau) mostrarDesbloqueio(efeito.subiuDegrau);
  }


  /* ---------------- aviso de degrau desbloqueado ----------------

     Na primeira aula em sala, uma aluna apontou que o desbloqueio passava
     despercebido: a mensagem era uma linha dentro da caixa de correção, no
     meio de outras informações. Sem perceber que havia um degrau novo, vários
     alunos continuaram repetindo o degrau 0.

     Este aviso ocupa a tela e faz uma pergunta direta, porque é uma decisão
     que o aluno precisa tomar, não um recado que ele precisa ler. */
  function mostrarDesbloqueio(numero) {
    const d = degrauPorNumero(numero);
    if (!d || document.getElementById("desbloqueio")) return;

    const overlay = criar("div", { id: "desbloqueio", className: "onboarding desbloqueio" });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "desbloqueio-titulo");

    const painel = criar("div", { className: "onboarding-painel painel-desbloqueio" });
    painel.innerHTML =
      `<p class="selo-desbloqueio">DEGRAU ${numero} DESBLOQUEADO</p>` +
      `<h2 id="desbloqueio-titulo">${d.nome}</h2>` +
      `<p class="desafio-desbloqueio">Você será desafiado em <strong>${d.resumo}</strong>.</p>` +
      `<p class="ajuda">Você pode continuar treinando aqui quando quiser — mas os acertos ` +
      `repetidos num degrau que você já domina valem cada vez menos XP. O degrau novo vale cheio.</p>`;

    const acoes = criar("div", { className: "onboarding-acoes" });
    const depois = criar("button", { type: "button", className: "botao secundario", textContent: "Agora não" });
    depois.addEventListener("click", fecharDesbloqueio);
    acoes.appendChild(depois);

    const aceitar = criar("button", { type: "button", className: "botao", textContent: "Aceitar o desafio →" });
    aceitar.addEventListener("click", () => {
      fecharDesbloqueio();
      estado.degrau = numero;
      estado.tipoAnterior = null;
      mostrarTela("tela-treino");
      desenharDegraus();
      proximoExercicio();
    });
    acoes.appendChild(aceitar);

    painel.appendChild(acoes);
    overlay.appendChild(painel);
    document.body.appendChild(overlay);
    if (aceitar.focus) aceitar.focus();

    const aoTeclar = (ev) => {
      if (ev.key === "Escape") { fecharDesbloqueio(); document.removeEventListener("keydown", aoTeclar); }
    };
    document.addEventListener("keydown", aoTeclar);
  }

  function fecharDesbloqueio() {
    const el = document.getElementById("desbloqueio");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* ---------------- onboarding do primeiro acesso ---------------- */

  const CHAVE_ONBOARDING = "molbox.onboarding.v1";

  function jaViuOnboarding() {
    try { return localStorage.getItem(CHAVE_ONBOARDING) === "1"; }
    catch (e) { return true; }
  }

  function marcarOnboardingVisto() {
    try { localStorage.setItem(CHAVE_ONBOARDING, "1"); } catch (e) { /* segue sem guardar */ }
  }

  function mostrarOnboarding() {
    if (document.getElementById("onboarding")) return;

    const overlay = criar("div", { id: "onboarding", className: "onboarding" });
    if (!jaViuOnboarding()) overlay.dataset.primeiroAcesso = "1";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "onboarding-titulo");

    const painel = criar("div", { className: "onboarding-painel" });
    painel.innerHTML =
      `<p class="onboarding-badge">Bem-vindo ao SUPER MOLBOX</p>` +
      `<h2 id="onboarding-titulo">Do átomo ao mol, do mol à bancada</h2>` +
      `<ol class="onboarding-passos">` +
      `<li><strong>Comece pela chave.</strong> A tela “Mol: A Chave” mostra por que o mol destrava o trabalho do químico — e usa a analogia da dúzia para fazer o número de Avogadro caber na cabeça.</li>` +
      `<li><strong>Faça o Degrau 0.</strong> No fim dessa mesma tela há um teste rápido com perguntas bem simples. Serve só para confirmar que a ideia do pacote ficou clara.</li>` +
      `<li><strong>Depois explore.</strong> Use o menu para abrir massa molar, balanceamento, soluções, titulação e o treino com diagnóstico de erro.</li>` +
      `</ol>` +
      `<p class="onboarding-dica">Tudo funciona sem internet. Seu progresso fica só neste aparelho.</p>`;

    const acoes = criar("div", { className: "onboarding-acoes" });
    const botao = criar("button", { type: "button", className: "botao", textContent: "Pegar a chave →" });
    botao.addEventListener("click", fecharOnboarding);
    acoes.appendChild(botao);
    painel.appendChild(acoes);
    overlay.appendChild(painel);
    document.body.appendChild(overlay);

    if (botao.focus) botao.focus();

    const aoTeclar = (ev) => {
      if (ev.key === "Escape") {
        fecharOnboarding();
        document.removeEventListener("keydown", aoTeclar);
      }
    };
    document.addEventListener("keydown", aoTeclar);
  }

  function fecharOnboarding() {
    const el = document.getElementById("onboarding");
    if (!el) return;
    el.classList.add("saindo");
    const eraPrimeiroAcesso = el.dataset.primeiroAcesso === "1";
    marcarOnboardingVisto();
    if (el.parentNode) el.parentNode.removeChild(el);
    // no primeiro acesso a gaveta aparece em seguida, para o aluno ver por onde
    // navegar; quando ele reabre pelo menu, não faz sentido reabrir a gaveta
    if (eraPrimeiroAcesso && estreita()) abrirMenu();
  }


  /* ---------------- tela: massa molar ---------------- */

  function analisarAtual() {
    const entrada = $("#formula").value;
    const caixaErro = $("#erro-formula");
    caixaErro.innerHTML = "";
    $("#formula").setAttribute("aria-invalid", "false");

    try {
      estado.analise = analisar(entrada);
      estado.formula = entrada;
      guardar();
      desenharResultadoMassa();
    } catch (e) {
      estado.analise = null;
      $("#resultado-massa").innerHTML = "";
      $("#formula").setAttribute("aria-invalid", "true");

      const caixa = criar("div", { className: "erro" });
      caixa.appendChild(criar("strong", { textContent: e.message }));
      if (typeof e.posicao === "number") {
        const marcador = criar("span", { className: "marcador" });
        marcador.textContent = entrada + "\n" + " ".repeat(Math.max(0, e.posicao)) + "▲";
        caixa.appendChild(marcador);
      }
      caixaErro.appendChild(caixa);
    }
  }

  function desenharResultadoMassa() {
    const a = estado.analise;
    const alvo = $("#resultado-massa");
    alvo.innerHTML = "";

    // destaque
    const destaque = criar("div", { className: "cartao destaque" });
    destaque.innerHTML =
      `<p class="formula-vista">${formatarFormula(a.normalizada)}</p>` +
      `<p class="rotulo">MASSA MOLAR</p>` +
      `<p class="valor">${formatarNumero(a.massaMolar, 6)} <span class="unidade">g/mol</span></p>`;
    alvo.appendChild(destaque);

    // frase da ponte
    const frase = criar("div", { className: "cartao" });
    frase.innerHTML =
      `<p style="margin:0">Um mol de <span style="font-family:var(--mb-fonte-dado)">${formatarFormula(a.normalizada)}</span> ` +
      `pesa <strong>${formatarNumero(a.massaMolar, 5)} g</strong> e contém ` +
      `<strong>6,022×10²³</strong> ${a.totalAtomos === 1 ? "átomos" : "entidades"}, ` +
      `somando ${formatarNumero(a.totalAtomos, 3)} átomos por entidade.</p>` +
      (a.carga !== 0 ? `<p class="ajuda">Íon de carga ${a.carga > 0 ? "+" : ""}${a.carga}. A massa dos elétrons ganhos ou perdidos é desprezada, como é praxe.</p>` : "") +
      (a.massaIncerta ? `<p class="ajuda">Contém elemento sem composição isotópica estável: a massa usada é o número de massa do isótopo mais estável, não uma massa atômica padrão.</p>` : "");

    const botao = criar("button", { className: "botao", type: "button", textContent: "Levar para a ponte do mol" });
    botao.style.marginTop = "var(--mb-e3)";
    botao.addEventListener("click", () => mostrarTela("tela-ponte"));
    frase.appendChild(botao);
    alvo.appendChild(frase);

    // composição
    const comp = criar("div", { className: "cartao" });
    comp.innerHTML = `<h2 style="margin-top:0">De onde vem cada grama</h2>`;
    const tabela = criar("table");
    tabela.innerHTML =
      `<thead><tr><th>Elemento</th><th>Átomos</th><th>Contribui</th><th>% da massa</th></tr></thead>`;
    const corpo = criar("tbody");
    const maior = a.itens[0].percentual;

    for (const item of a.itens) {
      const tr = criar("tr");
      tr.innerHTML =
        `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${item.simbolo}</span> ` +
        `<span style="color:var(--mb-texto-2);font-size:var(--mb-t-legenda)">${item.nome}</span></td>` +
        `<td class="num">${item.quantidade}</td>` +
        `<td class="num">${formatarNumero(item.contribuicao, 4)} g</td>` +
        `<td class="num">${formatarNumero(item.percentual, 3)}%` +
        `<div class="barra-trilho"><div class="barra" style="width:${(item.percentual / maior * 100).toFixed(1)}%"></div></div></td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    comp.appendChild(tabela);
    comp.appendChild(criar("p", {
      className: "ajuda",
      textContent: "A porcentagem em massa é o que a balança enxerga. Repare que o elemento mais numeroso quase nunca é o que mais pesa."
    }));
    alvo.appendChild(comp);

    desenharEstruturaECargas(alvo, a);
    desenharNucleo(alvo, a);
  }

  function desenharEstruturaECargas(alvo, a) {
    const est = estruturaDe(a);
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Como os átomos se ligam</h2>`;

    if (est.tipo === "molecular") {
      const quadro = criar("div", { className: "estrutura" });
      quadro.innerHTML = desenharEstrutura(est.dados);
      cartao.appendChild(quadro);
      cartao.appendChild(criar("p", {
        style: "margin:0;text-align:center",
        textContent: `${est.dados.nome} — ${est.dados.geometria}.`,
      }));
      cartao.appendChild(criar("p", {
        className: "ajuda",
        style: "text-align:center",
        textContent: "As bolinhas seguem o raio do núcleo, que cresce com a raiz cúbica do número de massa. O tamanho do átomo inteiro é outra coisa: depende da eletrosfera e não acompanha a massa.",
      }));
    } else if (est.tipo === "ionico") {
      cartao.appendChild(criar("p", {
        style: "margin:0",
        innerHTML: `Não há molécula de ${est.chave} para desenhar. O ${est.nome} é um retículo iônico: um empilhamento de íons que se repete indefinidamente, sem unidade isolada. A fórmula diz a proporção entre os íons, não o conteúdo de uma partícula.`,
      }));
    } else {
      cartao.appendChild(criar("p", {
        style: "margin:0",
        textContent: `Não tenho a estrutura desta substância — o acervo conferido tem ${quantasEstruturas()} moléculas e esta não está entre elas. Fórmula molecular não determina estrutura: C2H6O é etanol ou éter dimetílico, C4H10 é butano ou isobutano. Desenhar uma delas como se fosse a única seria ensinar errado, porque essa multiplicidade é a própria isomeria.`,
      }));
    }

    const idh = indiceInsaturacao(a);
    if (idh) {
      const caixa = criar("div", { className: idh.situacao === "impossivel" ? "erro" : "dica-caixa" });
      caixa.style.marginTop = "var(--mb-e4)";
      caixa.innerHTML = `<strong>${idh.titulo}</strong><br>${idh.mensagem}`;
      cartao.appendChild(caixa);
    }

    alvo.appendChild(cartao);
  }

  function desenharNucleo(alvo, a) {
    const n = contarNucleo(a);
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">O que pesa dentro do átomo</h2>`;

    const fila = criar("div", { className: "fila-nucleos" });
    for (const item of n.itens) {
      const r = raioNucleo(POR_SIMBOLO[item.simbolo].massa);
      const lado = Math.ceil(r * 2) + 6;
      const bolha = criar("div", { className: "bolha" });
      bolha.innerHTML =
        `<svg viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" role="img" ` +
        `aria-label="${item.nome}, ${item.z} prótons e ${item.neutrons} nêutrons">` +
        `<circle cx="${lado / 2}" cy="${lado / 2}" r="${r.toFixed(1)}" class="atomo a-${item.simbolo}"/>` +
        `<text x="${lado / 2}" y="${lado / 2}" class="rotulo-atomo" text-anchor="middle" ` +
        `dominant-baseline="central" font-size="${Math.max(9, r * 0.9).toFixed(1)}">${item.simbolo}</text></svg>` +
        `<span class="ajuda">${item.z}p + ${item.neutrons}n</span>`;
      fila.appendChild(bolha);
    }
    cartao.appendChild(fila);

    const tabela = criar("table");
    tabela.innerHTML = `<thead><tr><th>Elemento</th><th>Átomos</th><th>Prótons</th><th>Nêutrons</th></tr></thead>`;
    const corpo = criar("tbody");
    for (const item of n.itens) {
      const tr = criar("tr");
      tr.innerHTML =
        `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${item.simbolo}</span> ` +
        `<span class="ajuda">${item.isotopo}${item.simbolo}${item.incerta ? " *" : ""}</span></td>` +
        `<td class="num">${item.quantidade}</td>` +
        `<td class="num">${item.protonsTotal}</td>` +
        `<td class="num">${item.neutronsTotal}</td>`;
      corpo.appendChild(tr);
    }
    const total = criar("tr", { className: "linha-total" });
    total.innerHTML = `<td><strong>Total</strong></td><td class="num">${a.totalAtomos}</td>` +
      `<td class="num"><strong>${n.protons}</strong></td><td class="num"><strong>${n.neutrons}</strong></td>`;
    corpo.appendChild(total);
    tabela.appendChild(corpo);
    cartao.appendChild(tabela);

    const aviso = criar("div", { className: "dica-caixa", style: "margin-top:var(--mb-e4)" });
    aviso.innerHTML =
      `<strong>Por que a massa molar não é ${formatarNumero(n.somaNucleons, 6)} g/mol</strong><br>` +
      `Somando os núcleons do isótopo mais comum de cada elemento dá ${n.somaNucleons}. ` +
      `A massa molar é ${formatarNumero(a.massaMolar, 6)}, uma diferença de ${formatarNumero(Math.abs(n.diferenca), 3)}. ` +
      `A massa que a tabela periódica traz não é a de um átomo: é a média ponderada de todos os isótopos ` +
      `daquele elemento na natureza. É por isso que o cloro pesa 35,45 e não 35 — três quartos dele é ` +
      `cloro-35 e um quarto é cloro-37.`;
    cartao.appendChild(aviso);

    const eletrons = criar("p", { className: "ajuda" });
    eletrons.innerHTML =
      `E a eletrosfera? São ${n.eletrons} elétrons, e juntos eles pesam ${formatarNumero(n.massaEletrons, 3)} u — ` +
      `<strong>${formatarNumero(n.fracaoEletrons, 3)}%</strong> da massa. Um próton pesa 1836 vezes o que pesa um elétron, ` +
      `então a balança praticamente só enxerga o núcleo. Os elétrons decidem toda a química e quase nada da massa.`;
    cartao.appendChild(eletrons);

    alvo.appendChild(cartao);
  }

  /* ---------------- tela: ponte do mol ---------------- */

  function desenharPonte() {
    if (!estado.analise) {
      $("#caminho").innerHTML = `<p class="ajuda" style="margin:0">Escreva uma fórmula válida na tela de massa molar para atravessar a ponte.</p>`;
      $("#campos-ponte").innerHTML = "";
      $("#ponte-formula").textContent = "—";
      $("#ponte-massa").textContent = "";
      return;
    }

    const a = estado.analise;
    $("#ponte-formula").innerHTML = formatarFormula(a.normalizada);
    $("#ponte-massa").textContent = `M = ${formatarNumero(a.massaMolar, 5)} g/mol`;

    const valor = lerNumero(estado.entradaBruta);
    const vm = volumeMolarAtual();
    let resultado = null;
    if (isFinite(valor)) {
      resultado = converter({ origem: estado.origem, valor, massaMolar: a.massaMolar, volumeMolar: vm.valor });
    }

    const sig = contarSignificativos(estado.entradaBruta);
    const caixa = $("#campos-ponte");
    caixa.innerHTML = "";

    for (const chave of Object.keys(GRANDEZAS)) {
      const g = GRANDEZAS[chave];
      const div = criar("div", { className: "campo" + (chave === estado.origem ? " ativo" : "") });
      const idCampo = "campo-" + chave;

      const rotulo = criar("label", { htmlFor: idCampo, textContent: g.rotulo });
      const linha = criar("div", { className: "linha" });
      const input = criar("input", {
        type: "text", id: idCampo, inputMode: "decimal",
        autocomplete: "off", spellcheck: false,
      });
      input.setAttribute("aria-label", g.rotulo + " em " + g.unidade);

      if (chave === estado.origem) {
        input.value = estado.entradaBruta;
      } else if (resultado) {
        input.value = formatarNumero(resultado.valores[chave], sig);
      } else {
        input.value = "";
      }

      input.addEventListener("focus", () => {
        if (chave !== estado.origem) {
          estado.origem = chave;
          estado.entradaBruta = "";
          input.value = "";
          desenharPonte();
          const novo = document.getElementById(idCampo);
          if (novo) novo.focus();
        }
      });

      input.addEventListener("input", () => {
        estado.origem = chave;
        estado.entradaBruta = input.value;
        guardar();
        atualizarOutrosCampos(idCampo);
      });

      linha.appendChild(input);
      linha.appendChild(criar("span", { className: "sufixo", textContent: g.curta }));
      div.appendChild(rotulo);
      div.appendChild(linha);
      caixa.appendChild(div);
    }

    desenharCaminho(resultado);
  }

  /* Recalcula os campos sem redesenhar, para não roubar o cursor de quem digita. */
  function atualizarOutrosCampos(idAtivo) {
    const a = estado.analise;
    const valor = lerNumero(estado.entradaBruta);
    const vm = volumeMolarAtual();

    for (const chave of Object.keys(GRANDEZAS)) {
      const el = document.getElementById("campo-" + chave);
      if (!el) continue;
      el.parentElement.parentElement.classList.toggle("ativo", chave === estado.origem);
    }

    if (!isFinite(valor)) {
      for (const chave of Object.keys(GRANDEZAS)) {
        const el = document.getElementById("campo-" + chave);
        if (el && el.id !== idAtivo) el.value = "";
      }
      desenharCaminho(null);
      return;
    }

    const resultado = converter({ origem: estado.origem, valor, massaMolar: a.massaMolar, volumeMolar: vm.valor });
    const sig = contarSignificativos(estado.entradaBruta);
    for (const chave of Object.keys(GRANDEZAS)) {
      const el = document.getElementById("campo-" + chave);
      if (el && el.id !== idAtivo) el.value = formatarNumero(resultado.valores[chave], sig);
    }
    desenharCaminho(resultado);
  }

  function termo(texto, classe) {
    return `<span class="termo${classe ? " " + classe : ""}">${texto}</span>`;
  }

  function fracao(cima, baixo, cortarBaixo) {
    return `<span class="fracao"><span class="cima">${cima}</span>` +
           `<span class="baixo${cortarBaixo ? " corta" : ""}">${baixo}</span></span>`;
  }

  function desenharCaminho(resultado) {
    const alvo = $("#caminho");
    alvo.innerHTML = "";

    if (!resultado) {
      alvo.innerHTML = `<p class="ajuda" style="margin:0">Digite um valor em qualquer campo acima para ver o caminho da conversão.</p>`;
      return;
    }

    const sig = contarSignificativos(estado.entradaBruta);
    alvo.appendChild(criar("h2", { textContent: "O caminho da conta", style: "margin-top:0" }));

    for (const destino of Object.keys(GRANDEZAS)) {
      if (destino === estado.origem) continue;
      const passos = resultado.caminhos[destino];
      if (!passos.length) continue;

      const trilha = criar("div", { className: "trilha" });
      trilha.appendChild(criar("p", {
        className: "titulo",
        textContent: GRANDEZAS[estado.origem].rotulo.toUpperCase() + " → " + GRANDEZAS[destino].rotulo.toUpperCase()
      }));

      const conta = criar("div", { className: "conta" });
      let html = termo(`${formatarNumero(passos[0].valorEntrada, sig)} <span class="corta">${passos[0].unidadeEntrada}</span>`, "entrada");

      passos.forEach((p, indice) => {
        const cortaEmCima = p.unidadeNumero !== p.unidadeSaida;
        const cima = `${p.numero === 1 ? "1" : formatarNumero(p.numero, 4)} ${cortaEmCima ? `<span class="corta">${p.unidadeNumero}</span>` : p.unidadeNumero}`;
        const baixo = `${p.denominador === 1 ? "1" : formatarNumero(p.denominador, 4)} ${p.unidadeDenominador}`;
        html += `<span class="op">×</span>` + fracao(cima, baixo, true);
        const ehUltimo = indice === passos.length - 1;
        if (ehUltimo) {
          html += `<span class="op">=</span>` + termo(`${formatarNumero(p.valorSaida, sig)} ${p.unidadeSaida}`, "saida");
        }
      });

      conta.innerHTML = html;
      trilha.appendChild(conta);
      trilha.appendChild(criar("p", {
        className: "motivo",
        textContent: passos.map(p => p.motivo).join("; ") + "."
      }));
      alvo.appendChild(trilha);
    }

    const nota = criar("p", { className: "ajuda" });
    nota.innerHTML = `Resultados com ${sig} algarismo${sig > 1 ? "s" : ""} significativo${sig > 1 ? "s" : ""}, herdado${sig > 1 ? "s" : ""} do valor que você digitou. ` +
      `O volume vale apenas se a substância for um gás na condição escolhida.`;
    alvo.appendChild(nota);
  }



  /* ---------------- tela: balancear ---------------- */

  const EXEMPLOS_EQ = [
    "CH4 + O2 -> CO2 + H2O",
    "C3H8 + O2 -> CO2 + H2O",
    "Fe + O2 -> Fe2O3",
    "Al + HCl -> AlCl3 + H2",
    "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2",
    "MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O",
  ];

  function montarExemplosEquacao() {
    const caixa = $("#exemplos-eq");
    for (const eq of EXEMPLOS_EQ) {
      const b = criar("button", { type: "button", className: "chip", textContent: eq });
      b.addEventListener("click", () => {
        $("#equacao").value = eq;
        balancearAtual();
        sincronizarBandejasComTexto();
        desenharBandejas();
      });
      caixa.appendChild(b);
    }
  }

  /* ---------------- montador de equações por toque ----------------

     O motivo desta tela existir na sala de aula: digitar
     "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" no teclado do celular consome
     a aula inteira e erra em cada maiúscula. Aqui a espécie é um botão.

     A montagem NÃO é uma segunda fonte de verdade. As bandejas escrevem no
     campo de texto, e o balanceador continua lendo só dele — duas
     representações paralelas divergiriam, e o aluno veria a bandeja
     discordando do resultado na frente da turma.

     A divisão em três funções segue a regra que veio do bug do teclado da
     bancada: `montarTelaBalancear` monta os campos uma única vez e nunca é
     chamada de novo; `desenharBandejas` e `desenharGradeEspecies` redesenham
     só o pedaço que mudou. Digitar na busca chama apenas a terceira, então o
     campo em foco nunca é destruído. */

  function montarTelaBalancear() {
    montarExemplosEquacao();

    for (const aba of $("#abas-balancear").querySelectorAll(".aba-modo")) {
      aba.addEventListener("click", () => trocarModoBalancear(aba.dataset.modo));
    }

    const busca = $("#busca-especie");
    busca.addEventListener("input", () => {
      /* Redesenha só a grade. O campo fica fora dela justamente para não ser
         destruído a cada tecla, que foi o bug relatado na bancada. */
      desenharGradeEspecies();
    });

    const caixaCat = $("#cat-especies");
    for (const cat of categoriasDeEspecie()) {
      const b = criar("button", { type: "button", className: "chip", textContent: cat.nome });
      b.dataset.cat = cat.id;
      b.addEventListener("click", () => {
        estado.montagem.categoria = cat.id;
        busca.value = "";
        marcarCategoriaAtiva();
        desenharGradeEspecies();
      });
      caixaCat.appendChild(b);
    }

    montarReceitasDeAula();
    marcarCategoriaAtiva();
    desenharGradeEspecies();
    trocarModoBalancear(estado.montagem.modo);
  }

  function trocarModoBalancear(modo) {
    estado.montagem.modo = modo;
    $("#modo-montar").hidden = modo !== "montar";
    $("#modo-digitar").hidden = modo !== "digitar";
    for (const aba of $("#abas-balancear").querySelectorAll(".aba-modo")) {
      const ativa = aba.dataset.modo === modo;
      aba.classList.toggle("ativo", ativa);
      aba.setAttribute("aria-selected", ativa ? "true" : "false");
    }
    /* Quem digitou no computador e trocou para o montador não pode perder o
       que escreveu, e vice-versa. */
    if (modo === "montar") {
      sincronizarBandejasComTexto();
      desenharBandejas();
    }
  }

  function marcarCategoriaAtiva() {
    for (const b of $("#cat-especies").querySelectorAll(".chip")) {
      b.classList.toggle("ativo", b.dataset.cat === estado.montagem.categoria);
    }
    const cat = categoriasDeEspecie().find((c) => c.id === estado.montagem.categoria);
    $("#dica-categoria").textContent = cat ? cat.dica : "";
  }

  function sincronizarBandejasComTexto() {
    const lido = lerMontagem($("#equacao").value);
    if (!lido) return;
    estado.montagem.reagentes = lido.reagentes;
    estado.montagem.produtos = lido.produtos;
  }

  /* Escreve as bandejas no campo de texto e apaga o resultado anterior: uma
     equação balanceada que continua na tela depois de o aluno mexer nas
     espécies estaria mentindo sobre o que ele tem montado agora. */
  function aplicarMontagem() {
    const m = estado.montagem;
    $("#equacao").value = textoDaMontagem(m.reagentes, m.produtos);
    estado.equacao = $("#equacao").value;
    estado.balanceada = null;
    $("#resultado-equacao").innerHTML = "";
    $("#erro-equacao").innerHTML = "";
    guardar();
    desenharBandejas();
  }

  function acrescentarEspecie(formula) {
    const m = estado.montagem;
    m.receita = null;
    m[m.lado] = m[m.lado].concat([formula]);
    aplicarMontagem();
  }

  function desenharGradeEspecies() {
    const alvo = $("#grade-especies");
    alvo.innerHTML = "";
    const termo = $("#busca-especie").value;
    const achadas = buscarEspecies(termo, estado.montagem.categoria);

    if (!achadas.length) {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:0",
        textContent: "Nenhuma espécie com esse nome. Tente a fórmula, ou parte dela — " +
          "o banco tem " + quantasEspecies() + " espécies." }));
      return;
    }

    for (const e of achadas) {
      const b = criar("button", { type: "button", className: "especie" });
      b.innerHTML = `<span class="especie-f">${formatarFormula(e.f)}</span>` +
                    `<span class="especie-n">${e.n}</span>`;
      b.setAttribute("aria-label", `Adicionar ${e.n}, ${e.f}`);
      b.addEventListener("click", () => acrescentarEspecie(e.f));
      alvo.appendChild(b);
    }
  }

  function montarReceitasDeAula() {
    const alvo = $("#receitas-aula");
    alvo.innerHTML = `<h2 style="margin-top:0">Reações de aula</h2>` +
      `<p class="ajuda">Um toque monta e balanceia. São as que mais aparecem em prova, ` +
      `em aula prática e em rótulo de indústria.</p>`;

    const grupos = [];
    for (const r of receitasDeAula()) {
      let g = grupos.find((x) => x.nome === r.grupo);
      if (!g) { g = { nome: r.grupo, itens: [] }; grupos.push(g); }
      g.itens.push(r);
    }

    for (const g of grupos) {
      alvo.appendChild(criar("p", { className: "rotulo-grupo", textContent: g.nome }));
      const chips = criar("div", { className: "chips" });
      for (const r of g.itens) {
        const b = criar("button", { type: "button", className: "chip", textContent: r.nome });
        b.addEventListener("click", () => usarReceita(r));
        chips.appendChild(b);
      }
      alvo.appendChild(chips);
    }
  }

  function usarReceita(r) {
    estado.montagem.reagentes = r.reagentes.slice();
    estado.montagem.produtos = r.produtos.slice();
    aplicarMontagem();
    estado.montagem.receita = r;
    balancearAtual();
    desenharBandejas();
  }

  function desenharBandejas() {
    const alvo = $("#bandejas");
    if (!alvo) return;
    alvo.innerHTML = "";
    const m = estado.montagem;

    const montador = criar("div", { className: "montador" });
    montador.appendChild(bandejaDeUmLado("reagentes", "Reagentes", m.reagentes));
    const seta = criar("div", { className: "seta-montador", innerHTML: "&#8594;" });
    seta.setAttribute("aria-hidden", "true");
    montador.appendChild(seta);
    montador.appendChild(bandejaDeUmLado("produtos", "Produtos", m.produtos));
    alvo.appendChild(montador);

    const vazio = !m.reagentes.length && !m.produtos.length;
    if (vazio) {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e3) 0 0",
        textContent: "Toque numa espécie do banco abaixo para começar. Ela cai no lado " +
          "marcado como “recebendo”; toque no cabeçalho do outro lado para trocar." }));
      return;
    }

    alvo.appendChild(desenharContagemDeAtomos(m.reagentes, m.produtos));

    const acoes = criar("div", { className: "montador-acoes" });
    const bal = criar("button", { type: "button", className: "botao",
      textContent: "Balancear" });
    bal.addEventListener("click", () => { balancearAtual(); rolarParaResultado(); });
    acoes.appendChild(bal);
    const limpar = criar("button", { type: "button", className: "botao secundario",
      textContent: "Limpar tudo" });
    limpar.addEventListener("click", () => {
      estado.montagem.reagentes = [];
      estado.montagem.produtos = [];
      estado.montagem.lado = "reagentes";
      aplicarMontagem();
    });
    acoes.appendChild(limpar);
    alvo.appendChild(acoes);

    if (m.receita) {
      alvo.appendChild(criar("p", { className: "dica-caixa", style: "margin:var(--mb-e3) 0 0",
        textContent: m.receita.nota }));
    }
  }

  function bandejaDeUmLado(lado, rotulo, formulas) {
    const caixa = criar("div", { className: "lado-montador" });
    const ativo = estado.montagem.lado === lado;

    const cabeca = criar("button", { type: "button", className: "lado-cabeca" + (ativo ? " ativo" : "") });
    cabeca.innerHTML = `<span>${rotulo}</span>` +
      (ativo ? `<span class="marca-lado">recebendo</span>` : "");
    cabeca.setAttribute("aria-pressed", ativo ? "true" : "false");
    cabeca.addEventListener("click", () => {
      estado.montagem.lado = lado;
      desenharBandejas();
    });
    caixa.appendChild(cabeca);

    const bandeja = criar("div", { className: "bandeja bandeja-" + lado });
    if (!formulas.length) {
      bandeja.appendChild(criar("span", { className: "bandeja-vazia", textContent: "vazio" }));
    }
    formulas.forEach((f, i) => {
      const b = criar("button", { type: "button", className: "chip-bandeja" });
      b.innerHTML = `<span>${formatarFormula(f)}</span><span class="tirar" aria-hidden="true">&times;</span>`;
      b.setAttribute("aria-label", `Tirar ${f} dos ${rotulo.toLowerCase()}`);
      b.addEventListener("click", () => {
        const m = estado.montagem;
        m.receita = null;
        m[lado] = m[lado].filter((_, j) => j !== i);
        aplicarMontagem();
      });
      bandeja.appendChild(b);
    });
    caixa.appendChild(bandeja);
    return caixa;
  }

  /* A contagem conta com todos os coeficientes valendo 1, que é exatamente o
     que o aluno escreveu. O desencontro que ela mostra é o problema, não a
     resposta — por isso o texto de apoio diz de onde vêm os números. */
  function desenharContagemDeAtomos(reagentes, produtos) {
    const caixa = criar("div", { className: "contagem-montador" });
    const r = compararLados(reagentes, produtos);

    if (!r.linhas.length) {
      caixa.appendChild(criar("p", { className: "ajuda", style: "margin:0",
        textContent: "Falta um dos lados: a equação precisa de reagente e de produto." }));
      return caixa;
    }

    const titulo = criar("p", { className: "contagem-titulo" });
    if (r.fechaTudo) {
      titulo.classList.add("fecha");
      titulo.textContent = "Do jeito que está, os átomos já fecham — os coeficientes valem 1.";
    } else {
      titulo.textContent = "Contando com os coeficientes ainda em 1, os lados não batem:";
    }
    caixa.appendChild(titulo);

    const pilhas = criar("div", { className: "pilhas-atomo" });
    for (const l of r.linhas) {
      const p = criar("span", { className: "pilha-atomo" + (l.fecha ? " fecha" : " falha") });
      const rotulo = l.elemento === "carga" ? "carga" : l.elemento;
      p.innerHTML = `<span class="pilha-el">${rotulo}</span>` +
                    `<span class="pilha-num">${l.antes} : ${l.depois}</span>`;
      p.title = `${rotulo}: ${l.antes} antes, ${l.depois} depois`;
      pilhas.appendChild(p);
    }
    caixa.appendChild(pilhas);

    caixa.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e2) 0 0",
      textContent: r.usaCarga
        ? "Antes : depois. Numa equação iônica a carga também precisa fechar."
        : "Antes : depois. É este desencontro que o balanceamento resolve." }));
    return caixa;
  }

  function rolarParaResultado() {
    const alvo = $("#resultado-equacao");
    if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function balancearAtual() {
    const entrada = $("#equacao").value;
    $("#erro-equacao").innerHTML = "";
    $("#equacao").setAttribute("aria-invalid", "false");

    try {
      estado.balanceada = balancear(entrada);
      estado.equacao = entrada;
      estado.esteq.quantidades = {};
      estado.esteq.purezas = {};
      estado.esteq.produtoRendimento = 0;
      estado.esteq.massaObtida = "";
      guardar();
      desenharEquacao();
    } catch (e) {
      estado.balanceada = null;
      $("#resultado-equacao").innerHTML = "";
      $("#equacao").setAttribute("aria-invalid", "true");
      const caixa = criar("div", { className: "erro" });
      caixa.appendChild(criar("strong", { textContent: e.message }));
      $("#erro-equacao").appendChild(caixa);
    }
  }

  function desenharEquacao() {
    const b = estado.balanceada;
    const alvo = $("#resultado-equacao");
    alvo.innerHTML = "";

    const cartao = criar("div", { className: "cartao" });
    const vista = criar("div", { className: "equacao-vista" });
    vista.innerHTML = escreverEquacaoHTML(b);
    cartao.appendChild(vista);
    cartao.appendChild(criar("p", {
      className: "ajuda",
      style: "text-align:center;margin:0",
      textContent: "Coeficientes em laranja. Os que valem 1 ficam subentendidos, como se escreve à mão.",
    }));
    alvo.appendChild(cartao);

    const prova = criar("div", { className: "cartao" });
    prova.innerHTML = "<h2 style=\"margin-top:0\">A prova: átomos contados dos dois lados</h2>";
    const tabela = criar("table", { className: "conferencia" });
    tabela.innerHTML = "<thead><tr><th>Elemento</th><th>Antes</th><th>Depois</th></tr></thead>";
    const corpo = criar("tbody");
    for (const c of b.conferencia) {
      const tr = criar("tr");
      const rotulo = c.elemento === "carga" ? "carga elétrica" : c.elemento;
      tr.innerHTML = `<td>${rotulo}</td><td class="num ${c.fecha ? "fecha" : "falha"}">${c.antes}</td>` +
                     `<td class="num ${c.fecha ? "fecha" : "falha"}">${c.depois}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    prova.appendChild(tabela);
    prova.appendChild(criar("p", {
      className: "ajuda",
      textContent: b.usaCarga
        ? "Numa equação iônica a carga também precisa fechar, e ela entra no sistema como se fosse mais um elemento."
        : "É esta a conta que o balanceamento tem de satisfazer: nenhum átomo aparece nem desaparece.",
    }));
    alvo.appendChild(prova);

    const acao = criar("div", { className: "cartao" });
    acao.innerHTML = "<p style=\"margin:0 0 var(--mb-e3)\">Com a equação fechada, dá para descobrir quanto se forma a partir do que você tem na bancada.</p>";
    const botao = criar("button", { className: "botao", type: "button", textContent: "Levar para a estequiometria" });
    botao.addEventListener("click", () => mostrarTela("tela-esteq"));
    acao.appendChild(botao);
    alvo.appendChild(acao);
  }

  /* ---------------- exportar o progresso ----------------

     A tela de Progresso promete que nada sai do aparelho sozinho. Este cartão
     mantém a promessa: ele gera um texto, mostra o texto inteiro para o aluno
     ler, e para por aí. Quem envia é ele, se quiser, pelo meio que quiser.

     O código é o mesmo da atividade diagnóstica em papel — é o que liga as duas
     coisas sem que nome nenhum saia daqui. Fica guardado para não ser
     redigitado a cada vez. */

  const CHAVE_CODIGO = "molbox.codigo.v1";

  function montarCartaoExportar() {
    const alvo = $("#cartao-exportar");
    if (!alvo) return;
    alvo.innerHTML = `<h2 style="margin-top:0">Enviar meu progresso ao professor</h2>` +
      `<p class="ajuda">Só faça isto se o seu professor pedir. Nada é enviado pelo aplicativo: ` +
      `ele monta um texto, você lê, e envia se quiser. Seu nome não aparece.</p>`;

    let guardado = "";
    try { guardado = localStorage.getItem(CHAVE_CODIGO) || ""; } catch (e) {}

    const rot = criar("label", { htmlFor: "codigo-aluno", textContent: "Seu código (o mesmo da folha de exercício)" });
    alvo.appendChild(rot);
    const campo = criar("input", { type: "text", id: "codigo-aluno", value: guardado,
      placeholder: "MASO07", autocomplete: "off", autocapitalize: "characters", maxLength: 12 });
    alvo.appendChild(campo);
    alvo.appendChild(criar("p", { className: "ajuda",
      textContent: "2 letras do seu primeiro nome + 2 do sobrenome + o dia do seu aniversário." }));

    const acoes = criar("div", { className: "montador-acoes" });
    const gerar = criar("button", { type: "button", className: "botao", textContent: "Gerar meu resumo" });
    gerar.addEventListener("click", () => gerarResumo(campo.value));
    acoes.appendChild(gerar);
    alvo.appendChild(acoes);

    alvo.appendChild(criar("div", { id: "saida-exportacao" }));
  }

  function gerarResumo(codigo) {
    const saida = $("#saida-exportacao");
    saida.innerHTML = "";

    const linha = exportarProgresso(progresso, codigo);
    if (!linha) {
      saida.appendChild(criar("p", { className: "erro",
        textContent: "O código precisa ter pelo menos 4 letras ou números. Confira com o professor." }));
      return;
    }
    try { localStorage.setItem(CHAVE_CODIGO, codigo.trim().toUpperCase()); } catch (e) {}

    saida.appendChild(criar("p", { className: "ajuda", style: "margin-top:var(--mb-e4)",
      textContent: "Este é o texto inteiro. Leia antes de enviar — não há nada além do que está aqui." }));

    const caixa = criar("textarea", { id: "texto-exportacao", readOnly: true, rows: 4, value: linha });
    caixa.setAttribute("aria-label", "Resumo do seu progresso");
    saida.appendChild(caixa);

    const acoes = criar("div", { className: "montador-acoes" });
    const copiar = criar("button", { type: "button", className: "botao", textContent: "Copiar" });
    copiar.addEventListener("click", () => {
      caixa.select();
      let deu = false;
      try { deu = document.execCommand("copy"); } catch (e) {}
      if (!deu && navigator.clipboard) {
        navigator.clipboard.writeText(linha).then(() => avisarCopia(true), () => avisarCopia(false));
        return;
      }
      avisarCopia(deu);
    });
    acoes.appendChild(copiar);
    saida.appendChild(acoes);
    saida.appendChild(criar("p", { className: "ajuda", id: "aviso-copia" }));
  }

  function avisarCopia(deu) {
    const p = $("#aviso-copia");
    if (!p) return;
    p.textContent = deu
      ? "Copiado. Agora é só colar onde o professor pediu."
      : "Não consegui copiar sozinho. Segure o dedo sobre o texto acima e escolha Copiar.";
  }

  /* ---------------- seletor de espécies (Massa molar, Soluções, Preparo) ----

     O mesmo problema que tornava o Balanceamento ruim no celular estava em
     mais três telas: todas pediam a fórmula digitada à mão. No Preparo é o
     pior caso, porque é a tela usada de pé na bancada, de luva, e é a fórmula
     que decide qual aviso de segurança aparece.

     Por que um diálogo e não uma grade embutida: Soluções e Preparo redesenham
     o painel inteiro a cada mudança de campo. Uma grade dentro deles seria
     destruída a cada tecla — o mesmo bug do teclado da bancada. O diálogo é
     montado uma vez, fora desses painéis, e sobrevive a qualquer redesenho. */

  let aoEscolherEspecie = null;
  let categoriaDoSeletor = "usadas";

  function montarSeletorEspecies() {
    const busca = $("#busca-seletor");
    busca.addEventListener("input", desenharGradeSeletor);

    const caixa = $("#cat-seletor");
    for (const cat of categoriasDeEspecie()) {
      const b = criar("button", { type: "button", className: "chip", textContent: cat.nome });
      b.dataset.cat = cat.id;
      b.addEventListener("click", () => {
        categoriaDoSeletor = cat.id;
        busca.value = "";
        for (const o of caixa.querySelectorAll(".chip")) o.classList.toggle("ativo", o.dataset.cat === cat.id);
        desenharGradeSeletor();
      });
      caixa.appendChild(b);
    }
    for (const o of caixa.querySelectorAll(".chip")) o.classList.toggle("ativo", o.dataset.cat === categoriaDoSeletor);

    $("#fechar-seletor").addEventListener("click", fecharSeletorEspecies);
    $("#seletor-especies").addEventListener("click", (e) => {
      if (e.target.id === "seletor-especies") fecharSeletorEspecies();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#seletor-especies").hidden) fecharSeletorEspecies();
    });

    for (const b of document.querySelectorAll(".botao-banco")) {
      b.addEventListener("click", () => {
        const campo = $("#" + b.dataset.alvo);
        abrirSeletorEspecies((formula) => {
          campo.value = formula;
          campo.dispatchEvent(new Event("input"));
        });
      });
    }

    desenharGradeSeletor();
  }

  function abrirSeletorEspecies(aoEscolher) {
    aoEscolherEspecie = aoEscolher;
    $("#seletor-especies").hidden = false;
    $("#busca-seletor").value = "";
    desenharGradeSeletor();
    /* O foco vai para a busca: no computador dá para digitar direto, e no
       celular o aluno vê de imediato que dá para procurar. */
    try { $("#busca-seletor").focus(); } catch (e) {}
  }

  function fecharSeletorEspecies() {
    $("#seletor-especies").hidden = true;
    aoEscolherEspecie = null;
  }

  function desenharGradeSeletor() {
    const alvo = $("#grade-seletor");
    if (!alvo) return;
    alvo.innerHTML = "";
    const achadas = buscarEspecies($("#busca-seletor").value, categoriaDoSeletor);
    if (!achadas.length) {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:0",
        textContent: "Nenhuma espécie com esse nome. Tente a fórmula, ou parte dela — o banco tem " +
          quantasEspecies() + " espécies. Você também pode fechar e digitar à mão." }));
      return;
    }
    for (const e of achadas) {
      const b = criar("button", { type: "button", className: "especie" });
      b.innerHTML = `<span class="especie-f">${formatarFormula(e.f)}</span>` +
                    `<span class="especie-n">${e.n}</span>`;
      b.setAttribute("aria-label", `Usar ${e.n}, ${e.f}`);
      b.addEventListener("click", () => {
        if (aoEscolherEspecie) aoEscolherEspecie(e.f);
        fecharSeletorEspecies();
      });
      alvo.appendChild(b);
    }
  }

  /* ---------------- tela: treino de balanceamento ----------------

     Treino extra: dá XP e não mexe na escada. Está liberado desde o primeiro
     acesso porque balancear é anterior à estequiometria — trancá-lo atrás do
     degrau 4 obrigaria o aluno a atravessar a ponte do mol para exercitar algo
     que ele precisa antes disso.

     O formato de resposta é novo. O treino da escada só sabia duas coisas:
     escolher uma alternativa ou digitar um número. Aqui o aluno define vários
     coeficientes de uma vez, então a conferência também é nova. */

  const TREINO_BAL = "balanceamento";

  function entrarNoTreinoBal() {
    if (!estado.treinoBal.receita) sortearDesafioBal();
    else desenharTreinoBal();
    desenharPlacarTreinoBal();
  }

  /* Dificuldade calculada, nunca decorada: um número escrito à mão ao lado da
     reação divergiria no dia em que a equação mudasse. */
  function dificuldadeDoDesafio(b) {
    const maior = Math.max(...b.especies.map((e) => e.coeficiente));
    const soma = b.especies.reduce((t, e) => t + e.coeficiente, 0);
    if (maior <= 2 && b.especies.length <= 4) return { nome: "Aquecimento", n: 1 };
    if (maior <= 4 && soma <= 12) return { nome: "Firme", n: 2 };
    return { nome: "Osso duro", n: 3 };
  }

  /* Oito das reações do banco já fecham com todos os coeficientes em 1 —
     neutralização simples, calcinação do calcário e outras. Elas são ótimas no
     montador, mas como exercício são XP de graça: o treino começa com tudo em
     1, então o aluno acertaria clicando em "Conferir" sem fazer nada. Ficam
     fora do sorteio.

     O filtro é calculado, não uma lista escrita à mão: reação nova entra ou
     sai sozinha conforme o balanceamento dela. */
  function desafiosPossiveis() {
    return receitasDeAula().filter((r) => {
      try {
        return balancear(textoDaMontagem(r.reagentes, r.produtos))
          .especies.some((e) => e.coeficiente > 1);
      } catch (e) { return false; }
    });
  }

  function sortearDesafioBal() {
    const receitas = desafiosPossiveis();
    let escolhida = null;
    /* Não repetir a reação anterior: cair duas vezes na mesma logo em seguida
       faz o aluno achar que o banco é pequeno. */
    for (let i = 0; i < 30; i++) {
      const r = receitas[Math.floor(Math.random() * receitas.length)];
      if (!estado.treinoBal.receita || r.nome !== estado.treinoBal.receita.nome) { escolhida = r; break; }
    }
    if (!escolhida) escolhida = receitas[0];

    const b = balancear(textoDaMontagem(escolhida.reagentes, escolhida.produtos));
    estado.treinoBal = {
      receita: escolhida, balanceada: b,
      coefs: b.especies.map(() => 1),
      respondido: false, acertou: false, contou: false,
      rodada: estado.treinoBal.rodada + 1,
      feitos: estado.treinoBal.feitos,
      seguidos: estado.treinoBal.seguidos,
    };
    desenharTreinoBal();
  }

  function desenharTreinoBal() {
    const alvo = $("#painel-treino-bal");
    alvo.innerHTML = "";
    const t = estado.treinoBal;
    if (!t.balanceada) return;

    const dif = dificuldadeDoDesafio(t.balanceada);
    const cabeca = criar("div", { className: "cabeca-desafio" });
    cabeca.innerHTML = `<span class="etiqueta-dif dif-${dif.n}">${dif.nome}</span>` +
      `<span class="ajuda">${t.receita.grupo}</span>`;
    alvo.appendChild(cabeca);

    alvo.appendChild(criar("p", { className: "enunciado", style: "margin:var(--mb-e3) 0",
      textContent: "Ajuste os coeficientes até que a equação feche." }));

    /* A equação em dois quadros empilhados, reagentes em cima e produtos
       embaixo, com a seta apontando para baixo. É a mesma leitura da tela
       Balancear, e no celular empilhar cabe onde uma linha só não cabe.

       Os botões de mais e menos saíram: o aluno digita o número. Eram dois
       alvos de toque por espécie para um valor que quase sempre tem um dígito,
       e o "+" do seletor ficava colado no "+" que separa as espécies. */
    alvo.appendChild(quadroDeUmLado("reagentes", "Reagentes", t.balanceada.reagentes));
    const seta = criar("div", { className: "seta-baixo", innerHTML: "&#8595;" });
    seta.setAttribute("aria-hidden", "true");
    alvo.appendChild(seta);
    alvo.appendChild(quadroDeUmLado("produtos", "Produtos", t.balanceada.produtos));

    /* contagem de átomos: escondida por padrão, porque revelada de saída o
       exercício vira tentativa e erro até tudo ficar verde */
    if (t.contou && !t.respondido) alvo.appendChild(contagemComCoeficientes());

    const acoes = criar("div", { className: "montador-acoes" });
    if (!t.respondido) {
      const conferir = criar("button", { type: "button", className: "botao", textContent: "Conferir" });
      conferir.addEventListener("click", conferirDesafioBal);
      acoes.appendChild(conferir);
      if (!t.contou) {
        const contar = criar("button", { type: "button", className: "botao secundario",
          textContent: "Contar átomos" });
        contar.title = "Mostra a contagem por elemento, e reduz o XP deste exercício";
        contar.addEventListener("click", () => { estado.treinoBal.contou = true; desenharTreinoBal(); });
        acoes.appendChild(contar);
      }
    } else {
      const proximo = criar("button", { type: "button", className: "botao", textContent: "Próxima equação" });
      proximo.addEventListener("click", () => { sortearDesafioBal(); desenharPlacarTreinoBal(); });
      acoes.appendChild(proximo);
    }
    alvo.appendChild(acoes);

    if (t.respondido) alvo.appendChild(devolutivaDesafioBal());
  }

  function quadroDeUmLado(lado, rotulo, especies) {
    const t = estado.treinoBal;
    const quadro = criar("div", { className: "quadro-lado quadro-" + lado });
    quadro.appendChild(criar("p", { className: "rotulo-lado", textContent: rotulo }));

    const linha = criar("div", { className: "linha-especies" });
    especies.forEach((esp, k) => {
      if (k > 0) linha.appendChild(criar("span", { className: "sep-mais", textContent: "+" }));
      linha.appendChild(itemDeCoeficiente(t.balanceada.especies.indexOf(esp), esp));
    });
    quadro.appendChild(linha);
    return quadro;
  }

  function itemDeCoeficiente(i, esp) {
    const t = estado.treinoBal;
    const item = criar("span", { className: "item-coef" });

    const campo = criar("input", { type: "text", inputMode: "numeric", className: "coef-campo",
      value: String(t.coefs[i]), maxLength: 2, autocomplete: "off" });
    campo.setAttribute("aria-label", `Coeficiente de ${esp.formula}`);
    campo.disabled = t.respondido;

    /* Nada de redesenhar a equação aqui: só o valor muda. Recriar o campo a
       cada dígito fecharia o teclado do celular, que foi o bug da bancada. */
    campo.addEventListener("input", () => {
      const limpo = campo.value.replace(/\D/g, "").slice(0, 2);
      if (campo.value !== limpo) campo.value = limpo;
      const n = parseInt(limpo, 10);
      estado.treinoBal.coefs[i] = isNaN(n) || n < 1 ? 1 : n;
      atualizarContagemDoDesafio();
    });
    /* Campo vazio ou zerado volta a 1 ao sair, para o aluno não conferir uma
       equação com um coeficiente que ele não escolheu. */
    campo.addEventListener("blur", () => {
      const n = parseInt(campo.value, 10);
      if (isNaN(n) || n < 1) { campo.value = "1"; estado.treinoBal.coefs[i] = 1; atualizarContagemDoDesafio(); }
    });

    item.appendChild(campo);
    item.appendChild(criar("span", { className: "coef-formula", innerHTML: formatarFormula(esp.formula) }));
    return item;
  }

  /* Redesenha só a contagem, nunca a equação: a equação contém os campos, e
     recriá-los enquanto o aluno digita fecharia o teclado. */
  function atualizarContagemDoDesafio() {
    const antiga = $("#painel-treino-bal").querySelector(".contagem-desafio");
    if (!antiga) return;
    antiga.replaceWith(contagemComCoeficientes());
  }

  function contarComCoeficientes() {
    const t = estado.treinoBal;
    const lado = (especies) => {
      const atomos = {};
      let carga = 0;
      for (const esp of especies) {
        const i = t.balanceada.especies.indexOf(esp);
        const c = t.coefs[i];
        const a = analisar(esp.formula);
        for (const [el, q] of Object.entries(a.composicao)) atomos[el] = (atomos[el] || 0) + q * c;
        carga += (a.carga || 0) * c;
      }
      return { atomos, carga };
    };
    const esq = lado(t.balanceada.reagentes);
    const dir = lado(t.balanceada.produtos);
    const els = [...new Set([...Object.keys(esq.atomos), ...Object.keys(dir.atomos)])].sort();
    const linhas = els.map((el) => ({
      elemento: el, antes: esq.atomos[el] || 0, depois: dir.atomos[el] || 0,
      fecha: (esq.atomos[el] || 0) === (dir.atomos[el] || 0),
    }));
    if (esq.carga !== 0 || dir.carga !== 0) {
      linhas.push({ elemento: "carga", antes: esq.carga, depois: dir.carga, fecha: esq.carga === dir.carga });
    }
    return { linhas, fechaTudo: linhas.every((l) => l.fecha) };
  }

  function contagemComCoeficientes() {
    const r = contarComCoeficientes();
    const caixa = criar("div", { className: "contagem-montador contagem-desafio" });
    const pilhas = criar("div", { className: "pilhas-atomo" });
    for (const l of r.linhas) {
      const p = criar("span", { className: "pilha-atomo" + (l.fecha ? " fecha" : " falha") });
      p.innerHTML = `<span class="pilha-el">${l.elemento}</span>` +
                    `<span class="pilha-num">${l.antes} : ${l.depois}</span>`;
      pilhas.appendChild(p);
    }
    caixa.appendChild(pilhas);
    caixa.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e2) 0 0",
      textContent: "Antes : depois, já com os coeficientes que você escolheu." }));
    return caixa;
  }

  function conferirDesafioBal() {
    const t = estado.treinoBal;
    const certos = t.balanceada.especies.map((e) => e.coeficiente);
    const fecha = contarComCoeficientes().fechaTudo;
    const igual = t.coefs.every((c, i) => c === certos[i]);

    t.respondido = true;
    t.acertou = igual;
    /* Balanceada mas não simplificada não é acerto nem engano comum: é um
       múltiplo. O aluno entendeu o método e errou o pedido. */
    t.multiplo = fecha && !igual;

    const r = registrarTreinoExtra(progresso, TREINO_BAL, igual, t.contou);
    t.ganho = r.ganho;
    t.feitos += 1;
    t.seguidos = igual ? t.seguidos + 1 : 0;

    t.medalhasNovas = r.medalhasNovas;

    desenharTreinoBal();
    desenharPlacarTreinoBal();
    atualizarResumoLateral();
  }

  function devolutivaDesafioBal() {
    const t = estado.treinoBal;
    const caixa = criar("div", { className: "devolutiva-desafio" });

    const veredito = criar("p", { className: "veredito" });
    if (t.acertou) {
      veredito.classList.add("certo");
      veredito.textContent = `Fechou. +${t.ganho} XP.`;
    } else if (t.multiplo) {
      veredito.classList.add("quase");
      const fator = t.coefs[0] / t.balanceada.especies[0].coeficiente;
      veredito.textContent = "Está balanceada — os átomos fecham dos dois lados. Só não está " +
        "nos menores números inteiros" +
        (Number.isInteger(fator) && fator > 1 ? `: divida tudo por ${fator}.` : ".");
    } else {
      veredito.classList.add("errado");
      const falhou = contarComCoeficientes().linhas.filter((l) => !l.fecha).map((l) => l.elemento);
      veredito.textContent = falhou.length
        ? `Ainda não fecha em ${falhou.join(", ")}. Compare os dois lados desses elementos.`
        : "Ainda não fecha.";
    }
    caixa.appendChild(veredito);

    caixa.appendChild(criar("p", { className: "resolucao",
      innerHTML: `A resposta é <strong>${t.balanceada.equacaoTexto}</strong>.` }));

    /* O uso industrial não é enfeite: é o que faz a equação deixar de ser um
       quebra-cabeça de números e virar uma coisa que existe no mundo. */
    const uso = criar("div", { className: "dica-caixa uso-reacao" });
    uso.innerHTML = `<strong>${t.receita.nome}</strong><br>${t.receita.uso}` +
      (t.receita.nota ? `<br><span class="ajuda">${t.receita.nota}</span>` : "");
    caixa.appendChild(uso);

    const levar = criar("button", { type: "button", className: "botao secundario",
      style: "margin-top:var(--mb-e3)", textContent: "Abrir no Balancear" });
    levar.addEventListener("click", () => {
      estado.montagem.reagentes = t.receita.reagentes.slice();
      estado.montagem.produtos = t.receita.produtos.slice();
      aplicarMontagem();
      estado.montagem.receita = t.receita;
      balancearAtual();
      desenharBandejas();
      mostrarTela("tela-balancear");
    });
    /* Mesmo padrão da escada: a medalha é anunciada dentro da devolutiva, sem
       interromper o aluno com um aviso que ocupa a tela. */
    for (const m of (t.medalhasNovas || [])) {
      caixa.appendChild(criar("p", { style: "margin-top:4px;font-weight:500",
        textContent: `Medalha conquistada: ${m.nome}.` }));
    }

    caixa.appendChild(levar);
    return caixa;
  }

  function desenharPlacarTreinoBal() {
    const alvo = $("#placar-treino-bal");
    alvo.innerHTML = "";
    const t = estado.treinoBal;
    const rend = rendimentoDoTreino(progresso, TREINO_BAL);

    const painel = criar("div", { className: "painel-bancada" });
    painel.innerHTML =
      `<div class="medida"><span class="rot">Nesta sessão</span><span class="val">${t.feitos}</span></div>` +
      `<div class="medida"><span class="rot">Seguidos</span><span class="val">${t.seguidos}</span></div>` +
      `<div class="medida"><span class="rot">Acertos no treino</span><span class="val">${rend.acertos}</span></div>`;
    alvo.appendChild(painel);

    /* O mesmo aviso da escada: o aluno merece saber que o rendimento cai antes
       de descobrir sozinho e se sentir enganado. */
    if (rend.saturado) {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e3) 0 0",
        textContent: "Você já domina este treino: cada acerto vale 20% do XP. " +
          "O Treino da escada tem outros tipos de exercício esperando." }));
    } else if (rend.caindo) {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e3) 0 0",
        textContent: "O XP por acerto vai diminuindo neste treino, para valorizar o que você ainda não domina." }));
    } else {
      alvo.appendChild(criar("p", { className: "ajuda", style: "margin:var(--mb-e3) 0 0",
        textContent: `Faltam ${rend.restamCheios} acertos com XP integral neste treino.` }));
    }
  }

  /* ---------------- tela: estequiometria ---------------- */

  function desenharEstequiometria() {
    const alvo = $("#painel-esteq");
    alvo.innerHTML = "";
    const b = estado.balanceada;

    if (!b) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Balanceie uma equação primeiro. A estequiometria só faz sentido depois que a proporção entre as substâncias está definida.</p></div>`;
      return;
    }

    const cabeca = criar("div", { className: "cartao" });
    const vista = criar("div", { className: "equacao-vista", style: "font-size:var(--mb-t-titulo-3);padding:var(--mb-e2) 0" });
    vista.innerHTML = escreverEquacaoHTML(b);
    cabeca.appendChild(vista);
    alvo.appendChild(cabeca);

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = "<h2 style=\"margin-top:0\">O que você tem</h2>";

    const seletorUnidade = criar("select", { id: "unidade-esteq" });
    seletorUnidade.appendChild(criar("option", { value: "g", textContent: "Informar em gramas" }));
    seletorUnidade.appendChild(criar("option", { value: "mol", textContent: "Informar em mols" }));
    seletorUnidade.value = estado.esteq.unidade;
    seletorUnidade.addEventListener("change", () => {
      estado.esteq.unidade = seletorUnidade.value;
      desenharEstequiometria();
    });
    const rotuloUnidade = criar("label", { htmlFor: "unidade-esteq", textContent: "Unidade das quantidades" });
    entrada.appendChild(rotuloUnidade);
    entrada.appendChild(seletorUnidade);
    entrada.appendChild(criar("div", { style: "height:var(--mb-e4)" }));

    b.reagentes.forEach((r, i) => {
      const bloco = criar("div", { className: "reagente-campo" });

      const nome = criar("div");
      nome.innerHTML = `<span class="nome-r">${r.vista}</span><br>` +
        `<span class="ajuda">coef. ${r.coeficiente} · M = ${formatarNumero(r.analise.massaMolar, 5)} g/mol</span>`;
      bloco.appendChild(nome);

      const caixaQtd = criar("div");
      const idQtd = "qtd-" + i;
      caixaQtd.appendChild(criar("label", { htmlFor: idQtd, textContent: estado.esteq.unidade === "g" ? "Massa (g)" : "Quantidade (mol)" }));
      const campoQtd = criar("input", { type: "text", id: idQtd, inputMode: "decimal", autocomplete: "off", placeholder: "opcional" });
      campoQtd.value = estado.esteq.quantidades[i] || "";
      campoQtd.addEventListener("input", () => {
        estado.esteq.quantidades[i] = campoQtd.value;
        recalcularEstequiometria();
      });
      caixaQtd.appendChild(campoQtd);
      bloco.appendChild(caixaQtd);

      const caixaPureza = criar("div");
      if (estado.esteq.unidade === "g") {
        const idPur = "pur-" + i;
        caixaPureza.appendChild(criar("label", { htmlFor: idPur, textContent: "Pureza (%)" }));
        const campoPur = criar("input", { type: "text", id: idPur, inputMode: "decimal", autocomplete: "off", placeholder: "100" });
        campoPur.value = estado.esteq.purezas[i] || "";
        campoPur.addEventListener("input", () => {
          estado.esteq.purezas[i] = campoPur.value;
          recalcularEstequiometria();
        });
        caixaPureza.appendChild(campoPur);
      }
      bloco.appendChild(caixaPureza);
      entrada.appendChild(bloco);
    });

    entrada.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Deixe em branco o reagente que estiver em excesso conhecido ou que não interessa controlar. Basta um valor para o cálculo sair.",
    }));
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-esteq" }));
    recalcularEstequiometria();
  }

  function recalcularEstequiometria() {
    const b = estado.balanceada;
    const saida = $("#saida-esteq");
    if (!saida) return;
    saida.innerHTML = "";

    const mols = {};
    let algum = false;
    b.reagentes.forEach((r, i) => {
      const valor = lerNumero(estado.esteq.quantidades[i]);
      if (!isFinite(valor) || valor <= 0) { mols[i] = null; return; }
      const pureza = lerNumero(estado.esteq.purezas[i]);
      mols[i] = entradaParaMols(valor, estado.esteq.unidade, r.analise.massaMolar, isFinite(pureza) ? pureza : 100);
      algum = true;
    });

    if (!algum) {
      saida.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe a quantidade de pelo menos um reagente para ver o resultado.</p></div>`;
      return;
    }

    const r = calcularEstequiometria(b, mols);
    if (r.situacao !== "ok") {
      saida.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">${r.mensagem}</p></div>`;
      return;
    }

    const conhecidos = r.razoes.length;

    const resumo = criar("div", { className: "cartao" });
    if (conhecidos > 1) {
      resumo.innerHTML =
        `<h2 style="margin-top:0">Quem manda na reação</h2>` +
        (r.proporcaoExata
          ? `<p style="margin:0">Os reagentes estão na proporção exata da equação: nenhum sobra. Na prática de bancada isso quase nunca acontece por acaso.</p>`
          : `<p style="margin:0">O reagente limitante é <strong>${r.limitante.formula}</strong>. Ele acaba primeiro, e por isso define tudo que se forma.</p>`);
      const tabelaRazao = criar("table");
      tabelaRazao.innerHTML = `<thead><tr><th>Reagente</th><th>mols</th><th>÷ coef.</th><th>razão</th></tr></thead>`;
      const corpo = criar("tbody");
      for (const item of r.razoes) {
        const reg = b.reagentes[item.indice];
        const tr = criar("tr");
        if (item.indice === r.limitanteIndice) tr.className = "limitante";
        tr.innerHTML = `<td>${reg.vista}${item.indice === r.limitanteIndice ? '<span class="selo-limitante">LIMITANTE</span>' : ""}</td>` +
          `<td class="num">${formatarNumero(item.mols, 4)}</td><td class="num">${item.coeficiente}</td>` +
          `<td class="num">${formatarNumero(item.razao, 4)}</td>`;
        corpo.appendChild(tr);
      }
      tabelaRazao.appendChild(corpo);
      resumo.appendChild(tabelaRazao);
      resumo.appendChild(criar("p", {
        className: "ajuda",
        textContent: "Repare que quem manda é a menor razão, não a menor massa nem o menor número de mols. Um reagente que a equação consome de três em três acaba antes de outro que ela consome de um em um.",
      }));
    } else {
      resumo.innerHTML = `<h2 style="margin-top:0">Com um reagente informado</h2>` +
        `<p style="margin:0">Só <strong>${b.reagentes[r.razoes[0].indice].formula}</strong> foi informado, então a conta supõe que todos os outros estão em excesso.</p>`;
    }
    saida.appendChild(resumo);

    const tabela = criar("div", { className: "cartao" });
    tabela.innerHTML = `<h2 style="margin-top:0">O que acontece com cada substância</h2>`;
    const t = criar("table");
    t.innerHTML = `<thead><tr><th>Substância</th><th>mol</th><th>massa</th><th>situação</th></tr></thead>`;
    const corpo = criar("tbody");

    for (const l of r.linhas) {
      const tr = criar("tr");
      if (l.limitante) tr.className = "limitante";
      if (l.papel === "reagente") {
        const situacao = l.emFalta ? "suposto em excesso"
          : l.limitante ? "consumido por inteiro"
          : `sobram ${formatarNumero(l.restanteMols, 3)} mol (${formatarNumero(l.restanteMassa, 3)} g)`;
        tr.innerHTML = `<td>${l.especie.vista}${l.limitante ? '<span class="selo-limitante">LIMITANTE</span>' : ""}</td>` +
          `<td class="num">−${formatarNumero(l.consumidoMols, 4)}</td>` +
          `<td class="num">−${formatarNumero(l.consumidoMassa, 4)} g</td>` +
          `<td class="ajuda" style="text-align:left">${situacao}</td>`;
      } else {
        tr.innerHTML = `<td>${l.especie.vista}</td>` +
          `<td class="num">+${formatarNumero(l.formadoMols, 4)}</td>` +
          `<td class="num">+${formatarNumero(l.formadoMassa, 4)} g</td>` +
          `<td class="ajuda" style="text-align:left">formado</td>`;
      }
      corpo.appendChild(tr);
    }
    t.appendChild(corpo);
    tabela.appendChild(t);
    tabela.appendChild(criar("p", {
      className: "ajuda",
      textContent: `A reação acontece ${formatarNumero(r.extensao, 4)} vez${r.extensao === 1 ? "" : "es"} — é esse número, multiplicado pelo coeficiente de cada substância, que gera a coluna de mols.`,
    }));
    saida.appendChild(tabela);

    // rendimento
    const produtos = r.linhas.filter(l => l.papel === "produto");
    const rendCartao = criar("div", { className: "cartao" });
    rendCartao.innerHTML = `<h2 style="margin-top:0">Rendimento</h2>` +
      `<p class="ajuda">A massa acima é a teórica, a que a equação promete. Pese o que realmente saiu da bancada e compare.</p>`;

    const seletorProduto = criar("select", { id: "produto-rend" });
    produtos.forEach((pr, i) => {
      seletorProduto.appendChild(criar("option", { value: String(i), textContent: pr.especie.formula }));
    });
    seletorProduto.value = String(Math.min(estado.esteq.produtoRendimento, produtos.length - 1));
    seletorProduto.addEventListener("change", () => {
      estado.esteq.produtoRendimento = Number(seletorProduto.value);
      recalcularEstequiometria();
    });
    rendCartao.appendChild(criar("label", { htmlFor: "produto-rend", textContent: "Produto isolado" }));
    rendCartao.appendChild(seletorProduto);

    const escolhido = produtos[Math.min(estado.esteq.produtoRendimento, produtos.length - 1)];
    rendCartao.appendChild(criar("div", { style: "height:var(--mb-e3)" }));
    rendCartao.appendChild(criar("label", { htmlFor: "massa-obtida", textContent: "Massa obtida (g)" }));
    const campoObtida = criar("input", { type: "text", id: "massa-obtida", inputMode: "decimal", autocomplete: "off", placeholder: formatarNumero(escolhido.formadoMassa, 3) });
    campoObtida.value = estado.esteq.massaObtida;
    campoObtida.addEventListener("input", () => {
      estado.esteq.massaObtida = campoObtida.value;
      recalcularEstequiometria();
      const nova = document.getElementById("massa-obtida");
      if (nova) { nova.focus(); nova.setSelectionRange(nova.value.length, nova.value.length); }
    });
    rendCartao.appendChild(campoObtida);

    const obtida = lerNumero(estado.esteq.massaObtida);
    if (isFinite(obtida) && obtida > 0) {
      const rend = calcularRendimento(obtida, escolhido.formadoMassa);
      const caixa = criar("div", { className: "veredito " + (rend.percentual > 100 ? "diagnosticado" : "certo"), style: "margin-top:var(--mb-e3)" });
      caixa.innerHTML = `<span class="selo">RENDIMENTO</span>` +
        `<p><strong>${formatarNumero(rend.percentual, 3)}%</strong> — ${formatarNumero(obtida, 3)} g obtidos de ${formatarNumero(escolhido.formadoMassa, 3)} g teóricos.</p>`;
      if (rend.observacao) caixa.appendChild(criar("p", { className: "ajuda", style: "margin-top:6px", textContent: rend.observacao }));
      rendCartao.appendChild(caixa);
    }

    saida.appendChild(rendCartao);
  }


  /* ---------------- ajudantes de formulário ---------------- */

  function campoTexto(pai, { id, rotulo, rotuloHtml, valor, dica, aoMudar, placeholder, comBanco }) {
    const caixa = criar("div");
    const etiqueta = criar("label", { htmlFor: id });
    // rotuloHtml existe para que fórmulas apareçam com índice subscrito no
    // rótulo do campo; textContent não aceitaria a marcação
    if (rotuloHtml) etiqueta.innerHTML = rotuloHtml; else etiqueta.textContent = rotulo;
    caixa.appendChild(etiqueta);
    const input = criar("input", {
      type: "text", id, inputMode: "decimal", autocomplete: "off",
      spellcheck: false, value: valor || "", placeholder: placeholder || "",
    });
    input.addEventListener("input", () => aoMudar(input.value));
    caixa.appendChild(input);
    if (dica) caixa.appendChild(criar("p", { className: "ajuda", textContent: dica }));
    /* `comBanco` abre o seletor de espécies para este campo. O botão é criado
       junto com o campo, e não em HTML fixo, porque estes painéis são
       redesenhados por código a cada mudança. */
    if (comBanco) {
      const bot = criar("button", { type: "button", className: "botao secundario botao-banco",
        textContent: "Escolher do banco de espécies" });
      bot.addEventListener("click", () => abrirSeletorEspecies((formula) => {
        input.value = formula;
        aoMudar(formula);
      }));
      caixa.appendChild(bot);
    }
    pai.appendChild(caixa);
    return input;
  }

  function campoSelecao(pai, { id, rotulo, opcoes, valor, aoMudar }) {
    const caixa = criar("div");
    caixa.appendChild(criar("label", { htmlFor: id, textContent: rotulo }));
    const sel = criar("select", { id });
    for (const o of opcoes) sel.appendChild(criar("option", { value: String(o.valor), textContent: o.rotulo }));
    sel.value = String(valor);
    sel.addEventListener("change", () => aoMudar(sel.value));
    caixa.appendChild(sel);
    pai.appendChild(caixa);
    return sel;
  }

  function cartaoDeErro(alvo, mensagem) {
    const c = criar("div", { className: "cartao" });
    c.appendChild(criar("div", { className: "erro", textContent: mensagem }));
    alvo.appendChild(c);
  }

  function listaDeAvisos(pai, avisos, classe = "ressalva") {
    for (const a of avisos || []) {
      pai.appendChild(criar("div", { className: classe, textContent: a }));
    }
  }

  /* ---------------- tela: concentração ---------------- */

  function desenharSolucoes() {
    const alvo = $("#painel-solucoes");
    alvo.innerHTML = "";
    const st = estado.solucao;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">A solução</h2>`;
    const grade = criar("div", { className: "grelha-3" });

    campoTexto(grade, {
      id: "sol-formula", rotulo: "Soluto", valor: st.formula, placeholder: "NaCl", comBanco: true,
      aoMudar: (v) => { st.formula = v; desenharSaidaSolucao(); },
    });
    campoSelecao(grade, {
      id: "sol-unidade", rotulo: "Unidade informada",
      opcoes: Object.keys(UNIDADES_CONCENTRACAO).map((k) => ({ valor: k, rotulo: UNIDADES_CONCENTRACAO[k].rotulo })),
      valor: st.unidade, aoMudar: (v) => { st.unidade = v; desenharSolucoes(); },
    });
    campoTexto(grade, {
      id: "sol-valor", rotulo: `Valor (${UNIDADES_CONCENTRACAO[st.unidade].unidade || "adimensional"})`,
      valor: st.valor, aoMudar: (v) => { st.valor = v; desenharSaidaSolucao(); },
    });
    entrada.appendChild(grade);

    const linha2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(linha2, {
      id: "sol-densidade", rotulo: "Densidade da solução (g/mL)", valor: st.densidade,
      dica: "Sem densidade não há conversão entre massa e volume. Água pura é 1,00; ácido clorídrico concentrado é 1,19.",
      aoMudar: (v) => { st.densidade = v; desenharSaidaSolucao(); },
    });
    entrada.appendChild(linha2);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-solucao" }));
    desenharSaidaSolucao();

    desenharDiluicao(alvo);
    desenharMistura(alvo);
  }

  function desenharSaidaSolucao() {
    const alvo = $("#saida-solucao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.solucao;

    let analise;
    try { analise = analisar(st.formula); }
    catch (e) { cartaoDeErro(alvo, e.message); return; }

    const valor = lerNumero(st.valor);
    const densidade = lerNumero(st.densidade);
    if (!isFinite(valor) || valor <= 0) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe um valor de concentração.</p></div>`;
      return;
    }

    const molar = paraMolar(valor, st.unidade, analise.massaMolar, densidade);
    const tudo = todasAsConcentracoes(molar, analise.massaMolar, densidade);

    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML =
      `<h2 style="margin-top:0">A mesma solução em todas as unidades</h2>` +
      `<p class="ajuda">${formatarFormula(analise.normalizada)} · M = ${formatarNumero(analise.massaMolar, 5)} g/mol · ` +
      `d = ${formatarNumero(isFinite(densidade) && densidade > 0 ? densidade : 1, 3)} g/mL</p>`;

    const tabela = criar("table", { className: "tabela-unidades" });
    tabela.innerHTML = `<thead><tr><th>Unidade</th><th>Valor</th></tr></thead>`;
    const corpo = criar("tbody");
    for (const chave of Object.keys(UNIDADES_CONCENTRACAO)) {
      const u = UNIDADES_CONCENTRACAO[chave];
      const tr = criar("tr");
      if (chave === st.unidade) tr.className = "escolhida";
      const v = tudo[chave];
      tr.innerHTML = `<td>${u.rotulo}${chave === st.unidade ? " <span class=\"ajuda\">informado</span>" : ""}</td>` +
        `<td class="num">${isFinite(v) ? formatarNumero(v, 5) : "—"} ${u.unidade}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    cartao.appendChild(tabela);

    const base = criar("p", { className: "ajuda" });
    base.innerHTML = `Em um litro desta solução há <strong>${formatarNumero(tudo.massaSolutoPorLitro, 4)} g</strong> de soluto ` +
      `e <strong>${formatarNumero(tudo.massaSolventePorLitro, 5)} g</strong> de solvente, somando ${formatarNumero(tudo.massaSolucaoPorLitro, 5)} g. ` +
      `Todas as unidades acima são razões entre esses três números.`;
    cartao.appendChild(base);

    if (tudo.impossivel) {
      cartao.appendChild(criar("div", {
        className: "erro",
        textContent: "Esta combinação é impossível: a massa de soluto por litro já ultrapassa a massa total da solução. Confira a densidade ou a concentração.",
      }));
    }

    const fm = fracaoMolar(molar, analise.massaMolar, densidade);
    if (isFinite(fm)) {
      cartao.appendChild(criar("p", {
        className: "ajuda",
        textContent: `Fração molar do soluto em água: ${formatarNumero(fm, 4)}.`,
      }));
    }
    alvo.appendChild(cartao);
  }

  function desenharDiluicao(alvo) {
    const st = estado.solucao.dil;
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Diluição</h2>` +
      `<p class="ajuda">Preencha três campos e deixe o quarto em branco. Diluir não muda a quantidade de matéria do soluto: espalha a mesma quantidade num volume maior.</p>`;

    const grade = criar("div", { className: "grelha-2" });
    const campos = [
      ["dil-c1", "Concentração inicial (mol/L)", "c1"],
      ["dil-v1", "Volume inicial (mL)", "v1"],
      ["dil-c2", "Concentração final (mol/L)", "c2"],
      ["dil-v2", "Volume final (mL)", "v2"],
    ];
    for (const [id, rotulo, chave] of campos) {
      campoTexto(grade, {
        id, rotulo, valor: st[chave], placeholder: "em branco",
        aoMudar: (v) => { st[chave] = v; atualizarDiluicao(); },
      });
    }
    cartao.appendChild(grade);
    cartao.appendChild(criar("div", { id: "saida-diluicao" }));
    alvo.appendChild(cartao);
    atualizarDiluicao();
  }

  function atualizarDiluicao() {
    const alvo = $("#saida-diluicao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.solucao.dil;
    const r = diluicao({
      c1: lerNumero(st.c1), v1: lerNumero(st.v1),
      c2: lerNumero(st.c2), v2: lerNumero(st.v2),
    });

    if (r.situacao !== "ok") {
      alvo.innerHTML = `<p class="ajuda" style="margin-top:var(--mb-e3)">${r.mensagem}</p>`;
      return;
    }

    const linha = criar("div", { className: "destaque-linha" });
    linha.innerHTML =
      `<span class="rot">Pipete</span><span class="val">${formatarNumero(r.v1, 4)} mL</span>` +
      `<span class="rot">da solução de ${formatarNumero(r.c1, 4)} mol/L e complete a</span>` +
      `<span class="val">${formatarNumero(r.v2, 4)} mL</span>`;
    alvo.appendChild(linha);

    alvo.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Diluição de ${formatarNumero(r.fator, 4)} vezes. São ${formatarNumero(r.quantidadeDeMateria, 4)} mol de soluto, ` +
        `que continuam os mesmos depois de acrescentar ${formatarNumero(r.aguaAdicionada, 4)} mL de solvente.`,
    }));
    listaDeAvisos(alvo, r.avisos);
  }

  function desenharMistura(alvo) {
    const st = estado.solucao.mix;
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Mistura de soluções</h2>` +
      `<p class="ajuda">Duas soluções do mesmo soluto. A quantidade de matéria soma; a concentração final é a soma dividida pelo volume total.</p>`;

    st.forEach((parte, i) => {
      const grade = criar("div", { className: "grelha-2" });
      campoTexto(grade, {
        id: `mix-c-${i}`, rotulo: `Solução ${i + 1} — concentração (mol/L)`, valor: parte.c,
        aoMudar: (v) => { parte.c = v; atualizarMistura(); },
      });
      campoTexto(grade, {
        id: `mix-v-${i}`, rotulo: `Solução ${i + 1} — volume (mL)`, valor: parte.v,
        aoMudar: (v) => { parte.v = v; atualizarMistura(); },
      });
      cartao.appendChild(grade);
    });

    cartao.appendChild(criar("div", { id: "saida-mistura" }));
    alvo.appendChild(cartao);
    atualizarMistura();
  }

  function atualizarMistura() {
    const alvo = $("#saida-mistura");
    if (!alvo) return;
    alvo.innerHTML = "";
    const r = misturar(estado.solucao.mix.map((p) => ({ c: lerNumero(p.c), v: lerNumero(p.v) })));

    if (r.situacao !== "ok") {
      alvo.innerHTML = `<p class="ajuda" style="margin-top:var(--mb-e3)">${r.mensagem}</p>`;
      return;
    }
    const linha = criar("div", { className: "destaque-linha" });
    linha.innerHTML = `<span class="rot">Concentração final</span><span class="val">${formatarNumero(r.cFinal, 5)} mol/L</span>`;
    alvo.appendChild(linha);
    alvo.appendChild(criar("p", {
      className: "ajuda",
      textContent: `${formatarNumero(r.mols, 5)} mol de soluto em ${formatarNumero(r.volume, 5)} mL.`,
    }));
    alvo.appendChild(criar("div", { className: "ressalva", textContent: r.ressalva }));
  }


  /* ---------------- tela: preparo ---------------- */

  /* Unidades definidas sobre a massa da solução: sem a densidade dela não há
     como chegar a mol/L. As outras quatro se referem ao volume e dispensam. */
  const PRECISA_DENSIDADE_SOLUCAO = ["percentMM", "titulo", "molalidade"];

  function desenharPreparo() {
    const alvo = $("#painel-preparo");
    alvo.innerHTML = "";
    const st = estado.preparo;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">O que você quer preparar</h2>`;

    const g1 = criar("div", { className: "grelha-3" });
    campoTexto(g1, { id: "prep-formula", rotulo: "Reagente", valor: st.formula, placeholder: "NaOH", comBanco: true,
      aoMudar: (v) => { st.formula = v; atualizarPreparo(); } });
    campoTexto(g1, { id: "prep-volume", rotulo: "Volume final (mL)", valor: st.volume,
      aoMudar: (v) => { st.volume = v; atualizarPreparo(); } });
    campoSelecao(g1, {
      id: "prep-unidade", rotulo: "Unidade informada",
      opcoes: Object.keys(UNIDADES_CONCENTRACAO).map((k) => ({ valor: k, rotulo: UNIDADES_CONCENTRACAO[k].rotulo })),
      valor: st.unidade, aoMudar: (v) => { st.unidade = v; desenharPreparo(); },
    });
    campoTexto(g1, {
      id: "prep-conc",
      rotulo: `Concentração (${UNIDADES_CONCENTRACAO[st.unidade].unidade || "adimensional"})`,
      valor: st.concentracao,
      aoMudar: (v) => { st.concentracao = v; atualizarPreparo(); },
    });
    entrada.appendChild(g1);

    /* Três das sete unidades são definidas sobre a MASSA da solução, e não
       sobre o volume: % m/m, título e molalidade. Para elas não há como chegar
       a mol/L sem a densidade da solução — e essa é a densidade da solução
       pronta, não a do reagente do frasco, que é outro campo e outra coisa.
       O campo só aparece quando faz falta, para não pedir número inútil. */
    if (PRECISA_DENSIDADE_SOLUCAO.includes(st.unidade)) {
      const gd = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
      campoTexto(gd, { id: "prep-dens-solucao", rotulo: "Densidade da solução pronta (g/mL)",
        valor: st.densSolucao, placeholder: "1",
        dica: "Esta unidade se refere à massa da solução, então a conta depende da densidade dela. " +
              "Para solução aquosa diluída, 1,00 é uma aproximação razoável; para solução concentrada, " +
              "use o valor do rótulo ou da tabela.",
        aoMudar: (v) => { st.densSolucao = v; atualizarPreparo(); } });
      entrada.appendChild(gd);
    }

    const g2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(g2, { id: "prep-pureza", rotulo: "Pureza do rótulo (%)", valor: st.pureza, placeholder: "100",
      dica: "O que está escrito no frasco. Esquecer este número é o erro de preparo mais comum.",
      aoMudar: (v) => { st.pureza = v; atualizarPreparo(); } });
    campoTexto(g2, { id: "prep-densidade", rotulo: "Densidade, se líquido (g/mL)", valor: st.densidade, placeholder: "só para reagente líquido",
      aoMudar: (v) => { st.densidade = v; atualizarPreparo(); } });
    entrada.appendChild(g2);

    const atalhos = criar("div", { className: "chips" });
    const exemplos = [
      ["NaOH 0,1 mol/L · 500 mL", { formula: "NaOH", volume: "500", concentracao: "0,1", pureza: "97", densidade: "" }],
      ["HCl 0,1 mol/L · 1 L", { formula: "HCl", volume: "1000", concentracao: "0,1", pureza: "", densidade: "" }],
      ["H2SO4 0,5 mol/L · 250 mL", { formula: "H2SO4", volume: "250", concentracao: "0,5", pureza: "", densidade: "" }],
      /* Antes este atalho guardava 0,154 mol/L: alguém teve de converter os 0,9%
         do rótulo à mão porque a tela só aceitava mol/L. Agora guarda o que o
         rótulo diz. */
      ["NaCl 0,9% fisiológico", { formula: "NaCl", volume: "1000", concentracao: "0,9", unidade: "percentMV", pureza: "99,5", densidade: "" }],
    ];
    /* Atalho que não repõe a unidade herdaria a que estava selecionada, e o
       aluno veria "HCl 0,1 mol/L" produzindo a massa de 0,1 ppm. */
    for (const [rotulo, cfg] of exemplos) {
      if (!cfg.unidade) cfg.unidade = "molar";
      const b = criar("button", { type: "button", className: "chip", textContent: rotulo });
      b.addEventListener("click", () => { Object.assign(st, cfg); desenharPreparo(); });
      atalhos.appendChild(b);
    }
    entrada.appendChild(atalhos);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-preparo" }));
    atualizarPreparo();
  }

  function atualizarPreparo() {
    const alvo = $("#saida-preparo");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.preparo;

    let analise;
    try { analise = analisar(st.formula); }
    catch (e) { cartaoDeErro(alvo, e.message); return; }

    /* O motor do preparo trabalha em mol/L e continua assim. A unidade
       informada é convertida aqui, na borda, reusando o mesmo `paraMolar` da
       tela de Concentração — duas conversões paralelas divergiriam, e o aluno
       veria as duas telas discordando sobre a mesma solução. */
    let concentracaoMolar;
    try {
      concentracaoMolar = paraMolar(
        lerNumero(st.concentracao), st.unidade, analise.massaMolar,
        PRECISA_DENSIDADE_SOLUCAO.includes(st.unidade) ? (lerNumero(st.densSolucao) || 1) : 1);
    } catch (e) { cartaoDeErro(alvo, e.message); return; }

    const r = prepararSolucao({
      formula: analise.normalizada,
      massaMolar: analise.massaMolar,
      volumeFinalML: lerNumero(st.volume),
      concentracaoMolar,
      pureza: lerNumero(st.pureza),
      densidadeReagente: lerNumero(st.densidade),
    });

    if (r.situacao !== "ok") { cartaoDeErro(alvo, r.mensagem); return; }

    const resumo = criar("div", { className: "cartao" });
    resumo.innerHTML = `<h2 style="margin-top:0">Na balança e na bureta</h2>`;

    const linha = criar("div", { className: "destaque-linha" });
    if (r.ehLiquido) {
      linha.innerHTML = `<span class="rot">Meça</span><span class="val">${formatarNumero(r.volumeReagenteML, 4)} mL</span>` +
        `<span class="rot">do reagente concentrado</span>`;
    } else {
      // cinco algarismos: a balança analítica lê até 0,1 mg, e arredondar
      // para quatro joga fora um dígito que o instrumento entrega
      linha.innerHTML = `<span class="rot">Pese</span><span class="val">${formatarNumero(r.massaReagente, 5)} g</span>` +
        `<span class="rot">do reagente</span>`;
    }
    resumo.appendChild(linha);

    const ficha = criar("dl", { className: "ficha-bancada", style: "margin-top:var(--mb-e4)" });
    const itens = [
      ["Quantidade de matéria", `${formatarNumero(r.mols, 5)} mol`],
      ["Massa de substância pura", `${formatarNumero(r.massaPura, 5)} g`],
      ["Pureza considerada", `${formatarNumero(r.purezaUsada, 4)}%`],
      ["Massa molar", `${formatarNumero(analise.massaMolar, 5)} g/mol`],
    ];
    if (r.ehLiquido) {
      itens.push(["Densidade do frasco", `${formatarNumero(r.densidade, 4)} g/mL`]);
      itens.push(["Concentração do frasco", `${formatarNumero(r.concentracaoDoFrasco, 4)} mol/L`]);
      itens.push(["Vidraria de medida", r.medidor.tipo]);
    } else {
      itens.push(["Balança", `${r.balanca.classe}${r.balanca.precisao ? " (" + r.balanca.precisao + ")" : ""}`]);
    }
    itens.push(["Balão volumétrico", r.balao.volume ? `${r.balao.volume} mL` : "não há tamanho adequado"]);
    for (const [rot, val] of itens) {
      ficha.appendChild(criar("dt", { textContent: rot }));
      ficha.appendChild(criar("dd", { textContent: val }));
    }
    resumo.appendChild(ficha);
    alvo.appendChild(resumo);

    desenharSeguranca(alvo, r, analise);

    const roteiro = criar("div", { className: "cartao" });
    roteiro.innerHTML = `<h2 style="margin-top:0">A ordem das operações</h2>`;
    const lista = criar("ol", { className: "roteiro" });
    for (const passo of r.passos) {
      const li = criar("li");
      li.innerHTML = `<p class="titulo-passo">${passo.titulo}</p><p>${passo.texto}</p>`;
      lista.appendChild(li);
    }
    roteiro.appendChild(lista);
    alvo.appendChild(roteiro);

    if (r.avisos.length) {
      const cuidados = criar("div", { className: "cartao" });
      cuidados.innerHTML = `<h2 style="margin-top:0">O que o exercício não conta</h2>`;
      listaDeAvisos(cuidados, r.avisos);
      alvo.appendChild(cuidados);
    }
  }


  /* A segurança entra antes do roteiro, e não como rodapé: um alerta lido
     depois de o aluno já ter pesado e aberto o frasco não serviu para nada. */
  function desenharSeguranca(alvo, r, analise) {
    const s = avaliarSeguranca({
      formula: analise.normalizada,
      ehLiquido: r.ehLiquido,
      massaReagente: r.massaReagente,
      volumeReagenteML: r.volumeReagenteML,
      volumeFinalML: r.volumeFinalML,
      concentracaoMolar: r.concentracaoMolar,
      concentracaoDoFrasco: r.concentracaoDoFrasco,
    });

    const cartao = criar("div", { className: "cartao cartao-seguranca" });
    cartao.innerHTML = `<h2 style="margin-top:0">Antes de encostar no frasco</h2>`;

    const faixa = criar("div", { className: "faixa-epi" });
    const marcas = [];
    if (s.exigeCapela) marcas.push({ icone: "🌬️", texto: "Capela" });
    if (s.exigeBanhoDeGelo) marcas.push({ icone: "🧊", texto: "Banho de gelo" });
    marcas.push({ icone: "🥽", texto: "Óculos" });
    marcas.push({ icone: "🧤", texto: "Luvas" });
    marcas.push({ icone: "🥼", texto: "Jaleco" });
    for (const m of marcas) {
      const sel = criar("span", { className: "selo-epi" });
      sel.innerHTML = `<span aria-hidden="true">${m.icone}</span> ${m.texto}`;
      faixa.appendChild(sel);
    }
    cartao.appendChild(faixa);

    cartao.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Proteção recomendada para este reagente: " + s.epi.join("; ") + ".",
    }));

    if (!s.temPerfil) {
      cartao.appendChild(criar("div", {
        className: "risco info",
        innerHTML: `<span class="selo-risco">SEM PERFIL CADASTRADO</span>` +
          `<p>Não tenho perfil de risco específico para ${formatarFormula(analise.normalizada)}. ` +
          `Isso não significa que ele seja inofensivo: significa que você precisa ler a FISPQ do lote antes de manipular.</p>`,
      }));
    }

    for (const a of s.avisos) {
      const caixa = criar("div", { className: "risco " + a.nivel });
      caixa.innerHTML = `<span class="selo-risco">${niveisDeRisco()[a.nivel].rotulo}</span>` +
        `<p class="titulo-risco">${a.titulo}</p><p>${a.texto}</p>`;
      cartao.appendChild(caixa);
    }

    const gerais = criar("details", { className: "gerais-seguranca" });
    gerais.appendChild(criar("summary", { textContent: "Vale para qualquer preparo" }));
    for (const g of s.gerais) {
      const item = criar("div", { className: "risco info" });
      item.innerHTML = `<p class="titulo-risco">${g.titulo}</p><p>${g.texto}</p>`;
      gerais.appendChild(item);
    }
    cartao.appendChild(gerais);

    cartao.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Estas informações vêm de fichas de segurança e de manuais de boas práticas, e servem para lembrar do que costuma ser esquecido. Elas não substituem a FISPQ do lote que está na sua prateleira nem as normas do seu laboratório.",
    }));

    alvo.appendChild(cartao);
  }


  /* Escreve uma equação em texto simples com índices e seta corretos. */
  function formatarEquacaoTexto(texto) {
    return texto.split(/(\s+→\s+|\s\+\s)/).map((parte) => {
      if (/→/.test(parte)) return ` <span class="op seta">→</span> `;
      if (/^\s\+\s$/.test(parte)) return ` <span class="op">+</span> `;
      const m = parte.trim().match(/^(\d+)\s+(.*)$/);
      if (m) return `<span class="termo-eq"><b class="coef">${m[1]}</b> ${formatarFormula(m[2])}</span>`;
      return `<span class="termo-eq">${formatarFormula(parte.trim())}</span>`;
    }).join("");
  }


  /* ---------------- tela: equivalente e normalidade ---------------- */

  function desenharEquivalente() {
    const alvo = $("#painel-equivalente");
    alvo.innerHTML = "";
    const st = estado.eq;

    /* --- abertura: a ressalva vem antes, não depois --- */
    const capa = criar("div", { className: "cartao capa-eq" });
    capa.innerHTML =
      `<p class="sobretitulo">UMA UNIDADE ANTIGA QUE VOCÊ VAI ENCONTRAR</p>` +
      `<h1 style="margin:0 0 var(--mb-e3)">Equivalente e normalidade</h1>` +
      `<p>O equivalente-grama e a normalidade organizaram a química analítica por mais de um ` +
      `século. A IUPAC passou a recomendar o mol como unidade preferencial em 1971, e os livros ` +
      `escolares seguiram esse caminho — mas na bancada a linguagem antiga continua em uso ` +
      `diário, e por bons motivos práticos.</p>` +
      `<p class="fecho-mol">Um equivalente sempre reage com um equivalente. ` +
      `É essa simplicidade que sustenta a unidade.</p>` +
      `<p>Trabalhar bem com ela exige uma atenção: <strong>o k é definido pela reação</strong>. ` +
      `A mesma substância tem equivalentes diferentes conforme o que acontece com ela — e quem ` +
      `domina isso usa a unidade com segurança, enquanto quem ignora erra o laudo.</p>` +
      `<div class="dica-caixa">Laudo de eletrólitos vem em mEq/L. Alcalinidade de água vem em ` +
      `mg/L de CaCO₃. Análise de solo vem em cmolc/kg. O laboratório vai pedir NaOH 0,1 N e ` +
      `esperar que você saiba pesar. Esta tela ensina a ler, converter e usar — sempre deixando ` +
      `à vista qual reação está por trás do número.</div>`;
    alvo.appendChild(capa);

    /* --- o fator k --- */
    const sK = criar("div", { className: "cartao" });
    sK.innerHTML = `<h2 style="margin-top:0">Tudo se resume a achar o k</h2>` +
      `<p>A conta é simples: <strong>E = M ÷ k</strong>, onde M é a massa molar. ` +
      `A dificuldade inteira está em saber quanto vale k — e isso depende da função química ` +
      `e da reação pretendida.</p>`;
    const chipsFuncao = criar("div", { className: "chips" });
    for (const f of funcoesDoEquivalente()) {
      const b = criar("button", { type: "button", className: "chip" + (f.id === st.funcao ? " ativo" : "") });
      b.textContent = f.nome;
      b.addEventListener("click", () => { st.funcao = f.id; desenharEquivalente(); });
      chipsFuncao.appendChild(b);
    }
    sK.appendChild(chipsFuncao);
    const f = funcoesDoEquivalente().filter((x) => x.id === st.funcao)[0];
    const quadroK = criar("div", { className: "quadro-k" });
    quadroK.innerHTML =
      `<p class="regra-k">${f.comoAcharK}</p>` +
      `<p class="ajuda"><strong>Exemplo:</strong> ${f.exemplo}</p>` +
      `<p class="ajuda alerta-k"><strong>Armadilha:</strong> ${f.armadilha}</p>`;
    sK.appendChild(quadroK);

    // calculadora do equivalente
    const grade = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e4)" });
    campoTexto(grade, { id: "eq-formula", rotulo: "Fórmula", valor: st.formula,
      aoMudar: (v) => { st.formula = v; atualizarEquivalente(); } });
    campoTexto(grade, { id: "eq-k", rotulo: "k (da reação pretendida)", valor: st.k,
      aoMudar: (v) => { st.k = v; atualizarEquivalente(); } });
    sK.appendChild(grade);
    sK.appendChild(criar("div", { id: "saida-eq" }));
    alvo.appendChild(sK);

    /* --- a armadilha, com números --- */
    const sArm = criar("div", { className: "cartao" });
    sArm.innerHTML = `<h2 style="margin-top:0">O k vem da reação, não do rótulo</h2>` +
      `<p>Este é o ponto que separa quem usa a unidade com segurança de quem erra o laudo. ` +
      `Veja o mesmo ácido fosfórico, na mesma solução de 0,1 mol/L. Só muda até onde a ` +
      `titulação vai:</p>`;
    const tArm = criar("table");
    tArm.innerHTML = `<thead><tr><th>Até onde reage</th><th>k</th><th>E (g)</th><th>Normalidade</th></tr></thead>`;
    const corpoArm = criar("tbody");
    for (const e of armadilhaDoFosforico(0.1, analisar("H3PO4").massaMolar)) {
      const tr = criar("tr");
      tr.innerHTML = `<td>${e.ate}<br><span class="ajuda">forma ${formatarFormula(e.produto)}</span></td>` +
        `<td class="num">${e.k}</td>` +
        `<td class="num">${formatarNumero(e.equivalenteGrama, 4)}</td>` +
        `<td class="num" style="color:var(--mb-energia);font-weight:500">${formatarNumero(e.normalidade, 3)} N</td>`;
      corpoArm.appendChild(tr);
    }
    tArm.appendChild(corpoArm);
    sArm.appendChild(tArm);
    sArm.appendChild(criar("div", { className: "motivo",
      innerHTML: `Uma solução, três normalidades — todas corretas, cada uma para a sua reação. ` +
        `Por isso a boa prática de bancada é <strong>anotar a reação junto da normalidade</strong>. ` +
        `Em mol/L a solução é 0,1 mol/L sempre, e a estequiometria aparece depois, na equação ` +
        `balanceada. São dois jeitos de guardar a mesma informação.` }));
    alvo.appendChild(sArm);

    /* --- preparar em normalidade --- */
    const sPrep = criar("div", { className: "cartao" });
    sPrep.innerHTML = `<h2 style="margin-top:0">Preparar uma solução em normalidade</h2>` +
      `<p class="ajuda">É o que vão pedir no laboratório. Use a fórmula e o k definidos acima.</p>`;
    const gPrep = criar("div", { className: "grelha-2" });
    campoTexto(gPrep, { id: "eq-n", rotulo: "Normalidade desejada (N)", valor: st.normalidade,
      aoMudar: (v) => { st.normalidade = v; atualizarEquivalente(); } });
    campoTexto(gPrep, { id: "eq-v", rotulo: "Volume final (L)", valor: st.volume,
      aoMudar: (v) => { st.volume = v; atualizarEquivalente(); } });
    sPrep.appendChild(gPrep);
    sPrep.appendChild(criar("div", { id: "saida-preparo-eq" }));
    alvo.appendChild(sPrep);

    /* --- eletrólitos --- */
    const sEle = criar("div", { className: "cartao" });
    sEle.innerHTML = `<h2 style="margin-top:0">Eletrólitos em mEq/L</h2>` +
      `<p>O laudo clínico fala esta língua. Aqui o k é simplesmente a carga do íon, ` +
      `e por isso não há ambiguidade nenhuma — este é o uso mais legítimo da unidade.</p>`;
    const chipsEle = criar("div", { className: "chips" });
    for (const io of eletrolitosConhecidos()) {
      const b = criar("button", { type: "button", className: "chip" + (io.formula === st.eletrolito ? " ativo" : "") });
      b.innerHTML = formatarFormula(io.formula);
      b.addEventListener("click", () => { st.eletrolito = io.formula; desenharEquivalente(); });
      chipsEle.appendChild(b);
    }
    sEle.appendChild(chipsEle);
    const gEle = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(gEle, { id: "eq-valor", rotulo: "Valor", valor: st.valorEletrolito,
      aoMudar: (v) => { st.valorEletrolito = v; atualizarEquivalente(); } });
    campoSelecao(gEle, { id: "eq-unidade", rotulo: "Unidade", valor: st.unidadeEletrolito,
      opcoes: [{ valor: "mEqPorL", rotulo: "mEq/L" }, { valor: "mgPorL", rotulo: "mg/L" },
               { valor: "mmolPorL", rotulo: "mmol/L" }],
      aoMudar: (v) => { st.unidadeEletrolito = v; desenharEquivalente(); } });
    sEle.appendChild(gEle);
    sEle.appendChild(criar("div", { id: "saida-eletrolito" }));
    alvo.appendChild(sEle);

    /* --- alcalinidade e dureza --- */
    const sAgua = criar("div", { className: "cartao" });
    sAgua.innerHTML = `<h2 style="margin-top:0">Alcalinidade e dureza como CaCO₃</h2>` +
      `<p>O resultado sai em miligramas de carbonato de cálcio por litro <em>mesmo quando não há ` +
      `carbonato de cálcio nenhum na amostra</em>. É uma convenção: expressar tudo numa substância ` +
      `de referência permite comparar laudos de laboratórios diferentes.</p>` +
      `<p class="ajuda">O CaCO₃ tem massa molar ${formatarNumero(100.087, 6)} e k = 2, ` +
      `então um equivalente pesa ${formatarNumero(equivalenteDoCaCO3(), 4)} mg. ` +
      `É daí que vem o fator 50 000 das planilhas de estação de tratamento.</p>`;
    const gAlc = criar("div", { className: "grelha-3" });
    campoTexto(gAlc, { id: "eq-vacido", rotulo: "Ácido gasto (mL)", valor: st.vAcido,
      aoMudar: (v) => { st.vAcido = v; atualizarEquivalente(); } });
    campoTexto(gAlc, { id: "eq-nacido", rotulo: "Normalidade do ácido", valor: st.nAcido,
      aoMudar: (v) => { st.nAcido = v; atualizarEquivalente(); } });
    campoTexto(gAlc, { id: "eq-vamostra", rotulo: "Amostra (mL)", valor: st.vAmostra,
      aoMudar: (v) => { st.vAmostra = v; atualizarEquivalente(); } });
    sAgua.appendChild(criar("p", { className: "rot-campo", textContent: "Alcalinidade, por titulação com ácido" }));
    sAgua.appendChild(gAlc);
    sAgua.appendChild(criar("div", { id: "saida-alcalinidade" }));

    const gDur = criar("div", { className: "grelha-3", style: "margin-top:var(--mb-e3)" });
    campoTexto(gDur, { id: "eq-vedta", rotulo: "EDTA gasto (mL)", valor: st.vEdta,
      aoMudar: (v) => { st.vEdta = v; atualizarEquivalente(); } });
    campoTexto(gDur, { id: "eq-cedta", rotulo: "EDTA (mol/L)", valor: st.cEdta,
      aoMudar: (v) => { st.cEdta = v; atualizarEquivalente(); } });
    campoTexto(gDur, { id: "eq-vamostra-dureza", rotulo: "Amostra (mL)", valor: st.vAmostraDureza,
      aoMudar: (v) => { st.vAmostraDureza = v; atualizarEquivalente(); } });
    sAgua.appendChild(criar("p", { className: "rot-campo", style: "margin-top:var(--mb-e4)",
      textContent: "Dureza, por titulação com EDTA" }));
    sAgua.appendChild(gDur);
    sAgua.appendChild(criar("div", { id: "saida-dureza" }));
    alvo.appendChild(sAgua);

    /* --- o atalho --- */
    const sAtalho = criar("div", { className: "cartao" });
    sAtalho.innerHTML = `<h2 style="margin-top:0">Por que N₁V₁ = N₂V₂ funciona</h2>` +
      `<p>Porque a normalidade já embute a estequiometria: por construção, um equivalente sempre ` +
      `reage com um equivalente. Foi essa comodidade que manteve a unidade viva no laboratório ` +
      `industrial — dispensa recalcular a proporção a cada análise.</p>` +
      `<p>Veja a mesma titulação pelos dois caminhos: 25,0 mL de NaOH 0,1 mol/L neutralizando ` +
      `25,0 mL de H₂SO₄.</p>`;
    const cam = compararCaminhos({ cTitulante: 0.1, vTitulante: 25, vAmostra: 25, kTitulante: 1, kAmostra: 2 });
    const tCam = criar("table");
    tCam.innerHTML = `<tbody>` +
      `<tr><td>Pelo atalho da normalidade</td><td class="num">${formatarNumero(cam.porNormalidade, 4)} mol/L</td></tr>` +
      `<tr><td>Pelo caminho do mol</td><td class="num">${formatarNumero(cam.porMol, 4)} mol/L</td></tr>` +
      `</tbody>`;
    sAtalho.appendChild(tCam);
    sAtalho.appendChild(criar("div", { className: "risco alto",
      innerHTML: `<span class="selo-risco">ONDE ELE MENTE</span>` +
        `<p class="titulo-risco">Quando o k assumido não é o k da reação</p>` +
        `<p>Se você tratar o H₂SO₄ como k = 1 porque "é um ácido", o resultado sai pela metade — ` +
        `e nada no cálculo avisa. O atalho é rápido justamente porque não pergunta nada: quem o ` +
        `usa precisa ter a reação clara na cabeça antes de aplicá-lo.</p>` }));
    alvo.appendChild(sAtalho);

    /* --- onde se usa --- */
    const sOnde = criar("div", { className: "cartao" });
    sOnde.innerHTML = `<h2 style="margin-top:0">Onde a unidade continua viva</h2>`;
    const lista = criar("div", { className: "aplicacoes" });
    for (const o of ondeSeUsaEquivalente()) {
      const item = criar("div", { className: "aplicacao" });
      item.innerHTML = `<p class="area"><span class="emoji-area" aria-hidden="true">${o.emoji}</span> ${o.area}</p><p>${o.texto}</p>`;
      lista.appendChild(item);
    }
    sOnde.appendChild(lista);
    alvo.appendChild(sOnde);

    atualizarEquivalente();
  }

  function atualizarEquivalente() {
    const st = estado.eq;

    // --- equivalente-grama ---
    const alvoEq = $("#saida-eq");
    if (alvoEq) {
      alvoEq.innerHTML = "";
      let analise = null;
      try { analise = analisar(st.formula); } catch (e) { analise = null; }
      const k = lerNumero(st.k);
      if (!analise) {
        alvoEq.innerHTML = `<p class="ajuda">Informe uma fórmula válida.</p>`;
      } else if (!(k > 0)) {
        alvoEq.innerHTML = `<p class="ajuda">Informe o k da reação pretendida.</p>`;
      } else {
        const E = equivalenteGrama(analise.massaMolar, k);
        alvoEq.innerHTML =
          `<div class="quadro-eq"><p class="conta-eq">E = ${formatarNumero(analise.massaMolar, 6)} ÷ ${formatarNumero(k, 3)}</p>` +
          `<p class="valor-eq">${formatarNumero(E, 5)} g</p>` +
          `<p class="ajuda">um equivalente-grama de ${formatarFormula(analise.normalizada)}, ` +
          `considerando k = ${formatarNumero(k, 3)}</p></div>`;
      }

      // --- preparo em N ---
      const alvoPrep = $("#saida-preparo-eq");
      if (alvoPrep) {
        alvoPrep.innerHTML = "";
        const N = lerNumero(st.normalidade), V = lerNumero(st.volume);
        if (analise && k > 0 && N > 0 && V > 0) {
          const r = massaParaNormalidade(N, V, analise.massaMolar, k);
          const t = criar("table", { style: "margin-top:var(--mb-e3)" });
          t.innerHTML = `<tbody>` +
            `<tr><td>Equivalente-grama</td><td class="num">${formatarNumero(r.equivalenteGrama, 5)} g</td></tr>` +
            `<tr><td>Equivalentes necessários</td><td class="num">${formatarNumero(r.numeroDeEquivalentes, 4)} eq</td></tr>` +
            `<tr><td><strong>Massa a pesar</strong></td><td class="num" style="color:var(--mb-energia);font-weight:500">${formatarNumero(r.massa, 5)} g</td></tr>` +
            `<tr><td>A mesma solução, em mol/L</td><td class="num">${formatarNumero(r.concentracaoMolar, 4)} mol/L</td></tr>` +
            `</tbody>`;
          alvoPrep.appendChild(t);
          alvoPrep.appendChild(criar("p", { className: "ajuda",
            textContent: `Rotule o frasco com as duas: ${formatarNumero(N, 3)} N e ` +
              `${formatarNumero(r.concentracaoMolar, 4)} mol/L. Quem pegar o frasco depois pode ` +
              `não saber qual k você assumiu.` }));
        } else {
          alvoPrep.innerHTML = `<p class="ajuda">Preencha a normalidade e o volume.</p>`;
        }
      }
    }

    // --- eletrólito ---
    const alvoEle = $("#saida-eletrolito");
    if (alvoEle) {
      alvoEle.innerHTML = "";
      const io = eletrolitosConhecidos().filter((e) => e.formula === st.eletrolito)[0];
      const valor = lerNumero(st.valorEletrolito);
      const entrada = {};
      entrada[st.unidadeEletrolito] = valor;
      const r = io && valor >= 0 ? converterEletrolito(io, entrada) : null;
      if (r) {
        const t = criar("table");
        t.innerHTML = `<tbody>` +
          `<tr><td>Em mEq/L</td><td class="num">${formatarNumero(r.mEqPorL, 4)}</td></tr>` +
          `<tr><td>Em mg/L</td><td class="num">${formatarNumero(r.mgPorL, 4)}</td></tr>` +
          `<tr><td>Em mmol/L</td><td class="num">${formatarNumero(r.mmolPorL, 4)}</td></tr>` +
          `</tbody>`;
        alvoEle.appendChild(t);
        alvoEle.appendChild(criar("p", { className: "ajuda",
          innerHTML: `Um miliequivalente de ${formatarFormula(io.formula)} pesa ` +
            `${formatarNumero(r.equivalenteEmMg, 5)} mg, porque a carga é ${io.carga}. ` +
            `Referência de plasma: ${io.referencia}.` }));
      } else {
        alvoEle.innerHTML = `<p class="ajuda">Informe um valor.</p>`;
      }
    }

    // --- alcalinidade ---
    const alvoAlc = $("#saida-alcalinidade");
    if (alvoAlc) {
      alvoAlc.innerHTML = "";
      const r = alcalinidadeComoCaCO3({
        volumeAcidoML: lerNumero(st.vAcido), normalidadeAcido: lerNumero(st.nAcido),
        volumeAmostraML: lerNumero(st.vAmostra),
      });
      if (r) {
        alvoAlc.innerHTML =
          `<div class="quadro-eq"><p class="valor-eq">${formatarNumero(r.mgPorLCaCO3, 4)} mg/L de CaCO₃</p>` +
          `<p class="ajuda">equivale a ${formatarNumero(r.mEqPorL, 4)} mEq/L</p></div>`;
      } else {
        alvoAlc.innerHTML = `<p class="ajuda">Preencha os três campos.</p>`;
      }
    }

    // --- dureza ---
    const alvoDur = $("#saida-dureza");
    if (alvoDur) {
      alvoDur.innerHTML = "";
      const r = durezaComoCaCO3({
        volumeEdtaML: lerNumero(st.vEdta), molaridadeEdta: lerNumero(st.cEdta),
        volumeAmostraML: lerNumero(st.vAmostraDureza),
      });
      if (r) {
        alvoDur.innerHTML =
          `<div class="quadro-eq"><p class="valor-eq">${formatarNumero(r.mgPorLCaCO3, 4)} mg/L de CaCO₃</p>` +
          `<p class="ajuda">água ${r.classificacao} · ${formatarNumero(r.mmolPorL, 4)} mmol/L de Ca²⁺ e Mg²⁺</p>` +
          `<p class="ajuda">O EDTA reage 1:1 com o cálcio, então aqui a conta é molar. ` +
          `A expressão em CaCO₃ é só linguagem de laudo.</p></div>`;
      } else {
        alvoDur.innerHTML = `<p class="ajuda">Preencha os três campos.</p>`;
      }
    }
  }

  /* ---------------- tela: titulação virtual ----------------

     A bureta e o béquer ficam sempre visíveis. Cada clique deixa cair uma
     gota, e vinte gotas fazem um mililitro — a convenção de bancada que
     explica por que titular exige paciência. Segurando o botão, o fluxo é
     contínuo a 1 mL/s, que é o que se faz longe do ponto final.

     O pHmetro vem desligado de propósito. Numa titulação de verdade o aluno
     não vê o pH: ele vê a cor, e só a cor. Mostrar o número o tempo todo
     transformaria o exercício em "espere chegar a 8,2", que é justamente o
     raciocínio que a titulação não ensina. Quem quiser conferir, liga. */

  const CONFIG_BANCADA_PADRAO = {
    parId: "hcl-naoh", indicador: "Fenolftaleína",
    cAnalito: "0,1", vAnalito: "25", cTitulante: "0,1",
    phmetro: false, avaliacao: null,
  };

  function estadoBancada() {
    if (!estado.bancada) {
      estado.bancada = Object.assign({}, CONFIG_BANCADA_PADRAO);
      reiniciarBancada();
    }
    return estado.bancada;
  }

  function reiniciarBancada() {
    const st = estado.bancada;
    st.avaliacao = null;
    st.motor = novaBancada({
      parId: st.parId, indicador: st.indicador,
      cAnalito: lerNumero(st.cAnalito) || 0.1,
      vAnalito: lerNumero(st.vAnalito) || 25,
      cTitulante: lerNumero(st.cTitulante) || 0.1,
      volumeBureta: 50,
    });
  }

  function desenharBancada() {
    const st = estadoBancada();
    const alvo = $("#painel-bancada");
    alvo.innerHTML = "";

    // A tela tem duas partes. As escolhas são montadas uma vez; a cena é
    // redesenhada a cada gota. Antes tudo era refeito a cada tecla digitada,
    // o que destruía o campo em foco e fechava o teclado do celular a cada
    // dígito. Nunca refaça o contêiner dos campos dentro de um `input`.
    alvo.appendChild(criar("div", { className: "cartao", id: "bancada-escolhas" }));
    alvo.appendChild(criar("div", { className: "cartao", id: "bancada-cena" }));
    alvo.appendChild(criar("div", { id: "bancada-avaliacao" }));

    desenharEscolhasBancada();
    atualizarCenaBancada();
  }

  function desenharEscolhasBancada() {
    const st = estado.bancada;
    const caixa = $("#bancada-escolhas");
    if (!caixa) return;
    caixa.innerHTML = `<h2 style="margin-top:0">O que você vai titular</h2>`;
    const par = parDeTitulacao(st.parId);

    const diretos = paresDeTitulacao().filter((p) => !p.inverso);
    const inversos = paresDeTitulacao().filter((p) => p.inverso);

    const grupo = (rotulo, lista) => {
      caixa.appendChild(criar("p", { className: "rot-campo", textContent: rotulo, style: "margin:var(--mb-e3) 0 6px" }));
      const chips = criar("div", { className: "chips" });
      for (const p of lista) {
        const b = criar("button", { type: "button", className: "chip" + (p.id === st.parId ? " ativo" : "") });
        b.innerHTML = formatarFormula(p.analito.formula) + " + " + formatarFormula(p.titulante.formula);
        b.addEventListener("click", () => {
          st.parId = p.id;
          st.indicador = p.indicadorSugerido;
          reiniciarBancada();
          desenharEscolhasBancada();
          atualizarCenaBancada();
        });
        chips.appendChild(b);
      }
      caixa.appendChild(chips);
    };
    grupo("Base na bureta, ácido no béquer", diretos);
    grupo("Ácido na bureta, base no béquer", inversos);

    const eq = criar("div", { className: "equacao-bancada" });
    eq.innerHTML = formatarEquacaoTexto(par.equacao);
    caixa.appendChild(eq);
    caixa.appendChild(criar("p", {
      className: "ajuda",
      innerHTML: par.proporcao === 1
        ? "Proporção de 1 para 1: cada mol consome um mol."
        : `Proporção de 1 para ${par.proporcao}: cada mol de ${formatarFormula(par.analito.formula)} consome ${par.proporcao} mols de ${formatarFormula(par.titulante.formula)}. Esquecer isso divide o resultado por ${par.proporcao}.`,
    }));
    caixa.appendChild(criar("p", { textContent: par.contexto }));

    caixa.appendChild(criar("p", { className: "rot-campo", textContent: "Indicador", style: "margin:var(--mb-e4) 0 6px" }));
    const chipsInd = criar("div", { className: "chips" });
    for (const i of indicadoresConhecidos()) {
      const b = criar("button", { type: "button", className: "chip chip-indicador" + (i.nome === st.indicador ? " ativo" : "") });
      // a faixa de viragem na frente do nome: é o dado que decide a escolha
      b.innerHTML = `<i class="ponto-ind" style="background:${corDeIndicador(i.corBasica)}"></i>` +
        `<span class="faixa-ind">${formatarNumero(i.inicio, 2)}–${formatarNumero(i.fim, 3)}</span>` +
        `<span>${i.nome}</span>`;
      b.addEventListener("click", () => {
        st.indicador = i.nome;
        reiniciarBancada();
        desenharEscolhasBancada();
        atualizarCenaBancada();
      });
      chipsInd.appendChild(b);
    }
    caixa.appendChild(chipsInd);

    const campos = criar("div", { className: "grade-campos" });
    const aoDigitar = (campo) => (v) => {
      estado.bancada[campo] = v;
      reiniciarBancada();
      // só a cena é redesenhada: o campo em foco permanece vivo, e o teclado
      // do celular não se fecha entre um dígito e outro
      atualizarCenaBancada();
    };
    campoTexto(campos, { id: "banc-ca",
      rotuloHtml: `Concentração de ${formatarFormula(par.analito.formula)} no béquer (mol/L)`,
      valor: st.cAnalito, aoMudar: aoDigitar("cAnalito") });
    campoTexto(campos, { id: "banc-va", rotulo: "Volume no béquer (mL)",
      valor: st.vAnalito, aoMudar: aoDigitar("vAnalito") });
    campoTexto(campos, { id: "banc-ct",
      rotuloHtml: `Concentração de ${formatarFormula(par.titulante.formula)} na bureta (mol/L)`,
      valor: st.cTitulante, aoMudar: aoDigitar("cTitulante") });
    caixa.appendChild(campos);
  }

  function atualizarCenaBancada() {
    const st = estado.bancada;
    const caixa = $("#bancada-cena");
    if (!caixa) return;
    caixa.innerHTML = "";
    const par = parDeTitulacao(st.parId);
    const leitura = lerBancada(st.motor);

    /* Cada vidraria vem com o rótulo do que há dentro, como numa bancada de
       verdade: sem o rótulo, o aluno perde de vista quem titula quem — e é
       justamente isso que muda na titulação inversa. */
    const cena = criar("div", { className: "cena-bancada" });
    cena.innerHTML =
      `<div class="rotulo-vidraria rotulo-bureta">` +
      `<span class="qual">Bureta</span>` +
      `<span class="reagente">${formatarFormula(par.titulante.formula)}</span>` +
      `<span class="conc">${formatarNumero(st.motor.cTitulante, 4)} mol/L</span></div>` +
      svgDaBancada(leitura) +
      `<div class="rotulo-vidraria rotulo-bequer">` +
      `<span class="qual">Béquer</span>` +
      `<span class="reagente">${formatarFormula(par.analito.formula)}</span>` +
      `<span class="conc">${formatarNumero(st.motor.cAnalito, 4)} mol/L · ${formatarNumero(st.motor.vAnalito, 4)} mL</span></div>`;
    caixa.appendChild(cena);

    const painel = criar("div", { className: "painel-bancada" });
    painel.innerHTML =
      `<div class="medida"><span class="rot">Na bureta</span>` +
      `<span class="val">${formatarNumero(leitura.restaNaBureta, 4)} mL</span></div>` +
      `<div class="medida destaque"><span class="rot">Adicionado</span>` +
      `<span class="val">${formatarNumero(leitura.volumeAdicionado, 4)} mL</span></div>` +
      `<div class="medida"><span class="rot">Gotas</span>` +
      `<span class="val">${leitura.gotas}</span></div>` +
      (st.phmetro
        ? `<div class="medida"><span class="rot">pHmetro</span><span class="val">${formatarNumero(leitura.pH, 3)}</span></div>`
        : "");
    caixa.appendChild(painel);

    const controles = criar("div", { className: "controles-bancada" });

    const gotejar = criar("button", { type: "button", className: "botao botao-gota", id: "botao-gota" });
    gotejar.innerHTML = `<span class="icone-gota" aria-hidden="true">💧</span>` +
      `<span>Gotejar<small>clique: 1 gota · segure: 1 mL/s</small></span>`;
    if (leitura.buretaVazia) gotejar.disabled = true;
    ligarGotejamento(gotejar, st);
    controles.appendChild(gotejar);

    const umML = criar("button", { type: "button", className: "botao secundario", textContent: "+1 mL" });
    umML.disabled = leitura.buretaVazia;
    umML.addEventListener("click", () => aplicarGotas(st, gotasPorML()));
    controles.appendChild(umML);

    const parar = criar("button", { type: "button", className: "botao secundario", textContent: "Parei aqui" });
    parar.disabled = leitura.gotas === 0;
    parar.addEventListener("click", () => {
      st.avaliacao = avaliarTitulacao(st.motor);
      desenharAvaliacaoBancada();
    });
    controles.appendChild(parar);

    const limpar = criar("button", { type: "button", className: "botao secundario", textContent: "Recomeçar" });
    limpar.addEventListener("click", () => { reiniciarBancada(); atualizarCenaBancada(); desenharAvaliacaoBancada(); });
    controles.appendChild(limpar);
    caixa.appendChild(controles);

    const opcao = criar("label", { className: "opcao-phmetro" });
    const marcar = criar("input", { type: "checkbox", id: "banc-phmetro" });
    marcar.checked = st.phmetro;
    marcar.addEventListener("change", () => { st.phmetro = marcar.checked; atualizarCenaBancada(); });
    opcao.appendChild(marcar);
    opcao.appendChild(criar("span", { textContent: "Ligar o pHmetro (numa titulação real você só enxerga a cor)" }));
    caixa.appendChild(opcao);

    if (leitura.buretaVazia) {
      caixa.appendChild(criar("div", {
        className: "dica-caixa",
        textContent: "A bureta acabou. Numa bancada de verdade você completaria a bureta e anotaria as duas leituras — aqui, recomece.",
      }));
    }
  }

  function desenharAvaliacaoBancada() {
    const alvo = $("#bancada-avaliacao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.bancada;
    if (st.avaliacao) desenharAvaliacao(alvo, st.avaliacao, parDeTitulacao(st.parId));
  }

  function aplicarGotas(st, quantas) {
    const efeito = pingar(st.motor, quantas);
    st.avaliacao = null;
    atualizarCenaBancada();
    desenharAvaliacaoBancada();
    return efeito;
  }

  /* Clique dá uma gota; segurar abre o fluxo contínuo. O intervalo é sempre
     limpo no soltar, no sair do botão e no perder o foco, porque um fluxo que
     continua sozinho enche a bureta inteira e arruína a titulação do aluno. */
  function ligarGotejamento(botao, st) {
    let temporizador = null;
    let escoou = false;

    const abrir = () => {
      escoou = false;
      temporizador = setInterval(() => {
        escoou = true;
        // 1 mL/s, entregue em fatias de 100 ms para o desenho acompanhar
        aplicarGotas(st, Math.max(1, Math.round(gotasPorML() * mlPorSegundoSegurando() / 10)));
      }, 100);
    };
    const fechar = () => {
      if (temporizador === null) return;
      clearInterval(temporizador);
      temporizador = null;
      if (!escoou) aplicarGotas(st, 1);
    };

    botao.addEventListener("mousedown", abrir);
    botao.addEventListener("touchstart", (ev) => { ev.preventDefault(); abrir(); });
    for (const evento of ["mouseup", "mouseleave", "touchend", "touchcancel", "blur"]) {
      botao.addEventListener(evento, fechar);
    }
    // teclado: sem "segurar", cada acionamento é uma gota
    botao.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); aplicarGotas(st, 1); }
    });
  }

  function desenharAvaliacao(alvo, a, par) {
    const cartao = criar("div", { className: "cartao avaliacao-titulacao " + a.veredito });
    const titulos = { excelente: "Titulação bem feita", bom: "Aceitável, dá para melhorar",
                      passou: "Você passou do ponto", faltou: "Você parou antes" };
    cartao.innerHTML = `<h2 style="margin-top:0">${titulos[a.veredito]}</h2>`;

    const tabela = criar("table");
    tabela.innerHTML = `<tbody>` +
      `<tr><td>Volume gasto</td><td class="num">${formatarNumero(a.volumeGasto, 4)} mL</td></tr>` +
      `<tr><td>Volume de equivalência</td><td class="num">${formatarNumero(a.vEquivalencia, 4)} mL</td></tr>` +
      `<tr><td>Erro relativo</td><td class="num">${a.erroRelativo >= 0 ? "+" : ""}${formatarNumero(a.erroRelativo, 3)}%</td></tr>` +
      `<tr><td>Concentração que você acharia</td><td class="num">${formatarNumero(a.cEncontrada, 4)} mol/L</td></tr>` +
      `<tr><td>Concentração verdadeira</td><td class="num">${formatarNumero(a.cVerdadeira, 4)} mol/L</td></tr>` +
      `</tbody>`;
    cartao.appendChild(tabela);
    cartao.appendChild(criar("p", { textContent: a.comentario }));

    cartao.appendChild(criar("div", {
      className: "motivo",
      innerHTML: `A conta que fecha o exercício: <strong>C<sub>ácido</sub> = ` +
        `(C<sub>base</sub> × V<sub>base</sub>) ÷ (V<sub>ácido</sub> × ${par.proporcao})</strong>. ` +
        `Foi ela que transformou o volume que você leu na bureta numa concentração.`,
    }));
    alvo.appendChild(cartao);
  }

  /* ---------------- tela: ácidos e bases ---------------- */

  function desenharAcidoBase() {
    const alvo = $("#painel-ph");
    alvo.innerHTML = "";
    const st = estado.ph;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">A solução</h2>`;

    const g1 = criar("div", { className: "grelha-2" });
    campoSelecao(g1, {
      id: "ph-modo", rotulo: "Tipo de sistema", valor: st.modo,
      opcoes: [
        { valor: "acidoForte", rotulo: "Ácido forte" },
        { valor: "acidoFraco", rotulo: "Ácido fraco ou poliprótico" },
        { valor: "baseForte", rotulo: "Base forte" },
        { valor: "baseFraca", rotulo: "Base fraca" },
        { valor: "tampao", rotulo: "Tampão" },
      ],
      aoMudar: (v) => { st.modo = v; st.indice = 0; desenharAcidoBase(); },
    });

    const acidos = st.modo === "baseForte" || st.modo === "baseFraca";
    const acervo = acidos
      ? BASES.filter((b) => (st.modo === "baseForte" ? b.forte : !b.forte))
      : ACIDOS.filter((a) => (st.modo === "acidoForte" ? a.forte : !a.forte));

    campoSelecao(g1, {
      id: "ph-especie", rotulo: acidos ? "Base" : "Ácido",
      valor: Math.min(st.indice, acervo.length - 1),
      opcoes: acervo.map((e, i) => ({ valor: i, rotulo: `${e.formula} — ${e.nome}` })),
      aoMudar: (v) => { st.indice = Number(v); atualizarAcidoBase(); },
    });
    entrada.appendChild(g1);

    const g2 = criar("div", { className: st.modo === "tampao" ? "grelha-2" : "grelha-2", style: "margin-top:var(--mb-e3)" });
    if (st.modo === "tampao") {
      campoTexto(g2, { id: "ph-ca", rotulo: "Concentração do ácido (mol/L)", valor: st.tampaoAcido,
        aoMudar: (v) => { st.tampaoAcido = v; atualizarAcidoBase(); } });
      campoTexto(g2, { id: "ph-cb", rotulo: "Concentração da base conjugada (mol/L)", valor: st.tampaoBase,
        aoMudar: (v) => { st.tampaoBase = v; atualizarAcidoBase(); } });
    } else {
      campoTexto(g2, { id: "ph-conc", rotulo: "Concentração (mol/L)", valor: st.concentracao,
        aoMudar: (v) => { st.concentracao = v; atualizarAcidoBase(); } });
    }
    entrada.appendChild(g2);
    entrada.dataset.acervo = acervo.length;
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-ph" }));
    atualizarAcidoBase();
  }

  function acervoAtualPH() {
    const st = estado.ph;
    if (st.modo === "baseForte") return BASES.filter((b) => b.forte);
    if (st.modo === "baseFraca") return BASES.filter((b) => !b.forte);
    if (st.modo === "acidoForte") return ACIDOS.filter((a) => a.forte);
    return ACIDOS.filter((a) => !a.forte);
  }

  function atualizarAcidoBase() {
    const alvo = $("#saida-ph");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.ph;
    const acervo = acervoAtualPH();
    const especie = acervo[Math.min(st.indice, acervo.length - 1)];
    if (!especie) return;

    let pH = null;
    const detalhes = [];
    let extra = null;

    if (st.modo === "tampao") {
      const ca = lerNumero(st.tampaoAcido), cb = lerNumero(st.tampaoBase);
      if (!(ca > 0) || !(cb > 0)) {
        alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe as duas concentrações.</p></div>`;
        return;
      }
      const Ka = especie.Kas[0];
      const t = tampao(Ka, ca, cb);
      pH = t.pH;
      extra = t;
      detalhes.push(["pKa do ácido", formatarNumero(t.pKa, 4)]);
      detalhes.push(["Razão base/ácido", formatarNumero(cb / ca, 4)]);
      detalhes.push(["Henderson-Hasselbalch prevê", formatarNumero(t.henderson, 4)]);
      detalhes.push(["Capacidade tamponante", `${formatarNumero(t.capacidade, 3)} mol/L por unidade de pH`]);
    } else {
      const c = lerNumero(st.concentracao);
      if (!(c > 0)) {
        alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe a concentração.</p></div>`;
        return;
      }
      if (st.modo === "acidoForte") {
        pH = pHAcidoForte(c);
        detalhes.push(["Ionização", "total"]);
      } else if (st.modo === "acidoFraco") {
        pH = pHde(resolverH({ Kas: especie.Kas, cAcido: c, cCation: 0 }));
        especie.Kas.forEach((k, i) => detalhes.push([`Ka${i + 1}`, `${formatarNumero(k, 3)}  (pKa ${formatarNumero(pKde(k), 3)})`]));
      } else if (st.modo === "baseForte") {
        pH = pHBaseForte(c, especie.hidroxilas || 1);
        detalhes.push(["Hidroxilas por fórmula", String(especie.hidroxilas || 1)]);
      } else {
        pH = pHBaseFraca(especie.Kb, c);
        detalhes.push(["Kb", `${formatarNumero(especie.Kb, 3)}  (pKb ${formatarNumero(pKde(especie.Kb), 3)})`]);
        detalhes.push(["Ka do ácido conjugado", formatarNumero(KaDeKb(especie.Kb), 3)]);
      }
    }

    const h = Math.pow(10, -pH);
    const oh = KW_25 / h;

    const cartao = criar("div", { className: "cartao destaque" });
    cartao.innerHTML =
      `<p class="rotulo">pH DA SOLUÇÃO</p>` +
      `<p class="valor">${formatarNumero(pH, 4)}</p>` +
      `<p class="ajuda" style="margin-top:var(--mb-e2)">pOH ${formatarNumero(pOHde(pH), 4)} · ` +
      `[H⁺] = ${formatarNumero(h, 3)} mol/L · [OH⁻] = ${formatarNumero(oh, 3)} mol/L</p>`;
    alvo.appendChild(cartao);

    const ficha = criar("div", { className: "cartao" });
    ficha.innerHTML = `<h2 style="margin-top:0">${especie.formula} — ${especie.nome}</h2>`;
    const dl = criar("dl", { className: "ficha-bancada" });
    for (const [rot, val] of detalhes) {
      dl.appendChild(criar("dt", { textContent: rot }));
      dl.appendChild(criar("dd", { textContent: val }));
    }
    ficha.appendChild(dl);
    if (especie.observacao) {
      ficha.appendChild(criar("p", { className: "ajuda", textContent: especie.observacao }));
    }
    if (extra && extra.alerta) {
      ficha.appendChild(criar("div", { className: "ressalva", textContent: extra.alerta }));
    }
    ficha.appendChild(criar("p", {
      className: "ajuda",
      textContent: "O pH acima sai do balanço de cargas resolvido numericamente, não de fórmula aproximada. Por isso ele continua correto em soluções muito diluídas, onde a autoionização da água passa a mandar.",
    }));
    alvo.appendChild(ficha);
  }


  /* ---------------- tela: titulação ---------------- */

  function analitosDeTitulacao() {
    if (estado.titulacao.inversa) {
      return basesDeTitulacao().map((b) => ({
        ...b,
        rotulo: `${b.formula} — ${b.nome}${b.forte
          ? (b.hidroxilas > 1 ? ` (forte, ${b.hidroxilas} OH)` : " (forte)")
          : ""}`,
      }));
    }
    return ACIDOS.map((a) => ({
      ...a,
      rotulo: `${a.formula} — ${a.nome}${a.forte ? " (forte)" : a.Kas.length > 1 ? ` (${a.Kas.length} prótons)` : ""}`,
    }));
  }

  function configuracaoDeTitulacao() {
    const st = estado.titulacao;
    const lista = analitosDeTitulacao();
    const analito = lista[Math.min(st.indice, lista.length - 1)];
    return {
      analito,
      cfg: {
        cAnalito: lerNumero(st.cAnalito),
        vAnalito: lerNumero(st.vAnalito),
        cTitulante: lerNumero(st.cTitulante),
        analitoForte: analito.forte,
        Kas: analito.Kas || [],
        Kbs: analito.Kbs || [],
        hidroxilas: analito.hidroxilas || 1,
        inversa: !!st.inversa,
      },
    };
  }

  function desenharTitulacao() {
    const alvo = $("#painel-titulacao");
    alvo.innerHTML = "";
    const st = estado.titulacao;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">O experimento</h2>`;

    /* O sentido vem antes de tudo: ele decide quais analitos a lista oferece
       e para que lado a curva anda. */
    const sentidos = criar("div", { className: "chips", style: "margin-bottom:var(--mb-e3)" });
    for (const opcao of [
      { inversa: false, texto: "Ácido no erlenmeyer, base na bureta" },
      { inversa: true,  texto: "Base no erlenmeyer, ácido na bureta" },
    ]) {
      const b = criar("button", { type: "button",
        className: "chip" + (!!st.inversa === opcao.inversa ? " ativo" : "") });
      b.textContent = opcao.texto;
      b.addEventListener("click", () => {
        if (!!st.inversa === opcao.inversa) return;
        st.inversa = opcao.inversa;
        st.indice = 0;   // as listas de ácidos e bases não se correspondem
        desenharTitulacao();
      });
      sentidos.appendChild(b);
    }
    entrada.appendChild(sentidos);

    const g1 = criar("div", { className: "grelha-2" });
    campoSelecao(g1, {
      id: "tit-analito", rotulo: st.inversa ? "Base no erlenmeyer" : "Ácido no erlenmeyer",
      valor: st.indice,
      opcoes: analitosDeTitulacao().map((a, i) => ({ valor: i, rotulo: a.rotulo })),
      aoMudar: (v) => { st.indice = Number(v); desenharTitulacao(); },
    });
    campoTexto(g1, { id: "tit-c-analito",
      rotulo: `Concentração da ${st.inversa ? "base" : "ácido"} (mol/L)`.replace("da ácido", "do ácido"),
      valor: st.cAnalito,
      aoMudar: (v) => { st.cAnalito = v; atualizarTitulacao(); } });
    entrada.appendChild(g1);

    const g2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(g2, { id: "tit-v-analito", rotulo: "Volume no erlenmeyer (mL)", valor: st.vAnalito,
      aoMudar: (v) => { st.vAnalito = v; atualizarTitulacao(); } });
    campoTexto(g2, { id: "tit-c-titulante",
      rotulo: st.inversa ? "Concentração do ácido na bureta (mol/L)" : "Concentração da base na bureta (mol/L)",
      valor: st.cTitulante,
      aoMudar: (v) => { st.cTitulante = v; atualizarTitulacao(); } });
    entrada.appendChild(g2);

    /* O indicador fica aqui, junto dos reagentes, e não lá embaixo: ele é uma
       escolha do experimento, não uma leitura do resultado. Antes o aluno
       montava a titulação, rolava a tela inteira e só então descobria que
       precisava escolher o indicador. */
    entrada.appendChild(criar("p", { className: "rot-campo",
      textContent: "Indicador", style: "margin:var(--mb-e4) 0 6px" }));
    const chipsInd = criar("div", { className: "chips" });
    INDICADORES.forEach((ind, i) => {
      const b = criar("button", { type: "button",
        className: "chip chip-indicador" + (i === st.indicador ? " ativo" : "") });
      b.innerHTML = `<i class="ponto-ind" style="background:${corDeIndicador(ind.corBasica)}"></i>` +
        `<span class="faixa-ind">${formatarNumero(ind.inicio, 2)}–${formatarNumero(ind.fim, 3)}</span>` +
        `<span>${ind.nome}</span>`;
      b.addEventListener("click", () => { st.indicador = i; desenharTitulacao(); });
      chipsInd.appendChild(b);
    });
    entrada.appendChild(chipsInd);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-titulacao" }));
    atualizarTitulacao();
  }

  /* Desenha a curva em SVG puro. Escala do eixo x pelo volume, do eixo y de
     pH 0 a 14, com a faixa de viragem do indicador escolhido em destaque. */
  function desenharCurva(curva, cfg, indicador) {
    const L = 44, R = 12, T = 12, B = 34;
    const largura = 620, altura = 340;
    const areaX = largura - L - R;
    const areaY = altura - T - B;
    const vMax = curva.vFinal || 1;

    const px = (v) => L + (v / vMax) * areaX;
    const py = (pH) => T + ((14 - pH) / 14) * areaY;

    const partes = [];

    /* As três zonas do indicador, pintadas com as cores que o aluno vai ver
       no béquer: abaixo da faixa, a cor ácida; acima, a cor básica; no meio,
       a faixa de viragem, que fica no cinza neutro de sempre porque ali a cor
       não é nem uma nem outra — é a mistura que o analista está tentando
       enxergar. Antes o gráfico era todo cinza, e a curva não dizia nada
       sobre o que ia acontecer visualmente. */
    if (indicador) {
      const yFim = py(indicador.fim), yInicio = py(indicador.inicio);
      const corA = corDeIndicador(indicador.corAcida);
      const corB = corDeIndicador(indicador.corBasica);

      // zona ácida: do fundo do gráfico até o início da viragem
      partes.push(`<rect x="${L}" y="${yInicio.toFixed(1)}" width="${areaX}" ` +
        `height="${(T + areaY - yInicio).toFixed(1)}" fill="${corA}" class="zona-indicador"/>`);
      // zona básica: do topo até o fim da viragem
      partes.push(`<rect x="${L}" y="${T}" width="${areaX}" ` +
        `height="${(yFim - T).toFixed(1)}" fill="${corB}" class="zona-indicador"/>`);
      // faixa de viragem, mantida no destaque neutro
      partes.push(`<rect x="${L}" y="${yFim.toFixed(1)}" width="${areaX}" ` +
        `height="${(yInicio - yFim).toFixed(1)}" class="faixa-indicador"/>`);
    }

    for (let pH = 0; pH <= 14; pH += 2) {
      const y = py(pH);
      partes.push(`<line x1="${L}" y1="${y.toFixed(1)}" x2="${largura - R}" y2="${y.toFixed(1)}" class="malha"/>`);
      partes.push(`<text x="${L - 6}" y="${(y + 3).toFixed(1)}" class="rotulo-eixo" text-anchor="end">${pH}</text>`);
    }

    const passoV = vMax <= 30 ? 5 : vMax <= 70 ? 10 : 25;
    for (let v = 0; v <= vMax; v += passoV) {
      const x = px(v);
      partes.push(`<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${T + areaY}" class="malha"/>`);
      partes.push(`<text x="${x.toFixed(1)}" y="${altura - B + 14}" class="rotulo-eixo" text-anchor="middle">${v}</text>`);
    }

    partes.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${T + areaY}" class="eixo"/>`);
    partes.push(`<line x1="${L}" y1="${T + areaY}" x2="${largura - R}" y2="${T + areaY}" class="eixo"/>`);
    partes.push(`<text x="${(L + areaX / 2).toFixed(0)}" y="${altura - 4}" class="titulo-eixo" text-anchor="middle">volume de titulante (mL)</text>`);
    partes.push(`<text x="12" y="${(T + areaY / 2).toFixed(0)}" class="titulo-eixo" text-anchor="middle" transform="rotate(-90 12 ${(T + areaY / 2).toFixed(0)})">pH</text>`);

    for (const eq of curva.equivalencias) {
      const x = px(eq.volume);
      if (x > largura - R) continue;
      partes.push(`<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${(T + areaY).toFixed(1)}" class="linha-equivalencia"/>`);
      partes.push(`<circle cx="${x.toFixed(1)}" cy="${py(eq.pH).toFixed(1)}" r="4" class="marca-equivalencia"/>`);
    }

    const d = curva.dados
      .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.v).toFixed(1)} ${py(Math.max(0, Math.min(14, p.pH))).toFixed(1)}`)
      .join(" ");
    partes.push(`<path d="${d}" class="curva"/>`);

    return `<svg viewBox="0 0 ${largura} ${altura}" role="img" ` +
      `aria-label="Curva de titulação: pH em função do volume de titulante adicionado">` +
      `<title>Curva de titulação</title>${partes.join("")}</svg>`;
  }

  function atualizarTitulacao() {
    const alvo = $("#saida-titulacao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.titulacao;
    const { analito, cfg } = configuracaoDeTitulacao();

    if (!(cfg.cAnalito > 0) || !(cfg.vAnalito > 0) || !(cfg.cTitulante > 0)) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Preencha concentração e volume para ver a curva.</p></div>`;
      return;
    }

    const curva = curvaDeTitulacao(cfg);
    const indicador = INDICADORES[Math.min(st.indicador, INDICADORES.length - 1)];

    const grafico = criar("div", { className: "cartao" });
    const quadro = criar("div", { className: "grafico" });
    quadro.innerHTML = desenharCurva(curva, cfg, indicador);

    grafico.appendChild(quadro);

    if (indicador) {
      const legenda = criar("div", { className: "legenda-indicador" });
      legenda.innerHTML =
        `<span class="amostra"><i style="background:${corDeIndicador(indicador.corAcida)}"></i>` +
        `abaixo de pH ${formatarNumero(indicador.inicio, 3)}: ${indicador.corAcida}</span>` +
        `<span class="amostra"><i class="i-viragem"></i>viragem</span>` +
        `<span class="amostra"><i style="background:${corDeIndicador(indicador.corBasica)}"></i>` +
        `acima de pH ${formatarNumero(indicador.fim, 3)}: ${indicador.corBasica}</span>`;
      grafico.appendChild(legenda);
    }
    grafico.appendChild(criar("p", {
      className: "ajuda", style: "text-align:center;margin:var(--mb-e2) 0 0",
      innerHTML: `${formatarFormula(analito.formula)} ${formatarNumero(cfg.cAnalito, 3)} mol/L, ${formatarNumero(cfg.vAnalito, 3)} mL, titulado com ${cfg.inversa ? "ácido forte" : "base forte"} ${formatarNumero(cfg.cTitulante, 3)} mol/L. Faixa central: viragem da ${indicador.nome.toLowerCase()}.`,
    }));
    alvo.appendChild(grafico);

    const pontos = criar("div", { className: "cartao" });
    pontos.innerHTML = `<h2 style="margin-top:0">Pontos que valem olhar</h2>`;
    const tabela = criar("table");
    tabela.innerHTML = `<thead><tr><th>Momento</th><th>Volume</th><th>pH</th></tr></thead>`;
    const corpo = criar("tbody");
    const marcos = [{ rotulo: "Antes de começar", v: 0 }];
    curva.equivalencias.forEach((eq, i) => {
      marcos.push({ rotulo: `Meia-neutralização ${curva.equivalencias.length > 1 ? "do próton " + (i + 1) : ""}`.trim(), v: eq.volume - (i === 0 ? eq.volume / 2 : (eq.volume - curva.equivalencias[i - 1].volume) / 2) });
      marcos.push({ rotulo: `Equivalência ${curva.equivalencias.length > 1 ? "do próton " + (i + 1) : ""}`.trim(), v: eq.volume, destaque: true });
    });
    const ultima = curva.equivalencias[curva.equivalencias.length - 1].volume;
    marcos.push({ rotulo: "Excesso de titulante", v: ultima * 1.5 });

    for (const m of marcos) {
      const pH = pontoDeTitulacao({ ...cfg, vTitulante: m.v });
      const tr = criar("tr");
      if (m.destaque) tr.className = "limitante";
      tr.innerHTML = `<td>${m.rotulo}</td><td class="num">${formatarNumero(m.v, 4)} mL</td><td class="num">${formatarNumero(pH, 3)}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    pontos.appendChild(tabela);

    const primeira = curva.equivalencias[0];
    const salto = pontoDeTitulacao({ ...cfg, vTitulante: primeira.volume * 1.004 }) -
                  pontoDeTitulacao({ ...cfg, vTitulante: primeira.volume * 0.996 });
    pontos.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Entre 0,4% antes e 0,4% depois da primeira equivalência o pH salta ${formatarNumero(Math.abs(salto), 3)} unidades. ` +
        `É esse salto que torna a titulação possível: uma gota a mais muda a cor. Quanto mais fraco o ácido, menor o salto — e mais difícil enxergar o ponto final.`,
    }));

    if (!analito.forte && analito.Kas.length === 1) {
      pontos.appendChild(criar("div", {
        className: "ressalva",
        textContent: `Repare que a equivalência não cai em pH 7, e sim em ${formatarNumero(primeira.pH, 3)}. No ponto de equivalência de um ácido fraco só existe a base conjugada dele em solução, e ela hidrolisa. Quem escolhe indicador supondo pH 7 erra aqui.`,
      }));
    }
    alvo.appendChild(pontos);

    // ---- indicadores ----
    const escolha = criar("div", { className: "cartao" });
    escolha.innerHTML = `<h2 style="margin-top:0">Qual indicador usar</h2>` +
      `<p class="ajuda">Compare o erro de cada um. Para trocar o destacado no gráfico, use os botões lá em cima.</p>`;

    const avaliados = melhorIndicador(cfg, primeira);
    const t2 = criar("table", { className: "lista-indicadores", style: "margin-top:var(--mb-e3)" });
    t2.innerHTML = `<thead><tr><th>Indicador</th><th>Faixa</th><th>Para em</th><th>Erro</th></tr></thead>`;
    const c2 = criar("tbody");
    for (const a of avaliados) {
      const tr = criar("tr");
      if (a.adequado) tr.className = "adequado";
      tr.innerHTML =
        `<td><span class="nome-ind"><i class="ponto-ind" style="background:${corDeIndicador(a.indicador.corBasica)}"></i>` +
        `${a.indicador.nome}</span><br><span class="ajuda">viragem ${formatarNumero(a.indicador.inicio, 2)}–${formatarNumero(a.indicador.fim, 3)} · ` +
        `${a.indicador.corAcida} → ${a.indicador.corBasica}</span></td>` +
        `<td class="num">${formatarNumero(a.indicador.inicio, 3)}–${formatarNumero(a.indicador.fim, 3)}</td>` +
        `<td class="num">${formatarNumero(a.vFinal, 5)} mL</td>` +
        `<td class="num erro-val">${a.erro > 0 ? "+" : ""}${formatarNumero(a.erro, 3)}%</td>`;
      c2.appendChild(tr);
    }
    t2.appendChild(c2);
    escolha.appendChild(t2);

    const melhor = avaliados[0];
    escolha.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Volume de equivalência: ${formatarNumero(primeira.volume, 5)} mL. O erro de cada indicador é a diferença entre onde o analista para — quando enxerga a virada, no fim da faixa — e onde deveria parar.`,
    }));
    const veredito = criar("div", { className: melhor.adequado ? "dica-caixa" : "ressalva" });
    veredito.innerHTML = `<strong>${melhor.indicador.nome}</strong> é a melhor escolha aqui: erro de ${formatarNumero(melhor.erro, 3)}%. ${melhor.julgamento}`;
    escolha.appendChild(veredito);

    const ruins = avaliados.filter((a) => Math.abs(a.erro) > 2);
    if (ruins.length) {
      escolha.appendChild(criar("p", {
        className: "ajuda",
        textContent: `Não servem para esta titulação: ${ruins.map((a) => a.indicador.nome.toLowerCase()).join(", ")}. A faixa de viragem deles cai fora do salto, então a cor muda longe da equivalência.`,
      }));
    }
    alvo.appendChild(escolha);
  }

  /* ---------------- tela: treino ---------------- */

  function entrarNoTreino() {
    progresso = registrarDia(progresso);
    salvarProgresso(progresso);
    if (estado.degrau > progresso.desbloqueado) estado.degrau = progresso.desbloqueado;
    desenharDegraus();
    desenharPlacar();
    if (!estado.exercicio) proximoExercicio();
    else desenharExercicio();
    atualizarResumoLateral();
  }

  function desenharDegraus() {
    const caixa = $("#degraus");
    caixa.innerHTML = "";

    for (const d of DEGRAUS) {
      const liberado = d.n <= progresso.desbloqueado;
      const acertos = progresso.porDegrau[d.n].acertos;
      const b = criar("button", { type: "button", className: "degrau" });
      b.setAttribute("aria-pressed", String(d.n === estado.degrau));
      if (!liberado) b.disabled = true;

      const anterior = progresso.porDegrau[d.n - 1];
      const faltam = anterior ? Math.max(0, ACERTOS_PARA_LIBERAR - anterior.acertos) : 0;
      const sub = liberado
        ? `${acertos} acerto${acertos === 1 ? "" : "s"} · ${d.resumo}`
        : `Faltam ${faltam} acerto${faltam === 1 ? "" : "s"} no degrau ${d.n - 1}`;

      // marca o degrau já saturado, para o aluno não descobrir sozinho que o
      // XP caiu e se sentir enganado
      const rendimento = rendimentoDoDegrau(progresso, d.n);
      const selo = liberado && rendimento.saturado
        ? `<span class="selo-saturado" title="Você já domina este degrau: os acertos aqui valem XP reduzido">XP reduzido</span>`
        : "";
      b.innerHTML = `<span class="cabeca">${liberado ? "" : "🔒 "}Degrau ${d.n} — ${d.nome}${selo}</span><span class="sub">${sub}</span>`;
      b.addEventListener("click", () => {
        if (!liberado) return;
        estado.degrau = d.n;
        estado.tipoAnterior = null;
        desenharDegraus();
        proximoExercicio();
      });
      caixa.appendChild(b);
    }
  }

  function desenharPlacar() {
    const s = estado.sessao;
    const proporcao = s.total ? Math.round((s.certas / s.total) * 100) : 0;
    $("#placar").innerHTML =
      `<div><strong>${s.certas}/${s.total}</strong>nesta sessão${s.total ? " · " + proporcao + "%" : ""}</div>` +
      `<div><strong>${progresso.sequencia}</strong>acertos seguidos</div>` +
      `<div><strong>${progresso.ofensiva}</strong>dia${progresso.ofensiva === 1 ? "" : "s"} seguidos</div>` +
      `<div><strong>${progresso.xp}</strong>XP total</div>`;
  }

  function proximoExercicio() {
    estado.exercicio = gerarExercicio(estado.degrau, { volumeMolar: volumeMolarAtual().valor }, estado.tipoAnterior);
    estado.tipoAnterior = estado.exercicio.tipo;
    estado.usouDica = false;
    estado.respondido = false;
    estado.escolhaFeita = null;
    estado.consultaAberta = false;
    estado.expressao = "";
    desenharExercicio();
  }

  function desenharExercicio() {
    const q = estado.exercicio;
    const alvo = $("#exercicio");
    alvo.innerHTML = "";

    alvo.appendChild(criar("p", { className: "ajuda", textContent: NOME_TIPO[q.tipo], style: "margin:0 0 var(--mb-e2)" }));

    const enunciado = criar("p", { className: "enunciado" });
    enunciado.innerHTML = q.enunciado;
    alvo.appendChild(enunciado);

    if (q.contexto) alvo.appendChild(criar("p", { className: "contexto", textContent: q.contexto }));

    if (q.formato === "escolha") {
      const lista = criar("div", { className: "alternativas" });
      q.opcoes.forEach((op, i) => {
        const b = criar("button", { type: "button", className: "alternativa" });
        b.innerHTML = `<span class="letra" aria-hidden="true">${"ABCDE"[i]}</span><span>${op.texto}</span>`;
        if (estado.respondido) {
          b.disabled = true;
          if (op.correta) b.classList.add("certa");
          if (i === estado.escolhaFeita && !op.correta) b.classList.add("errada");
        } else {
          b.addEventListener("click", () => { estado.escolhaFeita = i; responder(String(i)); });
        }
        lista.appendChild(b);
      });
      alvo.appendChild(lista);
    } else {

    const linha = criar("div", { className: "resposta-linha" });
      const campo = criar("input", {
        type: "text", id: "resposta", inputMode: "decimal",
        autocomplete: "off", spellcheck: false, placeholder: "sua resposta",
      });
      campo.setAttribute("aria-label", "Sua resposta em " + q.unidade);
      if (estado.respondido) campo.readOnly = true;
      linha.appendChild(campo);
      linha.appendChild(criar("span", { className: "unidade", textContent: q.unidade }));
      alvo.appendChild(linha);

      // eco do valor interpretado: quem escreve 6,02x10^23 precisa ver que o
      // aplicativo entendeu 6,02×10²³, e não outra coisa
      const eco = criar("p", { className: "eco", id: "eco-resposta" });
      alvo.appendChild(eco);
      const atualizarEco = () => {
        const bruto = campo.value.trim();
        if (!bruto) { eco.textContent = ""; return; }
        const valor = lerNumero(bruto);
        if (!isFinite(valor)) {
          eco.innerHTML = `<span class="eco-erro">Não consegui ler esse número.</span>`;
        } else {
          eco.innerHTML = `entendi <strong>${formatarNumero(valor, 6)}</strong> ${q.unidade}`;
        }
      };
      campo.addEventListener("input", atualizarEco);
      atualizarEco();
    }

    const acoes = criar("div", { className: "acoes" });

    if (!estado.respondido) {
      if (q.formato !== "escolha") {
        const verificar = criar("button", { className: "botao", type: "button", textContent: "Verificar" });
        verificar.addEventListener("click", () => responder(document.getElementById("resposta").value));
        acoes.appendChild(verificar);
      }

      const dica = criar("button", { className: "botao secundario", type: "button", textContent: "Ver dica" });
      dica.addEventListener("click", () => {
        estado.usouDica = true;
        dica.disabled = true;
        const caixa = criar("div", { className: "dica-caixa", textContent: q.dica });
        alvo.insertBefore(caixa, acoes.nextSibling);
      });
      acoes.appendChild(dica);

      const pular = criar("button", { className: "botao secundario", type: "button", textContent: "Trocar exercício" });
      pular.addEventListener("click", proximoExercicio);
      acoes.appendChild(pular);

      const campoEnter = document.getElementById("resposta");
      if (campoEnter) {
        campoEnter.addEventListener("keydown", (ev) => { if (ev.key === "Enter") responder(campoEnter.value); });
      }
    } else {
      const seguinte = criar("button", { className: "botao", type: "button", textContent: "Próximo exercício" });
      seguinte.addEventListener("click", proximoExercicio);
      acoes.appendChild(seguinte);
    }

    alvo.appendChild(acoes);

    const rend = rendimentoDoDegrau(progresso, estado.degrau);
    const ultimo = DEGRAUS[DEGRAUS.length - 1].n;
    if (rend.saturado && estado.degrau < progresso.desbloqueado) {
      const nome = degrauPorNumero(estado.degrau + 1);
      const dica = criar("div", { className: "dica-caixa aviso-saturado" });
      dica.innerHTML = `Você já domina este degrau, então os acertos aqui rendem pouco XP agora. ` +
        `Treinar mais nunca é errado — mas se quiser avançar, o <strong>Degrau ${estado.degrau + 1} — ` +
        `${nome ? nome.nome : ""}</strong> está liberado e vale XP cheio.`;
      alvo.appendChild(dica);
    } else if (rend.saturado && estado.degrau === ultimo) {
      alvo.appendChild(criar("div", {
        className: "dica-caixa aviso-saturado",
        textContent: "Você já domina este degrau. Os acertos rendem pouco XP daqui em diante, mas a prática continua valendo: o mapa de dificuldades segue registrando onde você erra.",
      }));
    }

    if (q.formulas && q.formulas.length) montarConsulta(alvo, q);
    if (q.formato !== "escolha") {
      montarCalculadora(alvo, document.getElementById("resposta"));
      const campoResposta = document.getElementById("resposta");
      if (!estado.respondido && campoResposta) campoResposta.focus();
    }
  }

  /* Consultar massa atômica não é colar: nenhum químico decora esses números,
     eles ficam na parede do laboratório. O que se aprende é o método. Por isso
     este painel não custa XP, ao contrário da dica. */
  function montarConsulta(alvo, q) {
    const caixa = criar("div", { className: "consulta" });
    const botao = criar("button", {
      type: "button", className: "chip",
      textContent: estado.consultaAberta ? "Fechar a consulta" : "Consultar massas atômicas",
    });
    botao.setAttribute("aria-expanded", String(estado.consultaAberta));
    botao.addEventListener("click", () => {
      estado.consultaAberta = !estado.consultaAberta;
      const respostaAtual = document.getElementById("resposta");
      const guardado = respostaAtual ? respostaAtual.value : "";
      desenharExercicio();
      const novo = document.getElementById("resposta");
      if (novo && guardado) novo.value = guardado;
    });
    caixa.appendChild(botao);

    if (estado.consultaAberta) {
      const elementos = [];
      const substancias = [];
      for (const f of q.formulas || []) {
        let a;
        try { a = analisar(f); } catch (e) { continue; }
        substancias.push({ formula: f, vista: formatarFormula(a.normalizada), M: a.massaMolar });
        for (const item of a.itens) {
          if (!elementos.some(e => e.simbolo === item.simbolo)) {
            elementos.push({ simbolo: item.simbolo, nome: item.nome, massa: item.massaAtomica });
          }
        }
      }
      elementos.sort((x, y) => x.simbolo.localeCompare(y.simbolo));

      const painel = criar("div", { className: "painel-consulta" });
      const tabela = criar("table");
      tabela.innerHTML = `<thead><tr><th>Elemento</th><th>Massa atômica</th></tr></thead>`;
      const corpo = criar("tbody");
      for (const e of elementos) {
        const tr = criar("tr");
        tr.innerHTML = `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${e.simbolo}</span> ` +
          `<span class="ajuda">${e.nome}</span></td><td class="num">${formatarNumero(e.massa, 6)} u</td>`;
        corpo.appendChild(tr);
      }
      tabela.appendChild(corpo);
      painel.appendChild(tabela);

      if (substancias.length && q.degrau >= 3) {
        const lista = criar("p", { className: "ajuda" });
        lista.innerHTML = "Massa molar: " + substancias
          .map(x => `${x.vista} = ${formatarNumero(x.M, 5)} g/mol`).join(" · ");
        painel.appendChild(lista);
      }
      painel.appendChild(criar("p", {
        className: "ajuda",
        textContent: "Consultar a tabela não conta como dica e não reduz o XP.",
      }));
      caixa.appendChild(painel);
    }

    alvo.appendChild(caixa);
  }

  function montarCalculadora(alvo, campoResposta) {
    const caixa = criar("div", { className: "calculadora" });
    caixa.innerHTML = `<p class="titulo-calc">Calculadora</p>`;

    const linha = criar("div", { className: "linha-calc" });
    const campo = criar("input", {
      type: "text", id: "expressao", inputMode: "text", autocomplete: "off",
      spellcheck: false, placeholder: "4 / 39,997 × NA",
    });
    campo.setAttribute("aria-label", "Expressão para calcular");
    campo.value = estado.expressao;
    linha.appendChild(campo);
    caixa.appendChild(linha);

    const atalhos = criar("div", { className: "atalhos" });
    const inserir = (texto) => {
      const inicio = campo.selectionStart ?? campo.value.length;
      const fim = campo.selectionEnd ?? campo.value.length;
      campo.value = campo.value.slice(0, inicio) + texto + campo.value.slice(fim);
      const cursor = inicio + texto.length;
      campo.focus();
      campo.setSelectionRange(cursor, cursor);
      estado.expressao = campo.value;
      atualizar();
    };
    for (const [rotulo, texto] of [["×10ⁿ", "×10^"], ["×", "×"], ["÷", "/"], ["( )", "()"], ["N&thinsp;A", "NA"]]) {
      const b = criar("button", { type: "button", className: "tecla" });
      b.innerHTML = rotulo;
      b.addEventListener("click", () => inserir(texto === "()" ? "(" : texto));
      atalhos.appendChild(b);
    }
    caixa.appendChild(atalhos);

    const saida = criar("div", { className: "saida-calc", id: "saida-calc" });
    caixa.appendChild(saida);

    const acoes = criar("div", { className: "acoes", style: "margin-top:var(--mb-e2)" });
    const usar = criar("button", { className: "botao secundario", type: "button", textContent: "Usar como resposta" });
    usar.addEventListener("click", () => {
      let valor;
      try { valor = calcular(campo.value); } catch (e) { return; }
      if (valor === null || !isFinite(valor)) return;
      const destino = document.getElementById("resposta");
      if (!destino || destino.readOnly) return;
      destino.value = formatarNumero(valor, 4);
      destino.focus();
    });
    acoes.appendChild(usar);
    const limpar = criar("button", { className: "botao secundario", type: "button", textContent: "Limpar" });
    limpar.addEventListener("click", () => { campo.value = ""; estado.expressao = ""; campo.focus(); atualizar(); });
    acoes.appendChild(limpar);
    caixa.appendChild(acoes);

    function atualizar() {
      const texto = campo.value.trim();
      if (!texto) { saida.innerHTML = `<span class="ajuda">Escreva a conta e o resultado aparece aqui. NA é a constante de Avogadro.</span>`; usar.disabled = true; return; }
      try {
        const valor = calcular(texto);
        if (valor === null) { saida.innerHTML = ""; usar.disabled = true; return; }
        saida.innerHTML = `<span class="igual">=</span> <span class="valor-calc">${formatarNumero(valor, 6)}</span>`;
        usar.disabled = false;
      } catch (e) {
        saida.innerHTML = `<span class="erro-calc">${e.message}</span>`;
        usar.disabled = true;
      }
    }

    campo.addEventListener("input", () => { estado.expressao = campo.value; atualizar(); });
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") usar.click(); });
    atualizar();
    alvo.appendChild(caixa);
  }

  function responder(bruto) {
    const q = estado.exercicio;
    const veredito = corrigir(q, bruto);

    if (veredito.situacao === "invalido") {
      const aviso = criar("div", { className: "veredito errado" });
      aviso.innerHTML = `<span class="selo">NÃO ENTENDI O NÚMERO</span><p>${veredito.mensagem}</p>`;
      const antigo = $("#exercicio .veredito");
      if (antigo) antigo.remove();
      $("#exercicio").appendChild(aviso);
      return;
    }

    estado.respondido = true;
    const acertou = veredito.situacao === "certo";
    estado.sessao.total += 1;
    if (acertou) estado.sessao.certas += 1;

    const efeito = registrarResposta(progresso, q, acertou, estado.usouDica);
    estado.sessao.xp += efeito.ganho;

    desenharExercicio();
    const campoRespondido = document.getElementById("resposta");
    if (campoRespondido) campoRespondido.value = bruto;

    const caixa = criar("div", { className: "veredito " + veredito.situacao });
    const selo = acertou ? "CERTO"
      : veredito.erroReconhecido ? "SEI O QUE ACONTECEU" : "NÃO É ESSE VALOR";
    caixa.innerHTML = `<span class="selo">${selo}</span><p>${veredito.mensagem}</p>`;

    if (acertou && efeito.ganho) {
      caixa.appendChild(criar("span", { className: "ganho", textContent: `+${efeito.ganho} XP` }));
    }
    if (efeito.subiuDegrau) {
      mostrarDesbloqueio(efeito.subiuDegrau);
      caixa.appendChild(criar("p", {
        style: "margin-top:var(--mb-e2);font-weight:500",
        textContent: `Degrau ${efeito.subiuDegrau} liberado: ${degrauPorNumero(efeito.subiuDegrau).nome}.`
      }));
    }
    for (const m of efeito.medalhasNovas) {
      caixa.appendChild(criar("p", { style: "margin-top:4px", textContent: `Medalha conquistada: ${m.nome}.` }));
    }

    const alvo = $("#exercicio");
    alvo.insertBefore(caixa, alvo.querySelector(".acoes"));

    const resolucao = criar("div", { className: "resolucao" });
    resolucao.innerHTML = `<strong style="font-family:var(--mb-fonte-texto)">Resposta: ${formatarNumero(q.resposta, q.sig)} ${q.unidade}</strong><br>${q.resolucao}`;
    alvo.insertBefore(resolucao, alvo.querySelector(".acoes"));

    desenharDegraus();
    desenharPlacar();
    atualizarResumoLateral();
  }

  /* ---------------- tela: progresso ---------------- */

  function desenharProgresso() {
    const alvo = $("#painel-progresso");
    alvo.innerHTML = "";
    const nv = xpParaProximoNivel(progresso.xp);
    const taxa = progresso.totalTentativas
      ? Math.round((progresso.totalAcertos / progresso.totalTentativas) * 100) : 0;

    const cartaoNivel = criar("div", { className: "cartao" });
    cartaoNivel.innerHTML =
      `<div class="nivel-caixa"><span class="nivel-numero">Nível ${nv.nivel}</span>` +
      `<span class="ajuda" style="margin:0">${progresso.xp} XP acumulados</span></div>` +
      `<div class="xp-trilho"><div class="xp-barra" style="width:${Math.round(nv.atual / nv.necessario * 100)}%"></div></div>` +
      `<p class="ajuda">Faltam ${nv.necessario - nv.atual} XP para o nível ${nv.nivel + 1}.</p>`;
    alvo.appendChild(cartaoNivel);

    const numeros = criar("div", { className: "cartao" });
    numeros.innerHTML =
      `<div class="numeros">` +
      `<div><p class="n">${progresso.totalAcertos}</p><p class="r">acertos</p></div>` +
      `<div><p class="n">${taxa}%</p><p class="r">aproveitamento</p></div>` +
      `<div><p class="n">${progresso.melhorSequencia}</p><p class="r">melhor sequência</p></div>` +
      `<div><p class="n">${progresso.ofensiva}</p><p class="r">dias seguidos</p></div>` +
      `</div>`;
    alvo.appendChild(numeros);

    const escada = criar("div", { className: "cartao" });
    escada.innerHTML = `<h2 style="margin-top:0">A escada</h2>`;
    for (const d of DEGRAUS) {
      const liberado = d.n <= progresso.desbloqueado;
      const g = progresso.porDegrau[d.n];
      const total = g.acertos + g.erros;
      const linha = criar("div", { style: "margin-bottom:var(--mb-e3)" });
      linha.innerHTML =
        `<p style="margin:0 0 4px"><strong>Degrau ${d.n} — ${d.nome}</strong>` +
        `${liberado ? "" : ' <span class="ajuda">(bloqueado)</span>'}</p>` +
        `<p class="ajuda" style="margin:0 0 6px">${d.resumo}</p>` +
        `<div class="barra-trilho"><div class="barra" style="width:${total ? Math.round(g.acertos / total * 100) : 0}%"></div></div>` +
        `<p class="ajuda" style="margin:4px 0 0">${g.acertos} acertos e ${g.erros} erros</p>`;
      escada.appendChild(linha);
    }
    alvo.appendChild(escada);

    const fracos = pontosFracos(progresso, 2);
    const mapa = criar("div", { className: "cartao" });
    mapa.innerHTML = `<h2 style="margin-top:0">Onde você tropeça</h2>`;
    if (!fracos.length) {
      mapa.appendChild(criar("p", { className: "ajuda", textContent: "Ainda não há exercícios suficientes para apontar um padrão. Faça algumas rodadas no treino e este mapa se preenche." }));
    } else {
      for (const f of fracos.slice(0, 6)) {
        const linha = criar("div", { className: "fraqueza" });
        linha.innerHTML =
          `<span class="rot">${NOME_TIPO[f.tipo] || f.tipo}<br>` +
          `<span class="ajuda">${f.total} tentativa${f.total === 1 ? "" : "s"}</span></span>` +
          `<span class="taxa">${Math.round(f.taxa * 100)}% de erro</span>`;
        mapa.appendChild(linha);
      }
      mapa.appendChild(criar("p", { className: "ajuda", textContent: "Este é o dado mais útil da tela: ele diz exatamente qual conta merece a próxima meia hora de estudo." }));
    }
    alvo.appendChild(mapa);

    const medalhas = criar("div", { className: "cartao" });
    medalhas.innerHTML = `<h2 style="margin-top:0">Medalhas</h2>`;
    const grade = criar("div", { className: "medalhas" });
    for (const m of MEDALHAS) {
      const tem = progresso.medalhas.includes(m.id);
      const item = criar("div", { className: "medalha " + (tem ? "conquistada" : "pendente") });
      item.innerHTML = `<strong>${m.nome}</strong>${m.descricao}`;
      grade.appendChild(item);
    }
    medalhas.appendChild(grade);
    alvo.appendChild(medalhas);

    const zerar = criar("div", { className: "cartao" });
    zerar.innerHTML = `<h2 style="margin-top:0">Recomeçar</h2><p class="ajuda">Apaga XP, medalhas, degraus liberados e o mapa de dificuldades deste aparelho. Não dá para desfazer.</p>`;
    const botaoZerar = criar("button", { className: "botao secundario", type: "button", textContent: "Zerar meu progresso" });
    botaoZerar.addEventListener("click", () => {
      if (!window.confirm("Apagar todo o progresso guardado neste aparelho?")) return;
      progresso = zerarProgresso();
      estado.degrau = 1;
      estado.exercicio = null;
      estado.sessao = { certas: 0, total: 0, xp: 0 };
      desenharProgresso();
      atualizarResumoLateral();
    });
    zerar.appendChild(botaoZerar);
    alvo.appendChild(zerar);
  }

  function atualizarResumoLateral() {
    const nv = xpParaProximoNivel(progresso.xp);
    $("#resumo-lateral").textContent = `Nível ${nv.nivel} · ${progresso.xp} XP · ${progresso.totalAcertos} acertos`;
  }

  /* ---------------- tela: tabela periódica ---------------- */

  const CORES_FAMILIA = {
    alcalino: "#C43C0E", alcalinoterroso: "#B8860B", transicao: "#0B5E8C",
    postransicao: "#4A6FA5", semimetal: "#7A5AA8", naometal: "#1B7A3A",
    halogenio: "#14776E", nobre: "#164194", lantanideo: "#A03A6B", actinideo: "#8A5200",
  };

  function montarPeriodica() {
    const grade = $("#periodica");
    grade.innerHTML = "";

    for (const e of ELEMENTOS) {
      const [z, simbolo, nome, massa, col, lin, familia] = e;
      const b = criar("button", { type: "button", className: "celula f-" + familia });
      b.style.setProperty("--col", col);
      b.style.setProperty("--lin", lin);
      b.dataset.simbolo = simbolo;
      b.dataset.busca = (simbolo + " " + nome + " " + z).toLowerCase();
      b.setAttribute("aria-label", `${nome}, símbolo ${simbolo}, número atômico ${z}`);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<span class="z">${z}</span><span class="sim">${simbolo}</span>`;
      b.addEventListener("click", () => abrirElemento(simbolo));
      grade.appendChild(b);
    }

    const legenda = $("#legenda");
    legenda.innerHTML = "";
    for (const chave in CORES_FAMILIA) {
      const s = criar("span");
      s.innerHTML = `<i class="ponto" style="background:${CORES_FAMILIA[chave]}"></i>${NOME_FAMILIA[chave]}`;
      legenda.appendChild(s);
    }
  }

  function abrirElemento(simbolo) {
    estado.elementoAberto = simbolo;
    for (const b of document.querySelectorAll(".celula")) {
      b.setAttribute("aria-pressed", b.dataset.simbolo === simbolo ? "true" : "false");
    }

    const e = POR_SIMBOLO[simbolo];
    const alvo = $("#ficha-elemento");
    alvo.innerHTML = "";

    const cartao = criar("div", { className: "cartao ficha" });
    cartao.innerHTML =
      `<div class="cabeca"><span class="simbolo">${e.simbolo}</span>` +
      `<div><strong>${e.nome}</strong><br>` +
      `<span style="color:var(--mb-texto-2);font-size:var(--mb-t-legenda)">${NOME_FAMILIA[e.familia]}</span></div></div>` +
      `<dl>` +
      `<dt>Número atômico</dt><dd>${e.z}</dd>` +
      `<dt>Massa atômica</dt><dd>${formatarNumero(e.massa, 6)} u${e.incerta ? " *" : ""}</dd>` +
      `<dt>Um mol pesa</dt><dd>${formatarNumero(e.massa, 6)} g</dd>` +
      `<dt>Um mol contém</dt><dd>6,022×10²³ átomos</dd>` +
      `</dl>` +
      (e.incerta ? `<p class="ajuda">* Sem composição isotópica terrestre estável: o valor é o número de massa do isótopo mais estável.</p>` : "");

    const acao = criar("button", { className: "botao secundario", type: "button", textContent: `Somar ${e.simbolo} à fórmula` });
    acao.style.marginTop = "var(--mb-e3)";
    acao.addEventListener("click", () => {
      const campo = $("#formula");
      campo.value = campo.value + e.simbolo;
      analisarAtual();
      mostrarTela("tela-massa");
      campo.focus();
    });
    cartao.appendChild(acao);
    alvo.appendChild(cartao);
    if (cartao.scrollIntoView) cartao.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function filtrarTabela(texto) {
    const alvo = texto.trim().toLowerCase();
    for (const b of document.querySelectorAll(".celula")) {
      b.classList.toggle("apagada", alvo !== "" && !b.dataset.busca.includes(alvo));
    }
  }

  /* ---------------- montagem ---------------- */

  function montarExemplos() {
    const caixa = $("#exemplos");
    for (const f of EXEMPLOS) {
      const b = criar("button", { type: "button", className: "chip" });
      b.innerHTML = formatarFormula(f);
      b.addEventListener("click", () => {
        $("#formula").value = f;
        analisarAtual();
      });
      caixa.appendChild(b);
    }
  }

  function montarSeletorVolume() {
    const sel = $("#volume-molar");
    for (const v of VOLUMES_MOLARES) {
      sel.appendChild(criar("option", { value: v.id, textContent: `${v.rotulo} — ${formatarNumero(v.valor, 4)} L/mol` }));
    }
    sel.value = estado.volumeMolarId;
    const explicar = () => {
      const v = volumeMolarAtual();
      $("#ajuda-volume").textContent = `Volume molar de ${formatarNumero(v.valor, 4)} L/mol — ${v.detalhe}.`;
    };
    explicar();
    sel.addEventListener("change", () => {
      estado.volumeMolarId = sel.value;
      guardar();
      explicar();
      desenharPonte();
    });
  }

  function iniciar() {
    recuperar();
    progresso = carregarProgresso();
    $("#formula").value = estado.formula;
    montarExemplos();
    $("#equacao").value = estado.equacao;
    montarTelaBalancear();
    montarSeletorEspecies();
    montarCartaoExportar();
    sincronizarBandejasComTexto();
    desenharBandejas();
    balancearAtual();
    montarSeletorVolume();
    montarPeriodica();
    analisarAtual();
    atualizarResumoLateral();

    $("#formula").addEventListener("input", analisarAtual);
    $("#equacao").addEventListener("input", balancearAtual);
    $("#busca").addEventListener("input", (ev) => filtrarTabela(ev.target.value));
    for (const b of document.querySelectorAll(".menu .item")) {
      b.addEventListener("click", () => {
        // "Como usar" reabre as boas-vindas em vez de trocar de tela: serve ao
        // aluno que voltou depois de semanas e ao professor que vai apresentar
        // o aplicativo à turma
        if (b.dataset.acao === "rever-onboarding") {
          if (estreita()) fecharMenu();
          mostrarOnboarding();
          return;
        }
        mostrarTela(b.dataset.tela);
      });
    }
    $("#menuBtn").addEventListener("click", abrirMenu);
    $("#fecharMenu").addEventListener("click", fecharMenu);
    $("#cortina").addEventListener("click", fecharMenu);
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && estreita()) fecharMenu();
    });

    // quem chega pela primeira vez começa pela explicação do mol; quem já
    // usou volta para onde parou
    mostrarTela(estado.telaAtual);

    const destino = {
      "#mol": "tela-mol",
      "#massa-molar": "tela-massa", "#converter": "tela-ponte",
      "#balancear": "tela-balancear", "#estequiometria": "tela-esteq",
      "#treino": "tela-treino", "#progresso": "tela-progresso", "#tabela": "tela-tabela",
    }[location.hash];
    if (destino) mostrarTela(destino);

    // no primeiro acesso o onboarding tem a tela toda; a gaveta só abre
    // depois, para não competir com ele por atenção
    if (!jaViuOnboarding()) mostrarOnboarding();
    else if (estreita()) abrirMenu();

    ligarAtualizacao();
  }


  /* ---------------- atualização do aplicativo ----------------

     O aluno relatou precisar recarregar muitas vezes para ver uma versão nova.
     Eram três causas somadas, e todas precisam de correção:

     1. O service worker servia tudo do cache primeiro. Corrigido em sw.js.
     2. O próprio arquivo sw.js podia vir do cache HTTP do navegador. Daí o
        `updateViaCache: "none"` no registro.
     3. Ninguém procurava atualização depois que a página abria. Agora
        procuramos ao abrir, ao voltar para o app e de hora em hora.

     E mesmo com tudo isso, a página que já está aberta continua rodando o
     código antigo até recarregar. Por isso existe a faixa de aviso: em vez de
     recarregar sozinho no meio de um exercício, o aplicativo pergunta. */

  const INTERVALO_DE_BUSCA = 60 * 60 * 1000;   // uma hora

  function ligarAtualizacao() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
        .then((registro) => {
          const vigiar = () => {
            const novo = registro.installing || registro.waiting;
            if (!novo) return;
            if (registro.waiting && navigator.serviceWorker.controller) {
              mostrarAtualizacao(registro);
              return;
            }
            novo.addEventListener("statechange", () => {
              // "installed" com controlador ativo significa: já existia uma
              // versão rodando, e chegou outra. Primeira visita não avisa nada.
              if (novo.state === "installed" && navigator.serviceWorker.controller) {
                mostrarAtualizacao(registro);
              }
            });
          };

          vigiar();
          registro.addEventListener("updatefound", vigiar);

          const procurar = () => registro.update().catch(() => {});
          setInterval(procurar, INTERVALO_DE_BUSCA);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") procurar();
          });
        })
        .catch(() => { /* sem service worker o app funciona igual, só sem offline */ });
    });

    let recarregando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // a trava evita o laço de recarregamento clássico quando o controlador
      // troca mais de uma vez
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    });
  }

  function mostrarAtualizacao(registro) {
    if (document.getElementById("faixa-atualizacao")) return;

    const faixa = criar("div", { id: "faixa-atualizacao", className: "faixa-atualizacao" });
    faixa.setAttribute("role", "status");
    faixa.innerHTML = `<span>Uma versão nova do SUPER MOLBOX está pronta.</span>`;

    const atualizar = criar("button", { type: "button", className: "botao", textContent: "Atualizar agora" });
    atualizar.addEventListener("click", () => {
      atualizar.disabled = true;
      atualizar.textContent = "Atualizando…";
      if (registro.waiting) registro.waiting.postMessage("assumir-agora");
      else window.location.reload();
    });
    faixa.appendChild(atualizar);

    const depois = criar("button", { type: "button", className: "fechar-faixa", textContent: "Agora não" });
    depois.setAttribute("aria-label", "Adiar a atualização");
    depois.addEventListener("click", () => { if (faixa.parentNode) faixa.parentNode.removeChild(faixa); });
    faixa.appendChild(depois);

    document.body.appendChild(faixa);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
