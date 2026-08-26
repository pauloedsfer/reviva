/* MOLBOX — banco de espécies para montar equações por toque.

   Por que este módulo existe: no celular, digitar "KMnO4 + HCl -> KCl + MnCl2
   + H2O + Cl2" num campo de texto é lento e erra fácil. O aluno perde a aula
   brigando com o teclado em vez de pensar na reação. Aqui as espécies viram
   botões: toca no reagente, toca no produto, pronto.

   O banco é curado à mão, não gerado. Cada fórmula foi escolhida por aparecer
   em aula de curso técnico, em bancada de laboratório ou em rótulo de
   indústria — não por completar uma tabela. Fórmula errada aqui vira erro
   silencioso na tela do aluno, então há um teste que analisa todas elas.

   O campo `busca` guarda sinônimos e nomes comerciais: o aluno procura por
   "soda cáustica" e não por "hidróxido de sódio". A busca ignora acento. */

const CATEGORIAS_ESPECIE = [
  { id: "usadas",    nome: "Mais usadas",  dica: "As que mais aparecem em aula e na bancada." },
  { id: "elementos", nome: "Elementos",    dica: "Substâncias simples: gases, metais e não metais." },
  { id: "oxidos",    nome: "Óxidos",       dica: "Combinações binárias com oxigênio, água inclusa." },
  { id: "acidos",    nome: "Ácidos",       dica: "Liberam H⁺ em água." },
  { id: "bases",     nome: "Bases",        dica: "Liberam OH⁻ em água." },
  { id: "sais",      nome: "Sais",         dica: "Produto de ácido com base, e os hidratos de bancada." },
  { id: "organicos", nome: "Orgânicos",    dica: "Hidrocarbonetos, álcoois, açúcares e fármacos." },
  { id: "ions",      nome: "Íons",         dica: "Para equações iônicas: a carga também tem de fechar." },
];

/* `u: 1` marca a espécie que entra na aba "Mais usadas". A lista curta existe
   porque um banco de quase duzentas espécies sem porta de entrada vira rolagem
   infinita, e o aluno desiste antes de achar o O2. */
const BANCO_ESPECIES = [
  /* ---------------- elementos e substâncias simples ---------------- */
  { f: "H2",  n: "hidrogênio",   c: "elementos", u: 1, b: "gas hidrogenio" },
  { f: "O2",  n: "oxigênio",     c: "elementos", u: 1, b: "gas oxigenio ar" },
  { f: "N2",  n: "nitrogênio",   c: "elementos", u: 1, b: "gas nitrogenio azoto" },
  { f: "Cl2", n: "cloro",        c: "elementos", u: 1, b: "gas cloro" },
  { f: "F2",  n: "flúor",        c: "elementos", b: "gas fluor" },
  { f: "Br2", n: "bromo",        c: "elementos", b: "bromo liquido" },
  { f: "I2",  n: "iodo",         c: "elementos", b: "iodo cristal" },
  { f: "O3",  n: "ozônio",       c: "elementos", b: "ozonio camada" },
  { f: "S8",  n: "enxofre",      c: "elementos", b: "enxofre rombico" },
  { f: "P4",  n: "fósforo branco", c: "elementos", b: "fosforo branco" },
  { f: "C",   n: "carbono",      c: "elementos", u: 1, b: "carvao grafite coque" },
  { f: "He",  n: "hélio",        c: "elementos", b: "helio gas nobre" },
  { f: "Ne",  n: "neônio",       c: "elementos", b: "neonio gas nobre" },
  { f: "Ar",  n: "argônio",      c: "elementos", b: "argonio gas nobre solda" },
  { f: "Na",  n: "sódio",        c: "elementos", u: 1, b: "sodio metalico" },
  { f: "K",   n: "potássio",     c: "elementos", b: "potassio metalico" },
  { f: "Li",  n: "lítio",        c: "elementos", b: "litio bateria" },
  { f: "Mg",  n: "magnésio",     c: "elementos", u: 1, b: "magnesio fita" },
  { f: "Ca",  n: "cálcio",       c: "elementos", b: "calcio metalico" },
  { f: "Ba",  n: "bário",        c: "elementos", b: "bario" },
  { f: "Al",  n: "alumínio",     c: "elementos", u: 1, b: "aluminio" },
  { f: "Fe",  n: "ferro",        c: "elementos", u: 1, b: "ferro aco" },
  { f: "Cu",  n: "cobre",        c: "elementos", u: 1, b: "cobre" },
  { f: "Zn",  n: "zinco",        c: "elementos", u: 1, b: "zinco galvanizado" },
  { f: "Ag",  n: "prata",        c: "elementos", b: "prata" },
  { f: "Au",  n: "ouro",         c: "elementos", b: "ouro" },
  { f: "Pb",  n: "chumbo",       c: "elementos", b: "chumbo" },
  { f: "Sn",  n: "estanho",      c: "elementos", b: "estanho solda" },
  { f: "Ni",  n: "níquel",       c: "elementos", b: "niquel" },
  { f: "Cr",  n: "cromo",        c: "elementos", b: "cromo" },
  { f: "Mn",  n: "manganês",     c: "elementos", b: "manganes" },
  { f: "Hg",  n: "mercúrio",     c: "elementos", b: "mercurio" },
  { f: "Si",  n: "silício",      c: "elementos", b: "silicio" },
  { f: "Ti",  n: "titânio",      c: "elementos", b: "titanio" },

  /* ---------------- óxidos ---------------- */
  { f: "H2O",   n: "água",                  c: "oxidos", u: 1, b: "agua h2o" },
  { f: "H2O2",  n: "peróxido de hidrogênio", c: "oxidos", u: 1, b: "agua oxigenada peroxido" },
  { f: "CO2",   n: "dióxido de carbono",    c: "oxidos", u: 1, b: "gas carbonico carbonico" },
  { f: "CO",    n: "monóxido de carbono",   c: "oxidos", u: 1, b: "monoxido veneno" },
  { f: "SO2",   n: "dióxido de enxofre",    c: "oxidos", u: 1, b: "anidrido sulfuroso chuva acida" },
  { f: "SO3",   n: "trióxido de enxofre",   c: "oxidos", b: "anidrido sulfurico" },
  { f: "NO",    n: "monóxido de nitrogênio", c: "oxidos", b: "oxido nitrico" },
  { f: "NO2",   n: "dióxido de nitrogênio", c: "oxidos", b: "dioxido nitrogenio smog" },
  { f: "N2O",   n: "óxido nitroso",         c: "oxidos", b: "gas hilariante anestesico" },
  { f: "N2O4",  n: "tetróxido de dinitrogênio", c: "oxidos", b: "tetroxido" },
  { f: "N2O5",  n: "pentóxido de dinitrogênio", c: "oxidos", b: "pentoxido" },
  { f: "P2O5",  n: "pentóxido de difósforo", c: "oxidos", b: "anidrido fosforico" },
  { f: "CaO",   n: "óxido de cálcio",       c: "oxidos", u: 1, b: "cal virgem cal viva" },
  { f: "MgO",   n: "óxido de magnésio",     c: "oxidos", b: "magnesia" },
  { f: "Na2O",  n: "óxido de sódio",        c: "oxidos", b: "oxido sodio" },
  { f: "K2O",   n: "óxido de potássio",     c: "oxidos", b: "oxido potassio" },
  { f: "Li2O",  n: "óxido de lítio",        c: "oxidos", b: "oxido litio" },
  { f: "BaO",   n: "óxido de bário",        c: "oxidos", b: "oxido bario" },
  { f: "Al2O3", n: "óxido de alumínio",     c: "oxidos", u: 1, b: "alumina bauxita corindon" },
  { f: "Fe2O3", n: "óxido de ferro III",    c: "oxidos", u: 1, b: "hematita ferrugem" },
  { f: "FeO",   n: "óxido de ferro II",     c: "oxidos", b: "wustita oxido ferroso" },
  { f: "Fe3O4", n: "óxido de ferro II-III", c: "oxidos", b: "magnetita" },
  { f: "CuO",   n: "óxido de cobre II",     c: "oxidos", b: "oxido cuprico" },
  { f: "Cu2O",  n: "óxido de cobre I",      c: "oxidos", b: "oxido cuproso" },
  { f: "ZnO",   n: "óxido de zinco",        c: "oxidos", b: "oxido zinco pomada protetor" },
  { f: "PbO",   n: "óxido de chumbo II",    c: "oxidos", b: "litargirio" },
  { f: "PbO2",  n: "óxido de chumbo IV",    c: "oxidos", b: "bateria chumbo" },
  { f: "SiO2",  n: "dióxido de silício",    c: "oxidos", u: 1, b: "silica areia quartzo vidro" },
  { f: "TiO2",  n: "dióxido de titânio",    c: "oxidos", b: "pigmento branco protetor solar" },
  { f: "MnO2",  n: "dióxido de manganês",   c: "oxidos", b: "pirolusita pilha" },
  { f: "Cr2O3", n: "óxido de cromo III",    c: "oxidos", b: "oxido cromico verde" },
  { f: "CrO3",  n: "trióxido de cromo",     c: "oxidos", b: "anidrido cromico" },
  { f: "Ag2O",  n: "óxido de prata",        c: "oxidos", b: "oxido prata" },
  { f: "SnO2",  n: "óxido de estanho IV",   c: "oxidos", b: "cassiterita" },
  { f: "NiO",   n: "óxido de níquel II",    c: "oxidos", b: "oxido niquel" },

  /* ---------------- ácidos ---------------- */
  { f: "HCl",     n: "ácido clorídrico",  c: "acidos", u: 1, b: "muriatico acido cloridrico" },
  { f: "H2SO4",   n: "ácido sulfúrico",   c: "acidos", u: 1, b: "sulfurico bateria" },
  { f: "HNO3",    n: "ácido nítrico",     c: "acidos", u: 1, b: "nitrico" },
  { f: "H3PO4",   n: "ácido fosfórico",   c: "acidos", u: 1, b: "fosforico refrigerante" },
  { f: "H2CO3",   n: "ácido carbônico",   c: "acidos", u: 1, b: "carbonico gaseificado" },
  { f: "CH3COOH", n: "ácido acético",     c: "acidos", u: 1, b: "acetico vinagre etanoico" },
  { f: "HF",      n: "ácido fluorídrico", c: "acidos", b: "fluoridrico vidro" },
  { f: "HBr",     n: "ácido bromídrico",  c: "acidos", b: "bromidrico" },
  { f: "HI",      n: "ácido iodídrico",   c: "acidos", b: "iodidrico" },
  { f: "H2S",     n: "ácido sulfídrico",  c: "acidos", b: "sulfidrico gas ovo podre" },
  { f: "HCN",     n: "ácido cianídrico",  c: "acidos", b: "cianidrico cianeto" },
  { f: "H2SO3",   n: "ácido sulfuroso",   c: "acidos", b: "sulfuroso" },
  { f: "HNO2",    n: "ácido nitroso",     c: "acidos", b: "nitroso" },
  { f: "HClO",    n: "ácido hipocloroso", c: "acidos", b: "hipocloroso cloro piscina" },
  { f: "HClO2",   n: "ácido cloroso",     c: "acidos", b: "cloroso" },
  { f: "HClO3",   n: "ácido clórico",     c: "acidos", b: "clorico" },
  { f: "HClO4",   n: "ácido perclórico",  c: "acidos", b: "perclorico" },
  { f: "H3BO3",   n: "ácido bórico",      c: "acidos", b: "borico" },
  { f: "H2C2O4",  n: "ácido oxálico",     c: "acidos", b: "oxalico padronizacao" },
  { f: "H2CrO4",  n: "ácido crômico",     c: "acidos", b: "cromico" },
  { f: "H2Cr2O7", n: "ácido dicrômico",   c: "acidos", b: "dicromico" },
  { f: "HMnO4",   n: "ácido permangânico", c: "acidos", b: "permanganico" },
  { f: "H2SiO3",  n: "ácido metassilícico", c: "acidos", b: "silicico" },
  { f: "HCOOH",   n: "ácido fórmico",     c: "acidos", b: "formico metanoico formiga" },

  /* ---------------- bases ---------------- */
  { f: "NaOH",     n: "hidróxido de sódio",     c: "bases", u: 1, b: "soda caustica lixivia" },
  { f: "KOH",      n: "hidróxido de potássio",  c: "bases", u: 1, b: "potassa caustica" },
  { f: "Ca(OH)2",  n: "hidróxido de cálcio",    c: "bases", u: 1, b: "cal hidratada cal extinta caiacao" },
  { f: "Mg(OH)2",  n: "hidróxido de magnésio",  c: "bases", u: 1, b: "leite magnesia antiacido" },
  { f: "Ba(OH)2",  n: "hidróxido de bário",     c: "bases", b: "barita" },
  { f: "Al(OH)3",  n: "hidróxido de alumínio",  c: "bases", u: 1, b: "antiacido floculante" },
  { f: "NH3",      n: "amônia",                 c: "bases", u: 1, b: "amonia amoniaco gas" },
  { f: "NH4OH",    n: "hidróxido de amônio",    c: "bases", b: "amoniaco solucao" },
  { f: "Fe(OH)2",  n: "hidróxido de ferro II",  c: "bases", b: "hidroxido ferroso" },
  { f: "Fe(OH)3",  n: "hidróxido de ferro III", c: "bases", b: "hidroxido ferrico" },
  { f: "Cu(OH)2",  n: "hidróxido de cobre II",  c: "bases", b: "hidroxido cuprico" },
  { f: "Zn(OH)2",  n: "hidróxido de zinco",     c: "bases", b: "hidroxido zinco" },
  { f: "LiOH",     n: "hidróxido de lítio",     c: "bases", b: "hidroxido litio" },
  { f: "Sr(OH)2",  n: "hidróxido de estrôncio", c: "bases", b: "hidroxido estroncio" },
  { f: "Pb(OH)2",  n: "hidróxido de chumbo II", c: "bases", b: "hidroxido chumbo" },
  { f: "Ni(OH)2",  n: "hidróxido de níquel II", c: "bases", b: "hidroxido niquel" },
  { f: "Cr(OH)3",  n: "hidróxido de cromo III", c: "bases", b: "hidroxido cromo" },
  { f: "Mn(OH)2",  n: "hidróxido de manganês II", c: "bases", b: "hidroxido manganes" },

  /* ---------------- sais ---------------- */
  { f: "NaCl",       n: "cloreto de sódio",      c: "sais", u: 1, b: "sal cozinha soro" },
  { f: "KCl",        n: "cloreto de potássio",   c: "sais", u: 1, b: "cloreto potassio sal light" },
  { f: "CaCl2",      n: "cloreto de cálcio",     c: "sais", u: 1, b: "cloreto calcio secante" },
  { f: "MgCl2",      n: "cloreto de magnésio",   c: "sais", b: "cloreto magnesio" },
  { f: "AlCl3",      n: "cloreto de alumínio",   c: "sais", b: "cloreto aluminio" },
  { f: "FeCl2",      n: "cloreto de ferro II",   c: "sais", b: "cloreto ferroso" },
  { f: "FeCl3",      n: "cloreto de ferro III",  c: "sais", b: "cloreto ferrico floculante" },
  { f: "CuCl2",      n: "cloreto de cobre II",   c: "sais", b: "cloreto cuprico" },
  { f: "ZnCl2",      n: "cloreto de zinco",      c: "sais", b: "cloreto zinco" },
  { f: "MnCl2",      n: "cloreto de manganês II", c: "sais", b: "cloreto manganes permanganometria" },
  { f: "NH4Cl",      n: "cloreto de amônio",     c: "sais", u: 1, b: "cloreto amonio sal amoniaco" },
  { f: "AgCl",       n: "cloreto de prata",      c: "sais", u: 1, b: "cloreto prata precipitado" },
  { f: "BaCl2",      n: "cloreto de bário",      c: "sais", b: "cloreto bario" },
  { f: "PbCl2",      n: "cloreto de chumbo II",  c: "sais", b: "cloreto chumbo" },
  { f: "Na2SO4",     n: "sulfato de sódio",      c: "sais", u: 1, b: "sulfato sodio" },
  { f: "K2SO4",      n: "sulfato de potássio",   c: "sais", b: "sulfato potassio adubo" },
  { f: "CaSO4",      n: "sulfato de cálcio",     c: "sais", b: "gesso anidrita" },
  { f: "MgSO4",      n: "sulfato de magnésio",   c: "sais", b: "sal amargo epsom" },
  { f: "CuSO4",      n: "sulfato de cobre II",   c: "sais", u: 1, b: "sulfato cobre azul" },
  { f: "FeSO4",      n: "sulfato de ferro II",   c: "sais", b: "sulfato ferroso anemia" },
  { f: "Fe2(SO4)3",  n: "sulfato de ferro III",  c: "sais", b: "sulfato ferrico" },
  { f: "Al2(SO4)3",  n: "sulfato de alumínio",   c: "sais", u: 1, b: "sulfato aluminio floculante agua" },
  { f: "ZnSO4",      n: "sulfato de zinco",      c: "sais", b: "sulfato zinco" },
  { f: "BaSO4",      n: "sulfato de bário",      c: "sais", u: 1, b: "sulfato bario contraste raio x" },
  { f: "PbSO4",      n: "sulfato de chumbo II",  c: "sais", b: "sulfato chumbo bateria" },
  { f: "(NH4)2SO4",  n: "sulfato de amônio",     c: "sais", b: "sulfato amonio adubo" },
  { f: "Na2CO3",     n: "carbonato de sódio",    c: "sais", u: 1, b: "barrilha soda solvay" },
  { f: "K2CO3",      n: "carbonato de potássio", c: "sais", b: "carbonato potassio potassa" },
  { f: "CaCO3",      n: "carbonato de cálcio",   c: "sais", u: 1, b: "calcario marmore casca ovo" },
  { f: "MgCO3",      n: "carbonato de magnésio", c: "sais", b: "magnesita" },
  { f: "BaCO3",      n: "carbonato de bário",    c: "sais", b: "carbonato bario" },
  { f: "FeCO3",      n: "carbonato de ferro II", c: "sais", b: "siderita" },
  { f: "NaHCO3",     n: "bicarbonato de sódio",  c: "sais", u: 1, b: "bicarbonato fermento po royal" },
  { f: "KHCO3",      n: "bicarbonato de potássio", c: "sais", b: "bicarbonato potassio" },
  { f: "Ca(HCO3)2",  n: "bicarbonato de cálcio", c: "sais", b: "dureza temporaria agua" },
  { f: "NaNO3",      n: "nitrato de sódio",      c: "sais", b: "salitre chile" },
  { f: "KNO3",       n: "nitrato de potássio",   c: "sais", u: 1, b: "salitre polvora" },
  { f: "Ca(NO3)2",   n: "nitrato de cálcio",     c: "sais", b: "nitrato calcio adubo" },
  { f: "Mg(NO3)2",   n: "nitrato de magnésio",   c: "sais", b: "nitrato magnesio" },
  { f: "AgNO3",      n: "nitrato de prata",      c: "sais", u: 1, b: "nitrato prata argentometria" },
  { f: "Cu(NO3)2",   n: "nitrato de cobre II",   c: "sais", b: "nitrato cuprico" },
  { f: "Pb(NO3)2",   n: "nitrato de chumbo II",  c: "sais", b: "nitrato chumbo" },
  { f: "Al(NO3)3",   n: "nitrato de alumínio",   c: "sais", b: "nitrato aluminio" },
  { f: "Fe(NO3)3",   n: "nitrato de ferro III",  c: "sais", b: "nitrato ferrico" },
  { f: "NH4NO3",     n: "nitrato de amônio",     c: "sais", b: "nitrato amonio adubo bolsa gelo" },
  { f: "NaNO2",      n: "nitrito de sódio",      c: "sais", b: "nitrito sodio embutido cura" },
  { f: "Na3PO4",     n: "fosfato de sódio",      c: "sais", b: "fosfato trissodico" },
  { f: "K3PO4",      n: "fosfato de potássio",   c: "sais", b: "fosfato potassio" },
  { f: "Ca3(PO4)2",  n: "fosfato de cálcio",     c: "sais", u: 1, b: "fosfato calcio osso rocha fosfatica" },
  { f: "Na2HPO4",    n: "fosfato dissódico",     c: "sais", b: "tampao fosfato hidrogenofosfato" },
  { f: "NaH2PO4",    n: "fosfato monossódico",   c: "sais", b: "tampao fosfato dihidrogenofosfato" },
  { f: "K2HPO4",     n: "fosfato dipotássico",   c: "sais", b: "tampao fosfato" },
  { f: "KH2PO4",     n: "fosfato monopotássico", c: "sais", b: "tampao fosfato padrao ph" },
  { f: "AlPO4",      n: "fosfato de alumínio",   c: "sais", b: "fosfato aluminio" },
  { f: "CH3COONa",   n: "acetato de sódio",      c: "sais", u: 1, b: "acetato sodio tampao" },
  { f: "KMnO4",      n: "permanganato de potássio", c: "sais", u: 1, b: "permanganato roxo oxidante" },
  { f: "K2Cr2O7",    n: "dicromato de potássio", c: "sais", u: 1, b: "dicromato laranja oxidante dqo" },
  { f: "K2CrO4",     n: "cromato de potássio",   c: "sais", b: "cromato amarelo mohr" },
  { f: "NaClO",      n: "hipoclorito de sódio",  c: "sais", u: 1, b: "agua sanitaria cloro alvejante" },
  { f: "Ca(ClO)2",   n: "hipoclorito de cálcio", c: "sais", b: "cloro piscina hth" },
  { f: "KClO3",      n: "clorato de potássio",   c: "sais", b: "clorato potassio" },
  { f: "KClO4",      n: "perclorato de potássio", c: "sais", b: "perclorato potassio" },
  { f: "KI",         n: "iodeto de potássio",    c: "sais", u: 1, b: "iodeto potassio iodometria" },
  { f: "NaI",        n: "iodeto de sódio",       c: "sais", b: "iodeto sodio" },
  { f: "NaBr",       n: "brometo de sódio",      c: "sais", b: "brometo sodio" },
  { f: "KBr",        n: "brometo de potássio",   c: "sais", b: "brometo potassio" },
  { f: "NaF",        n: "fluoreto de sódio",     c: "sais", b: "fluoreto sodio creme dental" },
  { f: "CaF2",       n: "fluoreto de cálcio",    c: "sais", b: "fluorita" },
  { f: "Na2S",       n: "sulfeto de sódio",      c: "sais", b: "sulfeto sodio" },
  { f: "FeS",        n: "sulfeto de ferro II",   c: "sais", b: "sulfeto ferroso" },
  { f: "FeS2",       n: "dissulfeto de ferro",   c: "sais", u: 1, b: "pirita ouro tolo ustulacao" },
  { f: "ZnS",        n: "sulfeto de zinco",      c: "sais", b: "esfalerita" },
  { f: "CuS",        n: "sulfeto de cobre II",   c: "sais", b: "sulfeto cuprico" },
  { f: "PbS",        n: "sulfeto de chumbo II",  c: "sais", b: "galena" },
  { f: "CaS",        n: "sulfeto de cálcio",     c: "sais", b: "sulfeto calcio" },
  { f: "Na2SO3",     n: "sulfito de sódio",      c: "sais", b: "sulfito sodio conservante" },
  { f: "Na2S2O3",    n: "tiossulfato de sódio",  c: "sais", u: 1, b: "tiossulfato hipo iodometria" },
  { f: "Na2SiO3",    n: "silicato de sódio",     c: "sais", b: "vidro liquido silicato" },
  { f: "Na2B4O7",    n: "tetraborato de sódio",  c: "sais", b: "borax bórax padronizacao" },
  { f: "CaC2",       n: "carbeto de cálcio",     c: "sais", b: "carbureto acetileno" },
  { f: "CuSO4·5H2O", n: "sulfato de cobre penta-hidratado", c: "sais", u: 1, b: "sulfato cobre hidratado azul cristal" },
  { f: "Na2CO3·10H2O", n: "carbonato de sódio deca-hidratado", c: "sais", b: "soda cristal hidratado" },
  { f: "CaSO4·2H2O", n: "sulfato de cálcio di-hidratado", c: "sais", b: "gipsita gesso hidratado" },
  { f: "MgSO4·7H2O", n: "sulfato de magnésio hepta-hidratado", c: "sais", b: "sal epsom hidratado" },
  { f: "FeSO4·7H2O", n: "sulfato ferroso hepta-hidratado", c: "sais", b: "sulfato ferroso hidratado" },

  /* ---------------- orgânicos ---------------- */
  { f: "CH4",         n: "metano",              c: "organicos", u: 1, b: "metano gas natural biogas" },
  { f: "C2H6",        n: "etano",               c: "organicos", b: "etano" },
  { f: "C3H8",        n: "propano",             c: "organicos", u: 1, b: "propano glp gas cozinha" },
  { f: "C4H10",       n: "butano",              c: "organicos", u: 1, b: "butano glp isqueiro" },
  { f: "C5H12",       n: "pentano",             c: "organicos", b: "pentano" },
  { f: "C6H14",       n: "hexano",              c: "organicos", b: "hexano solvente extracao" },
  { f: "C8H18",       n: "octano",              c: "organicos", u: 1, b: "octano gasolina" },
  { f: "C2H4",        n: "eteno",               c: "organicos", b: "etileno amadurecimento polietileno" },
  { f: "C3H6",        n: "propeno",             c: "organicos", b: "propileno polipropileno" },
  { f: "C2H2",        n: "etino",               c: "organicos", b: "acetileno solda oxiacetilenica" },
  { f: "C6H6",        n: "benzeno",             c: "organicos", b: "benzeno aromatico" },
  { f: "C7H8",        n: "tolueno",             c: "organicos", b: "tolueno solvente" },
  { f: "CH3OH",       n: "metanol",             c: "organicos", u: 1, b: "metanol alcool metilico" },
  { f: "C2H5OH",      n: "etanol",              c: "organicos", u: 1, b: "etanol alcool cereais combustivel" },
  { f: "C3H8O",       n: "propanol",            c: "organicos", b: "propanol isopropanol alcool" },
  { f: "C3H8O3",      n: "glicerol",            c: "organicos", u: 1, b: "glicerina glicerol umectante" },
  { f: "C2H6O2",      n: "etilenoglicol",       c: "organicos", b: "etilenoglicol anticongelante" },
  { f: "C6H12O6",     n: "glicose",             c: "organicos", u: 1, b: "glicose dextrose acucar soro" },
  { f: "C12H22O11",   n: "sacarose",            c: "organicos", u: 1, b: "sacarose acucar mesa" },
  { f: "CH3COCH3",    n: "acetona",             c: "organicos", u: 1, b: "acetona propanona solvente" },
  { f: "CH3CHO",      n: "etanal",              c: "organicos", b: "acetaldeido" },
  { f: "HCHO",        n: "metanal",             c: "organicos", b: "formaldeido formol conservante" },
  { f: "CH3COOC2H5",  n: "acetato de etila",    c: "organicos", b: "acetato etila solvente esmalte" },
  { f: "CHCl3",       n: "clorofórmio",         c: "organicos", b: "cloroformio triclorometano" },
  { f: "CCl4",        n: "tetracloreto de carbono", c: "organicos", b: "tetracloreto" },
  { f: "CH3Cl",       n: "clorometano",         c: "organicos", b: "cloreto metila" },
  { f: "CH3NH2",      n: "metilamina",          c: "organicos", b: "metilamina amina" },
  { f: "CO(NH2)2",    n: "ureia",               c: "organicos", u: 1, b: "ureia adubo creme" },
  { f: "C6H5OH",      n: "fenol",               c: "organicos", b: "fenol desinfetante" },
  { f: "C6H8O7",      n: "ácido cítrico",       c: "organicos", u: 1, b: "citrico limao acidulante" },
  { f: "C3H6O3",      n: "ácido lático",        c: "organicos", b: "latico lactico fermentacao" },
  { f: "C4H6O6",      n: "ácido tartárico",     c: "organicos", b: "tartarico vinho" },
  { f: "C9H8O4",      n: "ácido acetilsalicílico", c: "organicos", u: 1, b: "aas aspirina analgesico" },
  { f: "C8H9NO2",     n: "paracetamol",         c: "organicos", u: 1, b: "paracetamol acetaminofeno analgesico" },
  { f: "C8H10N4O2",   n: "cafeína",             c: "organicos", b: "cafeina cafe" },
  { f: "C16H18N2O4S", n: "penicilina G",        c: "organicos", b: "penicilina antibiotico" },
  { f: "C18H36O2",    n: "ácido esteárico",     c: "organicos", b: "estearico gordura sabao" },
  { f: "C17H35COONa", n: "estearato de sódio",  c: "organicos", b: "sabao estearato saponificacao" },

  /* ---------------- íons ---------------- */
  { f: "H+",       n: "íon hidrogênio",   c: "ions", u: 1, b: "proton hidronio acido" },
  { f: "OH-",      n: "íon hidróxido",    c: "ions", u: 1, b: "hidroxila base" },
  { f: "H3O+",     n: "íon hidrônio",     c: "ions", b: "hidronio" },
  { f: "Na+",      n: "íon sódio",        c: "ions", u: 1, b: "sodio cation" },
  { f: "K+",       n: "íon potássio",     c: "ions", b: "potassio cation" },
  { f: "Li+",      n: "íon lítio",        c: "ions", b: "litio cation" },
  { f: "NH4+",     n: "íon amônio",       c: "ions", u: 1, b: "amonio cation" },
  { f: "Ca2+",     n: "íon cálcio",       c: "ions", u: 1, b: "calcio dureza" },
  { f: "Mg2+",     n: "íon magnésio",     c: "ions", u: 1, b: "magnesio dureza" },
  { f: "Ba2+",     n: "íon bário",        c: "ions", b: "bario cation" },
  { f: "Al3+",     n: "íon alumínio",     c: "ions", b: "aluminio cation" },
  { f: "Fe2+",     n: "íon ferro II",     c: "ions", u: 1, b: "ferroso cation" },
  { f: "Fe3+",     n: "íon ferro III",    c: "ions", u: 1, b: "ferrico cation" },
  { f: "Cu2+",     n: "íon cobre II",     c: "ions", b: "cuprico cation" },
  { f: "Zn2+",     n: "íon zinco",        c: "ions", b: "zinco cation" },
  { f: "Ag+",      n: "íon prata",        c: "ions", b: "prata cation" },
  { f: "Pb2+",     n: "íon chumbo II",    c: "ions", b: "chumbo cation" },
  { f: "Sn2+",     n: "íon estanho II",   c: "ions", b: "estanoso cation" },
  { f: "Sn4+",     n: "íon estanho IV",   c: "ions", b: "estanico cation" },
  { f: "Mn2+",     n: "íon manganês II",  c: "ions", u: 1, b: "manganes cation permanganometria" },
  { f: "Cr3+",     n: "íon cromo III",    c: "ions", u: 1, b: "cromo cation" },
  { f: "Ni2+",     n: "íon níquel II",    c: "ions", b: "niquel cation" },
  { f: "Hg2+",     n: "íon mercúrio II",  c: "ions", b: "mercurio cation" },
  { f: "Cl-",      n: "íon cloreto",      c: "ions", u: 1, b: "cloreto anion" },
  { f: "Br-",      n: "íon brometo",      c: "ions", b: "brometo anion" },
  { f: "I-",       n: "íon iodeto",       c: "ions", b: "iodeto anion" },
  { f: "F-",       n: "íon fluoreto",     c: "ions", b: "fluoreto anion" },
  { f: "S2-",      n: "íon sulfeto",      c: "ions", b: "sulfeto anion" },
  { f: "SO42-",    n: "íon sulfato",      c: "ions", u: 1, b: "sulfato anion" },
  { f: "SO32-",    n: "íon sulfito",      c: "ions", b: "sulfito anion" },
  { f: "S2O32-",   n: "íon tiossulfato",  c: "ions", b: "tiossulfato anion" },
  { f: "NO3-",     n: "íon nitrato",      c: "ions", u: 1, b: "nitrato anion" },
  { f: "NO2-",     n: "íon nitrito",      c: "ions", b: "nitrito anion" },
  { f: "CO32-",    n: "íon carbonato",    c: "ions", u: 1, b: "carbonato anion alcalinidade" },
  { f: "HCO3-",    n: "íon bicarbonato",  c: "ions", u: 1, b: "bicarbonato anion alcalinidade" },
  { f: "PO43-",    n: "íon fosfato",      c: "ions", b: "fosfato anion" },
  { f: "HPO42-",   n: "íon hidrogenofosfato", c: "ions", b: "fosfato anion tampao" },
  { f: "H2PO4-",   n: "íon di-hidrogenofosfato", c: "ions", b: "fosfato anion tampao" },
  { f: "MnO4-",    n: "íon permanganato", c: "ions", u: 1, b: "permanganato anion oxidante" },
  { f: "MnO42-",   n: "íon manganato",    c: "ions", b: "manganato anion" },
  { f: "Cr2O72-",  n: "íon dicromato",    c: "ions", u: 1, b: "dicromato anion oxidante" },
  { f: "CrO42-",   n: "íon cromato",      c: "ions", b: "cromato anion" },
  { f: "ClO-",     n: "íon hipoclorito",  c: "ions", b: "hipoclorito anion cloro" },
  { f: "ClO3-",    n: "íon clorato",      c: "ions", b: "clorato anion" },
  { f: "CH3COO-",  n: "íon acetato",      c: "ions", b: "acetato anion" },
  { f: "CN-",      n: "íon cianeto",      c: "ions", b: "cianeto anion" },
  { f: "SCN-",     n: "íon tiocianato",   c: "ions", b: "tiocianato anion" },
];

/* As reações que aparecem em prova, em aula prática e em rótulo de indústria.
   Cada uma carrega o porquê de estar aqui: sem a nota, viram só letras. */
const RECEITAS_DE_AULA = [
  { nome: "Combustão do metano", grupo: "Combustão",
    uso: "Geração de calor em caldeira e forno industrial; é a queima do gás natural encanado.",
    reagentes: ["CH4", "O2"], produtos: ["CO2", "H2O"],
    nota: "A queima do gás natural. Todo hidrocarboneto queimado por completo dá os mesmos dois produtos." },
  { nome: "Combustão do propano", grupo: "Combustão",
    uso: "O botijão de GLP: cozinha, empilhadeira e maçarico de bancada.",
    reagentes: ["C3H8", "O2"], produtos: ["CO2", "H2O"],
    nota: "O botijão de GLP da cozinha." },
  { nome: "Combustão do etanol", grupo: "Combustão",
    uso: "Motor flex e queima do álcool de cana nas usinas.",
    reagentes: ["C2H5OH", "O2"], produtos: ["CO2", "H2O"],
    nota: "O álcool combustível. O oxigênio da própria molécula reduz o O2 necessário." },
  { nome: "Combustão incompleta", grupo: "Combustão",
    uso: "O acidente que se quer evitar: aquecedor a gás sem exaustão produz monóxido e mata.",
    reagentes: ["CH4", "O2"], produtos: ["CO", "H2O"],
    nota: "Falta de ar e sai monóxido, que é o que mata em aquecedor sem exaustão." },

  { nome: "Neutralização simples", grupo: "Ácido e base",
    uso: "Tratamento de efluente ácido antes do descarte, e a titulação de padronização.",
    reagentes: ["HCl", "NaOH"], produtos: ["NaCl", "H2O"],
    nota: "Um H⁺ para uma OH⁻. Todos os coeficientes valem 1." },
  { nome: "Neutralização de diácido", grupo: "Ácido e base",
    uso: "Neutralização de efluente de decapagem e de banho de bateria.",
    reagentes: ["H2SO4", "NaOH"], produtos: ["Na2SO4", "H2O"],
    nota: "Dois hidrogênios ionizáveis pedem duas bases. É a origem do k = 2." },
  { nome: "Neutralização de triácido", grupo: "Ácido e base",
    uso: "Produção de fosfato trissódico, usado como detergente industrial e sequestrante.",
    reagentes: ["H3PO4", "NaOH"], produtos: ["Na3PO4", "H2O"],
    nota: "A neutralização total do fosfórico, aquela em que o k vale 3." },
  { nome: "Antiácido no estômago", grupo: "Ácido e base",
    uso: "Leite de magnésia: a reação que alivia a azia.",
    reagentes: ["Mg(OH)2", "HCl"], produtos: ["MgCl2", "H2O"],
    nota: "Leite de magnésia contra o ácido clorídrico gástrico." },
  { nome: "Amônia com ácido", grupo: "Ácido e base",
    uso: "Fabricação de cloreto de amônio para pilha seca e para fluxo de solda.",
    reagentes: ["NH3", "HCl"], produtos: ["NH4Cl"],
    nota: "Duas substâncias e um produto só: a fumaça branca da aula demonstrativa." },
  { nome: "Cal virgem em água", grupo: "Ácido e base",
    uso: "Preparo da cal hidratada para argamassa, caiação e correção de solo.",
    reagentes: ["CaO", "H2O"], produtos: ["Ca(OH)2"],
    nota: "A extinção da cal, que esquenta o suficiente para ferver a água." },

  { nome: "Precipitação do cloreto de prata", grupo: "Dupla troca",
    uso: "Argentometria: a dosagem de cloreto em água, soro e alimento.",
    reagentes: ["AgNO3", "NaCl"], produtos: ["AgCl", "NaNO3"],
    nota: "O sólido branco da argentometria. Todos os coeficientes valem 1." },
  { nome: "Precipitação do sulfato de bário", grupo: "Dupla troca",
    uso: "Gravimetria de sulfato e produção do contraste para radiografia.",
    reagentes: ["BaCl2", "Na2SO4"], produtos: ["BaSO4", "NaCl"],
    nota: "Gravimetria clássica de sulfato." },
  { nome: "Calcário com ácido", grupo: "Dupla troca",
    uso: "Acidificação de poço de petróleo e o teste de campo que identifica carbonato.",
    reagentes: ["CaCO3", "HCl"], produtos: ["CaCl2", "H2O", "CO2"],
    nota: "A efervescência que identifica carbonato." },
  { nome: "Bicarbonato com vinagre", grupo: "Dupla troca",
    uso: "Fermento químico e extintor de espuma; também a limpeza de ralo.",
    reagentes: ["NaHCO3", "CH3COOH"], produtos: ["CH3COONa", "H2O", "CO2"],
    nota: "O vulcão da feira de ciências, com nome e sobrenome." },

  { nome: "Síntese da água", grupo: "Síntese e decomposição",
    uso: "Célula a combustível: a reação que gera eletricidade produzindo só água.",
    reagentes: ["H2", "O2"], produtos: ["H2O"],
    nota: "A equação que abre todo livro. Repare que 2 e 1 dão 2, não 1 e 1 dão 1." },
  { nome: "Síntese da amônia", grupo: "Síntese e decomposição",
    uso: "Haber-Bosch, base de todo adubo nitrogenado do mundo.",
    reagentes: ["N2", "H2"], produtos: ["NH3"],
    nota: "Haber-Bosch, o processo que alimenta metade do planeta em forma de adubo." },
  { nome: "Calcinação do calcário", grupo: "Síntese e decomposição",
    uso: "Forno de cal: primeira etapa do cimento, do aço e do vidro.",
    reagentes: ["CaCO3"], produtos: ["CaO", "CO2"],
    nota: "O forno de cal. Um reagente só, dois produtos." },
  { nome: "Decomposição da água oxigenada", grupo: "Síntese e decomposição",
    uso: "Por que o frasco é escuro, e como o oxigênio é gerado em laboratório.",
    reagentes: ["H2O2"], produtos: ["H2O", "O2"],
    nota: "Por que o frasco é escuro: luz acelera essa reação." },
  { nome: "Fotossíntese", grupo: "Síntese e decomposição",
    uso: "A origem de toda biomassa: cana, eucalipto e o oxigênio que respiramos.",
    reagentes: ["CO2", "H2O"], produtos: ["C6H12O6", "O2"],
    nota: "Seis de cada lado. A equação da vida, escrita em coeficientes." },
  { nome: "Fermentação alcoólica", grupo: "Síntese e decomposição",
    uso: "Usina de etanol, cervejaria e panificação.",
    reagentes: ["C6H12O6"], produtos: ["C2H5OH", "CO2"],
    nota: "Glicose vira etanol e gás carbônico — usina, cerveja e pão." },

  { nome: "Zinco em ácido", grupo: "Deslocamento",
    uso: "Decapagem de peça metálica e geração de hidrogênio em laboratório.",
    reagentes: ["Zn", "HCl"], produtos: ["ZnCl2", "H2"],
    nota: "Metal mais reativo desloca o hidrogênio e o gás borbulha." },
  { nome: "Ferrugem", grupo: "Deslocamento",
    uso: "A corrosão que consome cerca de 3% do PIB mundial em manutenção.",
    reagentes: ["Fe", "O2"], produtos: ["Fe2O3"],
    nota: "O prejuízo mais caro da engenharia, em quatro e três." },
  { nome: "Aluminotermia", grupo: "Deslocamento",
    uso: "Solda de trilho de trem no próprio local, sem forno.",
    reagentes: ["Al", "Fe2O3"], produtos: ["Al2O3", "Fe"],
    nota: "A termita, que solda trilho de trem com o ferro derretido que produz." },
  { nome: "Cobre em ácido nítrico", grupo: "Deslocamento",
    uso: "Gravação de placa de circuito impresso e decapagem de cobre.",
    reagentes: ["Cu", "HNO3"], produtos: ["Cu(NO3)2", "NO", "H2O"],
    nota: "Cobre não desloca hidrogênio, mas o nítrico o ataca assim mesmo — e sai gás castanho." },

  { nome: "Permanganato em meio ácido", grupo: "Oxirredução",
    uso: "Geração de cloro em laboratório e a base da permanganometria.",
    reagentes: ["KMnO4", "HCl"], produtos: ["KCl", "MnCl2", "H2O", "Cl2"],
    nota: "Dezesseis mols de ácido. Tente balancear por tentativa e veja quanto tempo leva." },
  { nome: "Ustulação da pirita", grupo: "Oxirredução",
    uso: "Primeira etapa do processo de contato, que fabrica o ácido sulfúrico.",
    reagentes: ["FeS2", "O2"], produtos: ["Fe2O3", "SO2"],
    nota: "A primeira etapa da fabricação de ácido sulfúrico." },
  { nome: "Chuva ácida", grupo: "Oxirredução",
    uso: "Etapa catalítica do processo de contato — e o que acontece na atmosfera poluída.",
    reagentes: ["SO2", "O2"], produtos: ["SO3"],
    nota: "O dióxido vira trióxido na atmosfera; com água, vira sulfúrico." },
  { nome: "Sulfúrico a partir do trióxido", grupo: "Oxirredução",
    uso: "Fecho do processo de contato: o ácido mais produzido do planeta.",
    reagentes: ["SO3", "H2O"], produtos: ["H2SO4"],
    nota: "O fecho do processo de contato." },

  { nome: "Permanganato com ferro II", grupo: "Equação iônica",
    uso: "Dosagem de ferro em minério e em medicamento, por titulação.",
    reagentes: ["MnO4-", "Fe2+", "H+"], produtos: ["Mn2+", "Fe3+", "H2O"],
    nota: "Aqui a carga também tem de fechar, e ela entra no sistema como se fosse mais um elemento." },
  { nome: "Dicromato com ferro II", grupo: "Equação iônica",
    uso: "Titulação de ferro em minério; o mesmo dicromato mede a DQO de efluente.",
    reagentes: ["Cr2O72-", "Fe2+", "H+"], produtos: ["Cr3+", "Fe3+", "H2O"],
    nota: "A titulação de ferro em minério, na forma iônica." },

  /* As dezesseis reações abaixo vieram do banco do treino, que antes vivia
     separado em `exercicios.js`. Duas listas com o mesmo propósito divergem:
     uma ganha reação nova e a outra não. Agora há uma só, e o treino de
     balanceamento e o montador bebem da mesma fonte. */
  { nome: "Alumínio em ácido", grupo: "Deslocamento",
    uso: "Decapagem de alumínio e geração de hidrogênio para balão meteorológico.",
    reagentes: ["Al", "HCl"], produtos: ["AlCl3", "H2"],
    nota: "Seis de ácido para dois de metal — um dos primeiros que engana na tentativa." },
  { nome: "Sódio em água", grupo: "Deslocamento",
    uso: "A demonstração clássica de reatividade dos alcalinos; também alerta de armazenamento.",
    reagentes: ["Na", "H2O"], produtos: ["NaOH", "H2"],
    nota: "Por que o sódio é guardado sob querosene: com água, libera hidrogênio e calor." },
  { nome: "Magnésio queimando", grupo: "Deslocamento",
    uso: "Fita de magnésio em pirotecnia e sinalizador náutico.",
    reagentes: ["Mg", "O2"], produtos: ["MgO"],
    nota: "A luz branca que não se deve olhar direto." },
  { nome: "Clorato de potássio", grupo: "Síntese e decomposição",
    uso: "Geração de oxigênio em laboratório e em máscara de emergência de avião.",
    reagentes: ["KClO3"], produtos: ["KCl", "O2"],
    nota: "Dois e três: decomposição que só tem um reagente." },
  { nome: "Amônia queimando", grupo: "Oxirredução",
    uso: "Processo Ostwald, primeira etapa da fabricação do ácido nítrico.",
    reagentes: ["NH3", "O2"], produtos: ["NO", "H2O"],
    nota: "Quatro, cinco, quatro, seis — quase ninguém acerta de primeira." },
  { nome: "Respiração celular", grupo: "Oxirredução",
    uso: "A reação que sustenta o corpo; é a fotossíntese ao contrário.",
    reagentes: ["C6H12O6", "O2"], produtos: ["CO2", "H2O"],
    nota: "Mesmos coeficientes da fotossíntese, com os lados trocados." },
  { nome: "Ácido sulfídrico queimando", grupo: "Oxirredução",
    uso: "Processo Claus, que recupera enxofre do gás de refinaria.",
    reagentes: ["H2S", "O2"], produtos: ["SO2", "H2O"],
    nota: "O gás de ovo podre virando dióxido de enxofre." },
  { nome: "Redução do óxido de ferro", grupo: "Oxirredução",
    uso: "Alto-forno: como o minério de ferro vira ferro-gusa.",
    reagentes: ["Fe2O3", "CO"], produtos: ["Fe", "CO2"],
    nota: "O monóxido é o redutor; sai gás carbônico pela chaminé." },
  { nome: "Carbureto e água", grupo: "Dupla troca",
    uso: "Gera acetileno para solda oxiacetilênica e para amadurecer fruta.",
    reagentes: ["CaC2", "H2O"], produtos: ["C2H2", "Ca(OH)2"],
    nota: "A antiga lamparina de carbureto do minerador." },
  { nome: "Barrilha com cal", grupo: "Dupla troca",
    uso: "Caustificação: fabricação de soda cáustica a partir da barrilha.",
    reagentes: ["Na2CO3", "Ca(OH)2"], produtos: ["NaOH", "CaCO3"],
    nota: "O carbonato de cálcio precipita e leva o cálcio embora." },
  { nome: "Floculação com sulfato de alumínio", grupo: "Dupla troca",
    uso: "Estação de tratamento de água: o floco que arrasta a sujeira.",
    reagentes: ["Al2(SO4)3", "Ca(OH)2"], produtos: ["Al(OH)3", "CaSO4"],
    nota: "O hidróxido de alumínio gelatinoso é o floco." },
  { nome: "Dureza da água no aquecimento", grupo: "Síntese e decomposição",
    uso: "A incrustação que entope tubulação de caldeira e resistência de chuveiro.",
    reagentes: ["Ca(HCO3)2"], produtos: ["CaCO3", "H2O", "CO2"],
    nota: "Dureza temporária: some ao ferver, virando pedra no fundo da panela." },
  { nome: "Gesso desidratando", grupo: "Síntese e decomposição",
    uso: "Calcinação da gipsita para produzir gesso de construção e de molde.",
    reagentes: ["CaSO4·2H2O"], produtos: ["CaSO4", "H2O"],
    nota: "A água de hidratação conta na equação como qualquer outra." },
  { nome: "Cloro em soda", grupo: "Oxirredução",
    uso: "Fabricação de água sanitária.",
    reagentes: ["Cl2", "NaOH"], produtos: ["NaCl", "NaClO", "H2O"],
    nota: "O mesmo cloro vira cloreto e hipoclorito: desproporcionamento." },
  { nome: "Nitrato de prata com cobre", grupo: "Deslocamento",
    uso: "A árvore de prata, demonstração de fila de reatividade.",
    reagentes: ["Cu", "AgNO3"], produtos: ["Cu(NO3)2", "Ag"],
    nota: "O cobre desloca a prata e a solução fica azul." },
  { nome: "Ureia a partir da amônia", grupo: "Síntese e decomposição",
    uso: "Produção do adubo nitrogenado sólido mais usado no Brasil.",
    reagentes: ["NH3", "CO2"], produtos: ["CO(NH2)2", "H2O"],
    nota: "Duas amônias para um gás carbônico." },
];

/* ---------------- busca ---------------- */

/* Acento é obstáculo, não informação: quem digita "cloridrico" no teclado do
   celular quer achar o ácido clorídrico. */
function semAcento(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function especiesConhecidas() { return BANCO_ESPECIES; }
function categoriasDeEspecie() { return CATEGORIAS_ESPECIE; }
function receitasDeAula() { return RECEITAS_DE_AULA; }
function quantasEspecies() { return BANCO_ESPECIES.length; }

/* A busca vence a categoria: quem digitou já disse o que quer, e filtrar por
   aba em cima disso só esconderia o resultado que ele está vendo o nome. */
function buscarEspecies(termo, categoria) {
  const t = semAcento(termo || "").trim();
  if (t !== "") {
    return BANCO_ESPECIES.filter((e) =>
      semAcento(e.f).includes(t) || semAcento(e.n).includes(t) || semAcento(e.b || "").includes(t));
  }
  if (!categoria || categoria === "usadas") return BANCO_ESPECIES.filter((e) => e.u === 1);
  return BANCO_ESPECIES.filter((e) => e.c === categoria);
}

function especiePorFormula(formula) {
  return BANCO_ESPECIES.find((e) => e.f === formula) || null;
}

/* ---------------- ponte entre as bandejas e o texto ---------------- */

/* O texto continua sendo a fonte da verdade: o montador escreve nele e o
   balanceador lê dele. Duas representações paralelas divergiriam, e o aluno
   veria a bandeja discordar do resultado. */
function textoDaMontagem(reagentes, produtos) {
  if (!reagentes.length && !produtos.length) return "";
  return reagentes.join(" + ") + " -> " + produtos.join(" + ");
}

/* Caminho de volta: quem digitou no computador e trocou para o montador não
   pode perder o que escreveu. Só devolve as bandejas quando o texto tem os
   dois lados; equação pela metade fica como está. */
function lerMontagem(texto) {
  try {
    const lados = separarLados(texto);
    return {
      reagentes: dividirTermos(lados.esquerda).map(limparCoeficiente),
      produtos: dividirTermos(lados.direita).map(limparCoeficiente),
    };
  } catch (e) {
    return null;
  }
}

/* Coeficiente escrito à mão não entra na bandeja: o balanceador o descarta de
   qualquer jeito, e deixá-lo no botão faria o aluno achar que ele conta. */
function limparCoeficiente(termo) {
  return termo.replace(/^\s*\d+\s*/, "").trim();
}

/* ---------------- contagem de átomos por lado ---------------- */

/* O que esta contagem responde: "o que eu montei já fecha?". Ela soma os
   átomos com todos os coeficientes valendo 1, que é exatamente o que o aluno
   escreveu — o desencontro que aparece aqui é o problema que o balanceamento
   resolve. Não é prévia do resultado; é o retrato do esqueleto. */
function contarLado(formulas) {
  const atomos = {};
  let carga = 0;
  let erro = null;
  for (const f of formulas) {
    try {
      const a = analisar(f);
      for (const [el, q] of Object.entries(a.composicao)) atomos[el] = (atomos[el] || 0) + q;
      carga += a.carga || 0;
    } catch (e) {
      erro = f;
    }
  }
  return { atomos, carga, erro };
}

function compararLados(reagentes, produtos) {
  const esq = contarLado(reagentes);
  const dir = contarLado(produtos);
  const elementos = [...new Set([...Object.keys(esq.atomos), ...Object.keys(dir.atomos)])].sort();
  const linhas = elementos.map((el) => {
    const antes = esq.atomos[el] || 0;
    const depois = dir.atomos[el] || 0;
    return { elemento: el, antes, depois, fecha: antes === depois };
  });
  const usaCarga = esq.carga !== 0 || dir.carga !== 0;
  if (usaCarga) {
    linhas.push({ elemento: "carga", antes: esq.carga, depois: dir.carga, fecha: esq.carga === dir.carga });
  }
  return { linhas, usaCarga, fechaTudo: linhas.length > 0 && linhas.every((l) => l.fecha) };
}
