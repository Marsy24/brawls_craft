import { CLASSES } from './data/config';
document.querySelector('#app')!.innerHTML=`<h1>Пепельный Завет</h1><p>Архитектурный этап. Пять классов: ${Object.values(CLASSES).map(c=>c.name).join(', ')}.</p>`;
