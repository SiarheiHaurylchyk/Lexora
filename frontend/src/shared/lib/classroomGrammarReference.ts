/** Compact EN reference lists for the in-class sidebar (expand anytime). */

export type IrregularVerbRow = {
  v1: string;
  v2: string;
  v3: string;
  ru: string;
};

export type InfinitiveGerundRow = {
  pattern: string;
  example: string;
  ru: string;
};

/** Stable ids → i18n keys `classroom.shell.gerundSection_<id>`. */
export type InfinitiveGerundSectionId =
  | 'gerund_only'
  | 'infinitive_only'
  | 'either_ok'
  | 'meaning_differs'
  | 'prep_plus_gerund'
  | 'expressions';

export type InfinitiveGerundSection = {
  id: InfinitiveGerundSectionId;
  rows: InfinitiveGerundRow[];
};

export const IRREGULAR_VERBS_EN: IrregularVerbRow[] = [
  { v1: 'arise', v2: 'arose', v3: 'arisen', ru: 'возникать, появляться' },
  { v1: 'be', v2: 'was / were', v3: 'been', ru: 'быть' },
  { v1: 'bear', v2: 'bore', v3: 'borne', ru: 'нести, выносить' },
  { v1: 'beat', v2: 'beat', v3: 'beaten', ru: 'бить, побеждать' },
  { v1: 'become', v2: 'became', v3: 'become', ru: 'становиться' },
  { v1: 'begin', v2: 'began', v3: 'begun', ru: 'начинать' },
  { v1: 'bend', v2: 'bent', v3: 'bent', ru: 'гнуть' },
  { v1: 'bet', v2: 'bet', v3: 'bet', ru: 'держать пари' },
  { v1: 'bite', v2: 'bit', v3: 'bitten', ru: 'кусать' },
  { v1: 'blow', v2: 'blew', v3: 'blown', ru: 'дуть' },
  { v1: 'break', v2: 'broke', v3: 'broken', ru: 'ломать' },
  { v1: 'bring', v2: 'brought', v3: 'brought', ru: 'приносить' },
  { v1: 'build', v2: 'built', v3: 'built', ru: 'строить' },
  { v1: 'buy', v2: 'bought', v3: 'bought', ru: 'покупать' },
  { v1: 'catch', v2: 'caught', v3: 'caught', ru: 'ловить' },
  { v1: 'choose', v2: 'chose', v3: 'chosen', ru: 'выбирать' },
  { v1: 'come', v2: 'came', v3: 'come', ru: 'приходить' },
  { v1: 'cost', v2: 'cost', v3: 'cost', ru: 'стоить' },
  { v1: 'cut', v2: 'cut', v3: 'cut', ru: 'резать' },
  { v1: 'deal', v2: 'dealt', v3: 'dealt', ru: 'иметь дело, раздавать' },
  { v1: 'dig', v2: 'dug', v3: 'dug', ru: 'копать' },
  { v1: 'do', v2: 'did', v3: 'done', ru: 'делать' },
  { v1: 'draw', v2: 'drew', v3: 'drawn', ru: 'рисовать, тащить' },
  { v1: 'drink', v2: 'drank', v3: 'drunk', ru: 'пить' },
  { v1: 'drive', v2: 'drove', v3: 'driven', ru: 'водить' },
  { v1: 'eat', v2: 'ate', v3: 'eaten', ru: 'есть' },
  { v1: 'fall', v2: 'fell', v3: 'fallen', ru: 'падать' },
  { v1: 'feed', v2: 'fed', v3: 'fed', ru: 'кормить' },
  { v1: 'feel', v2: 'felt', v3: 'felt', ru: 'чувствовать' },
  { v1: 'fight', v2: 'fought', v3: 'fought', ru: 'бороться' },
  { v1: 'find', v2: 'found', v3: 'found', ru: 'находить' },
  { v1: 'fly', v2: 'flew', v3: 'flown', ru: 'летать' },
  { v1: 'forget', v2: 'forgot', v3: 'forgotten', ru: 'забывать' },
  { v1: 'forgive', v2: 'forgave', v3: 'forgiven', ru: 'прощать' },
  { v1: 'freeze', v2: 'froze', v3: 'frozen', ru: 'замерзать' },
  { v1: 'get', v2: 'got', v3: 'got / gotten', ru: 'получать' },
  { v1: 'give', v2: 'gave', v3: 'given', ru: 'давать' },
  { v1: 'go', v2: 'went', v3: 'gone', ru: 'идти, ехать' },
  { v1: 'grow', v2: 'grew', v3: 'grown', ru: 'расти, выращивать' },
  { v1: 'hang', v2: 'hung', v3: 'hung', ru: 'вешать' },
  { v1: 'have', v2: 'had', v3: 'had', ru: 'иметь' },
  { v1: 'hear', v2: 'heard', v3: 'heard', ru: 'слышать' },
  { v1: 'hide', v2: 'hid', v3: 'hidden', ru: 'прятать' },
  { v1: 'hit', v2: 'hit', v3: 'hit', ru: 'ударять' },
  { v1: 'hold', v2: 'held', v3: 'held', ru: 'держать' },
  { v1: 'hurt', v2: 'hurt', v3: 'hurt', ru: 'ранить, болеть' },
  { v1: 'keep', v2: 'kept', v3: 'kept', ru: 'держать, хранить' },
  { v1: 'know', v2: 'knew', v3: 'known', ru: 'знать' },
  { v1: 'lay', v2: 'laid', v3: 'laid', ru: 'класть' },
  { v1: 'lead', v2: 'led', v3: 'led', ru: 'вести' },
  { v1: 'leave', v2: 'left', v3: 'left', ru: 'оставлять, уходить' },
  { v1: 'lend', v2: 'lent', v3: 'lent', ru: 'давать в долг' },
  { v1: 'let', v2: 'let', v3: 'let', ru: 'позволять' },
  { v1: 'lie', v2: 'lay', v3: 'lain', ru: 'лежать' },
  {
    v1: 'light',
    v2: 'lit / lighted',
    v3: 'lit / lighted',
    ru: 'зажигать, освещать',
  },
  { v1: 'lose', v2: 'lost', v3: 'lost', ru: 'терять' },
  { v1: 'make', v2: 'made', v3: 'made', ru: 'делать, заставлять' },
  { v1: 'mean', v2: 'meant', v3: 'meant', ru: 'значить, иметь в виду' },
  { v1: 'meet', v2: 'met', v3: 'met', ru: 'встречать' },
  { v1: 'pay', v2: 'paid', v3: 'paid', ru: 'платить' },
  { v1: 'put', v2: 'put', v3: 'put', ru: 'класть' },
  { v1: 'read', v2: 'read', v3: 'read', ru: 'читать' },
  { v1: 'ride', v2: 'rode', v3: 'ridden', ru: 'ездить верхом' },
  { v1: 'ring', v2: 'rang', v3: 'rung', ru: 'звонить' },
  { v1: 'rise', v2: 'rose', v3: 'risen', ru: 'подниматься' },
  { v1: 'run', v2: 'ran', v3: 'run', ru: 'бежать' },
  { v1: 'say', v2: 'said', v3: 'said', ru: 'сказать' },
  { v1: 'see', v2: 'saw', v3: 'seen', ru: 'видеть' },
  { v1: 'sell', v2: 'sold', v3: 'sold', ru: 'продавать' },
  { v1: 'send', v2: 'sent', v3: 'sent', ru: 'посылать' },
  { v1: 'set', v2: 'set', v3: 'set', ru: 'устанавливать' },
  { v1: 'shake', v2: 'shook', v3: 'shaken', ru: 'трясти' },
  { v1: 'shine', v2: 'shone', v3: 'shone', ru: 'светить' },
  { v1: 'shoot', v2: 'shot', v3: 'shot', ru: 'стрелять' },
  { v1: 'show', v2: 'showed', v3: 'shown', ru: 'показывать' },
  { v1: 'shut', v2: 'shut', v3: 'shut', ru: 'закрывать' },
  { v1: 'sing', v2: 'sang', v3: 'sung', ru: 'петь' },
  { v1: 'sit', v2: 'sat', v3: 'sat', ru: 'сидеть' },
  { v1: 'sleep', v2: 'slept', v3: 'slept', ru: 'спать' },
  { v1: 'speak', v2: 'spoke', v3: 'spoken', ru: 'говорить' },
  { v1: 'spend', v2: 'spent', v3: 'spent', ru: 'тратить, проводить время' },
  { v1: 'stand', v2: 'stood', v3: 'stood', ru: 'стоять' },
  { v1: 'steal', v2: 'stole', v3: 'stolen', ru: 'красть' },
  { v1: 'stick', v2: 'stuck', v3: 'stuck', ru: 'приклеивать, застревать' },
  { v1: 'strike', v2: 'struck', v3: 'struck', ru: 'ударять, бастовать' },
  { v1: 'swim', v2: 'swam', v3: 'swum', ru: 'плавать' },
  { v1: 'take', v2: 'took', v3: 'taken', ru: 'брать' },
  { v1: 'teach', v2: 'taught', v3: 'taught', ru: 'учить' },
  { v1: 'tear', v2: 'tore', v3: 'torn', ru: 'рвать' },
  { v1: 'tell', v2: 'told', v3: 'told', ru: 'рассказывать' },
  { v1: 'think', v2: 'thought', v3: 'thought', ru: 'думать' },
  { v1: 'throw', v2: 'threw', v3: 'thrown', ru: 'бросать' },
  { v1: 'understand', v2: 'understood', v3: 'understood', ru: 'понимать' },
  { v1: 'wake', v2: 'woke', v3: 'woken', ru: 'просыпаться' },
  { v1: 'wear', v2: 'wore', v3: 'worn', ru: 'носить (одежду)' },
  { v1: 'win', v2: 'won', v3: 'won', ru: 'выигрывать' },
  { v1: 'write', v2: 'wrote', v3: 'written', ru: 'писать' },
];

export const INFINITIVE_GERUND_SECTIONS: InfinitiveGerundSection[] = [
  {
    id: 'gerund_only',
    rows: [
      {
        pattern: 'admit + gerund',
        example: 'She admitted lying.',
        ru: 'признаваться — admit + -ing',
      },
      {
        pattern: 'avoid + gerund',
        example: 'Avoid making mistakes.',
        ru: 'избегать — avoid + -ing',
      },
      {
        pattern: 'can’t help + gerund',
        example: 'I can’t help laughing.',
        ru: 'не могу не… — can’t help + -ing',
      },
      {
        pattern: 'consider + gerund',
        example: 'We considered moving.',
        ru: 'рассматривать — consider + -ing',
      },
      {
        pattern: 'delay + gerund',
        example: 'He delayed answering.',
        ru: 'откладывать — delay + -ing',
      },
      {
        pattern: 'deny + gerund',
        example: 'They denied stealing.',
        ru: 'отрицать — deny + -ing',
      },
      {
        pattern: 'discuss + gerund',
        example: 'We discussed changing the plan.',
        ru: 'discuss + -ing (без «to»)',
      },
      {
        pattern: 'dislike + gerund',
        example: 'I dislike waiting.',
        ru: 'не любить — dislike + -ing',
      },
      {
        pattern: 'enjoy + gerund',
        example: 'I enjoy reading.',
        ru: 'получать удовольствие — enjoy + -ing',
      },
      {
        pattern: 'escape + gerund',
        example: 'He escaped being punished.',
        ru: 'избежать — escape + -ing',
      },
      {
        pattern: 'finish + gerund',
        example: 'She finished writing.',
        ru: 'закончить — finish + -ing',
      },
      {
        pattern: 'give up + gerund',
        example: 'Don’t give up trying.',
        ru: 'бросить / сдаться — give up + -ing',
      },
      {
        pattern: 'imagine + gerund',
        example: 'Imagine living abroad!',
        ru: 'представлять — imagine + -ing',
      },
      {
        pattern: 'involve + gerund',
        example: 'The job involves travelling.',
        ru: 'включать в себя — involve + -ing',
      },
      {
        pattern: 'keep + gerund',
        example: 'Keep practicing!',
        ru: 'продолжать — keep + -ing',
      },
      {
        pattern: 'mention + gerund',
        example: 'She mentioned seeing him.',
        ru: 'упоминать — mention + -ing',
      },
      {
        pattern: 'mind + gerund',
        example: 'Do you mind waiting?',
        ru: 'возражать — mind + -ing',
      },
      {
        pattern: 'miss + gerund',
        example: 'I miss seeing old friends.',
        ru: 'скучать по… — miss + -ing',
      },
      {
        pattern: 'postpone + gerund',
        example: 'We postponed leaving.',
        ru: 'откладывать — postpone + -ing',
      },
      {
        pattern: 'practice + gerund',
        example: 'Practice speaking daily.',
        ru: 'практиковаться — practice + -ing',
      },
      {
        pattern: 'quit + gerund',
        example: 'He quit smoking.',
        ru: 'бросить привычку — quit + -ing',
      },
      {
        pattern: 'recommend + gerund',
        example: 'I recommend taking notes.',
        ru: 'рекомендовать — recommend + -ing',
      },
      {
        pattern: 'resent + gerund',
        example: 'She resents working late.',
        ru: 'негодовать — resent + -ing',
      },
      {
        pattern: 'risk + gerund',
        example: 'Don’t risk losing money.',
        ru: 'рисковать — risk + -ing',
      },
      {
        pattern: 'suggest + gerund',
        example: 'He suggested leaving early.',
        ru: 'предлагать — suggest + -ing',
      },
      {
        pattern: 'tolerate + gerund',
        example: 'I can’t tolerate cheating.',
        ru: 'терпеть — tolerate + -ing',
      },
      {
        pattern: 'understand + gerund',
        example: 'I understand your wanting help.',
        ru: 'понимать (формально) — understand + -ing',
      },
    ],
  },
  {
    id: 'infinitive_only',
    rows: [
      {
        pattern: 'afford + infinitive',
        example: 'We can’t afford to waste time.',
        ru: 'позволить себе — afford + to + V',
      },
      {
        pattern: 'agree + infinitive',
        example: 'She agreed to help.',
        ru: 'соглашаться — agree + to + V',
      },
      {
        pattern: 'appear + infinitive',
        example: 'He appeared to know the answer.',
        ru: 'казаться — appear + to + V',
      },
      {
        pattern: 'arrange + infinitive',
        example: 'I arranged to meet them.',
        ru: 'договориться — arrange + to + V',
      },
      {
        pattern: 'ask + infinitive',
        example: 'She asked to leave early.',
        ru: 'просить — ask + to + V',
      },
      {
        pattern: 'choose + infinitive',
        example: 'He chose to stay silent.',
        ru: 'выбирать — choose + to + V',
      },
      {
        pattern: 'claim + infinitive',
        example: 'He claimed to be innocent.',
        ru: 'утверждать — claim + to + V',
      },
      {
        pattern: 'decide + infinitive',
        example: 'We decided to stay.',
        ru: 'решать — decide + to + V',
      },
      {
        pattern: 'demand + infinitive',
        example: 'They demanded to see the manager.',
        ru: 'требовать — demand + to + V',
      },
      {
        pattern: 'deserve + infinitive',
        example: 'She deserves to win.',
        ru: 'заслуживать — deserve + to + V',
      },
      {
        pattern: 'expect + infinitive',
        example: 'I expect to arrive by six.',
        ru: 'ожидать — expect + to + V',
      },
      {
        pattern: 'fail + infinitive',
        example: 'He failed to reply.',
        ru: 'не суметь — fail + to + V',
      },
      {
        pattern: 'help + infinitive',
        example: 'Could you help me to carry this?',
        ru: 'help + (to) + V — часто без to в разговорной речи',
      },
      {
        pattern: 'hesitate + infinitive',
        example: 'Don’t hesitate to ask.',
        ru: 'колебаться — hesitate + to + V',
      },
      {
        pattern: 'hope + infinitive',
        example: 'I hope to see you soon.',
        ru: 'надеяться — hope + to + V',
      },
      {
        pattern: 'learn + infinitive',
        example: 'She learned to drive.',
        ru: 'научиться — learn + to + V',
      },
      {
        pattern: 'manage + infinitive',
        example: 'He managed to escape.',
        ru: 'удаётся — manage + to + V',
      },
      {
        pattern: 'need + infinitive',
        example: 'You need to rest.',
        ru: 'нужно — need + to + V',
      },
      {
        pattern: 'offer + infinitive',
        example: 'She offered to help.',
        ru: 'предлагать — offer + to + V',
      },
      {
        pattern: 'plan + infinitive',
        example: 'They plan to travel.',
        ru: 'планировать — plan + to + V',
      },
      {
        pattern: 'prepare + infinitive',
        example: 'We prepared to leave.',
        ru: 'готовиться — prepare + to + V',
      },
      {
        pattern: 'pretend + infinitive',
        example: 'He pretended not to hear.',
        ru: 'притворяться — pretend + to + V',
      },
      {
        pattern: 'promise + infinitive',
        example: 'I promised to call.',
        ru: 'обещать — promise + to + V',
      },
      {
        pattern: 'refuse + infinitive',
        example: 'He refused to answer.',
        ru: 'отказываться — refuse + to + V',
      },
      {
        pattern: 'seem + infinitive',
        example: 'You seem to know a lot.',
        ru: 'казаться — seem + to + V',
      },
      {
        pattern: 'struggle + infinitive',
        example: 'She struggled to concentrate.',
        ru: 'напрягаться — struggle + to + V',
      },
      {
        pattern: 'swear + infinitive',
        example: 'He swore to tell the truth.',
        ru: 'клясться — swear + to + V',
      },
      {
        pattern: 'tend + infinitive',
        example: 'People tend to forget.',
        ru: 'иметь склонность — tend + to + V',
      },
      {
        pattern: 'threaten + infinitive',
        example: 'They threatened to strike.',
        ru: 'угрожать — threaten + to + V',
      },
      {
        pattern: 'volunteer + infinitive',
        example: 'She volunteered to organize it.',
        ru: 'вызываться — volunteer + to + V',
      },
      {
        pattern: 'wait + infinitive',
        example: 'I waited to hear the news.',
        ru: 'ждать — wait + to + V',
      },
      {
        pattern: 'want + infinitive',
        example: 'I want to learn.',
        ru: 'хотеть — want + to + V',
      },
      {
        pattern: 'wish + infinitive',
        example: 'We wish to complain.',
        ru: 'формально «хотеть» — wish + to + V',
      },
      {
        pattern: 'would like + infinitive',
        example: 'I’d like to order tea.',
        ru: 'would like + to + V',
      },
      {
        pattern: 'yearn + infinitive',
        example: 'She yearned to return home.',
        ru: 'страстно желать — yearn + to + V',
      },
    ],
  },
  {
    id: 'either_ok',
    rows: [
      {
        pattern: 'begin + both',
        example: 'It began to rain. / It began raining.',
        ru: 'начинать — часто оба варианта',
      },
      {
        pattern: 'bother + both',
        example: 'Don’t bother to knock. / Don’t bother knocking.',
        ru: 'bother + to / -ing',
      },
      {
        pattern: 'continue + both',
        example: 'She continued to work. / She continued working.',
        ru: 'продолжать — оба OK',
      },
      {
        pattern: 'hate + both',
        example: 'I hate to tell you. / I hate telling people.',
        ru: 'не любить — оттенок может отличаться',
      },
      {
        pattern: 'like + both',
        example: 'I like to swim. / I like swimming.',
        ru: 'нравится — оба часто возможны',
      },
      {
        pattern: 'love + both',
        example: 'I love to read. / I love reading.',
        ru: 'любить — оба',
      },
      {
        pattern: 'prefer + both',
        example: 'I prefer to walk. / I prefer walking.',
        ru: 'предпочитать — оба',
      },
      {
        pattern: 'start + both',
        example: 'He started to laugh. / He started laughing.',
        ru: 'начать — оба',
      },
    ],
  },
  {
    id: 'meaning_differs',
    rows: [
      {
        pattern: 'forget + gerund (past fact)',
        example: 'I’ll never forget seeing Rome.',
        ru: 'никогда не забуду факт — forget + -ing',
      },
      {
        pattern: 'forget + infinitive (task)',
        example: 'Don’t forget to lock up.',
        ru: 'не забудь сделать — forget + to + V',
      },
      {
        pattern: 'go on + gerund',
        example: 'After lunch she went on working.',
        ru: 'продолжила то же — go on + -ing',
      },
      {
        pattern: 'go on + infinitive',
        example: 'After Paris we went on to visit Lyon.',
        ru: 'перешли к следующему — go on + to + V',
      },
      {
        pattern: 'remember + gerund (past)',
        example: 'I remember locking the door.',
        ru: 'помню, что делал — remember + -ing',
      },
      {
        pattern: 'remember + infinitive (reminder)',
        example: 'Remember to lock the door.',
        ru: 'не забудь — remember + to + V',
      },
      {
        pattern: 'regret + gerund (past)',
        example: 'I regret telling him.',
        ru: 'сожалею о прошлом — regret + -ing',
      },
      {
        pattern: 'regret + infinitive (formal news)',
        example: 'We regret to inform you…',
        ru: 'формально сообщить плохие новости — regret + to + V',
      },
      {
        pattern: 'stop + gerund (quit)',
        example: 'Stop talking!',
        ru: 'прекрати действие — stop + -ing',
      },
      {
        pattern: 'stop + infinitive (purpose)',
        example: 'He stopped to buy milk.',
        ru: 'остановился, чтобы — stop + to + V',
      },
      {
        pattern: 'try + gerund (test)',
        example: 'Try turning it off and on.',
        ru: 'попробуй метод — try + -ing',
      },
      {
        pattern: 'try + infinitive (effort)',
        example: 'Try to stay calm.',
        ru: 'стараться — try + to + V',
      },
    ],
  },
  {
    id: 'prep_plus_gerund',
    rows: [
      {
        pattern: 'look forward to + gerund',
        example: 'I’m looking forward to seeing you.',
        ru: 'ждать с нетерпением — to здесь предлог!',
      },
      {
        pattern: 'object to + gerund',
        example: 'She objects to working Sundays.',
        ru: 'возражать против — object to + -ing',
      },
      {
        pattern: 'be accustomed to + gerund',
        example: 'He’s accustomed to getting up early.',
        ru: 'привыкнуть к — accustomed to + -ing',
      },
      {
        pattern: 'be used to + gerund',
        example: 'I’m used to walking alone.',
        ru: 'привык к — used to + -ing (не путать с used to + V)',
      },
      {
        pattern: 'devote … to + gerund',
        example: 'She devotes time to studying.',
        ru: 'посвящать — devote to + -ing',
      },
      {
        pattern: 'in addition to + gerund',
        example: 'In addition to teaching, he writes.',
        ru: 'в дополнение к — in addition to + -ing',
      },
      {
        pattern: 'thank … for + gerund',
        example: 'Thank you for helping.',
        ru: 'благодарить за — for + -ing',
      },
      {
        pattern: 'apologize for + gerund',
        example: 'She apologized for being late.',
        ru: 'извиняться за — for + -ing',
      },
      {
        pattern: 'insist on + gerund',
        example: 'He insisted on paying.',
        ru: 'настаивать на — on + -ing',
      },
      {
        pattern: 'succeed in + gerund',
        example: 'She succeeded in solving it.',
        ru: 'преуспеть в — succeed in + -ing',
      },
      {
        pattern: 'think about + gerund',
        example: 'Think about moving closer.',
        ru: 'думать о — about + -ing',
      },
      {
        pattern: 'dream of + gerund',
        example: 'She dreams of becoming a pilot.',
        ru: 'мечтать о — of + -ing',
      },
    ],
  },
  {
    id: 'expressions',
    rows: [
      {
        pattern: 'It’s no good + gerund',
        example: 'It’s no good arguing.',
        ru: 'бесполезно — It’s no good + -ing',
      },
      {
        pattern: 'It’s no use + gerund',
        example: 'It’s no use crying.',
        ru: 'нет смысла — It’s no use + -ing',
      },
      {
        pattern: 'can’t stand + gerund',
        example: 'I can’t stand waiting.',
        ru: 'не выношу — can’t stand + -ing',
      },
      {
        pattern: 'there’s no point in + gerund',
        example: 'There’s no point in rushing.',
        ru: 'нет смысла — no point in + -ing',
      },
      {
        pattern: 'have difficulty + gerund',
        example: 'We had difficulty finding it.',
        ru: 'трудность — difficulty + -ing',
      },
      {
        pattern: 'spend time + gerund',
        example: 'She spends hours studying.',
        ru: 'тратить время — spend… + -ing',
      },
      {
        pattern: 'waste time + gerund',
        example: 'Don’t waste time arguing.',
        ru: 'терять время — waste time + -ing',
      },
      {
        pattern: 'be busy + gerund',
        example: 'He’s busy preparing slides.',
        ru: 'занят чем-то — busy + -ing',
      },
      {
        pattern: 'make progress + gerund',
        example: 'She’s making progress learning Russian.',
        ru: 'прогресс — progress + in + -ing (часто)',
      },
    ],
  },
];
