import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4317/';
const shots=path.resolve(process.env.CAPTURE_DOCS==='1'?'docs/images':'artifacts/editor');mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1366,height:768},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const frame=p=>p.locator('.terminal-frame .terminal-view');
const ready=async(p=page,theme)=>p.locator(`.terminal-frame .terminal-view[data-ready=true]${theme?`[data-theme="${theme}"]`:''}`).waitFor();
const screen=async(text,p=page)=>p.waitForFunction(text=>document.querySelector('.terminal-frame .xterm-accessibility')?.innerText.includes(text),text);
async function select(name,id){await page.getByLabel('Search themes',{exact:true}).fill(name);await page.getByRole('button',{name:'Select '+name,exact:true}).click();await page.getByLabel('Search themes',{exact:true}).fill('');await ready(page,id);}
async function snapshot(file){const dismiss=page.getByRole('button',{name:'Dismiss notification',exact:true});if(await dismiss.count())await dismiss.click();await page.screenshot({path:path.join(shots,file),fullPage:true});}
async function fits(width,height){await page.setViewportSize({width,height});await page.waitForTimeout(200);const box=await page.evaluate(()=>({page:document.body.scrollHeight,height:innerHeight,inspector:document.querySelector('.inspector').clientHeight,scroll:document.querySelector('.inspector').scrollHeight,last:document.querySelector('.draft-actions').getBoundingClientRect().bottom}));assert(box.page<=height&&box.last<=height&&box.scroll<=box.inspector+2,JSON.stringify(box));}
try {
 await page.goto(base);await ready();await screen('pwd');await screen('ls');await screen('No such file or directory');
 assert.equal(await page.getByRole('link',{name:'GitHub repository',exact:true}).getAttribute('href'),'https://github.com/guangyya/promptlab');
 await page.getByRole('button',{name:'Accent Green',exact:true}).click();
 const center=await page.getByRole('button',{name:'Accent Green',exact:true}).evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('svg').getBoundingClientRect();return {x:(b.left+b.right-a.left-a.right)/2,y:(b.top+b.bottom-a.top-a.bottom)/2};});assert(Math.abs(center.x)<.6&&Math.abs(center.y)<.6,JSON.stringify(center));
 console.log('PASS richer transcript with visible output/error, repository link and centered accent check');
 await select('Robbyrussell','robbyrussell');
 await page.getByLabel('Prompt identity',{exact:true}).selectOption('user-host');await screen('alex@workstation');
 await page.getByLabel('Prompt directory',{exact:true}).selectOption('full');await screen('~/code/promptlab');
 await page.getByLabel('Right-hand clock',{exact:true}).check();await screen('12:34:56');
 await fits(1280,720);await fits(1366,768);
 await page.getByLabel('Preview scenario',{exact:true}).selectOption('failed');await page.locator('.terminal-frame .terminal-view[data-scenario=failed][data-ready=true]').waitFor();await screen('No such file or directory');
 await snapshot('customize-prompt.png');
 await page.getByLabel('Command on a new line',{exact:true}).check();await page.locator('.terminal-frame .terminal-view[data-command-line=newline][data-ready=true]').waitFor();
 await page.getByRole('button',{name:'Share',exact:true}).click();const shared=await context.newPage();await shared.goto(page.url());await ready(shared,'robbyrussell');assert.equal(await shared.getByLabel('Prompt identity',{exact:true}).inputValue(),'user-host');assert.equal(await shared.getByLabel('Prompt directory',{exact:true}).inputValue(),'full');assert(await shared.getByLabel('Command on a new line',{exact:true}).isChecked());await shared.close();
 let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download theme',exact:true}).click();let download=await pending;const generated=readFileSync(await download.path(),'utf8');assert.match(generated,/%n@%m/);assert.match(generated,/RPROMPT\+=/);assert.match(generated,/%~/);
 console.log('PASS guided identity, directory, line layout and clock in preview, download, sharing and laptop layout');
 await page.getByRole('button',{name:'Source',exact:true}).click();await page.getByRole('button',{name:'Edit source',exact:true}).click();
 const editor=page.getByLabel('Edit theme source',{exact:true});await editor.fill("PROMPT='unfinished");await page.getByRole('alert').filter({hasText:'Close the single quote'}).waitFor();assert(await page.getByRole('button',{name:'Apply source',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Download theme',exact:true}).isDisabled());
 const source="# My prompt\nPROMPT='%F{cyan}%n@%m%f [%~] ready ❯ '\nRPROMPT='%F{242}%*%f'\n";
 await editor.fill(source);await page.locator('.source-checks').filter({hasText:'This prompt can be previewed'}).waitFor();await page.locator('.source-toolbar>span').first().click();await snapshot('source-editor.png');
 await page.getByRole('button',{name:'Apply source',exact:true}).click();await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('.terminal-frame .terminal-view[data-source-edited=true][data-ready=true]').waitFor();await screen('[~/code/promptlab] ready ❯');
 assert(await page.getByLabel('Prompt identity',{exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Accent Green',exact:true}).isDisabled());assert(await page.getByLabel('Terminal palette',{exact:true}).isEnabled());await fits(1280,720);await fits(1366,768);
 pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download theme',exact:true}).click();download=await pending;assert(readFileSync(await download.path(),'utf8').startsWith(source));
 await page.getByRole('button',{name:'Share',exact:true}).click();const manualShare=await context.newPage();await manualShare.goto(page.url());await ready(manualShare);await screen('ready ❯',manualShare);await manualShare.close();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.goto(base);await ready();await screen('ready ❯');
 console.log('PASS source editing, inline validation/error recovery, exact export, live preview, saved drafts and share roundtrip');
 await page.getByRole('button',{name:'Source',exact:true}).click();await page.getByRole('button',{name:'Edit source',exact:true}).click();await editor.fill("PROMPT='$(unsupported_prompt)'\n");await page.getByRole('button',{name:'Apply source',exact:true}).click();await page.getByRole('button',{name:'Preview',exact:true}).click();await ready();await screen('Preview unavailable');
 assert.doesNotMatch(await page.locator('.terminal-frame .xterm-accessibility').innerText(),/pwd|ready ❯/);
 await page.locator('.source-mode-note').getByRole('button',{name:'Use controls',exact:true}).click();await page.locator('.terminal-frame .terminal-view[data-source-edited=false][data-ready=true]').waitFor();await screen('alex@workstation');assert(await page.getByLabel('Prompt identity',{exact:true}).isEnabled());
 await page.getByRole('button',{name:'Help',exact:true}).click();await page.getByRole('dialog',{name:'Customize your prompt',exact:true}).waitFor();await page.getByRole('button',{name:'Start a simple editable prompt',exact:true}).click();assert.match(await editor.inputValue(),/%n@%m/);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 console.log('PASS unsupported-source fallback, return to controls and prompt-expression help');
 await page.getByRole('button',{name:'Community',exact:true}).click();await select('Pure','pure');await page.getByLabel('Preview scenario',{exact:true}).selectOption('venv');await page.getByLabel('Terminal palette',{exact:true}).selectOption('nord');await page.getByRole('button',{name:'Show all seven',exact:true}).click();await page.locator('.terminal-frame .terminal-view[data-scenario=venv][data-ready=true]').waitFor();await screen('Python 3.12.7');await snapshot('community-scenarios.png');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('All editor and guided customization checks passed.');
} finally {await browser.close();}
