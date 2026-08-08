/* =====================================================================
   COURS DE LUXEMBOURGEOIS — DONNÉES
   Généré par scripts/build-content-ids.mjs. Ne pas réordonner à la main
   sans relancer le script.

   Champs :
     id  identifiant permanent, ne jamais modifier ni réutiliser
     lb  luxembourgeois
     fr  français
     ph  prononciation approchée
     tr  astuce mémoire, aide, pas une règle de langue
     alt réponses orales également acceptées, VALIDÉES uniquement
     src source de vérification
     ver date de vérification
     by  personne ayant validé
     st  unverified | reviewing | verified

   Tout contenu doit être vérifié sur lod.lu, dictionnaire du Zenter fir
   d'Lëtzebuerger Sprooch, puis relu par un locuteur compétent avant vente.
   Aucun contenu de ce fichier n'a été inventé ou traduit automatiquement.
   ===================================================================== */

const ETAPES = [
  "Les chiffres",
  "Les lettres et les sons",
  "Les premiers mots",
  "Les premières phrases",
  "Le quotidien",
  "Comprendre autour de toi"
];

const COURS = [
{lid:"ls61410e",e:1,t:"De zéro à cinq",note:"On commence par le plus simple. Six mots, rien d'autre aujourd'hui.",i:[
 {id:"lx2be88ca4",lb:"null",fr:"zéro",ph:"noul",tr:"null, comme nul. Zéro, c'est nul.",st:"unverified"},
 {id:"lx3772901e",lb:"eent",fr:"un",ph:"ént",tr:"eent, une seule entité.",st:"unverified"},
 {id:"lx4d0e3cbe",lb:"zwee",fr:"deux",ph:"tsvé",tr:"zwee finit par deux e collés.",st:"unverified"},
 {id:"lxa4055e4a",lb:"dräi",fr:"trois",ph:"draï",tr:"dräi, les deux points du tréma plus le i, trois signes.",st:"unverified"},
 {id:"lx0980347d",lb:"véier",fr:"quatre",ph:"faï-er",tr:"véier se dit faï-er, comme fire. Quatre bougies.",st:"unverified"},
 {id:"lx1eb54b30",lb:"fënnef",fr:"cinq",ph:"fè-neuf",tr:"fënnef commence par F, comme five. Cinq doigts.",st:"unverified"}]},
{lid:"lscc9446",e:1,t:"De six à douze",note:"Sept mots de plus. Le s du début se prononce z. C'est une règle générale, tu la retrouveras partout.",i:[
 {id:"lx4dea3e5f",lb:"sechs",fr:"six",ph:"zeks",tr:"sechs se dit zeks, six avec un z devant.",st:"unverified"},
 {id:"lxebdf30c6",lb:"siwen",fr:"sept",ph:"zi-veune",tr:"siwen, pense à seven avec un z.",st:"unverified"},
 {id:"lxdaa8097b",lb:"aacht",fr:"huit",ph:"akht",tr:"aacht, pense à eight. Le t final est dans les deux.",st:"unverified"},
 {id:"lx5a40fe91",lb:"néng",fr:"neuf",ph:"nèng",tr:"néng, un n au début, comme neuf et nine.",st:"unverified"},
 {id:"lxee2503dd",lb:"zéng",fr:"dix",ph:"tsèng",tr:"zéng, dix c'est zen.",st:"unverified"},
 {id:"lx9c59399c",lb:"eelef",fr:"onze",ph:"é-leuf",tr:"eelef, pense à eleven.",st:"unverified"},
 {id:"lx1a783da4",lb:"zwielef",fr:"douze",ph:"tsvi-leuf",tr:"zwielef commence comme zwee.",st:"unverified"}]},
{lid:"lsa57a20",e:1,t:"De treize à vingt",note:"Une règle te fait gagner du temps. De treize à dix-neuf, on colle zéng à la fin du chiffre de base. Dräi devient dräizéng.",i:[
 {id:"lx56f9c389",lb:"dräizéng",fr:"treize",ph:"draï-tsèng",tr:"dräi plus zéng. Trois plus dix.",st:"unverified"},
 {id:"lx51df26fb",lb:"véierzéng",fr:"quatorze",ph:"faï-er-tsèng",tr:"véier plus zéng.",st:"unverified"},
 {id:"lx53b844de",lb:"fofzéng",fr:"quinze",ph:"fof-tsèng",st:"unverified"},
 {id:"lx3bfd8b22",lb:"siechzéng",fr:"seize",ph:"zi-eukh-tsèng",st:"unverified"},
 {id:"lxcfa86fa7",lb:"siwwenzéng",fr:"dix-sept",ph:"zi-veune-tsèng",st:"unverified"},
 {id:"lx7dbc1ded",lb:"uechtzéng",fr:"dix-huit",ph:"ou-eukht-tsèng",st:"unverified"},
 {id:"lx728f4cfb",lb:"nonzéng",fr:"dix-neuf",ph:"non-tsèng",st:"unverified"},
 {id:"lx1eb7ca2f",lb:"zwanzeg",fr:"vingt",ph:"tsvan-tsekh",tr:"zwanzeg commence par zwee. Deux dizaines.",st:"unverified"}]},
{lid:"ls69a0fd",e:1,t:"Les dizaines, cent, mille",note:"Deuxième règle. Les dizaines finissent en zeg. Terminaison zéng, c'est entre treize et dix-neuf. Terminaison zeg, c'est une dizaine. Deux sons très proches, une seule chose à distinguer.",i:[
 {id:"lxfa094abd",lb:"drësseg",fr:"trente",ph:"drè-sekh",st:"unverified"},
 {id:"lx1c0e7bfa",lb:"véierzeg",fr:"quarante",ph:"faï-er-tsekh",st:"unverified"},
 {id:"lx2d54bfa5",lb:"fofzeg",fr:"cinquante",ph:"fof-tsekh",st:"unverified"},
 {id:"lx4eca411e",lb:"sechzeg",fr:"soixante",ph:"zek-tsekh",st:"unverified"},
 {id:"lxa9d7fd1d",lb:"siwwenzeg",fr:"soixante-dix",ph:"zi-veune-tsekh",st:"unverified"},
 {id:"lx47877624",lb:"achtzeg",fr:"quatre-vingts",ph:"akh-tsekh",st:"unverified"},
 {id:"lxfa3cc8d5",lb:"nonzeg",fr:"quatre-vingt-dix",ph:"non-tsekh",st:"unverified"},
 {id:"lx361e3e8c",lb:"honnert",fr:"cent",ph:"ho-nert",tr:"honnert, pense à hundred.",st:"unverified"},
 {id:"lxb223fc81",lb:"dausend",fr:"mille",ph:"daou-zent",tr:"dausend, pense à thousand.",st:"unverified"}]},
{lid:"lscabe07",e:1,t:"Les chiffres dans la vie",note:"Les chiffres seuls ne servent à rien. Il faut les mots qui vont avec.",i:[
 {id:"lx24ad5a3e",lb:"Wéivill?",fr:"combien ?",ph:"vaï-fill",tr:"wéi, comment. vill, beaucoup. Comment beaucoup, donc combien.",st:"unverified"},
 {id:"lx953e2692",lb:"Wat kascht dat?",fr:"combien ça coûte ?",ph:"vat kacht dat",st:"unverified"},
 {id:"lxa77f85b7",lb:"zéng Euro",fr:"dix euros",ph:"tsèng eu-ro",st:"unverified"},
 {id:"lx220eb3b9",lb:"Wéi al bass du?",fr:"quel âge as-tu ?",ph:"vaï al bass dou",tr:"al veut dire vieux. Comment vieux es-tu.",st:"unverified"},
 {id:"lxd95d5dcf",lb:"d'Nummer",fr:"le numéro",ph:"d'nou-mer",st:"unverified"},
 {id:"lxc811ed14",lb:"d'Auer",fr:"l'heure, la montre",ph:"d'aou-er",st:"unverified"},
 {id:"lxd2ecf498",lb:"Wéi spéit ass et?",fr:"quelle heure est-il ?",ph:"vaï chpaït ass ét",tr:"spéit veut dire tard. Comment tard est-il.",st:"unverified"},
 {id:"lxbbb62fb8",lb:"Et ass zéng Auer",fr:"il est dix heures",ph:"ét ass tsèng aou-er",st:"unverified"}]},
{lid:"lsbc6a9f",e:2,t:"Les trois voyelles nouvelles",note:"Trois voyelles n'existent pas en français. Le ë se dit comme le e de je. Le é est un e fermé et long. Le ä est un è ouvert.",i:[
 {id:"lx8ee30f9c",lb:"Lëtzebuerg",fr:"le Luxembourg",ph:"lét-se-bouerkh",st:"unverified"},
 {id:"lx1eb54b30",lb:"fënnef",fr:"cinq",ph:"fè-neuf",st:"unverified"},
 {id:"lxa8911db4",lb:"gëschter",fr:"hier",ph:"guèch-ter",st:"unverified"},
 {id:"lx5dab9888",lb:"schéin",fr:"beau",ph:"chaïn",st:"unverified"},
 {id:"lx9bc09d51",lb:"méi",fr:"plus",ph:"maï",st:"unverified"},
 {id:"lxad894f42",lb:"spéit",fr:"tard",ph:"chpaït",st:"unverified"},
 {id:"lxfdc7a946",lb:"gär",fr:"volontiers",ph:"guèr",st:"unverified"},
 {id:"lx2a9c27bf",lb:"wäit",fr:"loin",ph:"vaït",st:"unverified"}]},
{lid:"ls69a76b",e:2,t:"Les lettres qui trompent",note:"Sept lettres ne se lisent pas comme en français. Le w se dit v. Le v se dit f. Le z se dit ts. Le s en début de mot se dit z. Le j se dit y. Le sch se dit ch. Le ch se dit au fond de la gorge, comme le kh de l'arabe.",i:[
 {id:"lxd2cb249e",lb:"Waasser",fr:"l'eau, le w se dit v",ph:"va-ser",tr:"Waasser, pense à water.",st:"unverified"},
 {id:"lx906c0642",lb:"vill",fr:"beaucoup, le v se dit f",ph:"fill",st:"unverified"},
 {id:"lx4d0e3cbe",lb:"zwee",fr:"deux, le z se dit ts",ph:"tsvé",st:"unverified"},
 {id:"lxabb902f7",lb:"Sonn",fr:"le soleil, le s se dit z",ph:"zonn",tr:"Sonn, pense à sun.",st:"unverified"},
 {id:"lxbd73d357",lb:"jo",fr:"oui, le j se dit y",ph:"yo",tr:"jo se dit yo. Yo, c'est oui.",st:"unverified"},
 {id:"lx3943cbc0",lb:"Schoul",fr:"l'école, sch se dit ch",ph:"choul",tr:"Schoul, pense à school.",st:"unverified"},
 {id:"lx880b52a8",lb:"ech",fr:"je, ch au fond de la gorge",ph:"èkh",tr:"le son final est le kh de l'arabe.",st:"unverified"},
 {id:"lx2b4e2182",lb:"Haus",fr:"la maison, au se dit ao",ph:"haous",tr:"Haus, pense à house.",st:"unverified"}]},
{lid:"lsa2a539",e:2,t:"L'alphabet, de A à M",note:"Tu auras besoin d'épeler ton nom au téléphone, à la banque, à la commune. La lettre, puis un mot qui commence par elle.",i:[
 {id:"lx0d612c12",lb:"Auto",fr:"A comme Auto",ph:"aou-to",st:"unverified"},
 {id:"lx6799b6b4",lb:"Buch",fr:"B comme Buch, le livre",ph:"boukh",st:"unverified"},
 {id:"lxc60266a8",lb:"Computer",fr:"C comme Computer",ph:"kom-piou-ter",st:"unverified"},
 {id:"lxe134adc5",lb:"Dag",fr:"D comme Dag, le jour",ph:"dakh",st:"unverified"},
 {id:"lx1f444844",lb:"Ee",fr:"E comme Ee, l'oeuf",ph:"é",st:"unverified"},
 {id:"lx295be004",lb:"Fra",fr:"F comme Fra, la femme",ph:"fra",st:"unverified"},
 {id:"lxe158e925",lb:"gutt",fr:"G comme gutt, bien",ph:"gout",tr:"gutt, pense à good.",st:"unverified"},
 {id:"lx2b4e2182",lb:"Haus",fr:"H comme Haus, la maison",ph:"haous",st:"unverified"},
 {id:"lx6f901581",lb:"Iessen",fr:"I comme Iessen, manger",ph:"i-eu-seune",st:"unverified"},
 {id:"lx14febe36",lb:"Jong",fr:"J comme Jong, le garçon",ph:"yong",st:"unverified"},
 {id:"lx5da1ba24",lb:"Kand",fr:"K comme Kand, l'enfant",ph:"kant",tr:"Kand, pense à kid.",st:"unverified"},
 {id:"lx3d3b60b2",lb:"Land",fr:"L comme Land, le pays",ph:"lant",st:"unverified"},
 {id:"lx85171451",lb:"Mamm",fr:"M comme Mamm, la mère",ph:"mamm",st:"unverified"}]},
{lid:"ls367e0b",e:2,t:"L'alphabet, de N à Z",note:"La suite. Le q, le x et le y sont rares. Le ä, le ë et le é sont des lettres à part entière, pas des accents décoratifs.",i:[
 {id:"lx4c08b0b7",lb:"Nuecht",fr:"N comme Nuecht, la nuit",ph:"nou-eukht",st:"unverified"},
 {id:"lxb3fc0e1a",lb:"Owend",fr:"O comme Owend, le soir",ph:"o-vent",st:"unverified"},
 {id:"lx0c20a48c",lb:"Papp",fr:"P comme Papp, le père",ph:"papp",st:"unverified"},
 {id:"lxd501d3ec",lb:"Quiz",fr:"Q comme Quiz",ph:"kviss",st:"unverified"},
 {id:"lx14205d78",lb:"Rees",fr:"R comme Rees, le voyage",ph:"réss",st:"unverified"},
 {id:"lx6e0b66b5",lb:"Stad",fr:"S comme Stad, la ville",ph:"chtat",st:"unverified"},
 {id:"lxe4edfacb",lb:"Telefon",fr:"T comme Telefon",ph:"té-lé-fon",st:"unverified"},
 {id:"lx1a7fe58c",lb:"Auer",fr:"U comme Auer, l'heure",ph:"aou-er",st:"unverified"},
 {id:"lx7c342114",lb:"Vugel",fr:"V comme Vugel, l'oiseau",ph:"fou-guel",st:"unverified"},
 {id:"lx8763f04e",lb:"Wieder",fr:"W comme Wieder, le temps",ph:"vi-der",st:"unverified"},
 {id:"lx7beb6f3f",lb:"Zäit",fr:"Z comme Zäit, le temps qui passe",ph:"tsaït",st:"unverified"},
 {id:"lx012b9f4a",lb:"Äppel",fr:"A tréma comme Äppel, les pommes",ph:"è-pel",tr:"Äppel, pense à apple.",st:"unverified"}]},
{lid:"lsa59fdb",e:3,t:"Dire bonjour",note:"Moien est le mot que tu diras cent fois par jour. Du matin au soir, au collègue comme au directeur. Un seul mot pour tout le monde.",i:[
 {id:"lx3657a808",lb:"Moien",fr:"bonjour, salut",ph:"mo-ï-eune",tr:"Moien contient moi. Moi j'arrive, je dis Moien.",st:"unverified"},
 {id:"lx52ccfdbd",lb:"Gudde Moien",fr:"bonjour, le matin",ph:"goud-de mo-ï-eune",st:"unverified"},
 {id:"lxb4d93a19",lb:"Gudden Owend",fr:"bonsoir",ph:"goud-den o-vent",st:"unverified"},
 {id:"lxe0db9f02",lb:"Gutt Nuecht",fr:"bonne nuit",ph:"gout nou-eukht",st:"unverified"},
 {id:"lx8313d08a",lb:"Äddi",fr:"au revoir",ph:"è-di",tr:"Äddi, comme adieu raccourci.",st:"unverified"},
 {id:"lx890519c9",lb:"Bis geschwënn",fr:"à bientôt",ph:"biss gue-chvenn",st:"unverified"},
 {id:"lxc0ac3849",lb:"Bis muer",fr:"à demain",ph:"biss moue-er",st:"unverified"}]},
{lid:"lse44a17",e:3,t:"Merci, s'il vous plaît",note:"Wann ech gelift veut dire s'il vous plaît. Mot à mot : si cela me plaît. Apprends-le comme un seul bloc.",i:[
 {id:"lx9f98291e",lb:"Merci",fr:"merci",ph:"mèr-si",tr:"identique au français. Un cadeau.",st:"unverified"},
 {id:"lxdfd18d59",lb:"Villmools merci",fr:"merci beaucoup",ph:"fill-mols mèr-si",st:"unverified"},
 {id:"lx487f8ee4",lb:"Wann ech gelift",fr:"s'il vous plaît",ph:"van èkh gue-lift",tr:"mot à mot, quand cela me plaît.",st:"unverified"},
 {id:"lx5a1f15d4",lb:"Entschëllegt",fr:"excusez-moi",ph:"ènt-chè-lekht",st:"unverified"},
 {id:"lx457999c0",lb:"Kee Problem",fr:"pas de problème",ph:"ké pro-blém",st:"unverified"},
 {id:"lxa1deed7f",lb:"Gär geschitt",fr:"je vous en prie",ph:"guèr gue-chitt",st:"unverified"}]},
{lid:"ls58e38a",e:3,t:"Oui, non, peut-être",note:"Attention à ton oreille. Nee ressemble à un é allongé, pas à un non français. Beaucoup de débutants entendent oui quand on leur dit non.",i:[
 {id:"lxbd73d357",lb:"Jo",fr:"oui",ph:"yo",st:"unverified"},
 {id:"lx1a7150a0",lb:"Nee",fr:"non",ph:"né",tr:"Nee, un é long. Pense à négatif.",st:"unverified"},
 {id:"lx1ca5eb98",lb:"Vläicht",fr:"peut-être",ph:"flaïkht",st:"unverified"},
 {id:"lx75f595fa",lb:"Sécher",fr:"bien sûr",ph:"zé-kher",tr:"Sécher, pense à sûr.",st:"unverified"},
 {id:"lxa6d83e36",lb:"E bëssen",fr:"un peu",ph:"e bè-seune",st:"unverified"},
 {id:"lxf7f49581",lb:"Ganz",fr:"très, tout à fait",ph:"gants",st:"unverified"},
 {id:"lx7e879b0a",lb:"Guer net",fr:"pas du tout",ph:"gouer nét",st:"unverified"}]},
{lid:"ls658078",e:3,t:"Dire qui tu es",note:"Ech veut dire je. C'est le mot le plus utile de la langue. Le verbe se place juste après.",i:[
 {id:"lx983ba2bf",lb:"Ech heeschen …",fr:"je m'appelle …",ph:"èkh hé-cheune",st:"unverified"},
 {id:"lx098d7ddf",lb:"Wéi heeschs du?",fr:"comment tu t'appelles ?",ph:"vaï héchs dou",st:"unverified"},
 {id:"lxa11021a8",lb:"Wéi heescht Dir?",fr:"comment vous appelez-vous ?",ph:"vaï héchst dir",st:"unverified"},
 {id:"lx06eb715b",lb:"Ech kommen aus Frankräich",fr:"je viens de France",ph:"èkh ko-meune aous frank-raïkh",st:"unverified"},
 {id:"lxcac494ba",lb:"Ech wunnen zu …",fr:"j'habite à …",ph:"èkh vou-neune tsou",st:"unverified"},
 {id:"lx39e26013",lb:"Ech schaffen zu Lëtzebuerg",fr:"je travaille au Luxembourg",ph:"èkh cha-feune tsou",st:"unverified"},
 {id:"lxae5583eb",lb:"Ech léieren Lëtzebuergesch",fr:"j'apprends le luxembourgeois",ph:"èkh laï-eureune",st:"unverified"}]},
{lid:"lsabceaf",e:3,t:"Comment ça va",note:"Wéi geet et, mot à mot : comment va cela. Personne ne dit je vais bien avec le mot je. On dit et geet mir gutt, cela va bien à moi.",i:[
 {id:"lx3bd3ab61",lb:"Wéi geet et?",fr:"comment ça va ?",ph:"vaï guét ét",tr:"geet ressemble à goes. Comment ça goes.",st:"unverified"},
 {id:"lx41a44911",lb:"Et geet mir gutt",fr:"je vais bien",ph:"ét guét mir gout",st:"unverified"},
 {id:"lx4f6515fa",lb:"Ganz gutt, merci",fr:"très bien, merci",ph:"gants gout mèr-si",st:"unverified"},
 {id:"lx129a847b",lb:"An dir?",fr:"et vous ?",ph:"ann dir",st:"unverified"},
 {id:"lxcfbab444",lb:"Net esou gutt",fr:"pas très bien",ph:"nét é-zo gout",st:"unverified"},
 {id:"lxd4a59311",lb:"Ech si midd",fr:"je suis fatigué",ph:"èkh si mit",st:"unverified"}]},
{lid:"ls66d169",e:3,t:"Quand tu ne comprends pas",note:"Cette leçon vaut plus que toutes les autres. Tant que tu peux dire que tu ne comprends pas et demander de répéter, tu restes dans la conversation.",i:[
 {id:"lx0354a22a",lb:"Ech verstinn net",fr:"je ne comprends pas",ph:"èkh fèr-chtinn nét",tr:"net à la fin, c'est la négation. Comme not.",st:"unverified"},
 {id:"lx15918030",lb:"Ech weess net",fr:"je ne sais pas",ph:"èkh véss nét",st:"unverified"},
 {id:"lx1e42a8b0",lb:"Méi lues, wann ech gelift",fr:"plus lentement, s'il vous plaît",ph:"maï lou-ess",st:"unverified"},
 {id:"lxaf353b6a",lb:"Kënnt Dir dat widderhuelen?",fr:"pouvez-vous répéter ?",ph:"kennt dir dat vi-der-hou-leune",st:"unverified"},
 {id:"lx8f842437",lb:"Wat heescht dat?",fr:"qu'est-ce que ça veut dire ?",ph:"vat héchst dat",st:"unverified"},
 {id:"lxd22a9ae4",lb:"Schwätzt Dir Franséisch?",fr:"parlez-vous français ?",ph:"chvètst dir fran-zaïch",st:"unverified"}]},
{lid:"ls52cf72",e:4,t:"Les verbes avec ech",note:"Avec ech, le verbe se termine presque toujours par en. Apprends d'abord cette forme, c'est celle que tu utiliseras le plus.",i:[
 {id:"lx70f92ac7",lb:"ech sinn",fr:"je suis",ph:"èkh zinn",st:"unverified"},
 {id:"lx48c14b07",lb:"ech hunn",fr:"j'ai",ph:"èkh hounn",st:"unverified"},
 {id:"lx324d9210",lb:"ech goen",fr:"je vais",ph:"èkh gô-eune",tr:"goen, pense à go.",st:"unverified"},
 {id:"lx0233ebbf",lb:"ech kommen",fr:"je viens",ph:"èkh ko-meune",tr:"kommen, pense à come.",st:"unverified"},
 {id:"lx6774e060",lb:"ech schaffen",fr:"je travaille",ph:"èkh cha-feune",st:"unverified"},
 {id:"lx5a0a45eb",lb:"ech schwätzen",fr:"je parle",ph:"èkh chvèt-seune",st:"unverified"},
 {id:"lx12009a42",lb:"ech verstinn",fr:"je comprends",ph:"èkh fèr-chtinn",st:"unverified"},
 {id:"lx82e1cac1",lb:"ech maachen",fr:"je fais",ph:"èkh ma-kheune",tr:"maachen, pense à make.",st:"unverified"},
 {id:"lxd6fde8d0",lb:"ech gesinn",fr:"je vois",ph:"èkh gue-zinn",st:"unverified"},
 {id:"lxde78bc0d",lb:"ech héieren",fr:"j'entends",ph:"èkh haï-eureune",tr:"héieren, pense à hear.",st:"unverified"}]},
{lid:"lsc6549d",e:4,t:"Tu, il, elle",note:"Avec du, le verbe prend un s. Avec hien ou si, il prend un t.",i:[
 {id:"lxa1edaa04",lb:"du schaffs",fr:"tu travailles",ph:"dou chafs",st:"unverified"},
 {id:"lx16724518",lb:"hie schafft",fr:"il travaille",ph:"hi chafft",st:"unverified"},
 {id:"lx4e4af1a3",lb:"si schafft",fr:"elle travaille",ph:"zi chafft",st:"unverified"},
 {id:"lxceb66548",lb:"du bass",fr:"tu es",ph:"dou bass",st:"unverified"},
 {id:"lxae102626",lb:"hien ass",fr:"il est",ph:"hi-eune ass",st:"unverified"},
 {id:"lx487125ef",lb:"du hues",fr:"tu as",ph:"dou hou-ess",st:"unverified"},
 {id:"lxecfe81d4",lb:"hien huet",fr:"il a",ph:"hi-eune hou-eut",st:"unverified"}]},
{lid:"ls03886c",e:4,t:"Nous, vous, ils",note:"Avec mir et si, le verbe reprend la forme en en. Avec dir, il prend un t.",i:[
 {id:"lx302ad483",lb:"mir schaffen",fr:"nous travaillons",ph:"mir cha-feune",st:"unverified"},
 {id:"lxf9fdbbfd",lb:"dir schafft",fr:"vous travaillez",ph:"dir chafft",st:"unverified"},
 {id:"lx64beb091",lb:"si schaffen",fr:"ils travaillent",ph:"zi cha-feune",st:"unverified"},
 {id:"lx380c2bc3",lb:"mir sinn",fr:"nous sommes",ph:"mir zinn",st:"unverified"},
 {id:"lx54b17457",lb:"mir hunn",fr:"nous avons",ph:"mir hounn",st:"unverified"},
 {id:"lx4ba91cdd",lb:"Dir sidd",fr:"vous êtes",ph:"dir zitt",st:"unverified"}]},
{lid:"ls83f4c0",e:4,t:"Dire non",note:"Pour nier, on ajoute net après le verbe. Devant un nom, on utilise keen ou keng.",i:[
 {id:"lx450c6b6a",lb:"Ech schaffen net haut",fr:"je ne travaille pas aujourd'hui",ph:"èkh cha-feune nét haout",st:"unverified"},
 {id:"lxa6e39547",lb:"Ech hunn keng Zäit",fr:"je n'ai pas le temps",ph:"èkh hounn kèng tsaït",st:"unverified"},
 {id:"lxc2894f6f",lb:"Dat ass net gutt",fr:"ce n'est pas bon",ph:"dat ass nét gout",st:"unverified"},
 {id:"lxca21e2fc",lb:"Ech kann net",fr:"je ne peux pas",ph:"èkh kann nét",st:"unverified"},
 {id:"lx75275a77",lb:"Nach net",fr:"pas encore",ph:"nakh nét",st:"unverified"},
 {id:"lx4d498f36",lb:"Näischt",fr:"rien",ph:"naïcht",st:"unverified"}]},
{lid:"lsc104d3",e:4,t:"Vouloir, pouvoir, devoir",note:"Attention à l'ordre : le deuxième verbe part à la fin. Ech muss elo goen, je dois maintenant aller. Ce n'est pas l'ordre du français.",i:[
 {id:"lx2c9f4aa4",lb:"ech kann",fr:"je peux",ph:"èkh kann",tr:"kann, pense à can.",st:"unverified"},
 {id:"lx753f5c17",lb:"ech muss",fr:"je dois",ph:"èkh mouss",tr:"muss, pense à must.",st:"unverified"},
 {id:"lx979a4c13",lb:"ech well",fr:"je veux",ph:"èkh vèll",st:"unverified"},
 {id:"lx24528c27",lb:"ech hätt gär",fr:"je voudrais",ph:"èkh hèt guèr",st:"unverified"},
 {id:"lx1ba85a7d",lb:"Ech muss elo goen",fr:"je dois y aller maintenant",ph:"èkh mouss é-lo gô-eune",st:"unverified"},
 {id:"lx224ff805",lb:"Kanns du mir hëllefen?",fr:"peux-tu m'aider ?",ph:"kanns dou mir hè-le-feune",tr:"hëllefen, pense à help.",st:"unverified"}]},
{lid:"ls1cc346",e:4,t:"L'ordre des mots",note:"Règle centrale. Le verbe conjugué occupe toujours la deuxième place. Si tu commences par un mot de temps, le verbe passe devant le sujet.",i:[
 {id:"lxac5d5a62",lb:"Haut schaffen ech",fr:"aujourd'hui, je travaille",ph:"haout cha-feune èkh",st:"unverified"},
 {id:"lxfcff9f2e",lb:"Muer kommen ech",fr:"demain, je viens",ph:"moue-er ko-meune èkh",st:"unverified"},
 {id:"lxb831d0e0",lb:"Elo verstinn ech",fr:"maintenant, je comprends",ph:"é-lo fèr-chtinn èkh",st:"unverified"},
 {id:"lx02cb634d",lb:"Am Auto léieren ech",fr:"dans la voiture, j'apprends",ph:"am aou-to laï-eureune èkh",st:"unverified"},
 {id:"lx122f0494",lb:"Ech schaffen haut",fr:"je travaille aujourd'hui",ph:"èkh cha-feune haout",st:"unverified"}]},
{lid:"lsdf2636",e:4,t:"Le, la, un, une",note:"Le masculin fait de ou den. Le féminin et le neutre font d'. Ne bloque pas là-dessus, un article faux ne t'empêchera jamais d'être compris.",i:[
 {id:"lx4b6417d3",lb:"de Mann",fr:"l'homme",ph:"de mann",st:"unverified"},
 {id:"lx585c1ddc",lb:"d'Fra",fr:"la femme",ph:"d'fra",st:"unverified"},
 {id:"lxeb2ac6e8",lb:"d'Kand",fr:"l'enfant",ph:"d'kant",st:"unverified"},
 {id:"lx395e6e44",lb:"den Auto",fr:"la voiture",ph:"den aou-to",st:"unverified"},
 {id:"lx72200743",lb:"eng Fra",fr:"une femme",ph:"eng fra",st:"unverified"},
 {id:"lx9ac45dfd",lb:"e Mann",fr:"un homme",ph:"e mann",st:"unverified"},
 {id:"lxed9c7fc3",lb:"d'Kanner",fr:"les enfants",ph:"d'ka-ner",st:"unverified"}]},
{lid:"ls51cecb",e:4,t:"Parler du passé",note:"Le passé se forme avec hunn ou sinn, puis le participe à la fin. Pour les déplacements, on utilise sinn. Vérifie les participes sur lod.lu, ils sont irréguliers.",i:[
 {id:"lx20e1ab6f",lb:"Ech hunn geschafft",fr:"j'ai travaillé",ph:"èkh hounn gue-chafft",st:"unverified"},
 {id:"lx97b3b4ea",lb:"Ech hunn geschwat",fr:"j'ai parlé",ph:"èkh hounn gue-chvat",st:"unverified"},
 {id:"lx4da94058",lb:"Ech si gaangen",fr:"je suis allé",ph:"èkh si gang-eune",st:"unverified"},
 {id:"lx1f230b8a",lb:"Ech si komm",fr:"je suis venu",ph:"èkh si komm",st:"unverified"},
 {id:"lx6ab3ffe4",lb:"Gëschter hunn ech geschafft",fr:"hier, j'ai travaillé",ph:"guèch-ter hounn èkh",st:"unverified"}]},
{lid:"lsad4dae",e:5,t:"Les jours et le temps",note:"Les jours se terminent presque tous par deg. Repère cette terminaison, elle t'aidera à reconnaître un jour dans une phrase que tu ne comprends pas.",i:[
 {id:"lx81af183e",lb:"Méindeg",fr:"lundi",ph:"maïn-dekh",tr:"Méindeg, pense à Monday, la lune.",st:"unverified"},
 {id:"lxf4543138",lb:"Dënschdeg",fr:"mardi",ph:"dench-dekh",st:"unverified"},
 {id:"lxc04639e3",lb:"Mëttwoch",fr:"mercredi",ph:"mèt-vokh",tr:"Mëttwoch, le milieu de la semaine.",st:"unverified"},
 {id:"lx533c3a71",lb:"Donneschdeg",fr:"jeudi",ph:"do-nech-dekh",st:"unverified"},
 {id:"lx70107732",lb:"Freideg",fr:"vendredi",ph:"fraï-dekh",tr:"Freideg, pense à Friday.",st:"unverified"},
 {id:"lx71de5223",lb:"Samschdeg",fr:"samedi",ph:"zamch-dekh",st:"unverified"},
 {id:"lx4fc63f09",lb:"Sonndeg",fr:"dimanche",ph:"zon-dekh",tr:"Sonndeg, le jour du soleil, Sonn.",st:"unverified"},
 {id:"lx3f8f7790",lb:"d'Woch",fr:"la semaine",ph:"d'vokh",tr:"Woch, pense à week.",st:"unverified"}]},
{lid:"lsf0a625",e:5,t:"Hier, aujourd'hui, demain",note:"Ces mots te permettent de situer une action sans conjuguer au passé ni au futur. C'est le raccourci du débutant, et c'est du vrai luxembourgeois.",i:[
 {id:"lx46424bd8",lb:"haut",fr:"aujourd'hui",ph:"haout",st:"unverified"},
 {id:"lx18676f74",lb:"muer",fr:"demain",ph:"moue-er",st:"unverified"},
 {id:"lxa8911db4",lb:"gëschter",fr:"hier",ph:"guèch-ter",st:"unverified"},
 {id:"lxcd798c45",lb:"elo",fr:"maintenant",ph:"é-lo",st:"unverified"},
 {id:"lxe016c63a",lb:"spéider",fr:"plus tard",ph:"chpaï-der",st:"unverified"},
 {id:"lx3ce4731c",lb:"de Moien",fr:"le matin",ph:"de mo-ï-eune",st:"unverified"},
 {id:"lx7937c6da",lb:"den Owend",fr:"le soir",ph:"den o-vent",st:"unverified"},
 {id:"lx7a11401a",lb:"de Weekend",fr:"le week-end",ph:"de ouik-end",st:"unverified"}]},
{lid:"ls036872",e:5,t:"Poser une question",note:"Sept mots ouvrent presque toutes les questions et commencent presque tous par W. Quand une phrase démarre par un mot en W, on te pose une question, même si tu ne comprends pas le reste.",i:[
 {id:"lx6da0ea8a",lb:"wien",fr:"qui",ph:"vi-eune",st:"unverified"},
 {id:"lxa3bbe1a8",lb:"wat",fr:"quoi",ph:"vat",tr:"wat, pense à what.",st:"unverified"},
 {id:"lx6054199e",lb:"wou",fr:"où",ph:"vou",tr:"wou, pense à where.",st:"unverified"},
 {id:"lx4ecbb359",lb:"wéini",fr:"quand",ph:"vaï-ni",st:"unverified"},
 {id:"lxd9dc5bb3",lb:"firwat",fr:"pourquoi",ph:"fir-vat",tr:"fir-wat, pour quoi. Comme en français.",st:"unverified"},
 {id:"lxb1378b18",lb:"wéi",fr:"comment",ph:"vaï",st:"unverified"},
 {id:"lx778a68fd",lb:"Wat ass dat?",fr:"qu'est-ce que c'est ?",ph:"vat ass dat",st:"unverified"}]},
{lid:"ls16ecca",e:5,t:"Au café, commander",note:"Ech hätt gär est la formule polie pour commander. Elle marche partout.",i:[
 {id:"lxf8e3f513",lb:"Ech hätt gär e Kaffi",fr:"je voudrais un café",ph:"èkh hèt guèr e ka-fi",st:"unverified"},
 {id:"lxdffc232d",lb:"E Waasser, wann ech gelift",fr:"une eau, s'il vous plaît",ph:"e va-ser",st:"unverified"},
 {id:"lx3bbcfc00",lb:"D'Rechnung, wann ech gelift",fr:"l'addition, s'il vous plaît",ph:"d'rèkh-noung",st:"unverified"},
 {id:"lx8f5bf8b2",lb:"Ech hunn Honger",fr:"j'ai faim",ph:"èkh hounn hong-er",tr:"Honger, pense à hungry.",st:"unverified"},
 {id:"lxdf6d33bb",lb:"Ech hunn Duuscht",fr:"j'ai soif",ph:"èkh hounn douscht",st:"unverified"},
 {id:"lxa9a47d85",lb:"Dat ass gutt",fr:"c'est bon",ph:"dat ass gout",st:"unverified"}]},
{lid:"lsc1803d",e:5,t:"La route et les transports",note:"Trois mots suffisent pour suivre une indication : lénks, riets, riicht aus. Le reste de la phrase peut t'échapper, ces trois-là portent toute l'information.",i:[
 {id:"lx2fa4117c",lb:"lénks",fr:"à gauche",ph:"lènks",tr:"lénks commence par L, comme left.",st:"unverified"},
 {id:"lx85e28a70",lb:"riets",fr:"à droite",ph:"ri-ets",tr:"riets commence par R, comme right.",st:"unverified"},
 {id:"lx0aad6690",lb:"riicht aus",fr:"tout droit",ph:"riikht aous",st:"unverified"},
 {id:"lx3de1857c",lb:"Wou ass …?",fr:"où est … ?",ph:"vou ass",st:"unverified"},
 {id:"lx546466a6",lb:"d'Strooss",fr:"la rue",ph:"d'chtrôss",tr:"Strooss, pense à street.",st:"unverified"},
 {id:"lxc4135816",lb:"de Stau",fr:"l'embouteillage",ph:"de chtaou",st:"unverified"},
 {id:"lx801c34ee",lb:"d'Grenz",fr:"la frontière",ph:"d'grènts",st:"unverified"},
 {id:"lx48c27e30",lb:"den Zuch",fr:"le train",ph:"den tsoukh",st:"unverified"}]},
{lid:"lsdcf6c3",e:5,t:"La maison et la météo",note:"Le temps qu'il fait est le sujet de toutes les conversations de couloir. Trois phrases là-dessus te font entrer dans le groupe plus vite que n'importe quelle règle de grammaire.",i:[
 {id:"lx31476875",lb:"d'Haus",fr:"la maison",ph:"d'haous",st:"unverified"},
 {id:"lx37c6cd89",lb:"doheem",fr:"à la maison",ph:"do-hém",tr:"doheem, pense à home.",st:"unverified"},
 {id:"lxbb63e08b",lb:"d'Wieder",fr:"le temps qu'il fait",ph:"d'vi-der",tr:"Wieder, pense à weather.",st:"unverified"},
 {id:"lx82ead77a",lb:"Et reent",fr:"il pleut",ph:"ét rént",tr:"reent, pense à rain.",st:"unverified"},
 {id:"lxe226448d",lb:"Et ass kal",fr:"il fait froid",ph:"ét ass kal",tr:"kal, pense à cold.",st:"unverified"},
 {id:"lx3d6c9d1a",lb:"Et ass waarm",fr:"il fait chaud",ph:"ét ass varm",tr:"waarm, pense à warm.",st:"unverified"},
 {id:"lx7a5048c8",lb:"D'Sonn schéngt",fr:"le soleil brille",ph:"d'zonn chèngt",st:"unverified"}]},
{lid:"lsd9555c",e:6,t:"Les petits mots qui portent le sens",note:"Voici la vraie clé de ton objectif. Ces mots ne se traduisent pas seuls, mais ils structurent chaque phrase. Quand tu les reconnais, tu devines le reste.",i:[
 {id:"lx3438df5f",lb:"awer",fr:"mais",ph:"a-ver",st:"unverified"},
 {id:"lxbd848328",lb:"well",fr:"parce que",ph:"vèll",st:"unverified"},
 {id:"lx09706c41",lb:"also",fr:"donc, alors",ph:"al-zo",st:"unverified"},
 {id:"lx2cd3eb82",lb:"dann",fr:"alors",ph:"dann",tr:"dann, pense à then.",st:"unverified"},
 {id:"lx29eafa3c",lb:"och",fr:"aussi",ph:"okh",st:"unverified"},
 {id:"lx14442c36",lb:"nëmmen",fr:"seulement",ph:"nè-meune",st:"unverified"},
 {id:"lx1357b70d",lb:"schonn",fr:"déjà",ph:"chonn",st:"unverified"},
 {id:"lx852cb848",lb:"nach",fr:"encore",ph:"nakh",st:"unverified"},
 {id:"lxe9c6b83d",lb:"ëmmer",fr:"toujours",ph:"è-mer",tr:"ëmmer, pense à immersion. Toujours dedans.",st:"unverified"},
 {id:"lx085980c9",lb:"heiansdo",fr:"parfois",ph:"haï-ans-do",st:"unverified"},
 {id:"lxb140cfb8",lb:"zesummen",fr:"ensemble",ph:"tse-zou-meune",st:"unverified"}]},
{lid:"ls8acf49",e:6,t:"Ce que tu entends tous les jours",note:"Des phrases entières, telles qu'elles sortent de la bouche des gens. Ne les découpe pas, apprends-les comme des blocs et tu les reconnaîtras au vol.",i:[
 {id:"lx88fe7c3f",lb:"Wat gëtt et Neies?",fr:"quoi de neuf ?",ph:"vat guétt ét naï-es",st:"unverified"},
 {id:"lx0c8d3ce2",lb:"Ech ginn heem",fr:"je rentre à la maison",ph:"èkh guinn hém",st:"unverified"},
 {id:"lxe57ca2f2",lb:"Dat ass kloer",fr:"c'est clair",ph:"dat ass klou-er",tr:"kloer, pense à clear.",st:"unverified"},
 {id:"lx32c69207",lb:"Alles an der Rei",fr:"tout est en ordre",ph:"a-les an der raï",st:"unverified"},
 {id:"lxe7274a99",lb:"Maach et gutt",fr:"porte-toi bien",ph:"makh ét gout",st:"unverified"},
 {id:"lx3edd3b47",lb:"Ech soen Iech Bescheed",fr:"je vous tiens au courant",ph:"èkh zo-eune i-eukh be-chét",st:"unverified"}]},
{lid:"lsf115dc",e:6,t:"Le travail",note:"Tu passes tes journées au travail. Ce vocabulaire va te servir plus que celui du restaurant. C'est là que se joue ton autonomie réelle.",i:[
 {id:"lx3c881ec2",lb:"d'Aarbecht",fr:"le travail",ph:"d'ar-bekht",st:"unverified"},
 {id:"lx517f9ebe",lb:"de Kolleeg",fr:"le collègue",ph:"de ko-lékh",st:"unverified"},
 {id:"lx704df6d8",lb:"de Chef",fr:"le chef",ph:"de chèf",st:"unverified"},
 {id:"lx4b6c0cb3",lb:"d'Equipe",fr:"l'équipe",ph:"d'é-kip",st:"unverified"},
 {id:"lxd5524d5f",lb:"d'Sitzung",fr:"la réunion",ph:"d'zit-soung",st:"unverified"},
 {id:"lx7d25c075",lb:"Ech si prett",fr:"je suis prêt",ph:"èkh si prèt",st:"unverified"}]},
{lid:"ls8a9f3f",e:6,t:"Les jeunes et les enfants",note:"Ton métier. Ces mots te permettront de comprendre ce qui se dit sur un jeune. Vérifie-les avec soin, ce sont ceux que tu utiliseras devant des professionnels.",i:[
 {id:"lx5d9375c7",lb:"de Jong",fr:"le garçon",ph:"de yong",st:"unverified"},
 {id:"lxf1578950",lb:"d'Meedchen",fr:"la fille",ph:"d'méd-khen",st:"unverified"},
 {id:"lxed9c7fc3",lb:"d'Kanner",fr:"les enfants",ph:"d'ka-ner",st:"unverified"},
 {id:"lx952fba89",lb:"de Jugendlechen",fr:"l'adolescent",ph:"de you-gend-le-khen",st:"unverified"},
 {id:"lx4cd48d1c",lb:"d'Schoul",fr:"l'école",ph:"d'choul",st:"unverified"},
 {id:"lx82248681",lb:"d'Grupp",fr:"le groupe",ph:"d'group",st:"unverified"}]},
{lid:"ls0351ea",e:6,t:"Comment tu te sens",note:"Dire son état est la base du lien humain. Ces mots servent aussi à comprendre ce qu'un jeune te dit de lui.",i:[
 {id:"lxa354616d",lb:"Ech si frou",fr:"je suis content",ph:"èkh si frou",st:"unverified"},
 {id:"lxd4a59311",lb:"Ech si midd",fr:"je suis fatigué",ph:"èkh si mit",st:"unverified"},
 {id:"lx9284f05e",lb:"Ech si rosen",fr:"je suis en colère",ph:"èkh si ro-zeune",st:"unverified"},
 {id:"lxe6347558",lb:"Ech hunn Angscht",fr:"j'ai peur",ph:"èkh hounn angcht",st:"unverified"},
 {id:"lx284f7b02",lb:"Et geet net",fr:"ça ne va pas",ph:"ét guét nét",st:"unverified"},
 {id:"lxd179f9b2",lb:"Ech si krank",fr:"je suis malade",ph:"èkh si krank",st:"unverified"}]},
{lid:"ls818b18",e:6,t:"Au téléphone et au guichet",note:"Le téléphone est l'exercice le plus dur : pas de visage, pas de gestes. Ces phrases te permettent de tenir trente secondes.",i:[
 {id:"lxf5ac7b56",lb:"Moien, hei ass …",fr:"bonjour, ici c'est …",ph:"mo-ï-eune haï ass",st:"unverified"},
 {id:"lxc704c234",lb:"Ee Moment, wann ech gelift",fr:"un instant, s'il vous plaît",ph:"é mo-ment",st:"unverified"},
 {id:"lxbacabb1a",lb:"Ech ruffen zréck",fr:"je rappelle",ph:"èkh rou-feune tsrék",st:"unverified"},
 {id:"lx9b68f182",lb:"Ech hunn e Rendez-vous",fr:"j'ai un rendez-vous",ph:"èkh hounn e ran-dé-vou",st:"unverified"},
 {id:"lx67386338",lb:"Kënnt Dir mir hëllefen?",fr:"pouvez-vous m'aider ?",ph:"kennt dir mir hè-le-feune",st:"unverified"},
 {id:"lx7b029843",lb:"Merci a schéinen Dag",fr:"merci et bonne journée",ph:"mèr-si a chaï-neune dakh",st:"unverified"}]},
];

const DIALOGUES = [
{id:"dga07564",e:3,t:"Se croiser le matin",l:[
 {q:"A",lb:"Moien! Wéi geet et?",fr:"Bonjour ! Comment ça va ?"},
 {q:"B",lb:"Et geet mir gutt, merci. An dir?",fr:"Je vais bien, merci. Et vous ?"},
 {q:"A",lb:"Ganz gutt, merci.",fr:"Très bien, merci."}]},
{id:"dg9de8ea",e:3,t:"Se présenter",l:[
 {q:"A",lb:"Moien. Wéi heeschs du?",fr:"Bonjour. Comment tu t'appelles ?"},
 {q:"B",lb:"Ech heeschen Fouad. An du?",fr:"Je m'appelle Fouad. Et toi ?"},
 {q:"A",lb:"Ech kommen aus Frankräich. Ech schaffen zu Lëtzebuerg.",fr:"Je viens de France. Je travaille au Luxembourg."}]},
{id:"dgc01597",e:3,t:"Quand tu ne suis plus",l:[
 {q:"A",lb:"Schwätzt Dir Lëtzebuergesch?",fr:"Parlez-vous luxembourgeois ?"},
 {q:"B",lb:"E bëssen. Ech léieren Lëtzebuergesch.",fr:"Un peu. J'apprends le luxembourgeois."},
 {q:"A",lb:"Kee Problem.",fr:"Pas de problème."},
 {q:"B",lb:"Méi lues, wann ech gelift.",fr:"Plus lentement, s'il vous plaît."}]},
{id:"dg49fbd1",e:5,t:"Au café",l:[
 {q:"A",lb:"Moien. Ech hätt gär e Kaffi.",fr:"Bonjour. Je voudrais un café."},
 {q:"B",lb:"Jo. Nach eppes?",fr:"Oui. Autre chose ?"},
 {q:"A",lb:"E Waasser, wann ech gelift. Wat kascht dat?",fr:"Une eau, s'il vous plaît. Combien ça coûte ?"},
 {q:"B",lb:"Zéng Euro.",fr:"Dix euros."}]},
{id:"dg7472d6",e:5,t:"Demander son chemin",l:[
 {q:"A",lb:"Entschëllegt. Wou ass d'Gare?",fr:"Excusez-moi. Où est la gare ?"},
 {q:"B",lb:"Riicht aus, dann lénks.",fr:"Tout droit, puis à gauche."},
 {q:"A",lb:"Ass et wäit?",fr:"C'est loin ?"},
 {q:"B",lb:"Nee, net wäit. Villmools merci.",fr:"Non, pas loin. Merci beaucoup."}]},
{id:"dge58f8e",e:5,t:"L'heure et le départ",l:[
 {q:"A",lb:"Wéi spéit ass et?",fr:"Quelle heure est-il ?"},
 {q:"B",lb:"Et ass zéng Auer.",fr:"Il est dix heures."},
 {q:"A",lb:"Merci. Ech muss elo goen.",fr:"Merci. Je dois y aller maintenant."},
 {q:"B",lb:"Äddi, bis muer.",fr:"Au revoir, à demain."}]},
{id:"dgbe3f22",e:5,t:"Le temps qu'il fait",l:[
 {q:"A",lb:"Et reent haut.",fr:"Il pleut aujourd'hui."},
 {q:"B",lb:"Jo, an et ass kal.",fr:"Oui, et il fait froid."},
 {q:"A",lb:"Muer ass et waarm.",fr:"Demain il fait chaud."},
 {q:"B",lb:"Dat ass gutt.",fr:"C'est bien."}]},
{id:"dga55bed",e:6,t:"Entre collègues",l:[
 {q:"A",lb:"Wat gëtt et Neies?",fr:"Quoi de neuf ?"},
 {q:"B",lb:"Näischt. Ech si midd.",fr:"Rien. Je suis fatigué."},
 {q:"A",lb:"Firwat?",fr:"Pourquoi ?"},
 {q:"B",lb:"Ech hunn haut vill geschafft.",fr:"J'ai beaucoup travaillé aujourd'hui."}]},
{id:"dge19c6b",e:6,t:"Demander de l'aide",l:[
 {q:"A",lb:"Kanns du mir hëllefen?",fr:"Peux-tu m'aider ?"},
 {q:"B",lb:"Jo, sécher.",fr:"Oui, bien sûr."},
 {q:"A",lb:"Villmools merci.",fr:"Merci beaucoup."},
 {q:"B",lb:"Gär geschitt.",fr:"Je vous en prie."}]},
{id:"dgc966fb",e:6,t:"Fin de journée",l:[
 {q:"A",lb:"Ech ginn heem.",fr:"Je rentre à la maison."},
 {q:"B",lb:"Schéine Weekend!",fr:"Bon week-end !"},
 {q:"A",lb:"Merci, a schéinen Dag.",fr:"Merci, et bonne journée."},
 {q:"B",lb:"Bis d'nächst Woch. Äddi.",fr:"À la semaine prochaine. Au revoir."}]},
];

const BLOCS = [
  {
    "h": "1 à 10",
    "t": "Les chiffres",
    "d": "Comprendre un chiffre, un prix, une heure dits à vitesse normale."
  },
  {
    "h": "11 à 20",
    "t": "Les lettres et les sons",
    "d": "Prononcer ë, é, ä. Lire un mot inconnu à voix haute. Épeler ton nom."
  },
  {
    "h": "21 à 35",
    "t": "Les premiers mots",
    "d": "Saluer, te présenter, dire que tu ne comprends pas."
  },
  {
    "h": "36 à 55",
    "t": "Les premières phrases",
    "d": "Conjuguer au présent, nier, placer le verbe au bon endroit."
  },
  {
    "h": "56 à 75",
    "t": "Le quotidien",
    "d": "Commander, demander son chemin, parler des jours et du temps qu'il fait."
  },
  {
    "h": "76 à 100",
    "t": "Comprendre autour de toi",
    "d": "Suivre une conversation entre collègues sans y participer."
  }
];

window.LETZ_CONTENT = { ETAPES, COURS, DIALOGUES, BLOCS, contentVersion: "5.0.0" };

/* Table de migration des anciennes clés "leçon-item" vers les identifiants
   permanents. Générée avec le contenu. Ne pas modifier à la main. */
window.LETZ_LEGACY_MAP = {"0-0":"lx2be88ca4","0-1":"lx3772901e","0-2":"lx4d0e3cbe","0-3":"lxa4055e4a","0-4":"lx0980347d","0-5":"lx1eb54b30","1-0":"lx4dea3e5f","1-1":"lxebdf30c6","1-2":"lxdaa8097b","1-3":"lx5a40fe91","1-4":"lxee2503dd","1-5":"lx9c59399c","1-6":"lx1a783da4","2-0":"lx56f9c389","2-1":"lx51df26fb","2-2":"lx53b844de","2-3":"lx3bfd8b22","2-4":"lxcfa86fa7","2-5":"lx7dbc1ded","2-6":"lx728f4cfb","2-7":"lx1eb7ca2f","3-0":"lxfa094abd","3-1":"lx1c0e7bfa","3-2":"lx2d54bfa5","3-3":"lx4eca411e","3-4":"lxa9d7fd1d","3-5":"lx47877624","3-6":"lxfa3cc8d5","3-7":"lx361e3e8c","3-8":"lxb223fc81","4-0":"lx24ad5a3e","4-1":"lx953e2692","4-2":"lxa77f85b7","4-3":"lx220eb3b9","4-4":"lxd95d5dcf","4-5":"lxc811ed14","4-6":"lxd2ecf498","4-7":"lxbbb62fb8","5-0":"lx8ee30f9c","5-1":"lx1eb54b30","5-2":"lxa8911db4","5-3":"lx5dab9888","5-4":"lx9bc09d51","5-5":"lxad894f42","5-6":"lxfdc7a946","5-7":"lx2a9c27bf","6-0":"lxd2cb249e","6-1":"lx906c0642","6-2":"lx4d0e3cbe","6-3":"lxabb902f7","6-4":"lxbd73d357","6-5":"lx3943cbc0","6-6":"lx880b52a8","6-7":"lx2b4e2182","7-0":"lx0d612c12","7-1":"lx6799b6b4","7-2":"lxc60266a8","7-3":"lxe134adc5","7-4":"lx1f444844","7-5":"lx295be004","7-6":"lxe158e925","7-7":"lx2b4e2182","7-8":"lx6f901581","7-9":"lx14febe36","7-10":"lx5da1ba24","7-11":"lx3d3b60b2","7-12":"lx85171451","8-0":"lx4c08b0b7","8-1":"lxb3fc0e1a","8-2":"lx0c20a48c","8-3":"lxd501d3ec","8-4":"lx14205d78","8-5":"lx6e0b66b5","8-6":"lxe4edfacb","8-7":"lx1a7fe58c","8-8":"lx7c342114","8-9":"lx8763f04e","8-10":"lx7beb6f3f","8-11":"lx012b9f4a","9-0":"lx3657a808","9-1":"lx52ccfdbd","9-2":"lxb4d93a19","9-3":"lxe0db9f02","9-4":"lx8313d08a","9-5":"lx890519c9","9-6":"lxc0ac3849","10-0":"lx9f98291e","10-1":"lxdfd18d59","10-2":"lx487f8ee4","10-3":"lx5a1f15d4","10-4":"lx457999c0","10-5":"lxa1deed7f","11-0":"lxbd73d357","11-1":"lx1a7150a0","11-2":"lx1ca5eb98","11-3":"lx75f595fa","11-4":"lxa6d83e36","11-5":"lxf7f49581","11-6":"lx7e879b0a","12-0":"lx983ba2bf","12-1":"lx098d7ddf","12-2":"lxa11021a8","12-3":"lx06eb715b","12-4":"lxcac494ba","12-5":"lx39e26013","12-6":"lxae5583eb","13-0":"lx3bd3ab61","13-1":"lx41a44911","13-2":"lx4f6515fa","13-3":"lx129a847b","13-4":"lxcfbab444","13-5":"lxd4a59311","14-0":"lx0354a22a","14-1":"lx15918030","14-2":"lx1e42a8b0","14-3":"lxaf353b6a","14-4":"lx8f842437","14-5":"lxd22a9ae4","15-0":"lx70f92ac7","15-1":"lx48c14b07","15-2":"lx324d9210","15-3":"lx0233ebbf","15-4":"lx6774e060","15-5":"lx5a0a45eb","15-6":"lx12009a42","15-7":"lx82e1cac1","15-8":"lxd6fde8d0","15-9":"lxde78bc0d","16-0":"lxa1edaa04","16-1":"lx16724518","16-2":"lx4e4af1a3","16-3":"lxceb66548","16-4":"lxae102626","16-5":"lx487125ef","16-6":"lxecfe81d4","17-0":"lx302ad483","17-1":"lxf9fdbbfd","17-2":"lx64beb091","17-3":"lx380c2bc3","17-4":"lx54b17457","17-5":"lx4ba91cdd","18-0":"lx450c6b6a","18-1":"lxa6e39547","18-2":"lxc2894f6f","18-3":"lxca21e2fc","18-4":"lx75275a77","18-5":"lx4d498f36","19-0":"lx2c9f4aa4","19-1":"lx753f5c17","19-2":"lx979a4c13","19-3":"lx24528c27","19-4":"lx1ba85a7d","19-5":"lx224ff805","20-0":"lxac5d5a62","20-1":"lxfcff9f2e","20-2":"lxb831d0e0","20-3":"lx02cb634d","20-4":"lx122f0494","21-0":"lx4b6417d3","21-1":"lx585c1ddc","21-2":"lxeb2ac6e8","21-3":"lx395e6e44","21-4":"lx72200743","21-5":"lx9ac45dfd","21-6":"lxed9c7fc3","22-0":"lx20e1ab6f","22-1":"lx97b3b4ea","22-2":"lx4da94058","22-3":"lx1f230b8a","22-4":"lx6ab3ffe4","23-0":"lx81af183e","23-1":"lxf4543138","23-2":"lxc04639e3","23-3":"lx533c3a71","23-4":"lx70107732","23-5":"lx71de5223","23-6":"lx4fc63f09","23-7":"lx3f8f7790","24-0":"lx46424bd8","24-1":"lx18676f74","24-2":"lxa8911db4","24-3":"lxcd798c45","24-4":"lxe016c63a","24-5":"lx3ce4731c","24-6":"lx7937c6da","24-7":"lx7a11401a","25-0":"lx6da0ea8a","25-1":"lxa3bbe1a8","25-2":"lx6054199e","25-3":"lx4ecbb359","25-4":"lxd9dc5bb3","25-5":"lxb1378b18","25-6":"lx778a68fd","26-0":"lxf8e3f513","26-1":"lxdffc232d","26-2":"lx3bbcfc00","26-3":"lx8f5bf8b2","26-4":"lxdf6d33bb","26-5":"lxa9a47d85","27-0":"lx2fa4117c","27-1":"lx85e28a70","27-2":"lx0aad6690","27-3":"lx3de1857c","27-4":"lx546466a6","27-5":"lxc4135816","27-6":"lx801c34ee","27-7":"lx48c27e30","28-0":"lx31476875","28-1":"lx37c6cd89","28-2":"lxbb63e08b","28-3":"lx82ead77a","28-4":"lxe226448d","28-5":"lx3d6c9d1a","28-6":"lx7a5048c8","29-0":"lx3438df5f","29-1":"lxbd848328","29-2":"lx09706c41","29-3":"lx2cd3eb82","29-4":"lx29eafa3c","29-5":"lx14442c36","29-6":"lx1357b70d","29-7":"lx852cb848","29-8":"lxe9c6b83d","29-9":"lx085980c9","29-10":"lxb140cfb8","30-0":"lx88fe7c3f","30-1":"lx0c8d3ce2","30-2":"lxe57ca2f2","30-3":"lx32c69207","30-4":"lxe7274a99","30-5":"lx3edd3b47","31-0":"lx3c881ec2","31-1":"lx517f9ebe","31-2":"lx704df6d8","31-3":"lx4b6c0cb3","31-4":"lxd5524d5f","31-5":"lx7d25c075","32-0":"lx5d9375c7","32-1":"lxf1578950","32-2":"lxed9c7fc3","32-3":"lx952fba89","32-4":"lx4cd48d1c","32-5":"lx82248681","33-0":"lxa354616d","33-1":"lxd4a59311","33-2":"lx9284f05e","33-3":"lxe6347558","33-4":"lx284f7b02","33-5":"lxd179f9b2","34-0":"lxf5ac7b56","34-1":"lxc704c234","34-2":"lxbacabb1a","34-3":"lx9b68f182","34-4":"lx67386338","34-5":"lx7b029843"};
