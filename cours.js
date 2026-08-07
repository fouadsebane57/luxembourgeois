/* =====================================================================
   COURS DE LUXEMBOURGEOIS — DONNÉES
   Tout ce fichier doit être vérifié sur lod.lu, le dictionnaire officiel
   du Zenter fir d'Lëtzebuerger Sprooch. Les champs :
     lb = luxembourgeois   fr = français   ph = prononciation approchée
     tr = astuce de mémoire (aide, PAS une règle de langue)
   Pour modifier le cours, tu n'as qu'à éditer ce fichier.
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
/* ---------- ÉTAPE 1 · LES CHIFFRES ---------- */
{e:1,t:"De zéro à cinq",note:"On commence par le plus simple. Six mots, rien d'autre aujourd'hui.",i:[
 {lb:"null",fr:"zéro",ph:"noul",tr:"null, comme nul. Zéro, c'est nul."},
 {lb:"eent",fr:"un",ph:"ént",tr:"eent, une seule entité."},
 {lb:"zwee",fr:"deux",ph:"tsvé",tr:"zwee finit par deux e collés."},
 {lb:"dräi",fr:"trois",ph:"draï",tr:"dräi, les deux points du tréma plus le i, trois signes."},
 {lb:"véier",fr:"quatre",ph:"faï-er",tr:"véier se dit faï-er, comme fire. Quatre bougies."},
 {lb:"fënnef",fr:"cinq",ph:"fè-neuf",tr:"fënnef commence par F, comme five. Cinq doigts."}]},
{e:1,t:"De six à douze",note:"Sept mots de plus. Le s du début se prononce z. C'est une règle générale, tu la retrouveras partout.",i:[
 {lb:"sechs",fr:"six",ph:"zeks",tr:"sechs se dit zeks, six avec un z devant."},
 {lb:"siwen",fr:"sept",ph:"zi-veune",tr:"siwen, pense à seven avec un z."},
 {lb:"aacht",fr:"huit",ph:"akht",tr:"aacht, pense à eight. Le t final est dans les deux."},
 {lb:"néng",fr:"neuf",ph:"nèng",tr:"néng, un n au début, comme neuf et nine."},
 {lb:"zéng",fr:"dix",ph:"tsèng",tr:"zéng, dix c'est zen."},
 {lb:"eelef",fr:"onze",ph:"é-leuf",tr:"eelef, pense à eleven."},
 {lb:"zwielef",fr:"douze",ph:"tsvi-leuf",tr:"zwielef commence comme zwee."}]},
{e:1,t:"De treize à vingt",note:"Une règle te fait gagner du temps. De treize à dix-neuf, on colle zéng à la fin du chiffre de base. Dräi devient dräizéng.",i:[
 {lb:"dräizéng",fr:"treize",ph:"draï-tsèng",tr:"dräi plus zéng. Trois plus dix."},
 {lb:"véierzéng",fr:"quatorze",ph:"faï-er-tsèng",tr:"véier plus zéng."},
 {lb:"fofzéng",fr:"quinze",ph:"fof-tsèng"},
 {lb:"siechzéng",fr:"seize",ph:"zi-eukh-tsèng"},
 {lb:"siwwenzéng",fr:"dix-sept",ph:"zi-veune-tsèng"},
 {lb:"uechtzéng",fr:"dix-huit",ph:"ou-eukht-tsèng"},
 {lb:"nonzéng",fr:"dix-neuf",ph:"non-tsèng"},
 {lb:"zwanzeg",fr:"vingt",ph:"tsvan-tsekh",tr:"zwanzeg commence par zwee. Deux dizaines."}]},
{e:1,t:"Les dizaines, cent, mille",note:"Deuxième règle. Les dizaines finissent en zeg. Terminaison zéng, c'est entre treize et dix-neuf. Terminaison zeg, c'est une dizaine. Deux sons très proches, une seule chose à distinguer.",i:[
 {lb:"drësseg",fr:"trente",ph:"drè-sekh"},
 {lb:"véierzeg",fr:"quarante",ph:"faï-er-tsekh"},
 {lb:"fofzeg",fr:"cinquante",ph:"fof-tsekh"},
 {lb:"sechzeg",fr:"soixante",ph:"zek-tsekh"},
 {lb:"siwwenzeg",fr:"soixante-dix",ph:"zi-veune-tsekh"},
 {lb:"achtzeg",fr:"quatre-vingts",ph:"akh-tsekh"},
 {lb:"nonzeg",fr:"quatre-vingt-dix",ph:"non-tsekh"},
 {lb:"honnert",fr:"cent",ph:"ho-nert",tr:"honnert, pense à hundred."},
 {lb:"dausend",fr:"mille",ph:"daou-zent",tr:"dausend, pense à thousand."}]},
{e:1,t:"Les chiffres dans la vie",note:"Les chiffres seuls ne servent à rien. Il faut les mots qui vont avec.",i:[
 {lb:"Wéivill?",fr:"combien ?",ph:"vaï-fill",tr:"wéi, comment. vill, beaucoup. Comment beaucoup, donc combien."},
 {lb:"Wat kascht dat?",fr:"combien ça coûte ?",ph:"vat kacht dat"},
 {lb:"zéng Euro",fr:"dix euros",ph:"tsèng eu-ro"},
 {lb:"Wéi al bass du?",fr:"quel âge as-tu ?",ph:"vaï al bass dou",tr:"al veut dire vieux. Comment vieux es-tu."},
 {lb:"d'Nummer",fr:"le numéro",ph:"d'nou-mer"},
 {lb:"d'Auer",fr:"l'heure, la montre",ph:"d'aou-er"},
 {lb:"Wéi spéit ass et?",fr:"quelle heure est-il ?",ph:"vaï chpaït ass ét",tr:"spéit veut dire tard. Comment tard est-il."},
 {lb:"Et ass zéng Auer",fr:"il est dix heures",ph:"ét ass tsèng aou-er"}]},

/* ---------- ÉTAPE 2 · LES LETTRES ET LES SONS ---------- */
{e:2,t:"Les trois voyelles nouvelles",note:"Trois voyelles n'existent pas en français. Le ë se dit comme le e de je. Le é est un e fermé et long. Le ä est un è ouvert.",i:[
 {lb:"Lëtzebuerg",fr:"le Luxembourg",ph:"lét-se-bouerkh"},
 {lb:"fënnef",fr:"cinq",ph:"fè-neuf"},
 {lb:"gëschter",fr:"hier",ph:"guèch-ter"},
 {lb:"schéin",fr:"beau",ph:"chaïn"},
 {lb:"méi",fr:"plus",ph:"maï"},
 {lb:"spéit",fr:"tard",ph:"chpaït"},
 {lb:"gär",fr:"volontiers",ph:"guèr"},
 {lb:"wäit",fr:"loin",ph:"vaït"}]},
{e:2,t:"Les lettres qui trompent",note:"Sept lettres ne se lisent pas comme en français. Le w se dit v. Le v se dit f. Le z se dit ts. Le s en début de mot se dit z. Le j se dit y. Le sch se dit ch. Le ch se dit au fond de la gorge, comme le kh de l'arabe.",i:[
 {lb:"Waasser",fr:"l'eau, le w se dit v",ph:"va-ser",tr:"Waasser, pense à water."},
 {lb:"vill",fr:"beaucoup, le v se dit f",ph:"fill"},
 {lb:"zwee",fr:"deux, le z se dit ts",ph:"tsvé"},
 {lb:"Sonn",fr:"le soleil, le s se dit z",ph:"zonn",tr:"Sonn, pense à sun."},
 {lb:"jo",fr:"oui, le j se dit y",ph:"yo",tr:"jo se dit yo. Yo, c'est oui."},
 {lb:"Schoul",fr:"l'école, sch se dit ch",ph:"choul",tr:"Schoul, pense à school."},
 {lb:"ech",fr:"je, ch au fond de la gorge",ph:"èkh",tr:"le son final est le kh de l'arabe."},
 {lb:"Haus",fr:"la maison, au se dit ao",ph:"haous",tr:"Haus, pense à house."}]},
{e:2,t:"L'alphabet, de A à M",note:"Tu auras besoin d'épeler ton nom au téléphone, à la banque, à la commune. La lettre, puis un mot qui commence par elle.",i:[
 {lb:"Auto",fr:"A comme Auto",ph:"aou-to"},
 {lb:"Buch",fr:"B comme Buch, le livre",ph:"boukh"},
 {lb:"Computer",fr:"C comme Computer",ph:"kom-piou-ter"},
 {lb:"Dag",fr:"D comme Dag, le jour",ph:"dakh"},
 {lb:"Ee",fr:"E comme Ee, l'oeuf",ph:"é"},
 {lb:"Fra",fr:"F comme Fra, la femme",ph:"fra"},
 {lb:"gutt",fr:"G comme gutt, bien",ph:"gout",tr:"gutt, pense à good."},
 {lb:"Haus",fr:"H comme Haus, la maison",ph:"haous"},
 {lb:"Iessen",fr:"I comme Iessen, manger",ph:"i-eu-seune"},
 {lb:"Jong",fr:"J comme Jong, le garçon",ph:"yong"},
 {lb:"Kand",fr:"K comme Kand, l'enfant",ph:"kant",tr:"Kand, pense à kid."},
 {lb:"Land",fr:"L comme Land, le pays",ph:"lant"},
 {lb:"Mamm",fr:"M comme Mamm, la mère",ph:"mamm"}]},
{e:2,t:"L'alphabet, de N à Z",note:"La suite. Le q, le x et le y sont rares. Le ä, le ë et le é sont des lettres à part entière, pas des accents décoratifs.",i:[
 {lb:"Nuecht",fr:"N comme Nuecht, la nuit",ph:"nou-eukht"},
 {lb:"Owend",fr:"O comme Owend, le soir",ph:"o-vent"},
 {lb:"Papp",fr:"P comme Papp, le père",ph:"papp"},
 {lb:"Quiz",fr:"Q comme Quiz",ph:"kviss"},
 {lb:"Rees",fr:"R comme Rees, le voyage",ph:"réss"},
 {lb:"Stad",fr:"S comme Stad, la ville",ph:"chtat"},
 {lb:"Telefon",fr:"T comme Telefon",ph:"té-lé-fon"},
 {lb:"Auer",fr:"U comme Auer, l'heure",ph:"aou-er"},
 {lb:"Vugel",fr:"V comme Vugel, l'oiseau",ph:"fou-guel"},
 {lb:"Wieder",fr:"W comme Wieder, le temps",ph:"vi-der"},
 {lb:"Zäit",fr:"Z comme Zäit, le temps qui passe",ph:"tsaït"},
 {lb:"Äppel",fr:"A tréma comme Äppel, les pommes",ph:"è-pel",tr:"Äppel, pense à apple."}]},

/* ---------- ÉTAPE 3 · LES PREMIERS MOTS ---------- */
{e:3,t:"Dire bonjour",note:"Moien est le mot que tu diras cent fois par jour. Du matin au soir, au collègue comme au directeur. Un seul mot pour tout le monde.",i:[
 {lb:"Moien",fr:"bonjour, salut",ph:"mo-ï-eune",tr:"Moien contient moi. Moi j'arrive, je dis Moien."},
 {lb:"Gudde Moien",fr:"bonjour, le matin",ph:"goud-de mo-ï-eune"},
 {lb:"Gudden Owend",fr:"bonsoir",ph:"goud-den o-vent"},
 {lb:"Gutt Nuecht",fr:"bonne nuit",ph:"gout nou-eukht"},
 {lb:"Äddi",fr:"au revoir",ph:"è-di",tr:"Äddi, comme adieu raccourci."},
 {lb:"Bis geschwënn",fr:"à bientôt",ph:"biss gue-chvenn"},
 {lb:"Bis muer",fr:"à demain",ph:"biss moue-er"}]},
{e:3,t:"Merci, s'il vous plaît",note:"Wann ech gelift veut dire s'il vous plaît. Mot à mot : si cela me plaît. Apprends-le comme un seul bloc.",i:[
 {lb:"Merci",fr:"merci",ph:"mèr-si",tr:"identique au français. Un cadeau."},
 {lb:"Villmools merci",fr:"merci beaucoup",ph:"fill-mols mèr-si"},
 {lb:"Wann ech gelift",fr:"s'il vous plaît",ph:"van èkh gue-lift",tr:"mot à mot, quand cela me plaît."},
 {lb:"Entschëllegt",fr:"excusez-moi",ph:"ènt-chè-lekht"},
 {lb:"Kee Problem",fr:"pas de problème",ph:"ké pro-blém"},
 {lb:"Gär geschitt",fr:"je vous en prie",ph:"guèr gue-chitt"}]},
{e:3,t:"Oui, non, peut-être",note:"Attention à ton oreille. Nee ressemble à un é allongé, pas à un non français. Beaucoup de débutants entendent oui quand on leur dit non.",i:[
 {lb:"Jo",fr:"oui",ph:"yo"},
 {lb:"Nee",fr:"non",ph:"né",tr:"Nee, un é long. Pense à négatif."},
 {lb:"Vläicht",fr:"peut-être",ph:"flaïkht"},
 {lb:"Sécher",fr:"bien sûr",ph:"zé-kher",tr:"Sécher, pense à sûr."},
 {lb:"E bëssen",fr:"un peu",ph:"e bè-seune"},
 {lb:"Ganz",fr:"très, tout à fait",ph:"gants"},
 {lb:"Guer net",fr:"pas du tout",ph:"gouer nét"}]},
{e:3,t:"Dire qui tu es",note:"Ech veut dire je. C'est le mot le plus utile de la langue. Le verbe se place juste après.",i:[
 {lb:"Ech heeschen …",fr:"je m'appelle …",ph:"èkh hé-cheune"},
 {lb:"Wéi heeschs du?",fr:"comment tu t'appelles ?",ph:"vaï héchs dou"},
 {lb:"Wéi heescht Dir?",fr:"comment vous appelez-vous ?",ph:"vaï héchst dir"},
 {lb:"Ech kommen aus Frankräich",fr:"je viens de France",ph:"èkh ko-meune aous frank-raïkh"},
 {lb:"Ech wunnen zu …",fr:"j'habite à …",ph:"èkh vou-neune tsou"},
 {lb:"Ech schaffen zu Lëtzebuerg",fr:"je travaille au Luxembourg",ph:"èkh cha-feune tsou"},
 {lb:"Ech léieren Lëtzebuergesch",fr:"j'apprends le luxembourgeois",ph:"èkh laï-eureune"}]},
{e:3,t:"Comment ça va",note:"Wéi geet et, mot à mot : comment va cela. Personne ne dit je vais bien avec le mot je. On dit et geet mir gutt, cela va bien à moi.",i:[
 {lb:"Wéi geet et?",fr:"comment ça va ?",ph:"vaï guét ét",tr:"geet ressemble à goes. Comment ça goes."},
 {lb:"Et geet mir gutt",fr:"je vais bien",ph:"ét guét mir gout"},
 {lb:"Ganz gutt, merci",fr:"très bien, merci",ph:"gants gout mèr-si"},
 {lb:"An dir?",fr:"et vous ?",ph:"ann dir"},
 {lb:"Net esou gutt",fr:"pas très bien",ph:"nét é-zo gout"},
 {lb:"Ech si midd",fr:"je suis fatigué",ph:"èkh si mit"}]},
{e:3,t:"Quand tu ne comprends pas",note:"Cette leçon vaut plus que toutes les autres. Tant que tu peux dire que tu ne comprends pas et demander de répéter, tu restes dans la conversation.",i:[
 {lb:"Ech verstinn net",fr:"je ne comprends pas",ph:"èkh fèr-chtinn nét",tr:"net à la fin, c'est la négation. Comme not."},
 {lb:"Ech weess net",fr:"je ne sais pas",ph:"èkh véss nét"},
 {lb:"Méi lues, wann ech gelift",fr:"plus lentement, s'il vous plaît",ph:"maï lou-ess"},
 {lb:"Kënnt Dir dat widderhuelen?",fr:"pouvez-vous répéter ?",ph:"kennt dir dat vi-der-hou-leune"},
 {lb:"Wat heescht dat?",fr:"qu'est-ce que ça veut dire ?",ph:"vat héchst dat"},
 {lb:"Schwätzt Dir Franséisch?",fr:"parlez-vous français ?",ph:"chvètst dir fran-zaïch"}]},

/* ---------- ÉTAPE 4 · LES PREMIÈRES PHRASES ---------- */
{e:4,t:"Les verbes avec ech",note:"Avec ech, le verbe se termine presque toujours par en. Apprends d'abord cette forme, c'est celle que tu utiliseras le plus.",i:[
 {lb:"ech sinn",fr:"je suis",ph:"èkh zinn"},
 {lb:"ech hunn",fr:"j'ai",ph:"èkh hounn"},
 {lb:"ech goen",fr:"je vais",ph:"èkh gô-eune",tr:"goen, pense à go."},
 {lb:"ech kommen",fr:"je viens",ph:"èkh ko-meune",tr:"kommen, pense à come."},
 {lb:"ech schaffen",fr:"je travaille",ph:"èkh cha-feune"},
 {lb:"ech schwätzen",fr:"je parle",ph:"èkh chvèt-seune"},
 {lb:"ech verstinn",fr:"je comprends",ph:"èkh fèr-chtinn"},
 {lb:"ech maachen",fr:"je fais",ph:"èkh ma-kheune",tr:"maachen, pense à make."},
 {lb:"ech gesinn",fr:"je vois",ph:"èkh gue-zinn"},
 {lb:"ech héieren",fr:"j'entends",ph:"èkh haï-eureune",tr:"héieren, pense à hear."}]},
{e:4,t:"Tu, il, elle",note:"Avec du, le verbe prend un s. Avec hien ou si, il prend un t.",i:[
 {lb:"du schaffs",fr:"tu travailles",ph:"dou chafs"},
 {lb:"hie schafft",fr:"il travaille",ph:"hi chafft"},
 {lb:"si schafft",fr:"elle travaille",ph:"zi chafft"},
 {lb:"du bass",fr:"tu es",ph:"dou bass"},
 {lb:"hien ass",fr:"il est",ph:"hi-eune ass"},
 {lb:"du hues",fr:"tu as",ph:"dou hou-ess"},
 {lb:"hien huet",fr:"il a",ph:"hi-eune hou-eut"}]},
{e:4,t:"Nous, vous, ils",note:"Avec mir et si, le verbe reprend la forme en en. Avec dir, il prend un t.",i:[
 {lb:"mir schaffen",fr:"nous travaillons",ph:"mir cha-feune"},
 {lb:"dir schafft",fr:"vous travaillez",ph:"dir chafft"},
 {lb:"si schaffen",fr:"ils travaillent",ph:"zi cha-feune"},
 {lb:"mir sinn",fr:"nous sommes",ph:"mir zinn"},
 {lb:"mir hunn",fr:"nous avons",ph:"mir hounn"},
 {lb:"Dir sidd",fr:"vous êtes",ph:"dir zitt"}]},
{e:4,t:"Dire non",note:"Pour nier, on ajoute net après le verbe. Devant un nom, on utilise keen ou keng.",i:[
 {lb:"Ech schaffen net haut",fr:"je ne travaille pas aujourd'hui",ph:"èkh cha-feune nét haout"},
 {lb:"Ech hunn keng Zäit",fr:"je n'ai pas le temps",ph:"èkh hounn kèng tsaït"},
 {lb:"Dat ass net gutt",fr:"ce n'est pas bon",ph:"dat ass nét gout"},
 {lb:"Ech kann net",fr:"je ne peux pas",ph:"èkh kann nét"},
 {lb:"Nach net",fr:"pas encore",ph:"nakh nét"},
 {lb:"Näischt",fr:"rien",ph:"naïcht"}]},
{e:4,t:"Vouloir, pouvoir, devoir",note:"Attention à l'ordre : le deuxième verbe part à la fin. Ech muss elo goen, je dois maintenant aller. Ce n'est pas l'ordre du français.",i:[
 {lb:"ech kann",fr:"je peux",ph:"èkh kann",tr:"kann, pense à can."},
 {lb:"ech muss",fr:"je dois",ph:"èkh mouss",tr:"muss, pense à must."},
 {lb:"ech well",fr:"je veux",ph:"èkh vèll"},
 {lb:"ech hätt gär",fr:"je voudrais",ph:"èkh hèt guèr"},
 {lb:"Ech muss elo goen",fr:"je dois y aller maintenant",ph:"èkh mouss é-lo gô-eune"},
 {lb:"Kanns du mir hëllefen?",fr:"peux-tu m'aider ?",ph:"kanns dou mir hè-le-feune",tr:"hëllefen, pense à help."}]},
{e:4,t:"L'ordre des mots",note:"Règle centrale. Le verbe conjugué occupe toujours la deuxième place. Si tu commences par un mot de temps, le verbe passe devant le sujet.",i:[
 {lb:"Haut schaffen ech",fr:"aujourd'hui, je travaille",ph:"haout cha-feune èkh"},
 {lb:"Muer kommen ech",fr:"demain, je viens",ph:"moue-er ko-meune èkh"},
 {lb:"Elo verstinn ech",fr:"maintenant, je comprends",ph:"é-lo fèr-chtinn èkh"},
 {lb:"Am Auto léieren ech",fr:"dans la voiture, j'apprends",ph:"am aou-to laï-eureune èkh"},
 {lb:"Ech schaffen haut",fr:"je travaille aujourd'hui",ph:"èkh cha-feune haout"}]},
{e:4,t:"Le, la, un, une",note:"Le masculin fait de ou den. Le féminin et le neutre font d'. Ne bloque pas là-dessus, un article faux ne t'empêchera jamais d'être compris.",i:[
 {lb:"de Mann",fr:"l'homme",ph:"de mann"},
 {lb:"d'Fra",fr:"la femme",ph:"d'fra"},
 {lb:"d'Kand",fr:"l'enfant",ph:"d'kant"},
 {lb:"den Auto",fr:"la voiture",ph:"den aou-to"},
 {lb:"eng Fra",fr:"une femme",ph:"eng fra"},
 {lb:"e Mann",fr:"un homme",ph:"e mann"},
 {lb:"d'Kanner",fr:"les enfants",ph:"d'ka-ner"}]},
{e:4,t:"Parler du passé",note:"Le passé se forme avec hunn ou sinn, puis le participe à la fin. Pour les déplacements, on utilise sinn. Vérifie les participes sur lod.lu, ils sont irréguliers.",i:[
 {lb:"Ech hunn geschafft",fr:"j'ai travaillé",ph:"èkh hounn gue-chafft"},
 {lb:"Ech hunn geschwat",fr:"j'ai parlé",ph:"èkh hounn gue-chvat"},
 {lb:"Ech si gaangen",fr:"je suis allé",ph:"èkh si gang-eune"},
 {lb:"Ech si komm",fr:"je suis venu",ph:"èkh si komm"},
 {lb:"Gëschter hunn ech geschafft",fr:"hier, j'ai travaillé",ph:"guèch-ter hounn èkh"}]},

/* ---------- ÉTAPE 5 · LE QUOTIDIEN ---------- */
{e:5,t:"Les jours et le temps",note:"Les jours se terminent presque tous par deg. Repère cette terminaison, elle t'aidera à reconnaître un jour dans une phrase que tu ne comprends pas.",i:[
 {lb:"Méindeg",fr:"lundi",ph:"maïn-dekh",tr:"Méindeg, pense à Monday, la lune."},
 {lb:"Dënschdeg",fr:"mardi",ph:"dench-dekh"},
 {lb:"Mëttwoch",fr:"mercredi",ph:"mèt-vokh",tr:"Mëttwoch, le milieu de la semaine."},
 {lb:"Donneschdeg",fr:"jeudi",ph:"do-nech-dekh"},
 {lb:"Freideg",fr:"vendredi",ph:"fraï-dekh",tr:"Freideg, pense à Friday."},
 {lb:"Samschdeg",fr:"samedi",ph:"zamch-dekh"},
 {lb:"Sonndeg",fr:"dimanche",ph:"zon-dekh",tr:"Sonndeg, le jour du soleil, Sonn."},
 {lb:"d'Woch",fr:"la semaine",ph:"d'vokh",tr:"Woch, pense à week."}]},
{e:5,t:"Hier, aujourd'hui, demain",note:"Ces mots te permettent de situer une action sans conjuguer au passé ni au futur. C'est le raccourci du débutant, et c'est du vrai luxembourgeois.",i:[
 {lb:"haut",fr:"aujourd'hui",ph:"haout"},
 {lb:"muer",fr:"demain",ph:"moue-er"},
 {lb:"gëschter",fr:"hier",ph:"guèch-ter"},
 {lb:"elo",fr:"maintenant",ph:"é-lo"},
 {lb:"spéider",fr:"plus tard",ph:"chpaï-der"},
 {lb:"de Moien",fr:"le matin",ph:"de mo-ï-eune"},
 {lb:"den Owend",fr:"le soir",ph:"den o-vent"},
 {lb:"de Weekend",fr:"le week-end",ph:"de ouik-end"}]},
{e:5,t:"Poser une question",note:"Sept mots ouvrent presque toutes les questions et commencent presque tous par W. Quand une phrase démarre par un mot en W, on te pose une question, même si tu ne comprends pas le reste.",i:[
 {lb:"wien",fr:"qui",ph:"vi-eune"},
 {lb:"wat",fr:"quoi",ph:"vat",tr:"wat, pense à what."},
 {lb:"wou",fr:"où",ph:"vou",tr:"wou, pense à where."},
 {lb:"wéini",fr:"quand",ph:"vaï-ni"},
 {lb:"firwat",fr:"pourquoi",ph:"fir-vat",tr:"fir-wat, pour quoi. Comme en français."},
 {lb:"wéi",fr:"comment",ph:"vaï"},
 {lb:"Wat ass dat?",fr:"qu'est-ce que c'est ?",ph:"vat ass dat"}]},
{e:5,t:"Au café, commander",note:"Ech hätt gär est la formule polie pour commander. Elle marche partout.",i:[
 {lb:"Ech hätt gär e Kaffi",fr:"je voudrais un café",ph:"èkh hèt guèr e ka-fi"},
 {lb:"E Waasser, wann ech gelift",fr:"une eau, s'il vous plaît",ph:"e va-ser"},
 {lb:"D'Rechnung, wann ech gelift",fr:"l'addition, s'il vous plaît",ph:"d'rèkh-noung"},
 {lb:"Ech hunn Honger",fr:"j'ai faim",ph:"èkh hounn hong-er",tr:"Honger, pense à hungry."},
 {lb:"Ech hunn Duuscht",fr:"j'ai soif",ph:"èkh hounn douscht"},
 {lb:"Dat ass gutt",fr:"c'est bon",ph:"dat ass gout"}]},
{e:5,t:"La route et les transports",note:"Trois mots suffisent pour suivre une indication : lénks, riets, riicht aus. Le reste de la phrase peut t'échapper, ces trois-là portent toute l'information.",i:[
 {lb:"lénks",fr:"à gauche",ph:"lènks",tr:"lénks commence par L, comme left."},
 {lb:"riets",fr:"à droite",ph:"ri-ets",tr:"riets commence par R, comme right."},
 {lb:"riicht aus",fr:"tout droit",ph:"riikht aous"},
 {lb:"Wou ass …?",fr:"où est … ?",ph:"vou ass"},
 {lb:"d'Strooss",fr:"la rue",ph:"d'chtrôss",tr:"Strooss, pense à street."},
 {lb:"de Stau",fr:"l'embouteillage",ph:"de chtaou"},
 {lb:"d'Grenz",fr:"la frontière",ph:"d'grènts"},
 {lb:"den Zuch",fr:"le train",ph:"den tsoukh"}]},
{e:5,t:"La maison et la météo",note:"Le temps qu'il fait est le sujet de toutes les conversations de couloir. Trois phrases là-dessus te font entrer dans le groupe plus vite que n'importe quelle règle de grammaire.",i:[
 {lb:"d'Haus",fr:"la maison",ph:"d'haous"},
 {lb:"doheem",fr:"à la maison",ph:"do-hém",tr:"doheem, pense à home."},
 {lb:"d'Wieder",fr:"le temps qu'il fait",ph:"d'vi-der",tr:"Wieder, pense à weather."},
 {lb:"Et reent",fr:"il pleut",ph:"ét rént",tr:"reent, pense à rain."},
 {lb:"Et ass kal",fr:"il fait froid",ph:"ét ass kal",tr:"kal, pense à cold."},
 {lb:"Et ass waarm",fr:"il fait chaud",ph:"ét ass varm",tr:"waarm, pense à warm."},
 {lb:"D'Sonn schéngt",fr:"le soleil brille",ph:"d'zonn chèngt"}]},

/* ---------- ÉTAPE 6 · COMPRENDRE AUTOUR DE TOI ---------- */
{e:6,t:"Les petits mots qui portent le sens",note:"Voici la vraie clé de ton objectif. Ces mots ne se traduisent pas seuls, mais ils structurent chaque phrase. Quand tu les reconnais, tu devines le reste.",i:[
 {lb:"awer",fr:"mais",ph:"a-ver"},
 {lb:"well",fr:"parce que",ph:"vèll"},
 {lb:"also",fr:"donc, alors",ph:"al-zo"},
 {lb:"dann",fr:"alors",ph:"dann",tr:"dann, pense à then."},
 {lb:"och",fr:"aussi",ph:"okh"},
 {lb:"nëmmen",fr:"seulement",ph:"nè-meune"},
 {lb:"schonn",fr:"déjà",ph:"chonn"},
 {lb:"nach",fr:"encore",ph:"nakh"},
 {lb:"ëmmer",fr:"toujours",ph:"è-mer",tr:"ëmmer, pense à immersion. Toujours dedans."},
 {lb:"heiansdo",fr:"parfois",ph:"haï-ans-do"},
 {lb:"zesummen",fr:"ensemble",ph:"tse-zou-meune"}]},
{e:6,t:"Ce que tu entends tous les jours",note:"Des phrases entières, telles qu'elles sortent de la bouche des gens. Ne les découpe pas, apprends-les comme des blocs et tu les reconnaîtras au vol.",i:[
 {lb:"Wat gëtt et Neies?",fr:"quoi de neuf ?",ph:"vat guétt ét naï-es"},
 {lb:"Ech ginn heem",fr:"je rentre à la maison",ph:"èkh guinn hém"},
 {lb:"Dat ass kloer",fr:"c'est clair",ph:"dat ass klou-er",tr:"kloer, pense à clear."},
 {lb:"Alles an der Rei",fr:"tout est en ordre",ph:"a-les an der raï"},
 {lb:"Maach et gutt",fr:"porte-toi bien",ph:"makh ét gout"},
 {lb:"Ech soen Iech Bescheed",fr:"je vous tiens au courant",ph:"èkh zo-eune i-eukh be-chét"}]},
{e:6,t:"Le travail",note:"Tu passes tes journées au travail. Ce vocabulaire va te servir plus que celui du restaurant. C'est là que se joue ton autonomie réelle.",i:[
 {lb:"d'Aarbecht",fr:"le travail",ph:"d'ar-bekht"},
 {lb:"de Kolleeg",fr:"le collègue",ph:"de ko-lékh"},
 {lb:"de Chef",fr:"le chef",ph:"de chèf"},
 {lb:"d'Equipe",fr:"l'équipe",ph:"d'é-kip"},
 {lb:"d'Sitzung",fr:"la réunion",ph:"d'zit-soung"},
 {lb:"Ech si prett",fr:"je suis prêt",ph:"èkh si prèt"}]},
{e:6,t:"Les jeunes et les enfants",note:"Ton métier. Ces mots te permettront de comprendre ce qui se dit sur un jeune. Vérifie-les avec soin, ce sont ceux que tu utiliseras devant des professionnels.",i:[
 {lb:"de Jong",fr:"le garçon",ph:"de yong"},
 {lb:"d'Meedchen",fr:"la fille",ph:"d'méd-khen"},
 {lb:"d'Kanner",fr:"les enfants",ph:"d'ka-ner"},
 {lb:"de Jugendlechen",fr:"l'adolescent",ph:"de you-gend-le-khen"},
 {lb:"d'Schoul",fr:"l'école",ph:"d'choul"},
 {lb:"d'Grupp",fr:"le groupe",ph:"d'group"}]},
{e:6,t:"Comment tu te sens",note:"Dire son état est la base du lien humain. Ces mots servent aussi à comprendre ce qu'un jeune te dit de lui.",i:[
 {lb:"Ech si frou",fr:"je suis content",ph:"èkh si frou"},
 {lb:"Ech si midd",fr:"je suis fatigué",ph:"èkh si mit"},
 {lb:"Ech si rosen",fr:"je suis en colère",ph:"èkh si ro-zeune"},
 {lb:"Ech hunn Angscht",fr:"j'ai peur",ph:"èkh hounn angcht"},
 {lb:"Et geet net",fr:"ça ne va pas",ph:"ét guét nét"},
 {lb:"Ech si krank",fr:"je suis malade",ph:"èkh si krank"}]},
{e:6,t:"Au téléphone et au guichet",note:"Le téléphone est l'exercice le plus dur : pas de visage, pas de gestes. Ces phrases te permettent de tenir trente secondes.",i:[
 {lb:"Moien, hei ass …",fr:"bonjour, ici c'est …",ph:"mo-ï-eune haï ass"},
 {lb:"Ee Moment, wann ech gelift",fr:"un instant, s'il vous plaît",ph:"é mo-ment"},
 {lb:"Ech ruffen zréck",fr:"je rappelle",ph:"èkh rou-feune tsrék"},
 {lb:"Ech hunn e Rendez-vous",fr:"j'ai un rendez-vous",ph:"èkh hounn e ran-dé-vou"},
 {lb:"Kënnt Dir mir hëllefen?",fr:"pouvez-vous m'aider ?",ph:"kennt dir mir hè-le-feune"},
 {lb:"Merci a schéinen Dag",fr:"merci et bonne journée",ph:"mèr-si a chaï-neune dakh"}]}
];

/* ---------------------------------------------------------------------
   DIALOGUES — uniquement composés de phrases déjà vues dans le cours.
   Chaque dialogue est débloqué quand l'étape indiquée est atteinte.
   --------------------------------------------------------------------- */
const DIALOGUES = [
{e:3,t:"Se croiser le matin",l:[
 {q:"A",lb:"Moien! Wéi geet et?",fr:"Bonjour ! Comment ça va ?"},
 {q:"B",lb:"Et geet mir gutt, merci. An dir?",fr:"Je vais bien, merci. Et vous ?"},
 {q:"A",lb:"Ganz gutt, merci.",fr:"Très bien, merci."}]},
{e:3,t:"Se présenter",l:[
 {q:"A",lb:"Moien. Wéi heeschs du?",fr:"Bonjour. Comment tu t'appelles ?"},
 {q:"B",lb:"Ech heeschen Fouad. An du?",fr:"Je m'appelle Fouad. Et toi ?"},
 {q:"A",lb:"Ech kommen aus Frankräich. Ech schaffen zu Lëtzebuerg.",fr:"Je viens de France. Je travaille au Luxembourg."}]},
{e:3,t:"Quand tu ne suis plus",l:[
 {q:"A",lb:"Schwätzt Dir Lëtzebuergesch?",fr:"Parlez-vous luxembourgeois ?"},
 {q:"B",lb:"E bëssen. Ech léieren Lëtzebuergesch.",fr:"Un peu. J'apprends le luxembourgeois."},
 {q:"A",lb:"Kee Problem.",fr:"Pas de problème."},
 {q:"B",lb:"Méi lues, wann ech gelift.",fr:"Plus lentement, s'il vous plaît."}]},
{e:5,t:"Au café",l:[
 {q:"A",lb:"Moien. Ech hätt gär e Kaffi.",fr:"Bonjour. Je voudrais un café."},
 {q:"B",lb:"Jo. Nach eppes?",fr:"Oui. Autre chose ?"},
 {q:"A",lb:"E Waasser, wann ech gelift. Wat kascht dat?",fr:"Une eau, s'il vous plaît. Combien ça coûte ?"},
 {q:"B",lb:"Zéng Euro.",fr:"Dix euros."}]},
{e:5,t:"Demander son chemin",l:[
 {q:"A",lb:"Entschëllegt. Wou ass d'Gare?",fr:"Excusez-moi. Où est la gare ?"},
 {q:"B",lb:"Riicht aus, dann lénks.",fr:"Tout droit, puis à gauche."},
 {q:"A",lb:"Ass et wäit?",fr:"C'est loin ?"},
 {q:"B",lb:"Nee, net wäit. Villmools merci.",fr:"Non, pas loin. Merci beaucoup."}]},
{e:5,t:"L'heure et le départ",l:[
 {q:"A",lb:"Wéi spéit ass et?",fr:"Quelle heure est-il ?"},
 {q:"B",lb:"Et ass zéng Auer.",fr:"Il est dix heures."},
 {q:"A",lb:"Merci. Ech muss elo goen.",fr:"Merci. Je dois y aller maintenant."},
 {q:"B",lb:"Äddi, bis muer.",fr:"Au revoir, à demain."}]},
{e:5,t:"Le temps qu'il fait",l:[
 {q:"A",lb:"Et reent haut.",fr:"Il pleut aujourd'hui."},
 {q:"B",lb:"Jo, an et ass kal.",fr:"Oui, et il fait froid."},
 {q:"A",lb:"Muer ass et waarm.",fr:"Demain il fait chaud."},
 {q:"B",lb:"Dat ass gutt.",fr:"C'est bien."}]},
{e:6,t:"Entre collègues",l:[
 {q:"A",lb:"Wat gëtt et Neies?",fr:"Quoi de neuf ?"},
 {q:"B",lb:"Näischt. Ech si midd.",fr:"Rien. Je suis fatigué."},
 {q:"A",lb:"Firwat?",fr:"Pourquoi ?"},
 {q:"B",lb:"Ech hunn haut vill geschafft.",fr:"J'ai beaucoup travaillé aujourd'hui."}]},
{e:6,t:"Demander de l'aide",l:[
 {q:"A",lb:"Kanns du mir hëllefen?",fr:"Peux-tu m'aider ?"},
 {q:"B",lb:"Jo, sécher.",fr:"Oui, bien sûr."},
 {q:"A",lb:"Villmools merci.",fr:"Merci beaucoup."},
 {q:"B",lb:"Gär geschitt.",fr:"Je vous en prie."}]},
{e:6,t:"Fin de journée",l:[
 {q:"A",lb:"Ech ginn heem.",fr:"Je rentre à la maison."},
 {q:"B",lb:"Schéine Weekend!",fr:"Bon week-end !"},
 {q:"A",lb:"Merci, a schéinen Dag.",fr:"Merci, et bonne journée."},
 {q:"B",lb:"Bis d'nächst Woch. Äddi.",fr:"À la semaine prochaine. Au revoir."}]}
];

const BLOCS = [
{h:"1 à 10",t:"Les chiffres",d:"Comprendre un chiffre, un prix, une heure dits à vitesse normale."},
{h:"11 à 20",t:"Les lettres et les sons",d:"Prononcer ë, é, ä. Lire un mot inconnu à voix haute. Épeler ton nom."},
{h:"21 à 35",t:"Les premiers mots",d:"Saluer, te présenter, dire que tu ne comprends pas."},
{h:"36 à 55",t:"Les premières phrases",d:"Conjuguer au présent, nier, placer le verbe au bon endroit."},
{h:"56 à 75",t:"Le quotidien",d:"Commander, demander son chemin, parler des jours et du temps qu'il fait."},
{h:"76 à 100",t:"Comprendre autour de toi",d:"Suivre une conversation entre collègues sans y participer."}
];
