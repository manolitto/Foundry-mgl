import ConversionEngine from "./ConversionEngine";

class Dnd5eConverter {
    private static _instance: Dnd5eConverter;

    private constructor() {
    }

    public static getInstance(): Dnd5eConverter {
        if (!Dnd5eConverter._instance) Dnd5eConverter._instance = new Dnd5eConverter();
        return Dnd5eConverter._instance;
    }

    /**
     * Converts item labels to metric
     *
     * @param label - the label of an item (can be found at actor.data.items.label)
     */
    private _labelConverter(label: string): any {
        if (!label) return;
        const labelRegex = /((?<valueOpt>[0-9]+) \/ )?(?<value>[0-9]+) (?<unit>[\w]+)/;
        const matchedLabel = label.match(labelRegex)?.groups;
        if (!matchedLabel) return label;
        const unit = ConversionEngine.convertDistanceStringToMetric(matchedLabel.unit);
        let convertedLabel = '';

        if (!unit) return label;
        if (unit === 'Meters' || unit === 'm') {
            if (matchedLabel.valueOpt)
                convertedLabel += ConversionEngine.convertDistanceFromFeetToMeters(matchedLabel.valueOpt) + ' /';
            convertedLabel += ConversionEngine.convertDistanceFromImperialToMetric(matchedLabel.value, matchedLabel.unit) + ' ' + unit;
        }
        return convertedLabel;
    }

    /**
     * Converts range and target structures to metric
     *
     * @param distance - object to be converted (format can be found at actor.data.items[0].range)
     */
    private _convertDistance(distance: any): any {
        if (!distance) return;
        distance.value = ConversionEngine.convertDistanceFromImperialToMetric(distance.value, distance.units);
        if (distance?.long)
            distance.long = ConversionEngine.convertDistanceFromImperialToMetric(distance.long, distance.units);

        distance.units = ConversionEngine.convertDistanceStringToMetric(distance.units);

        return distance;
    }

    /**
     * Converts text containing imperial units to metric
     *
     * @param text - text containing imperial units
     */
    private _convertText(text: string): string {
        text = text.replace(/([0-9]{1,3}(,[0-9]{3})+) (feet)/g, (_0, number: string, _1, label: string) => {
            return ConversionEngine.convertDistanceFromFeetToMeters(number) + " " + ConversionEngine.convertDistanceStringToMetric(label);
        });
        text = text.replace(/([0-9]+)\/([0-9]+) (feet|inch|foot|ft\.)/g, (_0, firstNumber: string, secondNumber: string, label: string) => {
            return ConversionEngine.convertDistanceFromFeetToMeters(firstNumber) + '/' + ConversionEngine.convertDistanceFromFeetToMeters(secondNumber) + ' ' + ConversionEngine.convertDistanceStringToMetric(label);
        });
        text = text.replace(/([0-9]+)([\W\D\S]|&nbsp;| cubic ){1,2}(feet|inch|foot|ft\.)/g, (_0, number: string, separator: string, label: string) => {
            return ConversionEngine.convertDistanceFromFeetToMeters(number) + separator + ConversionEngine.convertDistanceStringToMetric(label);
        });
        text = text.replace(/([0-9]+)(&nbsp;| )(pounds|lb)/g, (_0, number: string, separator: string, label: string) => {
            return ConversionEngine.convertWeightFromPoundsToKilograms(number) + " " + ConversionEngine.convertWeightStringToKilograms(label)
        })
        return text;
    }

    /**
     * Converts all the items and spells from an actor
     *
     * @param items - items array to be converted (can be found at actor.data.items)
     */
    private _itemsConverter(items: Array<any>): any {
        items.forEach((item) => {
            if (item?.flags["foundry-mgl"]?.converted) return

            item.data.description.value = this._convertText(item.data.description.value);

            const target = item.data.target;
            const range = item.data.range;
            if (!target) return

            item.data.target = this._convertDistance(target);
            item.data.range = this._convertDistance(range);

            item.data.weight = ConversionEngine.convertWeightFromPoundsToKilograms(item.data.weight);
            item.totalWeight = ConversionEngine.convertWeightFromPoundsToKilograms(item.totalWeight);
        })
        return items
    }

    /**
     * Flags all items and spells with the converted tag
     *
     * @param entries - array of items from the items map (can be found at actor.items.entries)
     */
    private async _itemsFlagger(entries: Array<any>): Promise<void> {
        for (let entry = 0; entry < entries.length; entry++)
            await entries[entry].setFlag("foundry-mgl", "converted", true)
    }

    /**
     * Converts the speed to metric
     *
     * @param speed - speed + special speed object as found on the actor object
     */
    private _speedConverter(speed: any): any {
        speed.value = ConversionEngine.imperialReplacer(speed.value, /(?<value>[0-9]+) (?<unit>[\w]+)/g)

        const specialSpeed = speed.special;
        speed.special = ConversionEngine.imperialReplacer(specialSpeed, /(?<value>[0-9]+ ?)(?<unit>[\w]+)/g);

        return speed;
    }

    /**
     * Converts the items, senses and speeds of an actor to metric
     *
     * @param data -  actor data to be converted (can be found at actor.data)
     * @param actor - actor object for setting flags
     */
    private _toMetricConverter5e(data: any, actor: any): any {
        const items = data.items;

        data.items = this._itemsConverter(items);
        this._itemsFlagger(actor.items.entries);

        data.data.attributes.speed = this._speedConverter(data.data.attributes.speed);

        data.data.traits.senses = ConversionEngine.imperialReplacer(data.data.traits.senses, /(?<value>[0-9]+ ?)(?<unit>[\w]+)/g)

        return data;
    }

    /**
     * Main function for updating a specific actor
     *
     * @param actor - actor to be converted
     */
    public async actorUpdater(actor: any) {
        const actorClone = await actor.object.clone({_id: actor.object.data._id}, {temporary: true});
        actorClone.data._id = actor.object.data._id;
        actorClone.data = this._toMetricConverter5e(actorClone.data, actor.object);

        await actor.object.update(actorClone.data);
    }


    /**
     * Main function for updating a specific item
     *
     * @param item - item to be converted
     */
    public async itemUpdater(item: any) {
        if (item.object.getFlag("foundry-mgl", "converted")) return;
        const itemClone = await item.object.clone({}, {temporary: true})

        itemClone.data.data.description.value = this._convertText(itemClone.data.data.description.value);

        itemClone.data.data.target = this._convertDistance(itemClone.data.data.target);
        itemClone.data.data.range = this._convertDistance(itemClone.data.data.range);
        itemClone.data.data.weight = ConversionEngine.convertWeightFromPoundsToKilograms(itemClone.data.data.weight);

        item.object.labels.range = this._labelConverter(item.object.labels.range);

        await item.object.setFlag("foundry-mgl", "converted", true);
        await item.object.update(itemClone.data);
    }
}

export default Dnd5eConverter.getInstance();