"use strict";
var V = {};
V.debug = true;
V.init = function(params) {
    V.initializeLocations(params.map);
    V.initializeThings(params.things);
    V.initializeCharacters(params.characters);

    var pChars = V.findCharactersByName(params.PLAYER);
    if (pChars.length != 1) {
        console.error('There must be exactly one character with the name ' + params.PLAYER);
        dieInAFire();
    }
    V.PLAYER = pChars[0];

    V.$CONSOLE = $('#console');
    V.$INPUT = $('#userInput');
    V.$FORM = $('#theForm');

    // handle user input
    V.$FORM.on('submit', function(e) {
        e.preventDefault();
        var text = V.$INPUT.val();
        V.$INPUT.val('');
        V.$CONSOLE.append('<p class="user">'+ text + '</p>');
        V.commandHistory.push(text);
        V.interpret(text);
    });

    V.PLAYER.location = null;
    var start = V.findLocationByName(params.start),
        placeDescription = start.goTo(V.PLAYER, true);
    V.sendToConsole(placeDescription);
};

V.index = {
    things: {},
    locations: {},
    characters: {},
    verbs: {
        look: function() {

        }
    }
};

V.commandHistory = [];
V.regexes = {
    spaceSplitter : /\s+/,
    initialWS: /^\s+/,
    finalWS: /\s+$/
};
V.interpret = function (text) {
    text = text.replace(V.regexes.initialWS, '').replace(V.regexes.finalWS, '');

    // attempt to parse as into <verb> [garbage] [<thing|location|character>]
    var bits = text.split(V.regexes.spaceSplitter),
        wordCount = bits.length,
        directObject = bits.length > 1 ? bits[wordCount - 1] : '', // last word
        verb = bits.length > 0 ? bits.slice(0, wordCount - 1).join(' ') : '',
        mcguffin,
        action,
        output = V.messages.totallyConfused;

    if (directObject) {
        // what kind of object is it?
        mcguffin = V.findThingsByName(directObject);
        if (!mcguffin || !mcguffin.length) {
            mcguffin = V.findCharactersByName(directObject);
        }
        if (mcguffin.length > 0) {
            mcguffin = mcguffin[0]; // TODO: handle multiple results better
        } else {
            mcguffin = V.findLocationByName(directObject);
        }
    }

    if (mcguffin) {

        action = mcguffin[verb] ? verb : V.utils.camelCaseify(verb);

        if (action && typeof mcguffin[action] == 'function') {
            output = mcguffin[action].apply(mcguffin); // carry out action

            if (output) {
                V.sendToConsole(output);
            }
            return;
        } else {
            output = V.messages.unknownActionToObject;
        }
    } else {
        output = V.messages.unknownItem;
    }



    // that failed. Try built in commands like "n", "up", "look"
    // TODO

    if (output) {
        V.sendToConsole(output);
    }

};

V.sendToConsole = function(text) {
    V.$CONSOLE.append('<p class="system">'+text+'</p>');
};

/**
 * create a Thing object for each thing in world definition
 * @param things object
 */
V.initializeThings = function(things) {
    var thing;
    for (thing in things) {
        new V.Thing(things[thing]);
    }
};

V.initializeLocations = function(locations) {
    var handle;
    for (handle in locations) {
        new V.Location(handle, locations[handle]); // location Ids can't use GUID system
    }
};

V.initializeCharacters = function(characters) {
    var c;
    for (c in characters) {
        new V.Character(characters[c]);
    }
};

/**
 * Search the index for items matching the property values provided in params
 * @param type
 * @param params
 * @returns array of things
 */
V.genericSearch = function(params, type) {
    type = type || 'things';
    var index = V.index[type],
        key, searchTarget, criterion,
        candidates = {},
        searchTerms = Object.keys(params),
        searchTerm,
        j;

    for (j=0; j < searchTerms.length; j++) {
        searchTerm = searchTerms[j].toLowerCase();
        criterion = params[searchTerm].toLowerCase();

        if (j==0) {
            for (key in index) {
                searchTarget = index[key];
                if (searchTarget[searchTerm] && searchTarget[searchTerm].toLowerCase() === criterion) {
                    candidates[key] = searchTarget; // can't delete items from index, so accumulate the first pass into candidates
                }
            }
        } else {
            for (key in candidates) {
                searchTarget = candidates[key];
                if (!searchTarget[searchTerm] || searchTarget[searchTerm].toLowerCase() !== criterion) {
                    delete candidates[key]; // remove candidates that fail subsequent passes
                }
            }
        }
    }

    return V.utils.objToArray(candidates);
};
V.findThingsByName = function(name) { // supports multiple items with the same name
    return V.genericSearch({'name': name});
};
V.findCharactersByName = function(name) {
    return V.genericSearch({'name': name}, 'characters');
};
V.findLocationByName = function(name) {
    var locs = V.genericSearch({'name': name}, 'locations');
    if (locs) {
        return locs[0];
    } else {
        return null;
    }
};
V.getThingsInLocation = function(locationName) {
    return V.genericSearch({'location': locationName}, 'things');
};
V.getCharactersInLocation = function(locationName, includePlayer) {
    var chars = V.genericSearch({'location': locationName}, 'characters'),
        i;
    if (!includePlayer) {
        for (i = 0; i < chars.length; i++) {
            if (chars[i].id == V.PLAYER.id) {
                chars.splice(i, 1);
                break;
            }
        }
    }
    return chars;
};

V.getRandomLocation = function(constraint) {
    var possibilities = Object.keys(V.index.locations),
        pin,
        testLoc,
        testLocId;
    while (possibilities.length) {
        pin = Math.floor(Math.random()*possibilities.length);
        testLocId = possibilities[pin];
        testLoc = V.index.locations[testLocId];
        if (constraint) {
            if (constraint(testLoc)) {
                return testLocId;
            } else {
                possibilities.splice(pin,1);
            }
        } else {
            return testLocId;
        }
    }
    return null;
};
V.getThingsText = function(things) {
    var i, text = V.messages.thingsInRoom1,
        thingCount = things.length;
    for (i=0; i < thingCount; i++) {
        if (i > 0 && i == thingCount - 1) {
            text += ", and "
        } else if (i > 0) {
            text += " and "
        }
        text += things[i].grammarName;
    }
    return text + '.';
};
V.getCharactersText = function(characters) {
    var i, text = V.messages.charactersInRoom1,
        thingCount = characters.length;
    for (i=0; i < thingCount; i++) {
        if (i > 0) {
            text += "and "
        }
        text += characters[i].name;
    }
    return text + (thingCount > 1 ? V.messages.charactersInRoom2plural : V.messages.charactersInRoom2singular);
};

V.Thing = function(o) {
    var extraProp;

    this.name = o.name;
    this.grammarName = o.grammarName;
    this.description = o.description;
    // description might be a function that figures out what the text description should be, based on state of thing
    // in that case, thing is passed in as only param

    if (o.location) {
        var loc = V.findLocationByName(o.location);
    }
    this.location = o.location || null; // name, not id
    this.hidden = o.hidden || false;

    // add bespoke properties
    if (o.bespoke) {
        for (extraProp in o.bespoke) {
            this[extraProp] = o.bespoke[extraProp];
        }
    }

    // add to thing index
    this.id = V.utils.getUniqueId(this.name);
    V.index.things[this.id] = this;
};
V.Thing.prototype.examine = function(character) {
    character = character || V.PLAYER;
    if (this._isPresent(character)) {
        var descString;
        if (typeof this.description == 'string') {
            descString = this.description;
        } else if (typeof this.description == 'function') {
            descString = this.description.apply(this);
        } else {
            descString = '';
        }
        return descString;
        // thing methods may have side effects. If they return text,
        // it is handled in the default way for that game
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.look = V.Thing.prototype.lookAt = V.Thing.prototype.examine; // TODO: proper aliasing
V.Thing.prototype.destroy = function(character) {
    if (this._isPresent(character)) {
        if (this.breakable) {
            delete V.index.things[this.id];
        } else {
            return V.messages.unbreakable;
        }
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype._isPresent = function(character) {
    character = character || V.PLAYER;
    return (this.location == character.location || this.location == "inventory." + character.name);
};
V.Thing.prototype._nameOfCarrier = function() {
    if (this.location.indexOf("inventory") === 0) {
        return this.location.slice(10);
    } else {
        return null;
    }
};
V.Thing.prototype._getDescription = function() {
    var thingText;
    if (typeof this.description == 'function') {
        thingText = this.description(this);
    } else {
        thingText = this.description ? this.description : '';
    }
    return thingText;
};
V.Thing.prototype.get = function(character) {
    character = character || V.PLAYER;

    if (this._isPresent(character)) {
        var whoHasIt = this._nameOfCarrier();
        if (whoHasIt == character.name) {
            return V.messages.alreadyHaveIt;
        } else if (whoHasIt) {
            return V.messages.genericImpossibleAction; // TODO - someone else has it
        } else {
            character.inventory.push(this);
            this.location = "inventory." + character.name;
            return V.messages.ok;
        }
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.drop = function(character) {
    character = character || V.PLAYER;

    var whoHasIt = this._nameOfCarrier();
    if (whoHasIt == character.name) {
        character._removeFromInventory(this);
        return V.messages.ok;
    } else {
        return V.messages.notPresent;
    }
};

V.Location = function(id, o) {
    this.name = o.name;
    this.description = o.description;
    this.exits = o.exits;
    this.id = id;

    V.index.locations[this.id] = this;
};
V.Location.prototype._getDescription = function() {
    var locationText;
    if (typeof this.description == 'function') {
        locationText = this.description(this);
    } else {
        locationText = this.description ? this.description : '';
    }
    return locationText;
};
V.Location.prototype._getEnterText = function() {
    var locationText = this._getDescription(),
        things = V.getThingsInLocation(this.name),
        characters = V.getCharactersInLocation(this.name);

    if (things && things.length) {
        locationText += V.messages.paragraphSeparator + V.getThingsText(things);
    }
    if (characters && characters.length) {
        locationText += V.messages.paragraphSeparator + V.getCharactersText(characters);
    }
    return locationText;
};
V.Location.prototype._canMoveTo = function(destinationName) {
    var exits = this.exits,
        dir, dest;

    for (dir in exits) {
        dest = exits[dir];
        if (dest == destinationName) {
            return true;
        }
    }
    return false;
};
V.Location.prototype.goTo = function(characterObj, teleport) {
    characterObj = characterObj || V.PLAYER;

    if (characterObj.location == this) return;

    if (teleport || this._canMoveTo(characterObj.location)) {
        characterObj.location = this.name;
        return this._getEnterText();
    } else {
        return V.messages.cantGoThatWay;
    }
};

V.Character = function(o) {
    var prop,
        defaultPersonalityAttributes = {
            stealth: 'r',
            dexterity: 'r',
            charisma: 'r',
            stamina: 'r',
            morality: 'r'
        };

    this.name = o.name;
    this.id = V.utils.getUniqueId(this.name);
    this.description = o.description;
    if (o.location == "r") { // random
        this.location = V.getRandomLocation();
    } else {
        this.location = o.location;
    }
    this.money = o.money || 0;

    this.personality = {};
    o.personality = $.extend(defaultPersonalityAttributes, o.personality);
    for (prop in o.personality) {
        if (o.personality[prop] == 'r') {
            this.personality[prop] = Math.floor(Math.random()*21);
        } else {
            this.personality[prop] = o.personality[prop];
        }
    }

    this.inventory = [];
    if (o.inventory) {
        var i, itemName, item;
        for (i = 0; i < o.inventory.length; i++) {
            itemName = o.inventory[i];
            item = V.findThingsByName(itemName)[0];
            this.inventory.push(item);
            item.location = "inventory." + this.name;
        }
    }

    V.index.characters[this.id] = this;
};
V.Character.prototype.examine = function(whosLooking) {
    whosLooking = whosLooking || V.PLAYER;
    if (this._isPresent(whosLooking)) {
        var descString;
        if (typeof this.description == 'string') {
            descString = this.description;
        } else if (typeof this.description == 'function') {
            descString = this.description.apply(this);
        } else {
            descString = '';
        }
        return descString;
    } else {
        return V.messages.notPresent;
    }
};
V.Character.prototype._isPresent = function(who) {
    who = who || V.PLAYER;
    return (this.location == who.location);
};
V.Character.prototype._removeFromInventory = function(thingObj) {
    var inv = this.inventory,
        count = inv.length,
        where,
        item,
        j;

    for (j = 0; j < inv.length; j++) {
        item = inv[j];
        if (item.id === thingObj.id) {
            where = j;
            break;
        }
    }

    if (typeof where == 'undefined') {
        V.error(thingObj.name + " wasn't in the inventory of player " + this.name);
    } else {
        thingObj.location = this.location;
        if (where === 0) {
            this.inventory = inv.slice(1);
        } else if (where == count - 1) {
            this.inventory = inv.slice(0, count - 1);
        } else {
            this.inventory = inv.slice(0, where).concat(inv.slice(where + 1));
        }
    }
};
V.Character.prototype._addToInventory = function(thingObj) {

};
V.error = function(message) {
    if (V.debug) {
        console.error(message);
    }
};

V.messages = { // TODO: make overrides for this
    notPresent: "What are you talking about?",
    notCarried: "What are you talking about?",
    unknownItem: "What are you talking about?",
    unknownAction: "You can't do that. Now or possibly ever.",
    unknownActionToObject: "You want to do what to it?!",
    unbreakable: "Unbreakable, dammit!",
    cantGoThatWay: "You can't go that way.",
    genericImpossibleAction: "You can't",
    alreadyHaveIt: "You already have it",
    thingsInRoom1: "You can see ",
    thingsInRoom2: ".",
    charactersInRoom1: "",
    charactersInRoom2singular: " is here.",
    charactersInRoom2plural: " are here.",
    ok: "Okay.",
    totallyConfused: "Nope. I got nothing. Sorry.",
    paragraphSeparator: '<br><br>'
};

V.utils = {
    getTimestamp: function() {
        try {
            return performance.now().toString().replace('.', '');
        } catch(e) {
            return new Date().getTime().toString();
        }
    },
    camelCaseify: function(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
            if (+match === 0) return "";
            return index == 0 ? match.toLowerCase() : match.toUpperCase();
        });
    },
    getUniqueId: function(name) {
        return V.utils.camelCaseify(name) + '_' + V.utils.getTimestamp()
    },
    objToArray: function(obj) {
        var result = [],
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(obj[key]);
            }
        }
        return result;
    }
};