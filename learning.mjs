const topics = [
  ['숙어', /\b(?:break|breaks|broke|broken|breaking)\s+the\s+ice\b/gi, 'break the ice', '어색한 분위기를 풀다', '처음 만났거나 대화가 어색할 때 먼저 말을 꺼내 분위기를 편하게 만든다는 표현입니다.', 'She told a joke to break the ice.', '그녀는 어색한 분위기를 풀려고 농담을 했다.'],
  ['숙어', /\ba\s+piece\s+of\s+cake\b/gi, 'a piece of cake', '아주 쉬운 일', '어떤 일이 쉽게 느껴진다는 뜻으로 쓰입니다. 음식 이야기에서는 문자 그대로 케이크 한 조각을 뜻할 수도 있습니다.', 'The test was a piece of cake.', '시험은 식은 죽 먹기였다.'],
  ['숙어', /\bonce\s+in\s+a\s+blue\s+moon\b/gi, 'once in a blue moon', '아주 가끔', '일이 매우 드물게 일어난다는 뜻의 부사구입니다.', 'We eat out once in a blue moon.', '우리는 아주 가끔 외식한다.'],
  ['숙어', /\bunder\s+the\s+weather\b/gi, 'under the weather', '몸이 좀 안 좋은', '가벼운 몸살이나 컨디션 저하를 완곡하게 말할 때 씁니다.', 'I’m feeling a little under the weather.', '나 몸이 좀 안 좋아.'],
  ['숙어', /\bof\s+(?:my|your|his|her|its|our|their)\s+own\b/gi, 'of one’s own', '자기만의', '명사 뒤에서 소유나 독립성을 강조합니다. own 앞의 소유격은 주체에 맞춰 바꿉니다.', 'She has a room of her own.', '그녀에게는 자기만의 방이 있다.'],
  ['구어 표현', /\bgonna\b/gi, 'gonna', '~할 거야', 'going to의 비격식 발음 표기입니다. 뒤에 동사원형을 붙여 계획이나 예측을 말합니다.', 'I’m gonna call you later.', '이따 전화할게.'],
  ['구어 표현', /\bwanna\b/gi, 'wanna', '~하고 싶어', 'want to를 빠르게 발음한 형태를 글로 옮긴 표현입니다. 뒤에 동사원형이 옵니다.', 'Do you wanna come with us?', '우리랑 같이 갈래?'],
  ['구어 표현', /\bgotta\b/gi, 'gotta', '~해야 해', '(have) got to의 비격식 발음 표기로 의무나 필요를 나타냅니다.', 'I gotta go now.', '나 이제 가야 해.'],
  ['구어 표현', /\bhang\s+out\b/gi, 'hang out', '같이 시간을 보내다', '친구와 편하게 어울리거나 특정 장소에서 시간을 보낼 때 씁니다. 함께 있는 사람은 with 뒤에 붙입니다.', 'We hang out after school.', '우리는 방과 후에 같이 놀아.'],
  ['구어 표현', /\byou\s+bet\b/gi, 'you bet', '물론이지', '상대의 부탁이나 확인에 흔쾌히 동의하는 비격식 대답입니다.', '“Can you help?” “You bet!”', '“도와줄 수 있어?” “물론이지!”'],
  ['구동사', /\blook(?:s|ed|ing)?\s+out\s+(?:over|onto)\b/gi, 'look out over / onto', '~을 내다보다, ~이 내다보이다', '창문이나 방이 어느 곳을 향해 있는지 설명할 때 씁니다. 사람이 주어라면 그곳을 내다본다는 뜻이 됩니다.', 'Our room looks out over the sea.', '우리 방에서는 바다가 내다보인다.'],
  ['구동사', /\b(?:find|finds|found|finding)\s+out\b/gi, 'find out', '알아내다, 알게 되다', '정보나 사실을 알게 되었을 때 씁니다. 뒤에 what, why, that으로 시작하는 절이 올 수 있습니다.', 'I found out why she left.', '나는 그녀가 왜 떠났는지 알게 됐다.'],
  ['구동사', /\bgiv(?:e|es|ing)\s+up\b|\bgave\s+up\b|\bgiven\s+up\b/gi, 'give up', '포기하다, 그만두다', '행동을 그만둔다는 뜻으로 쓸 때는 give up 뒤에 동명사(-ing)를 붙일 수 있습니다.', 'He gave up smoking.', '그는 담배를 끊었다.'],
  ['문법', /\beven\s+though\b/gi, 'even though + 주어 + 동사', '~인데도, ~이지만', '실제로 그렇다고 말하는 사실을 제시한 뒤, 그 사실에서 기대하기 어려운 결과를 주절에 둡니다.', 'We went out even though it was raining.', '비가 오고 있었는데도 우리는 밖에 나갔다.'],
  ['문법', /\benough\s+to\s+[a-z]+\b/gi, '(형용사·부사) + enough + to부정사', '~할 만큼 충분히', 'enough는 정도를 나타내는 형용사나 부사 뒤에 옵니다. to부정사는 그 정도에서 가능한 행동을 나타냅니다.', 'It’s warm enough to swim.', '수영할 만큼 따뜻하다.'],
  ['문법', /\benough\s+[a-z]+\s+to\s+[a-z]+\b/gi, 'enough + 명사 + to부정사', '~하기에 충분한 양의 …', 'enough는 양을 나타낼 때 명사 앞에 옵니다. 뒤의 to부정사는 그 양으로 할 수 있는 일을 나타냅니다.', 'We have enough time to finish.', '우리는 끝낼 시간이 충분하다.'],
  ['문법', /\bused\s+to\s+(?:be|have|go|live|work|play|walk|read|say|think|know|like)\b/gi, 'used to + 동사원형', '예전에 ~하곤 했다, 예전에는 ~였다', '과거의 습관이나 상태를 말할 때 씁니다. 보통 지금은 상황이 달라졌다는 뜻을 내포합니다.', 'I used to walk to school.', '나는 예전에 학교에 걸어 다녔다.'],
  ['문법', /\b(?:had|hadn[’']t)\s+(?:(?:once|already|just|never|never\s+before|not)\s+)?(?:been|gone|done|seen|written|eaten|found|left|told|walked|crossed|finished|arrived|started|spoken|met|forgotten)\b/gi, 'had + 과거분사', '과거의 기준 시점보다 앞선 일', '과거완료는 이미 과거인 시점에 기준을 두고, 그보다 앞선 사건이나 그때까지의 경험을 나타냅니다.', 'She had left before I arrived.', '내가 도착하기 전에 그녀는 이미 떠난 뒤였다.'],
  ['문법', /\b(?:am|is|are|was|were|been|being)\s+(?:tucked|built|written|made|chosen|sent|found|told|published)\b/gi, 'be + 과거분사', '수동태', '행동을 받는 대상을 주어로 두는 구조입니다. 행동을 한 사람이나 사물이 중요하면 by 뒤에 덧붙일 수 있습니다.', 'The letter was written by Mina.', '그 편지는 미나가 썼다.'],
  ['문법', /\bnot\s+only\b[^.!?;\n]{1,75}\bbut\s+also\b/gi, 'not only A but also B', 'A뿐만 아니라 B도', '두 요소를 연결하면서 B를 강조합니다. A와 B는 가능하면 같은 문법 형태로 맞춥니다.', 'She speaks not only English but also Spanish.', '그녀는 영어뿐만 아니라 스페인어도 한다.'],
  ['문법', /\bstop(?:s|ped|ping)?\s+to\s+[a-z]+\b/gi, 'stop + to부정사', '~하려고 멈추다', '진행 중이던 행동을 멈추고 뒤에 나오는 행동을 한다는 뜻입니다. stop 뒤에 동명사가 오면 그 행동 자체를 그만둔다는 뜻입니다.', 'We stopped to take a photo.', '우리는 사진을 찍으려고 멈췄다.']
];

export function findTopics(text) {
  return topics.flatMap(([type, pattern, title, korean, explanation, example, translation]) =>
    Array.from(text.matchAll(pattern), match => ({
      type, title, korean, explanation, example, translation, excerpt: match[0],
      start: match.index, end: match.index + match[0].length
    }))
  ).filter(({start,end})=>
    !/[a-z][’'-]$/i.test(text.slice(Math.max(0,start-2),start)) &&
    !/^[’'-][a-z]/i.test(text.slice(end,end+2))
  ).sort((a,b)=>a.start-b.start || a.end-b.end);
}

export const grammarPatterns = topics.filter(([type])=>type==='문법').map(([, , title])=>title);
