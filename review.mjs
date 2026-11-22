import {grammarPatterns} from './learning.mjs';

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function normalizeAnswer(text) {
  return text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
}

function vocabularyQuestion(entry) {
  const answer = entry.word;
  const clue = entry.korean || entry.definitions?.[0]?.definition;
  if (clue) return {answer, clue, instruction:'뜻을 보고 본문에 나온 영어 단어나 표현을 입력하세요.'};
  const escaped = answer.trim().replace(/[.*+?^\x24{}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
  if (!escaped) return null;
  const pattern = new RegExp('(?<![a-z])' + escaped + '(?![a-z])','gi');
  const context = entry.context?.replace(pattern,'____');
  if (!context || context===entry.context) return null;
  return {answer, clue:context, instruction:'본문의 빈칸에 들어갈 영어 단어나 표현을 입력하세요.'};
}

export function entryGroup(value) {
  return value.topic?.type==='문법' ? 'grammar' : 'vocabulary';
}

function grammarQuestion({topic}) {
  return {
    instruction:'설명에 해당하는 문법을 고르세요.',
    answer:topic.title,
    clue:topic.explanation,
    example:topic.example,
    translation:topic.translation,
    options:shuffle([topic.title,...shuffle(grammarPatterns.filter(title=>title!==topic.title)).slice(0,3)])
  };
}

export function reviewQuestions(entries) {
  return shuffle(entries.map(entry=>entryGroup(entry)==='grammar' ? grammarQuestion(entry) : vocabularyQuestion(entry)).filter(Boolean));
}
