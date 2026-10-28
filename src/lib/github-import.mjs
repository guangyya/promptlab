import {themes} from './theme-source.mjs';
import {inspectSource} from './import-preview.mjs';
export function parseGitHubURL(value) {
 let url;try{url=new URL(value.trim());}catch{throw Error('Enter a GitHub repository or theme file URL.');}
 if(url.protocol!=='https:'||!['github.com','raw.githubusercontent.com'].includes(url.hostname)||url.username||url.password)throw Error('Use an https://github.com repository or file link.');
 const p=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
 if(p.length<2||!/^[\w.-]+$/.test(p[0])||!/^[\w.-]+$/.test(p[1]))throw Error('This GitHub URL is not valid.');
 const repo=p[0]+'/'+p[1].replace(/\.git$/,'');
 if(url.hostname==='raw.githubusercontent.com')return {repo,ref:p[2],path:p.slice(3).join('/')};
 if(p[2]&& !['blob','tree'].includes(p[2]))throw Error('Use a repository URL or a link to a theme file.');
 return {repo,ref:p[3],path:p[2]==='blob'?p.slice(4).join('/'):undefined};
}
async function fetchText(url,fetcher,signal) {
 const response=await fetcher(url,{signal:signal||AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json'}});
 if(!response.ok){const e=Error(response.status===403||response.status===429?'GitHub request limit reached. Paste a direct file link or try again later.':response.status===404?'Repository or file not found. Use a public GitHub repository.':'Unable to read this repository. Try again.');e.status=response.status;throw e;}
 const text=await response.text();if(text.length>2_000_000)throw Error('This repository listing is too large. Paste a direct theme file link.');return text;
}
const rawURL=(repo,ref,path)=>`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
export async function discoverGitHub(value,{fetcher=fetch,signal}={}) {
 const input=parseGitHubURL(value);
 const builtin=themes.filter(t=>t.repo?.toLowerCase()===input.repo.toLowerCase()&&(!input.path||t.url.endsWith('/'+input.path)||t.group==='community'));
 if(builtin.length)return {...input,builtin,files:[],fetcher};
 try {
  const commit=JSON.parse(await fetchText(`https://api.github.com/repos/${input.repo}/commits/${encodeURIComponent(input.ref||'HEAD')}`,fetcher,signal));
  const ref=commit.sha;
  if(input.path)return {...input,ref,files:[{path:input.path}],fetcher};
  const tree=JSON.parse(await fetchText(`https://api.github.com/repos/${input.repo}/git/trees/${ref}?recursive=1`,fetcher,signal));
  const files=(tree.tree||[]).filter(f=>f.type==='blob'&&/\.zsh-theme$|\.zsh$|(?:^|\/)prompt_[^/]+_setup$/.test(f.path)&&f.size<=64000).slice(0,80).map(f=>({path:f.path}));
  if(!files.length)throw Error(tree.truncated?'This repository is too large. Paste a direct theme file link.':'No .zsh-theme files found. Paste a link to the theme entry file.');
  return {...input,ref,files,fetcher};
 }catch(error){
  if(signal?.aborted)throw error;
  if(input.path)return {...input,ref:input.ref||'main',files:[{path:input.path}],fetcher};
  const slug=input.repo.split('/')[1];const names=[`${slug}.zsh-theme`,`${slug.replace(/(?:-zsh-theme|-theme|\.zsh)$|^zsh-/g,'')}.zsh-theme`,'theme.zsh-theme',`${slug}.zsh`];
  const probes=await Promise.allSettled([...new Set(names)].flatMap(name=>['main','master'].map(async ref=>({path:name,ref,source:await fetchText(rawURL(input.repo,ref,name),fetcher,signal)}))));
  const found=probes.filter(p=>p.status==='fulfilled').map(p=>p.value);
  if(found.length)return {...input,ref:found[0].ref,files:[found[0]],fetcher};
  throw error;
 }
}
export async function importGitHubFile(discovery,path,{fetcher=discovery.fetcher||fetch,signal}={}) {
 const {repo,ref}=discovery;
 const item=discovery.files.find(f=>f.path===path);if(!item)throw Error('Choose a theme file.');
 const source=item.source||await fetchText(rawURL(repo,item.ref||ref,path),fetcher,signal);
 if(source.length>64000||/[\x00\x1b]/.test(source))throw Error('Choose a text theme file smaller than 64 KB.');
 let licenseText='';
 for(const filename of ['LICENSE','LICENSE.txt','license','LICENSE.md']){try{licenseText=await fetchText(rawURL(repo,ref,filename),fetcher,signal);if(licenseText.length<=16000)break;licenseText='';}catch{if(signal?.aborted)throw Error('Import canceled.');}}
 const mit=/Permission is hereby granted/i.test(licenseText)&&/THE SOFTWARE IS PROVIDED/i.test(licenseText);
 const preview=inspectSource(source);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(repo+'\n'+ref+'\n'+path+'\n'+source));
 const id='import-'+Array.from(new Uint8Array(digest)).slice(0,12).map(n=>n.toString(16).padStart(2,'0')).join('');
 const name=path.split('/').pop().replace(/\.zsh-theme$|\.zsh$/,'');
 return {id,name,description:repo,source,repo,sha:/^[0-9a-f]{40}$/.test(ref)?ref:undefined,url:`https://github.com/${repo}/blob/${ref}/${path}`,license:mit?'MIT':'Not verified',licenseText,group:'imported',layout:preview.supported&&/[\n]|\\n/.test(preview.left)?'double':'single',tags:['Imported'],color:'#a6a6a6',preview};
}
