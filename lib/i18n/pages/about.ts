// Текстовете на страница „За нас".
//
// ТЕКСТЪТ Е НА ВАСИЛЕНА, дословно от „За нас + допълнителна информация
// final.docx" (15.08.2026). Първоизточникът е запазен в
// docs/СЪДЪРЖАНИЕ-от-Василена.md — при разминаване печели той.
//
// БЪЛГАРСКИЯТ Е ИЗТОЧНИКЪТ, немският и английският са преводи от него.
// Това е обратното на повечето страници тук (там немският е основата), но
// текстът е неин и е написан на български.
//
// Разделите следват нейния документ, не измислена от нас структура: тя го
// е разделила с тирета и редът е нейният.

import type { Locale } from "@/lib/i18n/config";

const bg = {
  metaTitle: "За нас",
  metaDescription:
    "Курсовете по немски с Василена Нюрнбергер — подкрепяни от Regierung Mittelfranken. Дистанционно обучение за българи от цял свят.",
  kicker: "За нас",
  title: "Немски заедно с Василена",

  /** Стои най-отгоре, преди биографията — това е доверието. */
  backing: "Курсовете по немски език с Василена са подкрепяни от немското правителство Regierung Mittelfranken.",

  intro: [
    "Василена Нюрнбергер е основател на първия български дигитален чуждоезиков институт в Германия – Нюрнбергски чуждоезиков институт. Институтът предлага на българи от цял свят дистанционно обучение по НЕМСКИ език.",
    "Василена е завършила с отличен успех ГПЧЕ „Ромен Ролан“ гр. Стара Загора и работи като заклет преводач в Германия. През 2013-та година печели конкурс, организиран от немското Министерство на културата, като се класира в ТОП 8 българи, отлично владеещи немски език.",
    "През 2015 година Василена печели стипендия и заминава за Германия, където продължава образованието си в университет и пише своите авторски учебници за изучаване на немски език. В процеса на обучение се използва иновативна система, като учебниците са двуезични (всяка немска дума е с български превод). Лексиката и граматиката, която се изучава в уроците, е написана и на немски, и на български език, което е много удобно при подготовката на курсистите. Така структуриран, учебният материал се усвоява от българи бързо и лесно.",
  ],

  /** Води към формата веднага след биографията — така е в документа. */
  formLede:
    "Ако искаш и ти да научиш немски език бързо и лесно, заедно с Василена, напиши отдолу своя телефонен номер за връзка и Василена лично ще ти се обади до няколко дни БЕЗПЛАТНО, за да ти помогне с немския език.",
  formHint:
    "Моля напиши своя телефонен номер за връзка. Обърни внимание кодът на страната да е правилен, за да се свържем с теб бързо и лесно.",
  /** Кратки надписи за бутоните в дъното — водят обратно към формата. */
  formLedeCta: "Остави телефон за връзка",
  testCta: "Провери нивото си",

  sections: [
    {
      heading: "Немски заедно с Василена",
      body: [
        "Немски заедно с Василена е място за всички, които искат да научат немски език разбираемо, практично и с увереност – независимо дали започват от самото начало, или вече имат познания и искат да ги надградят.",
        "В основата на нашите курсове стои Василена – преподавател с дългогодишен опит, който превръща изучаването на езика в ясен и добре структуриран процес. Това позволява с лекота да се справите с предизвикателството за свободно и уверено общуване в немскоезична среда.",
        "Целта ни не е просто да запомните думи и граматични правила, а да започнете да разбирате, да говорите и да използвате немския език в реални ситуации, без затруднения.",
      ],
    },
    {
      heading: "От първите думи до уверено общуване",
      body: [
        "Обучението започва от основите на немския език и правилното произношение и постепенно преминава през граматика, лексика, четене, слушане и практическо общуване.",
        "Учебният материал обхваща познания от нива A1, A2, B1 и B2, като е структуриран така, че новата информация да бъде усвоявана по-лесно и да може да бъде използвана на практика.",
        "По време на обучението ще работим не само върху езика, но и върху увереността да го използвате. Ще преминем заедно през много упражнения, ще изградим правилно структурирани основни познания и ще добавим фини детайли, касаещи както ежедневното общуване, така и комуникацията с институции и държавни структури.",
      ],
    },
    {
      heading: "Немски за реалния живот",
      body: [
        "Знаем, че за много от нашите курсисти немският език е необходим не просто за сертификат, а за работа, ежедневие и успешна интеграция в немскоговорящите държави.",
      ],
      /** Списъкът е нейн — темите, които влизат в курса. */
      list: [
        "търсене и започване на работа;",
        "подготовка за интервю с работодател;",
        "комуникация с немскоговорящи колеги;",
        "трудови договори, права и задължения;",
        "здравно осигуряване и здравна каса;",
        "майчинство, детски надбавки и социални въпроси;",
        "кореспонденция с институциите;",
        "ситуации от ежедневието в немскоговорящите държави.",
      ],
      after: [
        "Наученото по време на курса ще можете да използвате веднага, на практика, в реалния живот и общуване.",
      ],
    },
    {
      heading: "Създадено за работещи хора",
      body: [
        "Курсовете са организирани така, че да бъдат удобни и за хора, които работят и на смени. Предлагаме сутрешни и вечерни часове.",
      ],
    },
    {
      heading: "Повече от курс по немски език",
      body: [
        "За нас доброто обучение не означава просто да преминем през учебния материал. Искаме всеки курсист да натрупа активен речник и постепенно да преодолее езиковата бариера. За това използваме практически примери, упражнения и техники за по-бързо и по-лесно усвояване на новата лексика и граматика.",
      ],
    },
    {
      heading: "Нашата цел",
      body: [
        "Нашата цел е проста: да направим немския език разбираем и достъпен, за да помогнем на възможно най-много хора да го използват уверено в работата и в ежедневието си.",
        "Защото немският език не трябва просто да се учи. Немският език трябва да се разбира, говори и използва — с лекота, с увереност и с удоволствие.",
      ],
    },
  ],

  /** Затваря страницата — въпрос към читателя, не твърдение за нас. */
  closingHeading: "Защо нашите курсове по немски език са най-добрите?",
  closingBody:
    "На този въпрос те молим ти да отговориш, когато си получиш сертификата за владеене на немски език, когато започнеш мечтаната работа, когато усетиш промяната в живота си в желаната посока — защото началото на курса по немски език с Василена е стартът на това пътуване към нови предизвикателства и сбъднати мечти!",
};

export type AboutCopy = typeof bg;

const de: AboutCopy = {
  metaTitle: "Über uns",
  metaDescription:
    "Deutschkurse mit Vasilena Nürnberger — unterstützt von der Regierung von Mittelfranken. Fernunterricht für Bulgaren weltweit.",
  kicker: "Über uns",
  title: "Deutsch zusammen mit Vasilena",

  backing:
    "Die Deutschkurse mit Vasilena werden von der Regierung von Mittelfranken unterstützt.",

  intro: [
    "Vasilena Nürnberger ist Gründerin des ersten bulgarischen digitalen Fremdspracheninstituts in Deutschland – des Nürnberger Fremdsprachen Instituts. Das Institut bietet Bulgaren aus aller Welt Deutschunterricht im Fernstudium an.",
    "Vasilena hat das Gymnasium für Fremdsprachen „Romain Rolland“ in Stara Sagora mit Auszeichnung abgeschlossen und arbeitet als vereidigte Übersetzerin in Deutschland. 2013 gewann sie einen Wettbewerb des bulgarischen Kulturministeriums und gehörte zu den TOP 8 der Bulgaren mit ausgezeichneten Deutschkenntnissen.",
    "2015 erhielt Vasilena ein Stipendium und ging nach Deutschland, wo sie ihr Studium an der Universität fortsetzte und ihre eigenen Lehrbücher für den Deutschunterricht schrieb. Im Unterricht kommt ein durchdachtes System zum Einsatz: Die Lehrbücher sind zweisprachig — zu jedem deutschen Wort steht die bulgarische Übersetzung. Wortschatz und Grammatik stehen auf Deutsch und auf Bulgarisch, was die Vorbereitung deutlich erleichtert. So aufgebaut, erschließt sich der Lernstoff bulgarischen Lernenden schnell und leicht.",
  ],

  formLede:
    "Wenn auch du schnell und leicht Deutsch lernen möchtest — zusammen mit Vasilena — schreib unten deine Telefonnummer. Vasilena ruft dich persönlich innerhalb weniger Tage KOSTENLOS an, um dir mit dem Deutschen zu helfen.",
  formHint:
    "Bitte schreib deine Telefonnummer für den Rückruf. Achte auf die richtige Ländervorwahl, damit wir dich schnell und einfach erreichen.",
  formLedeCta: "Telefonnummer hinterlassen",
  testCta: "Niveau testen",

  sections: [
    {
      heading: "Deutsch zusammen mit Vasilena",
      body: [
        "Deutsch zusammen mit Vasilena ist ein Ort für alle, die Deutsch verständlich, praxisnah und mit Selbstvertrauen lernen wollen – ganz gleich, ob sie ganz von vorn anfangen oder schon Kenntnisse haben und darauf aufbauen möchten.",
        "Im Zentrum unserer Kurse steht Vasilena – eine Lehrerin mit langjähriger Erfahrung, die das Sprachenlernen zu einem klaren, gut strukturierten Prozess macht. So gelingt der Schritt zu freier und sicherer Verständigung im deutschsprachigen Umfeld leichter.",
        "Unser Ziel ist nicht, dass du Wörter und Grammatikregeln auswendig lernst, sondern dass du Deutsch verstehst, sprichst und in realen Situationen ohne Mühe anwendest.",
      ],
    },
    {
      heading: "Von den ersten Wörtern bis zum sicheren Gespräch",
      body: [
        "Der Unterricht beginnt bei den Grundlagen der deutschen Sprache und der richtigen Aussprache und führt schrittweise über Grammatik, Wortschatz, Lesen, Hören bis zum praktischen Sprechen.",
        "Der Lernstoff umfasst die Niveaus A1, A2, B1 und B2 und ist so aufgebaut, dass neue Inhalte leichter aufgenommen und direkt angewendet werden können.",
        "Wir arbeiten dabei nicht nur an der Sprache, sondern auch an der Sicherheit, sie zu benutzen. Wir gehen gemeinsam durch viele Übungen, bauen ein sauber strukturiertes Fundament auf und ergänzen die feinen Details — für den Alltag ebenso wie für die Kommunikation mit Behörden und staatlichen Stellen.",
      ],
    },
    {
      heading: "Deutsch für das echte Leben",
      body: [
        "Wir wissen: Für viele unserer Teilnehmenden ist Deutsch nicht bloß für ein Zertifikat nötig, sondern für Arbeit, Alltag und eine gelungene Integration in den deutschsprachigen Ländern.",
      ],
      list: [
        "Arbeitssuche und Berufseinstieg;",
        "Vorbereitung auf das Bewerbungsgespräch;",
        "Kommunikation mit deutschsprachigen Kolleginnen und Kollegen;",
        "Arbeitsverträge, Rechte und Pflichten;",
        "Krankenversicherung und Krankenkasse;",
        "Mutterschaft, Kindergeld und soziale Fragen;",
        "Schriftverkehr mit Behörden;",
        "Alltagssituationen in den deutschsprachigen Ländern.",
      ],
      after: [
        "Was du im Kurs lernst, kannst du sofort anwenden — in der Praxis, im echten Leben und im Gespräch.",
      ],
    },
    {
      heading: "Gemacht für Berufstätige",
      body: [
        "Die Kurse sind so organisiert, dass sie auch für Menschen im Schichtdienst passen. Wir bieten Vormittags- und Abendstunden an.",
      ],
    },
    {
      heading: "Mehr als ein Deutschkurs",
      body: [
        "Guter Unterricht heißt für uns nicht, einfach den Lernstoff durchzugehen. Wir wollen, dass alle Teilnehmenden einen aktiven Wortschatz aufbauen und die Sprachbarriere Schritt für Schritt überwinden. Dafür nutzen wir praktische Beispiele, Übungen und Techniken, mit denen neuer Wortschatz und neue Grammatik schneller und leichter sitzen.",
      ],
    },
    {
      heading: "Unser Ziel",
      body: [
        "Unser Ziel ist einfach: Deutsch verständlich und zugänglich machen, damit möglichst viele Menschen die Sprache sicher im Beruf und im Alltag nutzen.",
        "Denn Deutsch soll nicht einfach gelernt werden. Deutsch soll verstanden, gesprochen und benutzt werden — mit Leichtigkeit, mit Sicherheit und mit Freude.",
      ],
    },
  ],

  closingHeading: "Warum sind unsere Deutschkurse die besten?",
  closingBody:
    "Diese Frage möchten wir dich beantworten lassen — wenn du dein Sprachzertifikat in den Händen hältst, wenn du die ersehnte Stelle antrittst, wenn du merkst, dass dein Leben die gewünschte Richtung nimmt. Denn der Beginn des Deutschkurses mit Vasilena ist der Start dieser Reise zu neuen Herausforderungen und erfüllten Träumen!",
};

const en: AboutCopy = {
  metaTitle: "About us",
  metaDescription:
    "German courses with Vasilena Nürnberger — supported by the Government of Middle Franconia. Distance learning for Bulgarians worldwide.",
  kicker: "About us",
  title: "German together with Vasilena",

  backing:
    "The German courses with Vasilena are supported by the Government of Middle Franconia (Regierung von Mittelfranken).",

  intro: [
    "Vasilena Nürnberger is the founder of the first Bulgarian digital language institute in Germany – the Nuremberg Institute of Foreign Languages. The institute offers distance learning in GERMAN to Bulgarians all over the world.",
    "Vasilena graduated with distinction from the „Romain Rolland“ language school in Stara Zagora and works as a sworn translator in Germany. In 2013 she won a competition organised by the Bulgarian Ministry of Culture, placing in the TOP 8 Bulgarians with excellent command of German.",
    "In 2015 Vasilena won a scholarship and moved to Germany, where she continued her studies at university and wrote her own textbooks for learning German. The teaching uses a carefully designed system: the textbooks are bilingual — every German word carries its Bulgarian translation. The vocabulary and grammar are written in both German and Bulgarian, which makes preparation much easier. Structured this way, the material comes to Bulgarian learners quickly and easily.",
  ],

  formLede:
    "If you too want to learn German quickly and easily, together with Vasilena, write your phone number below. Vasilena will call you personally within a few days, FREE of charge, to help you with your German.",
  formHint:
    "Please write your phone number so we can reach you. Do check that the country code is correct, so we can get in touch quickly and easily.",
  formLedeCta: "Leave your phone number",
  testCta: "Test your level",

  sections: [
    {
      heading: "German together with Vasilena",
      body: [
        "German together with Vasilena is a place for everyone who wants to learn German clearly, practically and with confidence – whether they are starting from scratch or already have some knowledge and want to build on it.",
        "At the heart of our courses is Vasilena – a teacher with many years of experience who turns learning a language into a clear, well-structured process. That makes it far easier to meet the challenge of speaking freely and confidently in a German-speaking environment.",
        "Our goal is not for you to memorise words and grammar rules, but for you to understand, speak and use German in real situations, without struggling.",
      ],
    },
    {
      heading: "From your first words to confident conversation",
      body: [
        "Teaching starts with the foundations of German and correct pronunciation, then moves step by step through grammar, vocabulary, reading, listening and practical conversation.",
        "The material covers levels A1, A2, B1 and B2, structured so that new information is absorbed more easily and can be put to use in practice.",
        "Along the way we work not only on the language but on the confidence to use it. We go through many exercises together, build properly structured foundations, and add the fine detail — for everyday conversation as much as for dealing with institutions and public authorities.",
      ],
    },
    {
      heading: "German for real life",
      body: [
        "We know that for many of our students German is needed not just for a certificate, but for work, daily life and successful integration in German-speaking countries.",
      ],
      list: [
        "looking for and starting a job;",
        "preparing for a job interview;",
        "communicating with German-speaking colleagues;",
        "employment contracts, rights and obligations;",
        "health insurance and health funds;",
        "maternity, child benefit and social matters;",
        "correspondence with the authorities;",
        "everyday situations in German-speaking countries.",
      ],
      after: [
        "What you learn on the course you can use straight away — in practice, in real life and in conversation.",
      ],
    },
    {
      heading: "Built for people who work",
      body: [
        "The courses are organised to suit people who work, including shift work. We offer morning and evening classes.",
      ],
    },
    {
      heading: "More than a German course",
      body: [
        "For us, good teaching does not mean simply working through the material. We want every student to build an active vocabulary and gradually break through the language barrier. For that we use practical examples, exercises and techniques that make new vocabulary and grammar stick faster and more easily.",
      ],
    },
    {
      heading: "Our goal",
      body: [
        "Our goal is simple: to make German understandable and accessible, so that as many people as possible can use it confidently at work and in daily life.",
        "Because German should not simply be studied. German should be understood, spoken and used — with ease, with confidence and with pleasure.",
      ],
    },
  ],

  closingHeading: "Why are our German courses the best?",
  closingBody:
    "That is a question we would like you to answer — when you hold your language certificate, when you start the job you dreamed of, when you feel your life turning in the direction you wanted. Because the start of the German course with Vasilena is the start of that journey towards new challenges and dreams come true!",
};

const COPY: Record<Locale, AboutCopy> = { de, bg, en };

export function aboutCopy(locale: Locale): AboutCopy {
  return COPY[locale] ?? COPY.de;
}
