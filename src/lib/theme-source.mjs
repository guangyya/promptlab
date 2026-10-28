import themeData from './theme-data.json' with { type: 'json' };
import communityData from './community-data.json' with { type: 'json' };
import { communitySource } from './community-source.mjs';
import { applyPromptOptions } from './prompt-options.mjs';
const sha = themeData.sha;
const definitions = [
 ['agnoster','Agnoster','Powerline segments with contextual status.','single','Powerline','#89b4d4'],
 ['robbyrussell','Robbyrussell','A compact directory and Git prompt.','single','Minimal','#a6ca91'],
 ['bira','Bira','A framed prompt with room for commands.','double','Two lines','#c5a4d3'],
 ['af-magic','AF Magic','Directory, context and a full-width separator.','double','Context','#c5a4d3'],
 ['ys','YS','A detailed workspace overview.','double','Context','#e2c185'],
 ['avit','Avit','Git status with a clean command line.','double','Git','#a6ca91'],
 ['clean','Clean','A familiar prompt with a right-hand clock.','single','Minimal','#89b4d4'],
 ['candy','Candy','Colorful identity, directory and Git details.','double','Colorful','#c5a4d3'],
 ['simple','Simple','Directory and branch, without extra decoration.','single','Minimal','#a6ca91'],
 ['arrow','Arrow','A short path with Git details on the right.','single','Minimal','#e2c185'],
 ['fishy','Fishy','A shortened directory inspired by Fish.','single','Compact','#a6ca91'],
 ['cloud','Cloud','A small cloud and a colorful Git branch.','single','Icons','#80c4c2'],
 ['lambda','Lambda','A quiet prompt with a lambda marker.','single','Minimal','#a6ca91'],
 ['minimal','Minimal','A short path and a subtle branch indicator.','single','Minimal','#cbd5e1'],
 ['awesomepanda','Awesomepanda','A familiar arrow with vivid accents.','single','Colorful','#80c4c2'],
 ['tonotdo','Tonotdo','Compact identity, branch and time.','single','Compact','#89b4d4'],
 ['dst','DST','A two-line prompt with visible failures.','double','Two lines','#c5a4d3'],
 ['terminalparty','Terminalparty','A minimal prompt with context on the right.','single','Minimal','#e2c185'],
];
export const themes = definitions.map(([id,name,description,layout,tag,color]) => ({id,name,description,layout,tags:[tag,'Git'],color,group:'omz',repo:'ohmyzsh/ohmyzsh',sha,license:'MIT',licenseText:themeData.license,url:`https://github.com/ohmyzsh/ohmyzsh/blob/${sha}/themes/${id}.zsh-theme`}));
for (const [id,name,description,layout,tag,color] of [
 ['pure','Pure','A minimal two-line prompt by Sindre Sorhus.','double','Minimal','#c5a4d3'],
 ['spaceship','Spaceship','A modular prompt for development environments.','double','Modules','#a6ca91'],
 ['powerlevel10k','Powerlevel10k','A highly configurable Powerline-style prompt.','double','Powerline','#89b4d4'],
 ['dracula','Dracula','A dark-theme favorite with vivid colors.','double','Colorful','#c5a4d3'],
 ['bullet-train','Bullet Train','Powerline segments for time, directory and Git.','double','Powerline','#89b4d4'],
 ['typewritten','Typewritten','A quiet two-line layout with asynchronous Git details.','double','Minimal','#c5a4d3'],
 ['geometry','Geometry','A geometric marker with Git details on the right.','single','Minimal','#cbd5e1'],
 ['alien','Alien','Modular Powerline sections with a vivid blue palette.','double','Powerline','#80c4c2'],
 ['powerlevel9k','Powerlevel9k','The classic Powerline prompt. Upstream is archived.','double','Powerline','#89b4d4'],
 ['agkozak','Agkozak','A responsive prompt with compact path and Git status.','double','Context','#a6ca91'],
 ['git-prompt','Git Prompt','A compact path with detailed asynchronous Git counts.','single','Git','#c5a4d3'],
 ['lambda-mod','Lambda Mod','A lambda, short path and a separate command line.','double','Two lines','#a6ca91'],
]) { const data=communityData[id]; themes.push({id,name,description,layout,tags:[tag,'Git'],color,group:'community',repo:data.repo,sha:data.sha,license:data.licenseId||'MIT',licenseText:data.license,url:`https://github.com/${data.repo}`,dependency:data.dependency===false?undefined:id}); }
themes.push({id:'studio',name:'Studio',description:'Build a prompt with your choice of details.',layout:'double',tags:['Builder','Two lines'],color:'#a6ca91',group:'custom',license:'MIT',licenseText:themeData.license,url:null});
const scenarios=['clean','dirty','failed','long','venv','ssh','conflict'];
const accents={original:null,mint:'green',cyan:'cyan',lavender:'magenta',amber:'yellow',blue:'blue'};
const symbols=['auto','❯','➜','λ','$'];
export const allowedCommands=['pwd','ls','ls -la','git status','git status --short','git branch','git log --oneline -3','git diff --stat','git merge --continue','whoami','hostname','python --version','which python','cat missing.txt','true','false','echo hello','clear','cd ..','cd ~','cd ~/code/promptlab','help'];
export const upstream={sha,license:themeData.license};
export function getTheme(c) { return themes.find(t=>t.id===c.theme) || (c.imported?.id===c.theme ? c.imported : null); }
export function cleanName(value) { return String(value||'').replace(/[\r\n\x00-\x1f]/g,'').slice(0,64); }
export function fileStem(c) { return (cleanName(c.name||getTheme(c)?.name||c.theme).normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^[-.]+|[-.]+$/g,'')||'my-theme').toLowerCase(); }
export function config(raw={}) {
 const imported=raw.imported;
 if(imported) {
  if(typeof imported.id!=='string'||!/^import-[a-z0-9-]{1,80}$/.test(imported.id)||typeof imported.source!=='string'||(imported.source.length>64000||/[\x00\x1b]/.test(imported.source)))throw Error('Invalid imported theme.');
  if(typeof imported.url!=='string'||!/^https:\/\/(github\.com|raw\.githubusercontent\.com)\//.test(imported.url))throw Error('Invalid theme source URL.');
 }
 if(!themes.some(t=>t.id===raw.theme)&&imported?.id!==raw.theme)throw Error('Unknown theme.');
 if(!Object.hasOwn(accents,raw.accent))throw Error('Unknown accent.');
 if(!symbols.includes(raw.symbol))throw Error('Unknown prompt symbol.');
 if(!scenarios.includes(raw.scenario))throw Error('Unknown scenario.');
 const context=raw.context??'theme',directory=raw.directory??'theme',commandLine=raw.commandLine??'theme';
 if(!['theme','user','host','user-host'].includes(context)||!['theme','basename','full'].includes(directory)||!['theme','newline'].includes(commandLine))throw Error('Unknown prompt option.');
 if(raw.sourceOverride!==undefined&&(typeof raw.sourceOverride!=='string'||!raw.sourceOverride.trim()||raw.sourceOverride.length>64000||/[\x00\x1b]/.test(raw.sourceOverride)))throw Error('Invalid edited source.');
 return {theme:raw.theme,name:cleanName(raw.name),accent:raw.accent,symbol:raw.symbol,scenario:raw.scenario,git:raw.git!==false,user:raw.user!==false,multiline:raw.multiline!==false,context,directory,commandLine,clock:raw.clock===true,...(raw.sourceOverride!==undefined?{sourceOverride:raw.sourceOverride}:{}),cols:Math.round(Math.max(40,Math.min(180,Number(raw.cols)||80))),rows:24,...(imported?{imported:{id:imported.id,source:imported.source,name:cleanName(imported.name)||'Imported theme',url:imported.url,repo:cleanName(imported.repo),sha:/^[0-9a-f]{40}$/.test(imported.sha||'')?imported.sha:undefined,group:'imported',tags:['Imported'],color:'#a6a6a6',layout:imported.layout==='double'?'double':'single',description:cleanName(imported.description||imported.repo),license:/Permission is hereby granted/i.test(String(imported.licenseText||''))?'MIT':'Not verified',licenseText:String(imported.licenseText||'').slice(0,16000)}}:{})};
}
function dependencySource(c,t) {
 const color=accents[c.accent]||(t.id==='spaceship'?'cyan':'blue'), symbol=c.symbol==='auto'?(t.id==='spaceship'||t.id==='dracula'?'➜':'❯'):c.symbol;
 const base='${ZSH_CUSTOM:-$ZSH/custom}/themes/';
 if(t.id==='dracula')return `# Requires ${t.url}\nDRACULA_DISPLAY_GIT=${c.git?1:0}\nDRACULA_DISPLAY_CONTEXT=1\nDRACULA_DISPLAY_NEW_LINE=1\nDRACULA_DISPLAY_FULL_CWD=1\nDRACULA_ARROW_ICON='${symbol} '\nsource "${base}dracula/dracula.zsh-theme"\n`;
 if(t.id==='pure')return `# Requires ${t.url}\nfpath=("${base}pure" $fpath)\nPURE_PROMPT_SYMBOL='${symbol}'\nPURE_PROMPT_VICMD_SYMBOL='${symbol}'\nzstyle ':prompt:pure:path' color ${color}\nzstyle ':prompt:pure:git:branch' color magenta\n${c.git?'':"zstyle ':prompt:pure:git:*' color default\n"}autoload -U promptinit; promptinit\n# The repository contains pure.zsh and async.zsh.\nsource "${base}pure/async.zsh"\nsource "${base}pure/pure.zsh"\n${c.git?'':'function prompt_pure_async_tasks() { prompt_pure_reset_git_info; }\n'}\n`;
 if(t.id==='spaceship')return `# Requires ${t.url}\nSPACESHIP_PROMPT_ORDER=(user dir ${c.git?'git ':''}venv exec_time line_sep char)\nSPACESHIP_DIR_COLOR='${color}'\nSPACESHIP_CHAR_SYMBOL='${symbol} '\nSPACESHIP_CHAR_SUFFIX=''\nsource "${base}spaceship/spaceship.zsh-theme"\n`;
 return `# Requires ${t.url}\ntypeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir ${c.git?'vcs ':''}newline prompt_char)\ntypeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status)\ntypeset -g POWERLEVEL9K_DIR_FOREGROUND=${color}\ntypeset -g POWERLEVEL9K_PROMPT_CHAR_OK_VIINS_CONTENT_EXPANSION='${symbol}'\ntypeset -g POWERLEVEL9K_PROMPT_CHAR_ERROR_VIINS_CONTENT_EXPANSION='${symbol}'\nsource "${base}powerlevel10k/powerlevel10k.zsh-theme"\n`;
}
export function themeSource(c) {
 const t=getTheme(c); if(!t)throw Error('Unknown theme.');
 if(c.sourceOverride!==undefined)return c.sourceOverride;
 const color=accents[c.accent]||'green', symbol=c.symbol==='auto'?'❯':c.symbol;
 let code;
 if(c.theme==='studio') {
  const first=(c.user?'%F{242}%n@%m%f ':'')+`%F{${color}}%~%f`+(c.git?' $(git_prompt_info)':'');
  code=`ZSH_THEME_GIT_PROMPT_PREFIX='%F{242}on %F{magenta}'\nZSH_THEME_GIT_PROMPT_SUFFIX='%f'\nZSH_THEME_GIT_PROMPT_DIRTY='%F{yellow} *%f'\nZSH_THEME_GIT_PROMPT_CLEAN=''\nPROMPT='${first}${c.multiline?'\n':' '}%(?.%F{${color}}.%F{red})${symbol}%f '\nRPROMPT='%(?..%F{red}exit %?%f)'\n`;
 } else if(communityData[t.id]?.entry) code=communitySource(c,t,communityData[t.id]);
 else if(t.dependency&&t.id!=='dracula') code=dependencySource(c,t);
 else {
  code=c.imported?.source || (c.theme==='dracula'?communityData.dracula.files['dracula.zsh-theme']:themeData.sources[c.theme]);
  if(c.theme==='dracula')code=`DRACULA_DISPLAY_GIT=${c.git?1:0}\nDRACULA_DISPLAY_CONTEXT=1\nDRACULA_DISPLAY_NEW_LINE=1\nDRACULA_DISPLAY_FULL_CWD=1\nDRACULA_ARROW_ICON='${c.symbol==='auto'?'➜':c.symbol} '\n`+code;
  if(c.accent!=='original') {
   code=code.replace(/(fg(?:_bold|_no_bold)?\[)(green|cyan|blue|magenta)(\])/g,`$1${color}$3`).replace(/%F\{(?:green|cyan|blue|magenta)\}/g,`%F{${color}}`);
   if(c.theme==='af-magic')code=code.replaceAll('${FG[032]}','${FG['+({green:'078',cyan:'081',magenta:'141',yellow:'214',blue:'075'}[color])+']}');
   if(c.theme==='agnoster')code=`AGNOSTER_DIR_BG=${color}\nAGNOSTER_VENV_BG=${color}\n`+code;
  }
  if(c.symbol!=='auto') {
   const replacements={robbyrussell:['➜',symbol],bira:["local user_symbol='%(!.#.$)'",`local user_symbol='${symbol}'`],'af-magic':['%(!.#.»)',symbol],ys:['$ %{$reset_color%}',`${symbol} %{$reset_color%}`],avit:['▶',symbol],clean:['%(!.#.$)',symbol],candy:['%#',symbol],arrow:['➤',symbol],fishy:['%(!.#.>)',symbol],lambda:['λ ',symbol+' '],minimal:['»',symbol],awesomepanda:['➜',symbol],tonotdo:['»',symbol],terminalparty:[' %% ',' '+symbol+' ']};
   const r=replacements[c.theme];
   if(c.theme==='dracula'){ /* The marker is configured before the upstream code. */ }
   else if(c.theme==='dst')code+=`\nfunction prompt_char() { print -nr -- '${symbol}'; }\n`;
   else if(c.theme==='cloud')code=code.replace(' % %{$reset_color%}',` ${symbol} %{$reset_color%}`);
   else
   if(r&&code.includes(r[0]))code=code.replaceAll(r[0],()=>r[1]);
   else code+=`\n# Custom command marker\nPROMPT+=' %F{${color}}${symbol}%f '\n`;
  }
  if(!c.git)code+='\nfunction git_prompt_info() { :; }\nfunction git_prompt_status() { :; }\n'+(c.theme==='agnoster'?'function prompt_git() { :; }\n':'')+(c.theme==='avit'?'function _git_time_since_commit() { :; }\n':'');
 }
 code=applyPromptOptions(c,code);
 return `# ${cleanName(c.name||t.name)}\n# Source: ${t.url||'Promptlab Studio'}\n${t.sha?'# Revision: '+t.sha+'\n':''}# License: ${t.license||'Not verified'}\n# Requires Oh My Zsh${t.dependency?' and '+t.name:''}.\n\n${code}`;
}
