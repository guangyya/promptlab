const neutral={background:'#171717',foreground:'#d4d4d4',cursor:'#fafafa',selectionBackground:'#525252',black:'#262626',red:'#ef7777',green:'#a3be8c',yellow:'#ebcb8b',blue:'#81a1c1',magenta:'#b48ead',cyan:'#88c0d0',white:'#d4d4d4',brightBlack:'#737373',brightRed:'#fca5a5',brightGreen:'#bef264',brightYellow:'#fde68a',brightBlue:'#93c5fd',brightMagenta:'#d8b4fe',brightCyan:'#a5f3fc',brightWhite:'#fafafa'};
export const PALETTES={
 neutral:{name:'Neutral dark',mode:'dark',...neutral},
 light:{name:'Neutral light',mode:'light',...neutral,background:'#ffffff',foreground:'#262626',cursor:'#171717',selectionBackground:'#d4d4d4',black:'#171717',red:'#b91c1c',green:'#3f6212',yellow:'#854d0e',blue:'#1d4ed8',magenta:'#7e22ce',cyan:'#0e7490',white:'#737373',brightBlack:'#525252',brightWhite:'#171717'},
 dracula:{name:'Dracula',mode:'dark',...neutral,background:'#282a36',foreground:'#f8f8f2',cursor:'#f8f8f2',black:'#21222c',red:'#ff5555',green:'#50fa7b',yellow:'#f1fa8c',blue:'#bd93f9',magenta:'#ff79c6',cyan:'#8be9fd',white:'#f8f8f2'},
 nord:{name:'Nord',mode:'dark',...neutral,background:'#2e3440',foreground:'#d8dee9',cursor:'#d8dee9',black:'#3b4252',red:'#bf616a',green:'#a3be8c',yellow:'#ebcb8b',blue:'#81a1c1',magenta:'#b48ead',cyan:'#88c0d0',white:'#e5e9f0'},
 'solarized-dark':{name:'Solarized dark',mode:'dark',...neutral,background:'#002b36',foreground:'#839496',cursor:'#93a1a1',black:'#073642',red:'#dc322f',green:'#859900',yellow:'#b58900',blue:'#268bd2',magenta:'#d33682',cyan:'#2aa198',white:'#eee8d5'},
 'solarized-light':{name:'Solarized light',mode:'light',...neutral,background:'#fdf6e3',foreground:'#657b83',cursor:'#586e75',black:'#073642',red:'#dc322f',green:'#718200',yellow:'#9c7500',blue:'#268bd2',magenta:'#d33682',cyan:'#2aa198',white:'#839496',brightWhite:'#586e75'},
 carbon:{name:'Carbon garden',mode:'dark',...neutral,background:'#191e1c',foreground:'#d5ddd7',green:'#a4c990',blue:'#89b4d4',magenta:'#c5a4d3'},
 midnight:{name:'Midnight',mode:'dark',...neutral,background:'#1c1e2c',foreground:'#d1d5ef',blue:'#99bcf0',magenta:'#c6aceb'},
 paper:{name:'Warm paper',mode:'light',...neutral,background:'#f4f1e8',foreground:'#384336',black:'#343c32',red:'#b64842',green:'#3c764c',yellow:'#966f24',blue:'#326a9a',magenta:'#895397',cyan:'#307d83',white:'#65705c',brightWhite:'#263020'},
};
