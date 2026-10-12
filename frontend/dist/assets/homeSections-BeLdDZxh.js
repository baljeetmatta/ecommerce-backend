const t=e=>e.some(n=>n.type==="announcements")?[...e]:[{type:"announcements",title:"Announcements",isActive:!0,sortOrder:Math.min(0,...e.map(n=>Number(n.sortOrder)||0))-1},...e];export{t as w};
