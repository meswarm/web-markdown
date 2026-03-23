import { Editor } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import { remarkMediaPlugin, mediaNodePlugins } from './src/plugins/mediaPlugin.ts';

const crepe = new Crepe({ defaultValue: '![alt](test.mp4)' });
crepe.editor.use(remarkMediaPlugin).use(mediaNodePlugins);

crepe.create().then(() => {
    console.log("Success");
    const json = crepe.editor.action((ctx) => {
        // get HTML
        return document.body.innerHTML;
    });
    console.log(json);
}).catch(console.error);
