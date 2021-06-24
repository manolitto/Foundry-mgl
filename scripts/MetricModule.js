import {
    actorUpdater,
    itemUpdater,
    journalUpdater,
    rollTableUpdater,
    compendiumUpdater,
    batchCompendiumUpdater
} from "./Dnd5e/Dnd5eConverterNew.js";
import {initBatchConversion} from "./Dnd5e/BatchConversion.js";
import {getSetting} from "./Settings.js";
import {updateActor, updateItem} from "./Pf2e/Pf2eConverter.js";
import {convertCompendium} from "./Pf2e/CompendiumPf2eConverter.js";

const entityUpdater = {
    'pf2e': {
        'actor': updateActor,
        'item': updateItem,
        'sheet': journalUpdater,
        'compendium': convertCompendium
    },
    'dnd5e': {
        'actor': actorUpdater,
        'item': itemUpdater,
        'sheet': journalUpdater,
        'rolltable': rollTableUpdater,
        'compendium': compendiumUpdater
    }
}

const batchConversionManager = (data, type, button) => {
    let batchConvert = initBatchConversion(data, type);
    button.on('click', () => createWarningDialog(batchConvert));
}

const batchCompendiumManager = (data, type, button) => {
    let batchConvert = batchCompendiumUpdater(game.packs.keys());
    button.on('click', () => createWarningDialog(batchConvert));
}

const batchCompendiumUpdaterMap = {
    'dnd5e': {
        'scenes': batchConversionManager,
        'actors': batchConversionManager,
        'items': batchConversionManager,
        'tables': batchConversionManager,
        'journal': batchConversionManager,
        'compendium': batchCompendiumManager
    },
    'pf2e': {

    }
}

const onRenderSideBar = (app, html) => {
    if (!game.user.hasRole(4)) return;
    let button = $(`<button><i class='fas fa-exchange-alt'></i>Metrify all the ${app?.options?.id}</button>`);
    const type = app?.options?.id;
    if (batchCompendiumUpdaterMap[game.system.id][type])
        batchCompendiumUpdaterMap[game.system.id][type](type === 'compendium' ? game.packs.keys() : game[type], type, button);
    if (app?.options?.id !== 'combat' && app?.options?.id !== 'playlists' && !app?.options?.id.includes('popout'))
        html.find(".directory-footer").append(button);
}

const addButton = (element, entity, type, html) => {
    if (!game.user.hasRole(4)) return;
    if (element.length !== 1) return;

    let button = $(`<a class="popout" style><i class="fas fa-ruler"></i>Metrificator</a>`);
    button.on('click', () => {
        ui.notifications.warn(`Metrifying the ${type}, hold on tight.`);
        entityUpdater[game.system.id][type](entity).then(() => ui.notifications.info(`Metrification complete, enjoy a better ${type}`));
        if (type === 'compendium') html.close();
    });

    if (!getSetting('buttonHidden')) element.after(button);
}

const onRenderActorSheet = (obj, html) => {
    let element = html.find(".window-header .window-title")
    addButton(element, obj.object, "actor");
}

const onRenderItemSheet = (obj, html) => {
    let element = html.find(".window-header .window-title");
    addButton(element, obj.object, "item");
}

const onRenderJurnalSheet = (obj, html) => {
    let element = html.find(".window-header .window-title");
    addButton(element, obj.object, "sheet");
}

const onRenderRollTable = (obj, html) => {
    let element = html.find(".window-header .window-title");
    addButton(element, obj.object, 'rolltable')
}

const onCompendiumRender = (obj, html) => {
    let element = html.find(".window-header .window-title");
    addButton(element, obj.collection, 'compendium', obj);

    /*
    Intended for debugging the relinking function
    let button = $(`<a class="popout" style><i class="fas fa-ruler"></i>Relink</a>`);
    button.on('click', () => relinkCompendium(obj.collection))
    element.after(button)
    */
}

const createWarningDialog = (callFunction) => {
    new Dialog({
        title: 'Warning!',
        content: 'You are about to process a lot of data. Are you sure you wanna do that? It will take a bit...',
        buttons: {
            ok: {
                icon: '<i class="fas fa-check"></i>',
                label: 'yes',
                callback: () => callFunction(),
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: 'no',
            }
        },
        default: 'ok',
    }).render(true);
}

export {
    onCompendiumRender,
    onRenderActorSheet,
    onRenderItemSheet,
    onRenderJurnalSheet,
    onRenderRollTable,
    onRenderSideBar
}
