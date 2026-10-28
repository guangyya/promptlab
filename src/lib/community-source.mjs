// Curated adapters use upstream settings or include the pinned upstream source.
// Nothing in this module executes downloaded shell code in the browser.
export function communitySource(c, t, data) {
 const colors={mint:'green',cyan:'cyan',lavender:'magenta',amber:'yellow',blue:'blue'};
 const accent=colors[c.accent], color=accent||'blue';
 const defaults={'bullet-train':'$',typewritten:'❯',geometry:'▲',alien:'❱',powerlevel9k:'❯',agkozak:'$', 'git-prompt':'❯❯❯','lambda-mod':'λ'};
 const symbol=c.symbol==='auto'?defaults[t.id]:c.symbol;
 const path='${ZSH_CUSTOM:-$ZSH/custom}/themes/'+t.id;
 const source=`source "${path}/${data.entry}"\n`;
 switch(t.id) {
  case 'bullet-train':
   return `BULLETTRAIN_PROMPT_ORDER=(time status context dir virtualenv ${c.git?'git ':''}cmd_exec_time)\nBULLETTRAIN_PROMPT_CHAR='${symbol}'\nBULLETTRAIN_PROMPT_SEPARATE_LINE=true\n${accent?`BULLETTRAIN_DIR_BG=${color}\n`:''}`+data.files[data.entry];
  case 'typewritten':
   return `TYPEWRITTEN_PROMPT_LAYOUT='pure'\nTYPEWRITTEN_SYMBOL='${symbol}'\n${accent?`TYPEWRITTEN_COLORS='current_directory:${color};git_branch:${color}'\n`:''}`+source+(c.git?'':`# Keep the path and prompt while omitting Git tasks.\nfunction tw_async_init_tasks() { typeset -gA tw_prompt_data; tw_prompt_data=(); tw_redraw; }\n`);
  case 'geometry':
   return `GEOMETRY_PROMPT=(geometry_echo geometry_status geometry_path)\nGEOMETRY_RPROMPT=(${c.git?'geometry_git ':''}geometry_echo)\nGEOMETRY_STATUS_SYMBOL='${symbol}'\nGEOMETRY_STATUS_SYMBOL_ERROR='${c.symbol==='auto'?'△':symbol}'\n${accent?`GEOMETRY_PATH_COLOR=${color}\n`:''}`+source;
  case 'alien':
   return `ALIEN_SECTIONS_LEFT=(exit time user path ${c.git?'vcs_branch:async vcs_status:async vcs_dirty:async ':''}newline ssh venv prompt)\nALIEN_PROMPT_SYM='${symbol}'\n${accent?`ALIEN_SECTION_PATH_BG=${color}\nALIEN_SECTION_PATH_FG=black\n`:''}`+source;
  case 'powerlevel9k':
   return `# Classic upstream theme; its repository is archived.\nPOWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir ${c.git?'vcs':''})\nPOWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status)\nPOWERLEVEL9K_PROMPT_ON_NEWLINE=true\nPOWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX=''\nPOWERLEVEL9K_MULTILINE_LAST_PROMPT_PREFIX='${symbol} '\n${accent?`POWERLEVEL9K_DIR_BACKGROUND=${color}\n`:''}`+source;
  case 'agkozak':
   return `AGKOZAK_MULTILINE=1\nAGKOZAK_COLORS_PATH=${color}\nAGKOZAK_PROMPT_CHAR=('${symbol}' '#' ':')\n${c.git?'':"AGKOZAK_CUSTOM_RPROMPT=''\n"}`+source;
  case 'git-prompt':
   return data.files[data.entry]+`\n# Prompt based on the upstream default example.\nPROMPT='%B%40<..<%~%<<%b ${c.git?'$(gitprompt)':''}%(?.%F{${accent||'green'}}.%F{red})${symbol}%f '\nRPROMPT=''\n`;
  case 'lambda-mod': {
   let code=data.files[data.entry];
   if(accent)code=code.replace(/(fg(?:_bold|_no_bold)?\[)(green|cyan|blue|magenta)(\])/g,`$1${color}$3`);
   if(c.symbol!=='auto')code=code.replaceAll('λ',()=>symbol).replaceAll('→',()=>symbol);
   if(!c.git)code+=`\nfunction check_git_prompt_info() { print -nr -- '%{$fg_bold[cyan]%}${c.symbol==='auto'?'→':symbol} '; }\nRPROMPT=''\n`;
   return code;
  }
  default: throw Error('Missing community source adapter.');
 }
}
