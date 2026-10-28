// A deliberately small, non-executing parser for literal Zsh prompt templates.
export function inspectSource(source) {
 const assignments=Object.create(null);
 const regex=/^[ \t]*(?:(?:export|local|typeset)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(\+?=)\s*\$?(['"])((?:\\[\s\S]|(?!\3)[\s\S])*?)\3/gm;
 for(const match of source.matchAll(regex))assignments[match[1]]=(match[2]==='+='?(assignments[match[1]]||''):'')+match[4];
 let left=assignments.PROMPT||assignments.PS1, right=assignments.RPROMPT||assignments.RPS1||'';
 if(!left)return {supported:false,reason:'This theme builds its prompt with functions. Its source is available below.'};
 const expand=text=>{for(let i=0;i<5;i++)text=text.replace(/\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g,(all,a,b)=>assignments[a||b]??all);return text;};
 left=expand(left);right=expand(right);
 const calls=[...(left+right).matchAll(/\$\(([^()]*)\)/g)].map(m=>m[1].trim());
 if(calls.some(c=>!['git_prompt_info','git_prompt_status','parse_git_dirty'].includes(c)))return {supported:false,reason:'This theme uses prompt functions that are not supported in the preview.'};
 const remaining=(left+right).replace(/\$\((?:git_prompt_info|git_prompt_status|parse_git_dirty)\)/g,'').replace(/\$\{?(?:fg(?:_bold|_no_bold)?|bg)\[[^\]]+\]\}?|\$\{?reset_color\}?|\$terminfo\[bold\]/g,'');
 if(/\$[({A-Za-z_]/.test(remaining))return {supported:false,reason:'This theme needs additional variables or dependencies to render its prompt.'};
 if(/%\(/.test(left+right))return {supported:false,reason:'This theme uses conditional prompt expressions. Its source is still available.'};
 return {supported:true,left,right,reason:'Approximate preview of literal prompt expressions.'};
}
export function renderImported(template,ctx) {
 const convert=value=>value.replace(/\\n|\n/g,'\r\n')
 .replace(/\$\(git_prompt_info\)/g,ctx.git?ctx.fg('magenta','('+ctx.branch+(ctx.dirty?' *':'')+')'):'')
 .replace(/\$\(git_prompt_status\)/g,ctx.git&&ctx.dirty?'±':'')
 .replace(/\$\(parse_git_dirty\)/g,ctx.git&&ctx.dirty?'*':'')
 .replace(/\$\{?(fg(?:_bold|_no_bold)?|bg)\[([^\]]+)\]\}?/g,(_,type,color)=>{const colors={black:0,red:1,green:2,yellow:3,blue:4,magenta:5,cyan:6,white:7,grey:8};const n=colors[color]??7;return '\x1b['+(type==='bg'?40+n:30+n)+'m';})
 .replace(/\$\{?reset_color\}?/g,'\x1b[0m').replace(/\$terminfo\[bold\]/g,'\x1b[1m')
 .replace(/%[FK]\{([^}]+)\}/g,(all,color)=>{const colors={black:0,red:1,green:2,yellow:3,blue:4,magenta:5,cyan:6,white:7};const isBg=all[1]==='K';return /^\d+$/.test(color)?`\x1b[${isBg?48:38};5;${color}m`:`\x1b[${(isBg?40:30)+(colors[color]??7)}m`;})
 .replace(/%D\{[^}]*\}|%\*/g,'12:34:56').replace(/%\d*~|%\d*[cd]/g,ctx.cwd).replace(/%n/g,'alex').replace(/%[mM]/g,'workstation')
 .replace(/%#/g,'$').replace(/%\?/g,String(ctx.exit)).replace(/%B/g,'\x1b[1m').replace(/%b/g,'\x1b[22m').replace(/%[fk]/g,'\x1b[0m').replace(/%[{}]/g,'').replace(/%%/g,'%');
 return {left:convert(template.left),right:convert(template.right)};
}
