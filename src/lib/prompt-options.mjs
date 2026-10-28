// These controls are Promptlab adaptations of the bundled OMZ prompt templates.
export const configurablePrompts = ['robbyrussell','simple','cloud','awesomepanda'];
export const hasPromptOptions = id => configurablePrompts.includes(id);
export const contextText = mode => ({user:'alex',host:'workstation','user-host':'alex@workstation'}[mode]||'');
const contextCode = mode => ({user:'%n',host:'%m','user-host':'%n@%m'}[mode]||'');
export function applyPromptOptions(c, source) {
 if(!hasPromptOptions(c.theme))return source;
 const color={mint:'green',cyan:'cyan',lavender:'magenta',amber:'yellow',blue:'blue'}[c.accent]||'green';
 const marker=c.symbol==='auto'?(c.theme==='cloud'?'%':c.theme==='simple'?'❯':'➜'):c.symbol;
 if(c.directory&&c.directory!=='theme')source=source.replace(/%c|%~/g,c.directory==='full'?'%~':'%c');
 if(c.commandLine==='newline')source+=`\n# Put the command on its own line.\nPROMPT+=$'\\n'\nPROMPT+='%(?.%F{${color}}.%F{red})${marker==='%'?'%%':marker}%f '\n`;
 if(c.context&&c.context!=='theme')source+=`\n# Display the current shell user and host.\nPROMPT='%F{242}${contextCode(c.context)}%f '"$PROMPT"\n`;
 if(c.clock)source+="\nRPROMPT+=' %F{242}%*%f'\n";
 return source;
}
