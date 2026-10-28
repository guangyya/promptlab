import { inspectSource } from './import-preview.mjs';

// Basic checks only: this deliberately does not claim to be a Zsh parser.
export function checkSource(source) {
 const errors=[];
 if(typeof source!=='string'||!source.trim())errors.push('Enter some theme source first.');
 else if(source.length>64000)errors.push('Keep the source under 64,000 characters.');
 else if(/[\x00\x1b]/.test(source))errors.push('Remove binary or terminal escape characters from the source.');
 if(errors.length)return {errors,preview:{supported:false,reason:errors[0]}};
 // Catch unfinished literal prompt assignments without parsing functions or expansions.
 for(const match of source.matchAll(/^[ \t]*(?:PROMPT|RPROMPT|PS1|RPS1)\s*\+?=\s*(\$?)(['"])/gm)) {
  const quote=match[2],start=match.index+match[0].length;
  let closed=false;
  for(let i=start;i<source.length;i++) {
   if(source[i]==='\\'&&(quote==='"'||match[1]==='$')){i++;continue;}
   if(source[i]===quote){closed=true;break;}
  }
  if(!closed)errors.push(`Close the ${quote==='"'?'double':'single'} quote in the prompt assignment on line ${source.slice(0,match.index).split('\n').length}.`);
 }
 return {errors,preview:errors.length?{supported:false,reason:errors[0]}:inspectSource(source)};
}
